const { getSystemPrompt } = require('../utils/prompts');

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const MAX_HISTORY_FOR_API = 6; // Keep the last 6 messages (3 turns) for context to avoid huge payloads

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Removed getContextAwareFallback as it's now handled by the server layer.

/**
 * Generate AI response with retry and improved stability
 */
async function generateResponse(message, conversationHistory, userLevel, intent, isCurrentInfo = false) {
  let attempts = 0;
  const maxAttempts = 2; // Original + 1 Retry

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const result = await makeApiCall(message, conversationHistory, userLevel, intent, isCurrentInfo);
      if (result) {
        console.log("Gemini reply:", result);
        return result;
      }
    } catch (error) {
      const reason = error.name === 'AbortError' ? 'TIMEOUT' : (error.message || 'UNKNOWN');
      console.error(`[AI ATTEMPT ${attempts} FAILED] Reason: ${reason}`);

      if (attempts < maxAttempts) {
        console.log(`[RETRY] Waiting 500ms before retry...`);
        await delay(500);
      } else {
        throw new Error("API completely failed after retries.");
      }
    }
  }
}

/**
 * The actual API fetch call
 */
async function makeApiCall(message, conversationHistory, userLevel, intent, isCurrentInfo) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("MISSING_API_KEY");

  let systemInstruction = getSystemPrompt(userLevel, intent, isCurrentInfo);
  systemInstruction += `

CRITICAL INSTRUCTIONS:
- Detect user language and respond in the same language. Support Telugu, Hindi, English.
- If user asks about current elections, dates, or recent news:
  * Provide general known info
  * If unsure, clearly say: "Check official Election Commission website for latest updates"
DO NOT hallucinate.`;

  const contents = [
    { role: 'user', parts: [{ text: systemInstruction + "\n\nPlease confirm you understand your role as VoteBuddy AI." }] },
    { role: 'model', parts: [{ text: "Understood. I am VoteBuddy AI." }] }
  ];

  if (conversationHistory && conversationHistory.length > 0) {
    conversationHistory.slice(-MAX_HISTORY_FOR_API).forEach(msg => {
      const gRole = (msg.role === 'assistant' || msg.role === 'ai' || msg.role === 'model') ? 'model' : 'user';
      contents.push({ role: gRole, parts: [{ text: msg.text || "" }] });
    });
  }

  contents.push({ role: 'user', parts: [{ text: message }] });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  const response = await fetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, generationConfig: { temperature: 0.2, maxOutputTokens: 500 } }),
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    let errorData = {};
    try {
      errorData = await response.json();
    } catch (e) {
      // Ignored
    }
    if (errorData.error && errorData.error.message) {
      throw new Error(`API_ERROR: ${errorData.error.message}`);
    }
    throw new Error(`HTTP_${response.status}`);
  }

  let data = {};
  try {
    data = await response.json();
  } catch (parseErr) {
    throw new Error(`JSON_PARSE_ERROR: Failed to parse Gemini response`);
  }

  let reply = "";

  if (data && data.candidates && data.candidates.length > 0) {
    const parts = data.candidates[0].content?.parts;

    if (parts && Array.isArray(parts)) {
      reply = parts.map(p => p.text || "").join(" ").trim();
    }
  }


  const isInternal = message.includes("Return ONLY the") || message.includes("Identify the ISO");
  
  if (!isInternal && (!reply || reply.length < 30 || reply.endsWith("...") || reply.split(" ").length < 8)) {
    console.log("Retrying AI due to weak response");

    try {
      const retryController = new AbortController();
      const retryTimeoutId = setTimeout(() => retryController.abort(), 10000);

      const retryRes = await fetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig: { temperature: 0.4, maxOutputTokens: 800 } }),
        signal: retryController.signal
      });

      clearTimeout(retryTimeoutId);

      if (retryRes.ok) {
        const retryData = await retryRes.json();
        const retryParts = retryData.candidates?.[0]?.content?.parts;
        if (retryParts && Array.isArray(retryParts)) {
          const retryText = retryParts.map(p => p.text || "").join(" ").trim();
          if (retryText && retryText.length > reply.length) {
            reply = retryText;
          }
        }
      }
    } catch (err) {
      console.log("Retry failed, using original reply", err.message);
    }
  }

  if (reply && reply.length > 5) {
    return reply;
  }

  // Return safe fallback WITHOUT throwing error
  return "I’m not fully sure about that, but here’s the general idea:\n\n• Elections are how people choose leaders\n• Voting gives citizens a voice in democracy\n\nAsk me something specific and I’ll guide you 👍";
}

module.exports = { generateResponse };
