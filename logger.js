/**
 * Structured Interaction Logger
 * 
 * Default: console.log (structured JSON for Cloud Run log parsing)
 * Optional: Set ENABLE_DB_LOGS=true in .env for future Firestore logging
 */

const LANGUAGE_NAMES = {
  'en': 'English',
  'hi': 'Hindi',
  'hi-Latn': 'Hinglish',
  'te': 'Telugu',
  'ta': 'Tamil',
  'bn': 'Bengali',
  'kn': 'Kannada'
};

/**
 * Log a user interaction with structured metadata
 */
function logInteraction({ input, detectedLanguage, intent, safetyFlags, sessionId }) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    sessionId: sessionId || 'unknown',
    input: typeof input === 'string' ? input.substring(0, 100) : '',
    detectedLanguage: LANGUAGE_NAMES[detectedLanguage] || detectedLanguage || 'Unknown',
    intent: intent || 'GENERAL',
    safetyFlags: safetyFlags || {}
  };

  // Always log to console (structured JSON for Cloud Run)
  console.log('[INTERACTION]', JSON.stringify(logEntry));

  // Future: Firestore logging when ENABLE_DB_LOGS is set
  if (process.env.ENABLE_DB_LOGS === 'true') {
    logToFirestore(logEntry).catch(err => {
      console.error('[LOG DB ERROR]', err.message);
    });
  }
}

/**
 * Log a safety event (harmful content, injection attempt)
 */
function logSafetyEvent({ type, input, category, sessionId }) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: 'SAFETY_TRIGGER',
    type: type || 'unknown',
    category: category || 'none',
    sessionId: sessionId || 'unknown',
    input: typeof input === 'string' ? input.substring(0, 100) : ''
  };

  console.warn('[SAFETY]', JSON.stringify(logEntry));

  if (process.env.ENABLE_DB_LOGS === 'true') {
    logToFirestore(logEntry).catch(err => {
      console.error('[LOG DB ERROR]', err.message);
    });
  }
}

/**
 * Future: Write log entry to Firestore
 * Activated by setting ENABLE_DB_LOGS=true in environment
 */
async function logToFirestore(logEntry) {
  try {
    const { Firestore } = require('@google-cloud/firestore');
    const db = new Firestore();
    await db.collection('interaction_logs').add(logEntry);
  } catch (err) {
    // Silent fail — logging should never crash the app
    console.error('[FIRESTORE LOG ERROR]', err.message);
  }
}

module.exports = { logInteraction, logSafetyEvent };
