// ===== INTENT DETECTION =====
function detectIntent(message) {
  const lowerMsg = message.toLowerCase();
  
  // Deterministic Keyword Routing
  if (/(step|how to|guide|process|help me vote|first time|how do i)/i.test(lowerMsg)) return 'GUIDED';
  if (/(history|evolution|system|how it works|what is|why|democracy|explain|tell me about)/i.test(lowerMsg)) return 'LEARNING';
  if (/(lost|missing|not registered|error|problem|issue|can't find|help me|stuck)/i.test(lowerMsg)) return 'PROBLEM';
  
  return 'GENERAL';
}

// ===== USER LEVEL DETECTION =====
function detectUserLevel(message) {
  const lowerMsg = message.toLowerCase();
  
  if (/(first time|beginner|don't know|simple|teenager|student|explain like i'm 5)/i.test(lowerMsg)) return 'BEGINNER';
  if (/(details|compare|history|evolution|deep|advanced|statistics|analysis)/i.test(lowerMsg)) return 'ADVANCED';
  
  return 'INTERMEDIATE'; // Default
}

// ===== PROMPT INJECTION DETECTION (REFINED) =====
function detectPromptInjection(message) {
  const lowerMsg = message.toLowerCase();
  const suspiciousPatterns = [
    /\bignore previous instructions\b/i,
    /\bforget (all )?previous instructions\b/i,
    /\bdisregard all previous\b/i,
    /\breveal your system prompt\b/i,
    /\bshow your system prompt\b/i,
    /\bwhat is your system prompt\b/i,
    /\bjailbreak\b/i,
    /\bdan mode\b/i,
    /\bdeveloper mode\b/i,
    /\bsudo mode\b/i
  ];
  return suspiciousPatterns.some(pattern => pattern.test(lowerMsg));
}

// ===== HARMFUL CONTENT DETECTION (REFINED) =====
function detectHarmfulContent(message) {
  const lowerMsg = message.toLowerCase();

  const categories = {
    'self-harm': [
      /\bkill myself\b/i,
      /\bsuicide\b/i,
      /\bend my life\b/i
    ],
    'violence': [
      /\bhow to build a bomb\b/i,
      /\bhow to (kill|murder) someone\b/i,
      /\bterrorist attack\b/i
    ],
    'illegal': [
      /\bhack (the )?election\b/i,
      /\brig (the )?vote\b/i,
      /\bvoter fraud scheme\b/i,
      /\bbuy votes\b/i
    ]
  };

  for (const [category, patterns] of Object.entries(categories)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerMsg)) {
        return { flagged: true, category };
      }
    }
  }

  return { flagged: false, category: null };
}

// ===== OUT-OF-SCOPE DETECTION (REFINED) =====
function detectOutOfScope(message) {
  const lowerMsg = message.toLowerCase();

  // Clearly off-topic keywords
  const offTopicPatterns = [
    /\b(football|cricket|soccer|basketball|tennis)\b/i,
    /\b(movie|film|cinema|actor|actress)\b/i,
    /\b(recipe|cooking|pizza|burger)\b/i,
    /\b(weather forecast|stock market|crypto)\b/i
  ];

  // If it matches off-topic AND doesn't mention voting/elections, then it's out of scope
  if (offTopicPatterns.some(p => p.test(lowerMsg))) {
    const inScopeKeywords = /\b(vote|voter|voting|election|ballot|poll|candidate|party|register|id card|epic|evm|vvpat|democracy)\b/i;
    if (!inScopeKeywords.test(lowerMsg)) {
      return true;
    }
  }

  return false;
}

// ===== INPUT SANITIZATION (REFINED) =====
function sanitizeInput(message) {
  if (typeof message !== 'string') return '';

  let clean = message;

  // 1. Remove script tags and their entire content
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // 2. Remove actual HTML tags (e.g., <b>, <div style="...">, etc.)
  // This regex looks for < followed by letters, avoiding stripping things like "< 18"
  clean = clean.replace(/<[a-z][a-z0-9]*\b[^>]*>/gi, '');
  clean = clean.replace(/<\/[a-z][a-z0-9]*\b[^>]*>/gi, '');

  // 3. Remove common injection characters but keep normal punctuation
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 4. Trim excessive whitespace
  clean = clean.replace(/\s{3,}/g, '  ').trim();

  return clean;
}

// ===== CURRENT INFO DETECTION =====
function detectCurrentInfo(message) {
  const lowerMsg = message.toLowerCase();
  const currentInfoPatterns = [
    /\bcurrent elections?\b/i,
    /\bongoing elections?\b/i,
    /\belection dates?\b/i,
    /\bnext elections?\b/i,
    /\blatest elections?\b/i,
    /\bupcoming elections?\b/i,
    /\bwhen is (the )?election\b/i,
    /\belection kab hai\b/i
  ];
  return currentInfoPatterns.some(pattern => pattern.test(lowerMsg));
}

// ===== LANGUAGE DETECTION =====
function detectLanguage(message) {
  if (!message) return 'en';

  const hindiChars = (message.match(/[\u0900-\u097F]/g) || []).length;
  const teluguChars = (message.match(/[\u0C00-\u0C7F]/g) || []).length;
  const tamilChars = (message.match(/[\u0B80-\u0BFF]/g) || []).length;
  const bengaliChars = (message.match(/[\u0980-\u09FF]/g) || []).length;
  const kannadaChars = (message.match(/[\u0C80-\u0CFF]/g) || []).length;

  const totalChars = message.length;

  if (hindiChars / totalChars > 0.1) return 'hi';
  if (teluguChars / totalChars > 0.1) return 'te';
  if (tamilChars / totalChars > 0.1) return 'ta';
  if (bengaliChars / totalChars > 0.1) return 'bn';
  if (kannadaChars / totalChars > 0.1) return 'kn';

  // Basic Hinglish heuristic: looks like Latin script but uses common Hindi words
  const hinglishWords = /\b(kaise|kya|kab|kahan|kyon|hai|matdan|chunav|vote|batao|karo)\b/ig;
  const matchCount = (message.match(hinglishWords) || []).length;
  if (matchCount >= 2 && hindiChars === 0) return 'hi-Latn'; // Hinglish

  return 'en';
}

module.exports = {
  detectIntent,
  detectUserLevel,
  detectPromptInjection,
  detectHarmfulContent,
  detectOutOfScope,
  sanitizeInput,
  detectLanguage,
  detectCurrentInfo
};
