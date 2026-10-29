/**
 * Speech Normalizer for Multilingual & Hinglish Code-Switching Speech Synthesis.
 * Transforms spoken text into an internal phonetic representation for TTS engines
 * while keeping the displayed written response 100% intact.
 */

// Multi-word common Hinglish idioms & collocations mapped to phonetic Devanagari
export const HINGLISH_PHRASES = [
  { regex: /\bstep\s+by\s+step\b/gi, replacement: "स्टेप बाय स्टेप" },
  { regex: /\bby\s+default\b/gi, replacement: "बाय डिफ़ॉल्ट" },
  { regex: /\bday\s+to\s+day\b/gi, replacement: "डे टू डे" },
  { regex: /\bone\s+by\s+one\b/gi, replacement: "वन बाय वन" },
  { regex: /\bline\s+by\s+line\b/gi, replacement: "लाइन बाय लाइन" },
  { regex: /\breal\s+world\b/gi, replacement: "रियल वर्ल्ड" },
  { regex: /\breal\s+time\b/gi, replacement: "रियल टाइम" },
  { regex: /\bdhyan\s+se\b/gi, replacement: "ध्यान से" },
  { regex: /\bke\s+baare\s+mein\b/gi, replacement: "के बारे में" },
  { regex: /\bke\s+liye\b/gi, replacement: "के लिए" },
  { regex: /\bke\s+saath\b/gi, replacement: "के साथ" },
  { regex: /\bke\s+baad\b/gi, replacement: "के बाद" },
  { regex: /\bke\s+pehle\b/gi, replacement: "के पहले" },
  { regex: /\bke\s+bina\b/gi, replacement: "के बिना" },
  { regex: /\baa\s+raha\b/gi, replacement: "आ रहा" },
  { regex: /\baa\s+rahi\b/gi, replacement: "आ रही" },
  { regex: /\baa\s+rahe\b/gi, replacement: "आ रहे" },
  { regex: /\bja\s+raha\b/gi, replacement: "जा रहा" },
  { regex: /\bja\s+rahi\b/gi, replacement: "जा रही" },
  { regex: /\bja\s+rahe\b/gi, replacement: "जा रहे" },
  { regex: /\bkar\s+sakta\b/gi, replacement: "कर सकता" },
  { regex: /\bkar\s+sakti\b/gi, replacement: "कर सकती" },
  { regex: /\bkar\s+sakte\b/gi, replacement: "कर सकते" },
  { regex: /\bkar\s+raha\b/gi, replacement: "कर रहा" },
  { regex: /\bkar\s+rahi\b/gi, replacement: "कर रही" },
  { regex: /\bkar\s+rahe\b/gi, replacement: "कर रहे" },
  { regex: /\bkar\s+liya\b/gi, replacement: "कर लिया" },
  { regex: /\bkar\s+chuke\b/gi, replacement: "कर चुके" },
  { regex: /\bho\s+sakta\b/gi, replacement: "हो सकता" },
  { regex: /\bho\s+sakti\b/gi, replacement: "हो सकती" },
  { regex: /\bho\s+sakte\b/gi, replacement: "हो सकते" },
  { regex: /\bho\s+raha\b/gi, replacement: "हो रहा" },
  { regex: /\bho\s+rahi\b/gi, replacement: "हो रही" },
  { regex: /\bho\s+rahe\b/gi, replacement: "हो रहे" },
  { regex: /\bho\s+gaya\b/gi, replacement: "हो गया" },
  { regex: /\bho\s+gayi\b/gi, replacement: "हो गई" },
  { regex: /\bho\s+gaye\b/gi, replacement: "हो गए" },
  { regex: /\bsamjhata\s+hoon\b/gi, replacement: "समझाता हूँ" },
  { regex: /\bsamjhati\s+hoon\b/gi, replacement: "समझाती हूँ" },
  { regex: /\bshuru\s+karte\b/gi, replacement: "शुरू करते" },
  { regex: /\bshuru\s+karo\b/gi, replacement: "शुरू करो" },
  { regex: /\bdetail\s+mein\b/gi, replacement: "detail में" },
  { regex: /\bhota\s+hai\b/gi, replacement: "होता है" },
  { regex: /\bhoti\s+hai\b/gi, replacement: "होती है" },
  { regex: /\bhote\s+hain\b/gi, replacement: "होते हैं" },
  { regex: /\baaj\s+hum\b/gi, replacement: "आज हम" },
  { regex: /\baaj\s+ham\b/gi, replacement: "आज हम" },
  { regex: /\b(main|mai)\s+use\b/gi, replacement: "मैं उसे" },
  { regex: /\b(hum|ham)\s+use\b/gi, replacement: "हम उसे" },
  { regex: /\b(tum|aap)\s+use\b/gi, replacement: "आप उसे" },
  { regex: /\bka\s+use\b/gi, replacement: "का use" },
  { regex: /\bki\s+use\b/gi, replacement: "की use" },
  { regex: /\bke\s+use\b/gi, replacement: "के use" },
  { regex: /\buse\s+karne\b/gi, replacement: "use करने" },
  { regex: /\buse\s+karna\b/gi, replacement: "use करना" },
  { regex: /\buse\s+karo\b/gi, replacement: "use करो" },
  { regex: /\buse\s+hota\b/gi, replacement: "use होता" },
  { regex: /\buse\s+hoti\b/gi, replacement: "use होती" },
  { regex: /\buse\s+hote\b/gi, replacement: "use होते" },
];

// Single Romanized Hindi words dictionary mapped to Devanagari
// Case-insensitive mapping for standard and colloquial spellings
export const HINGLISH_WORDS = {
  // Pronouns & Demonstratives
  main: "मैं",
  mai: "मैं",
  mera: "मेरा",
  meri: "मेरी",
  mere: "मेरे",
  mujhe: "मुझे",
  mujhko: "मुझको",
  hum: "हम",
  ham: "हम",
  humara: "हमारा",
  humari: "हमारी",
  humare: "हमारे",
  hamara: "हमारा",
  hamari: "हमारी",
  hamare: "हमारे",
  humein: "हमें",
  humko: "हमको",
  tum: "तुम",
  tumhara: "तुम्हारा",
  tumhari: "तुम्हारी",
  tumhare: "तुम्हारे",
  tumhe: "तुम्हें",
  tumko: "तुमको",
  aap: "आप",
  aapka: "आपका",
  aapki: "आपकी",
  aapke: "आपके",
  aapko: "आपको",
  yeh: "यह",
  ye: "यह",
  woh: "वह",
  wo: "वह",
  iska: "इसका",
  iski: "इसकी",
  iske: "इसके",
  uska: "उसका",
  uski: "उसकी",
  uske: "उसके",
  ise: "इसे",
  usse: "उसे",
  usey: "उसे",
  inhe: "इन्हें",
  unhe: "उन्हें",
  inka: "इनका",
  unka: "उनका",
  kisi: "किसी",
  kisko: "किसको",
  sab: "सब",
  sabhi: "सभी",
  kuch: "कुछ",
  koi: "कोई",

  // Verbs & Auxiliaries
  hai: "है",
  hain: "हैं",
  tha: "था",
  thi: "थी",
  the: "थे",
  hoga: "होगा",
  hogi: "होगी",
  hoge: "होंगे",
  hoon: "हूँ",
  hu: "हूँ",
  ho: "हो",
  hota: "होता",
  hoti: "होती",
  hote: "होते",
  hona: "होना",
  hone: "होने",
  karo: "करो",
  kare: "करें",
  karein: "करें",
  karna: "करना",
  karne: "करने",
  karta: "करता",
  karti: "करती",
  karte: "करते",
  kiya: "किया",
  kiye: "किए",
  kijiye: "कीजिए",
  samajh: "समझ",
  samjho: "समझो",
  samjhe: "समझें",
  samjhenge: "समझेंगे",
  samajhta: "समझता",
  samajhti: "समझती",
  samajhte: "समझते",
  samjhata: "समझाता",
  samjhati: "समझती",
  samjhate: "समझते",
  samajhna: "समझना",
  seekho: "सीखो",
  seekhein: "सीखें",
  seekhna: "सीखना",
  seekhenge: "सीखेंगे",
  sikhata: "सिखाता",
  sikhao: "सिखाओ",
  padho: "पढ़ो",
  padhein: "पढ़ें",
  padhna: "पढ़ना",
  padhai: "पढ़ाई",
  padhaai: "पढ़ाई",
  padhate: "पढ़ाते",
  dekho: "देखो",
  dekhein: "देखें",
  dekhna: "देखना",
  dekh: "देख",
  bolo: "बोलो",
  bolein: "बोलें",
  bolna: "बोलना",
  batao: "बताओ",
  bataiye: "बताइए",
  batana: "बताना",
  batate: "बताते",
  pucho: "पूछो",
  puchiye: "पूछिए",
  puchna: "पूछना",
  chalo: "चलो",
  chalein: "चलें",
  chalte: "चलते",
  aao: "आओ",
  aaye: "आए",
  aate: "आते",
  aana: "आना",
  jao: "जाओ",
  jaye: "जाएं",
  jaate: "जाते",
  jaana: "जाना",
  raha: "रहा",
  rahi: "रही",
  rahe: "रहे",
  sakta: "सकता",
  sakti: "सकती",
  sakte: "सकते",
  chahiye: "चाहिए",
  rakho: "रखो",
  rakhein: "रखें",
  rakhna: "रखना",
  likho: "लिखो",
  likhein: "लिखें",
  likhna: "लिखना",
  bano: "बनो",
  bane: "बनें",
  banna: "बनना",

  // Postpositions & Conjunctions
  ka: "का",
  ki: "की",
  ke: "के",
  ko: "को",
  se: "से",
  mein: "में",
  par: "पर",
  pe: "पर",
  tak: "तक",
  aur: "और",
  ya: "या",
  lekin: "लेकिन",
  kintu: "किन्तु",
  parantu: "परन्तु",
  agar: "अगर",
  yadi: "यदि",
  toh: "तो",
  to: "तो",
  kyunki: "क्योंकि",
  kyonki: "क्योंकि",
  isliye: "इसलिए",
  bhi: "भी",
  hi: "ही",

  // Question words
  kya: "क्या",
  kaise: "कैसे",
  kyun: "क्यों",
  kyon: "क्यों",
  kab: "कब",
  kahan: "कहाँ",
  kaha: "कहाँ",
  kitna: "कितना",
  kitni: "कितनी",
  kitne: "कितने",
  kaun: "कौन",
  kiska: "किसका",

  // Adverbs, Adjectives & Common markers
  accha: "अच्छा",
  achha: "अच्छा",
  acchi: "अच्छी",
  achhi: "अच्छी",
  acche: "अच्छे",
  achhe: "अच्छे",
  bura: "बुरा",
  buri: "बुरी",
  bure: "बुरे",
  nahi: "नहीं",
  nahin: "नहीं",
  nhi: "नहीं",
  mat: "मत",
  pehle: "पहले",
  baad: "बाद",
  ab: "अब",
  abhi: "अभी",
  tab: "तब",
  tabhi: "तभी",
  aaj: "आज",
  kal: "कल",
  hamesha: "हमेशा",
  kabhi: "कभी",
  dobara: "दोबारा",
  fir: "फिर",
  phir: "फिर",
  dhyan: "ध्यान",
  zarur: "ज़रूर",
  zaroor: "ज़रूर",
  bilkul: "बिल्कुल",
  bohot: "बहुत",
  bahut: "बहुत",
  thoda: "थोड़ा",
  thodi: "थोड़ी",
  thode: "थोड़े",
  zyada: "ज़्यादा",
  jyada: "ज़्यादा",
  poora: "पूरा",
  poori: "पूरी",
  poore: "पूरे",
  shuru: "शुरू",
  khatam: "खत्म",
  sahi: "सही",
  galat: "गलत",
  aasan: "आसान",
  mushkil: "मुश्किल",
  dost: "दोस्त",
  yaar: "यार",
  bhai: "भाई",
  shukriya: "शुक्रिया",
  dhanyawad: "धन्यवाद",
  namaste: "नमस्ते",
  alvida: "अलविदा",

  // Numbers in words
  ek: "एक",
  do: "दो",
  teen: "तीन",
  char: "चार",
  paanch: "पाँच",
  chheh: "छह",
  saat: "सात",
  aath: "आठ",
  nau: "नौ",
  das: "दस",
};

// Reserved English technical terms that MUST remain in English script
// or are pronounced by modern Indian TTS seamlessly as English terms
const ENGLISH_TECHNICAL_PRESERVE = new Set([
  "java", "python", "c", "c++", "javascript", "typescript", "react", "node", "express",
  "html", "css", "sql", "nosql", "mongodb", "postgres", "mysql", "api", "apis", "rest",
  "json", "xml", "dom", "props", "state", "usestate", "useeffect", "hook", "hooks",
  "class", "object", "objects", "inheritance", "polymorphism", "abstraction", "encapsulation",
  "function", "functions", "method", "methods", "variable", "variables", "constant", "loop",
  "loops", "for", "while", "if", "else", "switch", "array", "arrays", "string", "strings",
  "integer", "boolean", "pointer", "pointers", "stack", "stacks", "queue", "queues",
  "tree", "trees", "graph", "graphs", "algorithm", "algorithms", "dsa", "complexity",
  "time", "space", "auxiliary", "big", "linear", "constant", "logarithmic", "quadratic",
  "git", "github", "commit", "push", "pull", "merge", "branch", "branching", "clone",
  "compiler", "interpreter", "runtime", "compile", "debug", "debugging", "bug", "bugs",
  "framework", "library", "libraries", "package", "module", "modules", "server", "client",
  "database", "query", "queries", "table", "schema", "key", "keys", "foreign", "primary",
  "index", "indexing", "network", "http", "https", "request", "response", "status",
  "syntax", "statement", "expression", "scope", "closure", "async", "await", "promise",
  "callback", "thread", "threads", "process", "memory", "allocation", "garbage", "collection",
  "leetcode", "viva", "semester", "exam", "assignment", "project", "code", "coding",
  "use", "uses", "used", "using", "hide", "details", "implementation"
]);

/**
 * Checks whether a sentence or text chunk contains prominent Hinglish/Hindi content.
 */
export const isHinglishText = (text) => {
  if (!text) return false;
  // If Devanagari is present, it is definitely Hindi
  if (/[\u0900-\u097F]/.test(text)) return true;

  const words = text.toLowerCase().split(/[^a-zA-Z]+/);
  let hinglishCount = 0;

  for (const w of words) {
    if (!w) continue;
    if (Object.prototype.hasOwnProperty.call(HINGLISH_WORDS, w)) {
      hinglishCount++;
    }
  }

  // If at least 2 words match the Romanized Hindi vocabulary
  return hinglishCount >= 2;
};

/**
 * Normalizes Romanized Hindi into native Devanagari representation for TTS,
 * while preserving English technical terms in standard English script.
 */
export const normalizeSpeechText = (text, detectedLang = "en-IN") => {
  if (!text || !text.trim()) return "";

  // If text is in regional Indic scripts (Punjabi, Bengali, Tamil, etc.), preserve as-is
  if (/[\u0A00-\u0A7F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]/.test(text)) {
    return text;
  }

  // If language is explicitly detected as pure English and has no Hinglish words, return as-is
  const isHinglish = detectedLang === "hi-IN" || isHinglishText(text);
  if (!isHinglish) {
    return text;
  }

  let normalized = text;

  // 1. Multi-word phrase substitutions first (e.g. "step by step" -> "स्टेप बाय स्टेप")
  for (const { regex, replacement } of HINGLISH_PHRASES) {
    normalized = normalized.replace(regex, replacement);
  }

  // 2. Tokenize preserving words, punctuation, and whitespace
  // Replace Romanized Hindi tokens that match HINGLISH_WORDS unless they are in ENGLISH_TECHNICAL_PRESERVE
  normalized = normalized.replace(/\b([a-zA-Z]+)\b/g, (match, word) => {
    const lower = word.toLowerCase();

    // If word is in technical preserve set, keep it as-is
    if (ENGLISH_TECHNICAL_PRESERVE.has(lower)) {
      return word;
    }

    // Check if word is a Romanized Hindi word
    if (Object.prototype.hasOwnProperty.call(HINGLISH_WORDS, lower)) {
      return HINGLISH_WORDS[lower];
    }

    return word;
  });

  // Ensure full-stop at end of Hindi sentence is a period or danda for natural pause
  normalized = normalized.replace(/\s*([,.:;!?।])\s*/g, "$1 ");
  return normalized.trim();
};
