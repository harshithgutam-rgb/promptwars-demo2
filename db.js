const { Firestore } = require('@google-cloud/firestore');

// Initialize Firestore. Will automatically use default credentials or service account in GCP.
let db;
try {
  db = new Firestore();
} catch (e) {
  console.warn("Firestore initialization skipped. Run in GCP or set GOOGLE_APPLICATION_CREDENTIALS for local run.");
}

// Store last 10 message pairs (20 entries) for conversation memory
const MAX_MESSAGES = 10;

async function getSession(sessionId) {
  if (!db) return { messages: [], lastIntent: 'GENERAL', userLevel: 'INTERMEDIATE' };
  try {
    const doc = await db.collection('sessions').doc(sessionId).get();
    if (!doc.exists) {
      return { messages: [], lastIntent: 'GENERAL', userLevel: 'INTERMEDIATE' };
    }
    const data = doc.data();
    // Migration: support old "history" field name
    if (data.history && !data.messages) {
      data.messages = data.history.map(h => ({
        role: h.role === 'model' ? 'assistant' : h.role,
        text: h.content || h.text
      }));
    }
    return { ...data, messages: data.messages || [] };
  } catch (error) {
    console.error("[DB READ ERROR]", error.message);
    return { messages: [], lastIntent: 'GENERAL', userLevel: 'INTERMEDIATE' };
  }
}

async function updateSession(sessionId, userMessage, aiMessage, intent, userLevel) {
  if (!db) return;
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

    // Single efficient write
    await db.collection('sessions').doc(sessionId).set({
      messages,
      lastIntent: intent,
      userLevel,
      updatedAt: Firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error("[DB WRITE ERROR]", error.message);
  }
}

module.exports = { getSession, updateSession };
