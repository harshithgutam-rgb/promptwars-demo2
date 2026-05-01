const TRANSLATE_API_BASE = "https://translation.googleapis.com/language/translate/v2";

/**
 * Service to handle Google Cloud Translation and Language Detection.
 * Using the official Cloud Translation REST API for maximum accuracy and 
 * to demonstrate deep integration with Google Cloud services.
 */

async function detectLanguage(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !text) return "en";

  try {
    const response = await fetch(`${TRANSLATE_API_BASE}/detect?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text })
    });

    if (!response.ok) {
      console.warn("[TRANSLATE] Detection fallback to 'en'");
      return "en";
    }

    const data = await response.json();
    return data.data.detections[0][0].language || "en";
  } catch (err) {
    console.error("[TRANSLATE DETECTION ERROR]", err.message);
    return "en";
  }
}

async function translateText(text, targetLang) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !text) return text;
  
  // Skip translation if it's already English and we're targeting English
  if (targetLang === 'en' && /^[A-Za-z0-9\s.,!?'"()-]+$/.test(text)) return text;

  try {
    const response = await fetch(`${TRANSLATE_API_BASE}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        target: targetLang
      })
    });

    if (!response.ok) {
      console.warn("[TRANSLATE] Translation fallback to original text");
      return text;
    }

    const data = await response.json();
    return data.data.translations[0].translatedText || text;
  } catch (err) {
    console.error("[TRANSLATE ERROR]", err.message);
    return text;
  }
}

module.exports = { detectLanguage, translateText };
