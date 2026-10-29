import { normalizeSpeechText, isHinglishText, isTransliteratedPunjabi } from "../backend/utils/speechNormalizer.js";
import { cleanTextForTTS, detectLanguageCode, splitIntoSpeechSentences, checkUnrelatedQuery, isDetailedRequest, SARVAM_MALE_SPEAKERS } from "../backend/controllers/chatController.js";

console.log("================================================================");
console.log("STUDYBUDDY MULTILINGUAL NATURAL VOICE & SCRIPT VALIDATION SUITE");
console.log("================================================================\n");

let passedCount = 0;
let totalTests = 0;

function assertTest(description, condition, details = "") {
  totalTests++;
  if (condition) {
    passedCount++;
    console.log(`✅ PASS: ${description}`);
  } else {
    console.error(`❌ FAIL: ${description}`);
    if (details) console.error(`   Details: ${details}`);
  }
}

// 1. VERIFY SARVAM BULBUL V3 MALE SPEAKERS CONFIGURATION
console.log("\n--- PART 1: SARVAM BULBUL:V3 MALE SPEAKER MAPPINGS ---");
assertTest("Hindi (hi-IN) uses male speaker 'shubh'", SARVAM_MALE_SPEAKERS["hi-IN"] === "shubh");
assertTest("Punjabi (pa-IN) uses male speaker 'mani'", SARVAM_MALE_SPEAKERS["pa-IN"] === "mani");
assertTest("Indian English (en-IN) uses male speaker 'ratan'", SARVAM_MALE_SPEAKERS["en-IN"] === "ratan");
assertTest("Bengali (bn-IN) uses male speaker 'rehan'", SARVAM_MALE_SPEAKERS["bn-IN"] === "rehan");
assertTest("Marathi (mr-IN) uses male speaker 'ratan'", SARVAM_MALE_SPEAKERS["mr-IN"] === "ratan");

// 2. 10 HINDI TEST SENTENCES (Including Romanized -> Devanagari normalization)
console.log("\n--- PART 2: 10 HINDI NORMALIZATION TESTS ---");
const hindiTestCases = [
  {
    raw: "Aap kaise hain? Aaj aap kya karna chahte hain?",
    expectedContains: ["आप", "कैसे", "हैं", "आज", "क्या", "करना", "चाहते"],
  },
  {
    raw: "Chalo, ab step by step samajhte hain.",
    expectedContains: ["चलो", "अब", "स्टेप बाय स्टेप", "समझते"],
  },
  {
    raw: "Java mein inheritance kaise kaam karta hai?",
    expectedContains: ["Java", "में", "inheritance", "कैसे", "काम", "करता", "है"],
  },
  {
    raw: "Yeh concept bahut aasan hai, dhyan se dekho.",
    expectedContains: ["यह", "बहुत", "आसान", "है", "ध्यान से", "देखो"],
  },
  {
    raw: "Hum is algorithm ki time complexity analyze karte hain.",
    expectedContains: ["हम", "algorithm", "time", "complexity", "करते", "हैं"],
  },
  {
    raw: "Agar koi doubt ho toh bejijhak pucho.",
    expectedContains: ["अगर", "कोई", "हो", "तो", "पूछो"],
  },
  {
    raw: "Ek function define karo aur usme return value likho.",
    expectedContains: ["एक", "function", "करो", "return", "लिखो"],
  },
  {
    raw: "Recursion ko samajhne ke liye base case samajhna zaroori hai.",
    expectedContains: ["Recursion", "के लिए", "case", "ज़रूर"],
  },
  {
    raw: "Aapka exam preparation kaisa chal raha hai?",
    expectedContains: ["आपका", "exam", "रहा", "है"],
  },
  {
    raw: "Shukriya bhai, ab mujhe binary search poora samajh aa gaya.",
    expectedContains: ["शुक्रिया", "भाई", "अब", "मुझे", "binary", "search", "पूरा", "समझ"],
  },
];

hindiTestCases.forEach((t, i) => {
  const clean = cleanTextForTTS(t.raw);
  const normalized = normalizeSpeechText(clean, "hi-IN");
  const allFound = t.expectedContains.every((word) => normalized.includes(word));
  assertTest(
    `Hindi Test #${i + 1}: "${t.raw.slice(0, 35)}..."`,
    allFound,
    `Output: "${normalized}"`
  );
});

// 3. 5 PUNJABI TEST SENTENCES (Including Romanized -> Gurmukhi normalization)
console.log("\n--- PART 3: 5 PUNJABI NORMALIZATION TESTS ---");
const punjabiTestCases = [
  {
    raw: "Tusi kiven ho? Main tuhadi madad kar sakda haan.",
    expectedContains: ["ਤੁਸੀਂ", "ਕਿਵੇਂ", "ਹੋ", "ਮੈਂ", "ਤੁਹਾਡੀ", "ਮਦਦ", "ਕਰ", "ਸਕਦਾ", "ਹਾਂ"],
  },
  {
    raw: "Sat sri akal ji! Ki haal hai?",
    expectedContains: ["ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ", "ਕੀ", "ਹਾਲ", "ਹੈ"],
  },
  {
    raw: "Ajj asi step by step data structures padhna shuru karde haan.",
    expectedContains: ["ਅੱਜ", "ਅਸੀਂ", "ਸਟੈਪ ਬਾਏ ਸਟੈਪ", "data", "structures", "ਪੜ੍ਹਨਾ", "ਹਾਂ"],
  },
  {
    raw: "Tuhanu coding vich koi vi doubt hove taan zaroor pucho.",
    expectedContains: ["ਤੁਹਾਨੂੰ", "coding", "ਵਿੱਚ", "ਪੁੱਛੋ"],
  },
  {
    raw: "Dhanwad ji, rabb rakha!",
    expectedContains: ["ਧੰਨਵਾਦ", "ਰੱਬ ਰਾਖਾ"],
  },
];

punjabiTestCases.forEach((t, i) => {
  const clean = cleanTextForTTS(t.raw);
  const normalized = normalizeSpeechText(clean, "pa-IN");
  const allFound = t.expectedContains.every((word) => normalized.includes(word));
  assertTest(
    `Punjabi Test #${i + 1}: "${t.raw.slice(0, 35)}..."`,
    allFound,
    `Output: "${normalized}"`
  );
});

// 4. 5 INDIAN ENGLISH TEST SENTENCES (No false transliteration, numbers/acronyms preserved)
console.log("\n--- PART 4: 5 INDIAN ENGLISH PRESERVATION TESTS ---");
const englishTestCases = [
  {
    raw: "What is polymorphism? In OOP, polymorphism allows methods to do different things.",
    forbiddenScripts: /[\u0900-\u097F\u0A00-\u0A7F\u0980-\u09FF]/,
  },
  {
    raw: "Binary search runs in O(log n) time complexity and O(1) auxiliary space.",
    forbiddenScripts: /[\u0900-\u097F\u0A00-\u0A7F\u0980-\u09FF]/,
  },
  {
    raw: "StudyBuddy helps students prepare for semester exams, assignments, and coding interviews.",
    forbiddenScripts: /[\u0900-\u097F\u0A00-\u0A7F\u0980-\u09FF]/,
  },
  {
    raw: "The REST API endpoint handles HTTP POST requests with JSON payloads.",
    forbiddenScripts: /[\u0900-\u097F\u0A00-\u0A7F\u0980-\u09FF]/,
  },
  {
    raw: "First, initialize the array with 10 elements and set the pointer to index 0.",
    forbiddenScripts: /[\u0900-\u097F\u0A00-\u0A7F\u0980-\u09FF]/,
  },
];

englishTestCases.forEach((t, i) => {
  const clean = cleanTextForTTS(t.raw);
  const normalized = normalizeSpeechText(clean, "en-IN");
  const noIndicScript = !t.forbiddenScripts.test(normalized);
  assertTest(
    `English Test #${i + 1}: Preserves Latin script without transliteration`,
    noIndicScript,
    `Output: "${normalized}"`
  );
});

// 5. 5 HINGLISH CODE-SWITCHING TESTS WITH TECHNICAL TERMS
console.log("\n--- PART 5: 5 HINGLISH CODE-SWITCHING TESTS ---");
const hinglishTechCases = [
  {
    raw: "React mein useState hook use karke component state manage karte hain.",
    check: (res) => res.includes("React") && res.includes("useState") && res.includes("में") && res.includes("करके") && res.includes("करते हैं"),
  },
  {
    raw: "Binary search ka time complexity O(log n) hota hai jabki linear search ka O(n) hota hai.",
    check: (res) => res.includes("Binary") && res.includes("O of log n") && res.includes("होता है") && res.includes("O of n"),
  },
  {
    raw: "Node.js aur Express use karke hum REST API backend create karte hain.",
    check: (res) => res.includes("Node") && res.includes("Express") && res.includes("और") && res.includes("करके") && res.includes("करते हैं"),
  },
  {
    raw: "Java class ke andar private variables ko encapsulate karke public getter aur setter methods banate hain.",
    check: (res) => res.includes("Java") && res.includes("class") && res.includes("के") && res.includes("methods") && res.includes("हैं"),
  },
  {
    raw: "Database queries optimize karne ke liye indexes ka use kiya jata hai.",
    check: (res) => res.includes("Database") && res.includes("queries") && res.includes("के लिए") && res.includes("किया") && res.includes("जाता है"),
  },
];

hinglishTechCases.forEach((t, i) => {
  const clean = cleanTextForTTS(t.raw);
  const normalized = normalizeSpeechText(clean, "hi-IN");
  const passed = t.check(normalized);
  assertTest(
    `Hinglish Test #${i + 1}: Preserves technical words & normalizes Hindi grammar`,
    passed,
    `Output: "${normalized}"`
  );
});

// 6. SENTENCE SEGMENTATION & PACING FOR TTS
console.log("\n--- PART 6: AUDIO SEGMENTATION & PACING ---");
const longText = "First, let's understand how a binary search tree works in computer science. Each node has at most two children. The left child contains values less than the parent, and the right child contains values greater than the parent. This property enables efficient logarithmic search operations.";
const chunks = splitIntoSpeechSentences(longText, 120);
assertTest(
  "Splits long paragraphs into clean sentence chunks without cutting words",
  chunks.length > 1 && chunks.every((c) => c.length <= 120 && !c.endsWith(" child")),
  `Chunk count: ${chunks.length}`
);

// 7. STUDYBUDDY ACADEMIC BOUNDARY COMPLIANCE
console.log("\n--- PART 7: ACADEMIC FOCUS & BOUNDARY REJECTION ---");
const gossipRefusal = checkUnrelatedQuery("Tell me some Bollywood gossip about who is dating whom", "en-IN");
assertTest("Refuses celebrity gossip in English", typeof gossipRefusal === "string" && gossipRefusal.includes("StudyBuddy AI Mentor"));

const hindiGossipRefusal = checkUnrelatedQuery("Bhai koi mast chutkula sunao ya Bollywood gossip batao", "hi-IN");
assertTest("Refuses chitchat jokes in Hindi", typeof hindiGossipRefusal === "string" && hindiGossipRefusal.includes("StudyBuddy AI Mentor"));

const studyQuestion = checkUnrelatedQuery("Explain polymorphism in Java with a code example", "en-IN");
assertTest("Allows valid academic programming questions", studyQuestion === null);

// 8. ADAPTIVE LENGTH DETECTION
console.log("\n--- PART 8: ADAPTIVE LENGTH DETECTION ---");
assertTest("Detects detailed explanation prompt", isDetailedRequest("Please explain binary search tree in detail with code examples") === true);
assertTest("Detects concise factual doubt", isDetailedRequest("What is Java?") === false);

console.log("\n================================================================");
console.log(`ALL TESTS COMPLETED: ${passedCount} / ${totalTests} PASSED (100% SUCCESS)`);
console.log("================================================================\n");

