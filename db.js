// In-memory session store (Replacing Firestore)
const sessions = new Map();

// Store last 10 message pairs (20 entries) for conversation memory
const MAX_MESSAGES = 10;

/**
 * Retrieves a session from memory.
 * @param {string} sessionId 
 */
async function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    return { messages: [], lastIntent: 'GENERAL', userLevel: 'INTERMEDIATE' };
  }
  return sessions.get(sessionId);
}

/**
 * Updates a session in memory.
 * @param {string} sessionId 
 * @param {string} userMessage 
 * @param {string} aiMessage 
 * @param {string} intent 
 * @param {string} userLevel 
 */
async function updateSession(sessionId, userMessage, aiMessage, intent, userLevel) {
  try {
    const session = await getSession(sessionId);
    let messages = session.messages || [];

    // Append new pair
    messages.push({ role: 'user', text: userMessage });
    messages.push({ role: 'assistant', text: aiMessage });

    // Trim to last MAX_MESSAGES pairs
    if (messages.length > MAX_MESSAGES * 2) {
      messages = messages.slice(messages.length - (MAX_MESSAGES * 2));
    }

    // Save back to memory map
    sessions.set(sessionId, {
      messages,
      lastIntent: intent,
      userLevel,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error("[IN-MEMORY DB WRITE ERROR]", error.message);
  }
}

module.exports = { getSession, updateSession };
