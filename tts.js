const TTS_API_BASE = "https://texttospeech.googleapis.com/v1/text:synthesize";

/**
 * Service to handle Google Cloud Text-to-Speech synthesis via REST API.
 * This provides high-quality voice output for the AI responses.
 */
async function synthesizeSpeech(text, languageCode = 'en-US') {
  const apiKey = process.env.GEMINI_API_KEY; // Often the same key works if unrestricted
  if (!apiKey || !text) return null;

  // Map common ISO codes to TTS locales
  const localeMap = {
    'en': 'en-US',
    'hi': 'hi-IN',
    'te': 'te-IN',
    'ta': 'ta-IN',
    'kn': 'kn-IN',
    'ml': 'ml-IN'
  };

  const ssmlGender = 'NEUTRAL';
  const locale = localeMap[languageCode.substring(0, 2)] || 'en-US';

  try {
    const response = await fetch(`${TTS_API_BASE}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: locale, ssmlGender },
        audioConfig: { audioEncoding: 'MP3' }
      })
    });

    if (!response.ok) {
      console.warn("[TTS ERROR] API response not OK:", response.status);
      return null;
    }

    const data = await response.json();
    return data.audioContent; // Base64 encoded MP3
  } catch (err) {
    console.error("[TTS SERVICE ERROR]", err.message);
    return null;
  }
}

module.exports = { synthesizeSpeech };
