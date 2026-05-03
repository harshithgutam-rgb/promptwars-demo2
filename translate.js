const { generateResponse } = require('./ai');

/**
 * Service to handle language detection and translation using Gemini.
 * This is more reliable than the Cloud Translation API as it uses the same 
 * API key and handles context better.
 */

async function detectLanguage(text) {
  if (!text || text.length < 3) return "en";
  try {
    const prompt = `Identify the ISO 639-1 language code (e.g., 'en', 'hi', 'te') of the following text. Return ONLY the code:\n\n"${text}"`;
    const response = await generateResponse(prompt, [], "BEGINNER", "GENERAL");
    const code = response.trim().toLowerCase().substring(0, 2);
    return ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'bn'].includes(code) ? code : 'en';
  } catch (err) {
    console.error("[GEMINI TRANSLATE] Detection error:", err.message);
    return "en";
  }
}

async function translateText(text, targetLang) {
  if (!text || targetLang === 'en' && /^[A-Za-z0-9\s.,!?'"()-]+$/.test(text)) return text;
  
  try {
    const prompt = `Translate the following text into the language with code '${targetLang}'. Return ONLY the translated text, no explanation:\n\n"${text}"`;
    const response = await generateResponse(prompt, [], "BEGINNER", "GENERAL");
    return response.trim() || text;
  } catch (err) {
    console.error("[GEMINI TRANSLATE] Translation error:", err.message);
    return text;
  }
}

module.exports = { detectLanguage, translateText };
