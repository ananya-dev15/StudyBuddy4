import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import {
  cleanTextForTTS,
  splitIntoSpeechSentences,
  concatWavBuffers,
  detectLanguageCode,
  checkUnrelatedQuery,
} from "./backend/controllers/chatController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "backend/.env") });

console.log("=================================================");
console.log("🧪 RUNNING STUDYBUDDY AI VOICE MENTOR TEST SUITE");
console.log("=================================================");

let allPassed = true;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
  } else {
    console.error(`❌ FAIL: ${message}`);
    allPassed = false;
  }
}

// -----------------------------------------------------------------
// TEST B: STRICT BOUNDARY & STUDY-ONLY VERIFICATION TEST
// -----------------------------------------------------------------
console.log("\n--- TEST B: Strict Boundary & Study-Only Policy ---");

const jokeRefusal = checkUnrelatedQuery("tell me a funny joke", "en-IN");
assert(
  jokeRefusal && jokeRefusal.includes("StudyBuddy AI Mentor"),
  "Refuses English joke request with exact boundary message"
);

const hindiJokeRefusal = checkUnrelatedQuery("koi accha joke sunao", "hi-IN");
assert(
  hindiJokeRefusal && hindiJokeRefusal.includes("StudyBuddy AI Mentor hoon"),
  "Refuses Hindi joke request with exact Hindi boundary message"
);

const weatherRefusal = checkUnrelatedQuery("what is today's weather", "en-IN");
assert(
  weatherRefusal && weatherRefusal.includes("StudyBuddy AI Mentor"),
  "Refuses weather question with boundary message"
);

const gossipRefusal = checkUnrelatedQuery("tell me celebrity gossip", "en-IN");
assert(
  gossipRefusal && gossipRefusal.includes("StudyBuddy AI Mentor"),
  "Refuses celebrity gossip request"
);

const studyJava = checkUnrelatedQuery("What is polymorphism in Java?", "en-IN");
assert(studyJava === null, "Does NOT refuse legitimate Java study question");

const studyDSA = checkUnrelatedQuery("Explain QuickSort algorithm time complexity", "en-IN");
assert(studyDSA === null, "Does NOT refuse legitimate DSA question");

const studyHinglish = checkUnrelatedQuery("Recursion kya hota hai simple example se samjhao", "hi-IN");
assert(studyHinglish === null, "Does NOT refuse legitimate Hinglish study question");

// -----------------------------------------------------------------
// TEST A & E: NATURAL SPEECH TEXT PREPROCESSING & CHUNKING
// -----------------------------------------------------------------
console.log("\n--- TEST A & E: Natural Speech & Audio Text Preprocessing ---");

const rawMarkdownWithCode = `
# Object Oriented Programming
Polymorphism allows objects to take multiple forms.

Here is an example:
\`\`\`java
public class Animal {
    public void makeSound() {
        System.out.println("Animal sound");
    }
}
\`\`\`

Key points:
1. Method overriding happens at runtime.
2. Method overloading happens at compile time.

Complexity is O(1) time and O(n) space!
Check if a === b && c !== d.
`;

const cleanedSpeech = cleanTextForTTS(rawMarkdownWithCode);
console.log("\nSample Cleaned Speech for TTS:\n", cleanedSpeech);

assert(!cleanedSpeech.includes("```"), "Strips raw code fence markers from speech");
assert(!cleanedSpeech.includes("System.out.println"), "Does not read long code verbatim; uses conversational cue");
assert(cleanedSpeech.includes("as shown in the code on your screen"), "Inserts natural spoken cue for code blocks");
assert(!cleanedSpeech.includes("#"), "Removes Markdown heading symbols");
assert(cleanedSpeech.includes("First,"), "Formats numbered list 1. into natural cadence pause 'First,'");
assert(cleanedSpeech.includes("Second,"), "Formats numbered list 2. into natural cadence pause 'Second,'");
assert(cleanedSpeech.includes("O of 1 constant time"), "Converts O(1) into 'O of 1 constant time'");
assert(cleanedSpeech.includes("O of n linear time"), "Converts O(n) into 'O of n linear time'");
assert(cleanedSpeech.includes("equals"), "Converts === into 'equals'");
assert(cleanedSpeech.includes("is not equal to"), "Converts !== into 'is not equal to'");

// Test sentence splitting
const longText = "Object-Oriented Programming (OOP) is a programming paradigm based on the concept of objects, which contain data in the form of fields and code in the form of procedures. The four core pillars of OOP are encapsulation, abstraction, inheritance, and polymorphism. Encapsulation bundles data and methods. Abstraction hides complexity. Inheritance enables code reusability. Polymorphism allows methods to do different things based on the object.";
const chunks = splitIntoSpeechSentences(longText, 150);
console.log(`\nSentence chunks count: ${chunks.length}`);
chunks.forEach((c, idx) => console.log(`  Chunk ${idx + 1} (${c.length} chars): "${c}"`));

assert(chunks.length >= 2, "Splits long response into multiple natural sentence chunks");
assert(chunks.every((c) => c.length <= 160), "Every chunk respects character boundary");
assert(chunks.every((c) => !/\w+-$/.test(c)), "No words are split mid-word with hyphens");

// Test WAV Buffer concatenation
const dummyHeader = Buffer.alloc(44);
dummyHeader.write("RIFF", 0);
dummyHeader.writeUInt32LE(36 + 100, 4);
dummyHeader.write("WAVEfmt ", 8);
dummyHeader.writeUInt32LE(16, 16);
dummyHeader.writeUInt16LE(1, 20); // PCM
dummyHeader.writeUInt16LE(1, 22); // Mono
dummyHeader.writeUInt32LE(22050, 24); // Sample rate
dummyHeader.writeUInt32LE(44100, 28);
dummyHeader.writeUInt16LE(2, 32);
dummyHeader.writeUInt16LE(16, 34);
dummyHeader.write("data", 36);
dummyHeader.writeUInt32LE(100, 40);

const pcm1 = Buffer.alloc(100, 0x11);
const wav1 = Buffer.concat([dummyHeader, pcm1]);

const pcm2 = Buffer.alloc(150, 0x22);
const dummyHeader2 = Buffer.from(dummyHeader);
dummyHeader2.writeUInt32LE(150, 40);
const wav2 = Buffer.concat([dummyHeader2, pcm2]);

const concatenatedWav = concatWavBuffers([wav1, wav2]);
assert(concatenatedWav !== null, "Concatenates WAV buffers without error");
assert(concatenatedWav.length === 44 + 100 + 150, "Combined WAV length is exact (44-byte header + data1 + data2)");
assert(concatenatedWav.readUInt32LE(40) === 250, "Updated data subchunk length is exactly 250 bytes");
assert(concatenatedWav.readUInt32LE(4) === 36 + 250, "Updated RIFF size is exactly 286 bytes");

// -----------------------------------------------------------------
// TEST D: LANGUAGE & CODE SWITCHING DETECTION
// -----------------------------------------------------------------
console.log("\n--- TEST D: Language Detection & Code-Switching ---");

assert(detectLanguageCode("What is an array in C++?") === "en-IN", "Detects English correctly");
assert(detectLanguageCode("Recursion kaise kaam karta hai bhai?") === "hi-IN", "Detects Hinglish correctly");
assert(detectLanguageCode("क्या आप मुझे बाइनरी सर्च समझा सकते हैं?") === "hi-IN", "Detects Devanagari Hindi correctly");
assert(detectLanguageCode("ਕਿਵੇਂ ਹੋ? ਮੈਨੂੰ ਡਾਟਾ ਸਟਰਕਚਰ ਸਮਝਾਓ") === "pa-IN", "Detects Gurmukhi Punjabi correctly");
assert(detectLanguageCode("তুমি কি আমাকে স্ট্যাক বোঝাতে পারবে?") === "bn-IN", "Detects Bengali correctly");

console.log("\n=================================================");
if (allPassed) {
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
} else {
  console.error("❌ SOME TESTS FAILED.");
  process.exit(1);
}
console.log("=================================================");

