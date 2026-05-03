# VoteBuddy AI 🗳️

**VoteBuddy AI** is a smart, multilingual election assistant that helps users understand voting processes, registration, and election-related queries in a simple, accurate, and accessible way.

---

## 🚀 Features

* 🧠 **AI-Powered Election Guidance**
  Clear and reliable explanations about voting, eligibility, and election procedures.
  Built with Google Gemini for accurate and structured answers

* 🌐 **Multilingual Support**
  Supports multiple languages including:

  * English (high accuracy)
  * Hindi (high accuracy)
  * Telugu
  * Tamil
  * Kannada
  * Malayalam
    *(and more supported dynamically)*


* 🎤 **Voice Interaction**
  Speech-to-text input and text-to-speech output.Speak your queries — the AI detects language and responds accordingly.You can also listen to AI replies.

* 📱 **Mobile Compatible UI**
  Fully responsive design optimized for phones and tablets with smooth touch interactions.

* 💬 **Context-Aware Conversations**
  Understands previous messages and responds intelligently based on context.

* 🔁 **Retry System**
  Users can retry any message if they are not satisfied with the response.

* ⚡ **Smart Quick Actions**
  Context-based suggestions for faster navigation and better user experience.

---

## 🔊 Voice & Language Support
* ✅ Most accurate support: English and Hindi
* 🌍 Other languages supported: Telugu, Tamil, Kannada, Malayalam, etc.
* ⚠️ Note: Regional language voice output may vary in pronunciation due to current browser and API limitations

The system is designed to scale voice capabilities further using enhanced APIs and datasets for improved multilingual speech quality.

---

## 🔒 Security & Safety

* XSS Protection (frontend + backend)
* Input sanitization and validation
* Prompt injection protection
* Safe AI responses (no harmful or misleading content)
* Anti-hallucination rules for better accuracy
* Graceful fallback for API failures
* Robust error handling (frontend + backend )
---

## ♿ Accessibility

* Keyboard navigation support
* Screen reader friendly (ARIA labels)
* Clear focus states and interaction feedback

---

## ⚡ Performance

* Optimized rendering for smooth experience
* Chat history limits for stability
* Frontend rate limiting to prevent spam
* Fast response time

---

## 🧠 AI Behavior

* Responds in the **same language as the user**
* Provides **highly accurate responses in English and Hindi**
* Supports multiple Indian languages effectively
* Avoids guessing uncertain information and suggests official verification when needed

---

## 🛠️ Tech Stack

* **Frontend:** HTML, CSS, JavaScript
* **Backend:** Node.js, Express
* **AI:** Google Gemini API
* **Storage:** Local storage (chat history)

---

## ☁️ Google Services Used
* Google Gemini API → Intelligent response generation
* Google Translate API → Multilingual support
* Google Cloud Text-to-Speech (Hybrid) → Voice output

The system is designed with a hybrid Text-to-Speech architecture, where Google Cloud TTS is integrated for scalable voice output, and a browser-based fallback ensures uninterrupted audio playback across devices and API conditions.

---

## 🧪 Testing

The application has been tested across functionality, security, performance, and responsiveness.  
Detailed testing strategy is available in `TESTING.md`.
* No crash handling for API failures
* Safe JSON parsing
* Mobile and desktop tested
* Consistent UI behavior

---

## 🎯 Problem Statement Alignment

VoteBuddy AI helps users:

* Understand voter eligibility
* Learn how to apply for voter ID
* Get election-related information in simple language
* Access information in their preferred language

---

## 💡 Purpose

To make election-related information:

* Simple
* Accessible
* Multilingual
* Safe and trustworthy

for every citizen.

---

## ⚠️ Disclaimer

This application provides general guidance based on commonly accepted election processes.
For official and latest updates, please refer to authorized election commission sources.

---

## 📌 Conclusion

VoteBuddy AI is designed as a scalable, accessible, and reliable AI assistant, focusing on real-world usability and clean engineering practices.

---
