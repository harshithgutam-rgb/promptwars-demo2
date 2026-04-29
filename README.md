# VoteBuddy AI 🗳️

VoteBuddy AI is a friendly, highly reliable, and intelligent step-by-step election guide designed to help users understand elections and the voting process.

## Problem and Solution
Many first-time voters find the voting process intimidating, and existing information is often scattered or overly complex. LLMs are helpful, but they often hallucinate legal or statistical facts about elections. 
**Solution:** VoteBuddy AI uses a hybrid deterministic + AI architecture. We apply deterministic intent and user-level routing *before* hitting the AI, and strict anti-hallucination post-processing *after* hitting the AI. It guides users step-by-step, adapting its tone from Beginner to Advanced.

## Architecture

- **Frontend:** Vanilla HTML/CSS/JS with a modern Glassmorphism UI to ensure extreme lightweight performance.
- **Backend:** Node.js / Express handling the API layer.
- **Logic Layer:** Deterministic Intent & User Level Classifier (GUIDED, LEARNING, PROBLEM, GENERAL).
- **AI Engine:** Google Vertex AI (Gemini 2.5 Flash) with strict System Instructions for safe generation.
- **Database:** Google Cloud Firestore for tracking session history and user intent efficiently.
- **Deployment:** Google Cloud Run (Dockerized).

## Features
- **Anti-Hallucination Strategy:** Deterministic fallback if the AI attempts to guess or hallucinate statistics. Low temperature setting on Gemini.
- **User Level Adaptation:** Automatically detects if a user is a BEGINNER or ADVANCED based on keyword heuristics.
- **Stateful Memory:** Uses Firestore to keep track of previous conversational turns and the user's intent.
- **Rate Limiting:** Built-in memory rate limiter to prevent abuse.
- **Security:** Input validation and Prompt Injection protection.

## Setup Steps
1. Clone the repository and run `npm install`.
2. Copy `.env.example` to `.env` and fill in `GEMINI_API_KEY`.
3. Start the server: `npm start`.
4. Open `http://localhost:8080` in your browser.

## Testing
Run the lightweight native node test suite:
\`\`\`bash
npm test
\`\`\`

## Deployment to Google Cloud Run
1. Authenticate with Google Cloud: `gcloud auth login`
2. Set your project: `gcloud config set project [YOUR-PROJECT-ID]`
3. Submit build and deploy:
   \`\`\`bash
   gcloud run deploy votebuddy-ai \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars GEMINI_API_KEY=[YOUR_KEY]
   \`\`\`
