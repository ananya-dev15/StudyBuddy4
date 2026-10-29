import { normalizeSpeechText } from "../backend/utils/speechNormalizer.js";
import {
  cleanTextForTTS,
  detectLanguageCode,
  splitIntoSpeechSentences,
  SARVAM_MALE_SPEAKERS,
} from "../backend/controllers/chatController.js";

console.log("=========================================================================");
console.log("STUDYBUDDY — 10 MANDATORY SARVAM AI EVALUATION SENTENCES TEST SUITE");
console.log("=========================================================================\n");

const evaluationSuite = [
  {
    id: 1,
    query: "Tree data structure kya hai?",
    simulatedResponse: "Tree ek non-linear data structure hai jisme data nodes ke form mein organize hota hai. Isme ek root node hota hai aur multiple child nodes ho sakte hain.",
    expectedLang: "hi-IN",
    expectedSpeaker: "shubh",
    verifySpoken: (spoken) =>
      spoken.includes("ट्री") &&
      spoken.includes("नॉन-लिनियर") &&
      spoken.includes("डेटा स्ट्रक्चर") &&
      spoken.includes("नोड्स") &&
      spoken.includes("रूट नोड") &&
      spoken.includes("चाइल्ड नोड्स") &&
      spoken.includes("हो सकते हैं"),
  },
  {
    id: 2,
    query: "Binary tree aur BST mein kya difference hai?",
    simulatedResponse: "Binary tree aur BST mein main difference yeh hai ki BST mein left child parent node se chhota hota hai aur right child bada hota hai.",
    expectedLang: "hi-IN",
    expectedSpeaker: "shubh",
    verifySpoken: (spoken) =>
      spoken.includes("बाइनरी ट्री") &&
      spoken.includes("बीएसटी") &&
      spoken.includes("डिफ़रेंस") &&
      spoken.includes("लेफ़्ट चाइल्ड") &&
      spoken.includes("राइट चाइल्ड") &&
      spoken.includes("पैरेंट नोड"),
  },
  {
    id: 3,
    query: "Stack ko real life example se samjhao.",
    simulatedResponse: "Stack ek LIFO yaani Last In First Out data structure hai. Real life example mein kitchen mein rakhi plates ka stack dekh sakte hain jisme sabse upar wali plate pehle nikalti hai.",
    expectedLang: "hi-IN",
    expectedSpeaker: "shubh",
    verifySpoken: (spoken) =>
      spoken.includes("स्टैक") &&
      spoken.includes("लिफ़ो") &&
      spoken.includes("डेटा स्ट्रक्चर") &&
      spoken.includes("रियल लाइफ़ एग्ज़ाम्पल") &&
      spoken.includes("पहले"),
  },
  {
    id: 4,
    query: "What is database normalization?",
    simulatedResponse: "Database normalization is the process of organizing data in a relational database to reduce redundancy and improve data integrity across tables.",
    expectedLang: "en-IN",
    expectedSpeaker: "ratan",
    verifySpoken: (spoken) =>
      spoken.includes("Database normalization is the process") &&
      spoken.includes("relational database") &&
      !/[\u0900-\u097F]/.test(spoken), // Strictly English Latin script
  },
  {
    id: 5,
    query: "Explain inheritance in simple words.",
    simulatedResponse: "Inheritance is an OOP concept where a child class inherits properties and methods from a parent class, enabling reusable code.",
    expectedLang: "en-IN",
    expectedSpeaker: "ratan",
    verifySpoken: (spoken) =>
      spoken.includes("Inheritance is an OOP concept") &&
      spoken.includes("child class") &&
      !/[\u0900-\u097F]/.test(spoken),
  },
  {
    id: 6,
    query: "मुझे polymorphism समझाइए।",
    simulatedResponse: "पॉलीमॉर्फिज्म ऑब्जेक्ट ओरिएंटेड प्रोग्रामिंग का एक महत्वपूर्ण सिद्धांत है जिसमें एक ही मेथड अलग-अलग रूपों में काम कर सकता है।",
    expectedLang: "hi-IN",
    expectedSpeaker: "shubh",
    verifySpoken: (spoken) =>
      spoken.includes("पॉलीमॉर्फिज्म") &&
      spoken.includes("ऑब्जेक्ट") &&
      spoken.includes("प्रोग्रामिंग") &&
      spoken.includes("मेथड"),
  },
  {
    id: 7,
    query: "Inheritance ki hunda hai?",
    simulatedResponse: "Inheritance ik mahatavpurna OOP concept hai jide vich ik child class parent class di properties te methods inherit kardi hai.",
    expectedLang: "pa-IN",
    expectedSpeaker: "mani",
    verifySpoken: (spoken) =>
      spoken.includes("ਇਨਹੈਰੀਟੈਂਸ") &&
      spoken.includes("ਕਲਾਸ") &&
      /[\u0A00-\u0A7F]/.test(spoken), // Gurmukhi Punjabi script
  },
  {
    id: 8,
    query: "API kya hoti hai aur iska use kahan hota hai?",
    simulatedResponse: "API yaani Application Programming Interface do software applications ke beech data exchange aur communication karwane ke liye use hoti hai.",
    expectedLang: "hi-IN",
    expectedSpeaker: "shubh",
    verifySpoken: (spoken) =>
      spoken.includes("एपीआई") &&
      spoken.includes("एप्लीकेशन प्रोग्रामिंग इंटरफ़ेस") ||
      spoken.includes("एपीआई") && spoken.includes("सॉफ्टवेयर") ||
      spoken.includes("एपीआई") && spoken.includes("कम्युनिकेशन"),
  },
  {
    id: 9,
    query: "What is the difference between SQL and NoSQL?",
    simulatedResponse: "SQL databases are relational and table-based with fixed schemas, whereas NoSQL databases are non-relational document or key-value stores with dynamic schemas.",
    expectedLang: "en-IN",
    expectedSpeaker: "ratan",
    verifySpoken: (spoken) =>
      spoken.includes("SQL databases are relational") &&
      spoken.includes("NoSQL") &&
      !/[\u0900-\u097F]/.test(spoken),
  },
  {
    id: 10,
    query: "Explain stack and queue in Hinglish with real life examples and time complexity.",
    simulatedResponse: "Stack LIFO principle follow karta hai jaise cafeteria mein plates ka stack. Queue FIFO principle follow karta hai jaise movie ticket counter ki line. Dono mein insertion aur deletion O(1) constant time mein hote hain.",
    expectedLang: "hi-IN",
    expectedSpeaker: "shubh",
    verifySpoken: (spoken) =>
      spoken.includes("स्टैक") &&
      spoken.includes("क्यू") &&
      spoken.includes("लिफ़ो") &&
      spoken.includes("फ़िफ़ो") &&
      spoken.includes("O of 1") &&
      spoken.includes("होते हैं"),
  },
];

let allPassed = true;

evaluationSuite.forEach((test) => {
  console.log(`-------------------------------------------------------------------------`);
  console.log(`TEST #${test.id}: "${test.query}"`);

  // 1. Language detection
  const detectedLang = detectLanguageCode(test.query);
  const langMatch = detectedLang === test.expectedLang;
  console.log(`  • Language Detection: Detected "${detectedLang}" | Expected "${test.expectedLang}" => ${langMatch ? "✅ PASS" : "❌ FAIL"}`);

  // 2. Speaker mapping
  const selectedSpeaker = SARVAM_MALE_SPEAKERS[detectedLang] || "shubh";
  const speakerMatch = selectedSpeaker === test.expectedSpeaker;
  console.log(`  • Bulbul v3 Speaker: Selected "${selectedSpeaker}" | Expected "${test.expectedSpeaker}" => ${speakerMatch ? "✅ PASS" : "❌ FAIL"}`);

  // 3. Display response preservation
  const cleanSpokenBase = cleanTextForTTS(test.simulatedResponse);
  const spokenTTS = normalizeSpeechText(cleanSpokenBase, detectedLang);
  const spokenOk = test.verifySpoken(spokenTTS);

  console.log(`  • Written Screen Display: "${test.simulatedResponse}"`);
  console.log(`  • Spoken TTS Pronunciation: "${spokenTTS}"`);
  console.log(`  • Phonetic Verification: ${spokenOk ? "✅ PASS" : "❌ FAIL"}`);

  if (!langMatch || !speakerMatch || !spokenOk) {
    allPassed = false;
  }
});

console.log("\n=========================================================================");
if (allPassed) {
  console.log("🎉 ALL 10 MANDATORY EVALUATION SENTENCES PASSED 100% SUCCESSFULLY!");
} else {
  console.error("❌ SOME SENTENCES FAILED VALIDATION.");
}
console.log("=========================================================================\n");
