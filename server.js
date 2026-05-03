require('dotenv').config();
const express = require('express');
const path = require('path');
const {
  detectIntent,
  detectUserLevel,
  detectPromptInjection,
  detectHarmfulContent,
  detectOutOfScope,
  sanitizeInput,
  detectCurrentInfo
} = require('./services/logic');

// ... (skip down to the logic layer)

const { getSession, updateSession } = require('./services/db');
const { generateResponse } = require('./services/ai');
const { detectLanguage: detectLangCode, translateText } = require('./services/translate');
const { synthesizeSpeech } = require('./services/tts');
const { logInteraction, logSafetyEvent } = require('./utils/logger');

const app = express();

// ===== CORS MIDDLEWARE (Allows file:// and local testing) =====
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ===== RATE LIMITING =====
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 15;

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now - data.timestamp > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitMap.delete(ip);
    }
  }
}, 300000);

function rateLimiter(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  if (rateLimitMap.has(ip)) {
    const data = rateLimitMap.get(ip);
    if (now - data.timestamp < RATE_LIMIT_WINDOW_MS) {
      if (data.count > RATE_LIMIT_MAX_REQUESTS) {
        console.warn(`[RATE LIMIT] IP: ${ip} exceeded ${RATE_LIMIT_MAX_REQUESTS} requests/min`);
        return res.status(429).json({ reply: "Please slow down. Let me catch my breath for a minute 👍" });
      }
      data.count++;
    } else {
      rateLimitMap.set(ip, { count: 1, timestamp: now });
    }
  } else {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
  }
  next();
}


app.post('/api/chat', rateLimiter, async (req, res) => {
  try {
    const { message, sessionId, history } = req.body;

    // ===== INPUT VALIDATION =====
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(200).json({ reply: "I didn't quite catch that. Could you try asking again?" });
    }
    if (message.length > 500) {
      return res.status(200).json({ reply: "That's a bit long for me! Could you keep it under 500 characters?" });
    }

    // ===== SANITIZE INPUT =====
    const cleanMessage = sanitizeInput(message);
    if (!cleanMessage || cleanMessage.trim().length === 0) {
      return res.status(200).json({ reply: "I couldn't understand that input. Could you rephrase?" });
    }

    const safeSessionId = sessionId ? String(sessionId).substring(0, 50) : 'default-session';

    console.log(`[INCOMING] Session: ${safeSessionId} | Message: "${cleanMessage.substring(0, 80)}"`);

    // ===== PROMPT INJECTION PROTECTION =====
    const isInjection = detectPromptInjection(cleanMessage);
    if (isInjection) {
      console.log('[SAFETY CHECK] injection: true');
      logSafetyEvent({ type: 'injection', input: cleanMessage, category: 'prompt_injection', sessionId: safeSessionId });
      return res.status(200).json({ reply: "I am VoteBuddy AI. I'm here to help you understand elections safely. How can I assist you?" });
    }

    // ===== HARMFUL CONTENT DETECTION =====
    const harmCheck = detectHarmfulContent(cleanMessage);
    if (harmCheck.flagged) {
      console.log('[SAFETY CHECK] harmful: true', { category: harmCheck.category });
      logSafetyEvent({ type: 'harmful', input: cleanMessage, category: harmCheck.category, sessionId: safeSessionId });
      return res.status(200).json({ reply: "I can't help with that, but I'm here to guide you with safe and useful information." });
    }

    // ===== LANGUAGE DETECTION =====
    // Using unified async detection in the translation layer below

    // ===== LOGIC LAYER =====
    const intent = detectIntent(cleanMessage);
    let userLevel = detectUserLevel(cleanMessage);
    const isOutOfScope = detectOutOfScope(cleanMessage);
    const isCurrentInfo = detectCurrentInfo(cleanMessage);

    // Final safety check
    if (harmCheck.flagged || isOutOfScope || isInjection) {
      logSafetyEvent({ type: 'safety_check', input: cleanMessage, flags: { harmful: harmCheck.flagged, outOfScope: isOutOfScope, injection: isInjection } });
    }

    // ===== LOG INTERACTION =====
    logInteraction({
      input: cleanMessage,
      intent,
      safetyFlags: {
        injection: false,
        harmful: false,
        outOfScope: isOutOfScope
      },
      sessionId: safeSessionId
    });

    // ===== OUT-OF-SCOPE: SOFT REDIRECT =====
    if (isOutOfScope) {
      return res.status(200).json({
        reply: "I focus on helping with elections and voting. I can still try to guide you if it's related 👍\n\nFor example, I can help with:\n• How to register to vote\n• Understanding the voting process\n• What to do if you lost your voter ID\n\nWhat would you like to know?"
      });
    }

    // ===== FETCH SESSION =====
    let session = { messages: [], lastIntent: 'GENERAL', userLevel: 'INTERMEDIATE' };
    try {
      session = await getSession(safeSessionId);
      if (userLevel === 'INTERMEDIATE' && session.userLevel) {
        userLevel = session.userLevel;
      }
    } catch (dbErr) {
      console.error("[DB FETCH ERROR]", dbErr.message);
    }

    // ===== TRANSLATION LAYER (INCOMING) =====
    let userLang = 'en';
    let messageForAI = cleanMessage;
    try {
      // Optimization: Skip Gemini language detection if text is clearly basic English ASCII
      if (!/^[A-Za-z0-9\s.,!?'"()@#$%^&*-]+$/.test(cleanMessage)) {
        userLang = await detectLangCode(cleanMessage);
      }
      
      if (userLang !== 'en') {
        console.log(`[TRANSLATE] Translating from ${userLang} to en...`);
        messageForAI = await translateText(cleanMessage, 'en');
      }
    } catch (langErr) {
      console.warn("[TRANSLATE ERROR - FALLBACK TO EN]", langErr.message);
    }

    // ===== AI GENERATION =====
    let aiResponse = "";
    try {
      const historyToPass = history && Array.isArray(history) ? history : session.messages;
      aiResponse = await generateResponse(messageForAI, historyToPass, userLevel, intent, isCurrentInfo);

      // Clean AI response of scripts
      if (aiResponse) {
        aiResponse = aiResponse.replace(/<script.*?>.*?<\/script>/gi, "");
      }

      // ===== TRANSLATION LAYER (OUTGOING) =====
      try {
        if (userLang !== 'en' && aiResponse) {
          console.log(`[TRANSLATE] Translating from en back to ${userLang}...`);
          aiResponse = await translateText(aiResponse, userLang);
        }
      } catch (outTransErr) {
        console.warn("[OUTGOING TRANSLATE ERROR]", outTransErr.message);
      }

      // ===== GOOGLE TEXT-TO-SPEECH (OPTIONAL AUDIO) =====
      let audioContent = null;
      try {
        if (aiResponse) {
          if (userLang === 'en' || userLang === 'hi') {
             audioContent = await synthesizeSpeech(aiResponse, userLang);
          } else {
             // No fallback speech for other languages
             console.log(`[TTS] Skipped audio generation for unsupported language: ${userLang}`);
          }
        }
      } catch (ttsErr) {
        console.warn("[TTS PIPELINE ERROR]", ttsErr.message);
      }

      // ===== SAVE SESSION =====
      try {
        if (aiResponse) {
          await updateSession(safeSessionId, cleanMessage, aiResponse, intent, userLevel);
        }
      } catch (dbWriteErr) {
        console.error("[DB WRITE ERROR]", dbWriteErr.message);
      }

      return res.status(200).json({ 
        reply: aiResponse || "I'm having a bit of trouble thinking. Try again in a second? 👍",
        audio: audioContent 
      });

    } catch (aiErr) {
      console.error("AI ERROR:", aiErr.message);
      return res.status(200).json({ reply: "I'm having trouble connecting right now. Try again 👍" });
    }

  } catch (criticalErr) {
    console.error("[CRITICAL ERROR]", criticalErr); // Log full stack trace
    return res.status(200).json({ reply: "Something went wrong on my side. Try again? 👍" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`VoteBuddy AI running on port ${PORT}`);
});
