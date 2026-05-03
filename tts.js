const TTS_API_BASE = "https://texttospeech.googleapis.com/v1/text:synthesize";

/**
 * Strips emojis, markdown symbols, and cleans text for better TTS flow.
 */
function cleanTextForTTS(text) {
  if (!text) return "";
  return text
    .replace(/[\u{1F600}-\u{1F6FF}]/gu, "")
    .replace(/[*#•-]/g, "")
    .trim();
}

/**
 * Service to handle Google Cloud Text-to-Speech synthesis via REST API.
 * Optimized for natural, female, and friendly voice output.
 */
async function synthesizeSpeech(originalText, languageCode = 'en-US') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !originalText) return null;

  const text = cleanTextForTTS(originalText);
  if (!text) return null;

  const isHindi = languageCode.startsWith('hi');
  
  try {
    const response = await fetch(`${TTS_API_BASE}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { 
          languageCode: isHindi ? "hi-IN" : "en-IN", 
          name: isHindi ? "hi-IN-Wavenet-A" : "en-IN-Wavenet-B",
          ssmlGender: isHindi ? "FEMALE" : "MALE" 
        },
        audioConfig: { 
          audioEncoding: 'MP3',
          speakingRate: 0.95,
          pitch: 1.5
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[TTS API ERROR]", response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data.audioContent || null;
  } catch (err) {
    // Silent fallback per requirement 5
    return null;
  }
}

module.exports = { synthesizeSpeech };
