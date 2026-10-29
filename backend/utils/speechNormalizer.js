/**
 * Comprehensive Multilingual & Indic Script Speech Normalizer for Text-to-Speech Engines.
 * 
 * Transforms Romanized/transliterated Indian speech and technical English terms into
 * authentic native scripts (Hindi -> Devanagari, Punjabi -> Gurmukhi, Bengali -> Bengali script,
 * Marathi -> Devanagari) so that TTS engines (like Sarvam Bulbul v3) speak with natural,
 * native Indian pronunciation without robotic English accents or phonetic errors.
 * 
 * The student-visible UI response (displayText) is NEVER altered; only the internal spoken TTS audio
 * (speechText) uses this normalized phonetic representation.
 */

// Technical multi-word phrases mapped to phonetic Devanagari for speech
export const TECHNICAL_PHRASES_HINDI = [
  { regex: /\bbinary\s+search\s+tree\b/gi, replacement: "बाइनरी सर्च ट्री" },
  { regex: /\bbinary\s+search\b/gi, replacement: "बाइनरी सर्च" },
  { regex: /\bbinary\s+trees?\b/gi, replacement: "बाइनरी ट्री" },
  { regex: /\blinear\s+search\b/gi, replacement: "लिनियर सर्च" },
  { regex: /\bdata\s+structures?\b/gi, replacement: "डेटा स्ट्रक्चर" },
  { regex: /\bnon[\s-]linear\b/gi, replacement: "नॉन-लिनियर" },
  { regex: /\broot\s+nodes?\b/gi, replacement: "रूट नोड" },
  { regex: /\bchild\s+nodes\b/gi, replacement: "चाइल्ड नोड्स" },
  { regex: /\bchild\s+node\b/gi, replacement: "चाइल्ड नोड" },
  { regex: /\bparent\s+nodes?\b/gi, replacement: "पैरेंट नोड" },
  { regex: /\bleaf\s+nodes?\b/gi, replacement: "लीफ़ नोड" },
  { regex: /\breal\s+life\b/gi, replacement: "रियल लाइफ़" },
  { regex: /\breal\s+world\b/gi, replacement: "रियल वर्ल्ड" },
  { regex: /\breal\s+time\b/gi, replacement: "रियल टाइम" },
  { regex: /\btime\s+complexity\b/gi, replacement: "टाइम कॉम्प्लेक्सिटी" },
  { regex: /\bspace\s+complexity\b/gi, replacement: "स्पेस कॉम्प्लेक्सिटी" },
  { regex: /\blinked\s+lists?\b/gi, replacement: "लिंक्ड लिस्ट" },
  { regex: /\bsource\s+code\b/gi, replacement: "सोर्स कोड" },
  { regex: /\boperating\s+systems?\b/gi, replacement: "ऑपरेटिंग सिस्टम" },
  { regex: /\bdatabase\s+normalization\b/gi, replacement: "डेटाबेस नॉर्मलाइज़ेशन" },
  { regex: /\brelational\s+database\b/gi, replacement: "रिलेशनल डेटाबेस" },
  { regex: /\bkey[\s-]value\b/gi, replacement: "की वैल्यू" },
  { regex: /\brest\s+apis?\b/gi, replacement: "रेस्ट एपीआई" },
  { regex: /\bfront[\s-]end\b/gi, replacement: "फ़्रंटएंड" },
  { regex: /\bback[\s-]end\b/gi, replacement: "बैकएंड" },
  { regex: /\bfull[\s-]stack\b/gi, replacement: "फ़ुल स्टैक" },
  { regex: /\bbase\s+cases?\b/gi, replacement: "बेस केस" },
  { regex: /\boop\s+concepts?\b/gi, replacement: "ओओपी कॉन्सेप्ट" },
  { regex: /\boop\b/gi, replacement: "ओओपी" },
  { regex: /\boops\b/gi, replacement: "ओओपी" },
  { regex: /\bweb\s+development\b/gi, replacement: "वेब डेवलपमेंट" },
  { regex: /\bmachine\s+learning\b/gi, replacement: "मशीन लर्निंग" },
  { regex: /\bartificial\s+intelligence\b/gi, replacement: "आर्टिफिशियल इंटेलिजेंस" },
  { regex: /\bdeep\s+learning\b/gi, replacement: "डीप लर्निंग" },
  { regex: /\bcomputer\s+science\b/gi, replacement: "कंप्यूटर साइंस" },
  { regex: /\bapplication\s+programming\s+interface\b/gi, replacement: "एप्लीकेशन प्रोग्रामिंग इंटरफ़ेस" },
  { regex: /\bmain\s+(difference|feature|concept|reason|use|point|function|class|method)\b/gi, replacement: "मेन $1" },
  { regex: /\bstep\s+by\s+step\b/gi, replacement: "स्टेप बाय स्टेप" },
  { regex: /\bby\s+default\b/gi, replacement: "बाय डिफ़ॉल्ट" },
  { regex: /\bday\s+to\s+day\b/gi, replacement: "डे टू डे" },
  { regex: /\bone\s+by\s+one\b/gi, replacement: "वन बाय वन" },
  { regex: /\bline\s+by\s+line\b/gi, replacement: "लाइन बाय लाइन" },
  { regex: /\bdhyan\s+se\b/gi, replacement: "ध्यान से" },
  { regex: /\baa\s+gaya\b/gi, replacement: "आ गया" },
  { regex: /\baa\s+gayi\b/gi, replacement: "आ गई" },
  { regex: /\baa\s+gaye\b/gi, replacement: "आ गए" },
  { regex: /\bke\s+baare\s+mein\b/gi, replacement: "के बारे में" },
  { regex: /\bke\s+bare\s+mein\b/gi, replacement: "के बारे में" },
  { regex: /\bke\s+liye\b/gi, replacement: "के लिए" },
  { regex: /\bke\s+saath\b/gi, replacement: "के साथ" },
  { regex: /\bke\s+baad\b/gi, replacement: "के बाद" },
  { regex: /\bke\s+pehle\b/gi, replacement: "के पहले" },
  { regex: /\bke\s+bina\b/gi, replacement: "के बिना" },
];

// Single technical words mapped to phonetic Devanagari
export const TECHNICAL_WORDS_HINDI = {
  tree: "ट्री",
  trees: "ट्रीज़",
  bst: "बीएसटी",
  node: "नोड",
  nodes: "नोड्स",
  data: "डेटा",
  structure: "स्ट्रक्चर",
  structures: "स्ट्रक्चर्स",
  database: "डेटाबेस",
  databases: "डेटाबेस",
  api: "एपीआई",
  apis: "एपीआई",
  programming: "प्रोग्रामिंग",
  program: "प्रोग्राम",
  programs: "प्रोग्राम्स",
  stack: "स्टैक",
  stacks: "स्टैक्स",
  queue: "क्यू",
  queues: "क्यूज़",
  array: "एरे",
  arrays: "एरेज़",
  string: "स्ट्रिंग",
  strings: "स्ट्रिंग्स",
  integer: "इंटीजर",
  integers: "इंटीजर्स",
  boolean: "बूलियन",
  pointer: "पॉइंटर",
  pointers: "पॉइंटर्स",
  graph: "ग्राफ़",
  graphs: "ग्राफ़्स",
  algorithm: "एल्गोरिदम",
  algorithms: "एल्गोरिदम्स",
  complexity: "कॉम्प्लेक्सिटी",
  inheritance: "इनहेरिटेंस",
  polymorphism: "पॉलीमॉर्फिज़्म",
  abstraction: "एब्स्ट्रैक्शन",
  encapsulation: "एन्कैप्सुलेशन",
  class: "क्लास",
  classes: "क्लासेस",
  object: "ऑब्जेक्ट",
  objects: "ऑब्जेक्ट्स",
  function: "फ़ंक्शन",
  functions: "फ़ंक्शंस",
  method: "मेथड",
  methods: "मेथड्स",
  variable: "वेरिएबल",
  variables: "वेरिएबल्स",
  constant: "कॉन्स्टेंट",
  constants: "कॉन्स्टेंट्स",
  loop: "लूप",
  loops: "लूप्स",
  recursion: "रिकर्शन",
  recursive: "रिकर्सिव",
  iteration: "इटरेशन",
  sql: "एसक्यूएल",
  nosql: "नोएसक्यूएल",
  difference: "डिफ़रेंस",
  example: "एग्ज़ाम्पल",
  examples: "एग्ज़ाम्पल्स",
  lifo: "लिफ़ो",
  fifo: "फ़िफ़ो",
  memory: "मेमोरी",
  server: "सर्वर",
  servers: "सर्वर",
  client: "क्लाइंट",
  clients: "क्लाइंट्स",
  frontend: "फ़्रंटएंड",
  backend: "बैकएंड",
  fullstack: "फ़ुल स्टैक",
  react: "रिएक्ट",
  express: "एक्सप्रेस",
  mongodb: "मोंगोडीबी",
  python: "पायथन",
  java: "जावा",
  javascript: "जावास्क्रिप्ट",
  typescript: "टाइपस्क्रिप्ट",
  html: "एचटीएमएल",
  css: "सीएसएस",
  json: "जेसन",
  xml: "एक्सएमएल",
  compiler: "कंपाइलर",
  interpreter: "इंटरप्रेटर",
  debug: "डीबग",
  debugging: "डीबगिंग",
  code: "कोड",
  coding: "कोडिंग",
  test: "टेस्ट",
  testing: "टेस्टिंग",
  table: "टेबल",
  tables: "टेबल्स",
  schema: "स्कीमा",
  index: "इंडेक्स",
  indexes: "इंडेक्सेस",
  query: "क्वेरी",
  queries: "क्वेरीज़",
  git: "गिट",
  github: "गिटहब",
  component: "कंपोनेंट",
  components: "कंपोनेंट्स",
  hook: "हुक",
  hooks: "हुक्स",
  state: "स्टेट",
  props: "प्रॉप्स",
  usestate: "यूज़स्टेट",
  useeffect: "यूज़इफ़ेक्ट",
  concept: "कॉन्सेप्ट",
  concepts: "कॉन्सेप्ट्स",
  linear: "लिनियर",
  nonlinear: "नॉन-लिनियर",
  organize: "ऑर्गनाइज़",
  organizes: "ऑर्गनाइज़",
  multiple: "मल्टीपल",
  element: "एलिमेंट",
  elements: "एलिमेंट्स",
  order: "ऑर्डर",
  value: "वैल्यू",
  values: "वैल्यूज़",
  key: "की",
  keys: "कीज़",
  left: "लेफ़्ट",
  right: "राइट",
  child: "चाइल्ड",
  parent: "पैरेंट",
  root: "रूट",
  leaf: "लीफ़",
  height: "हाइट",
  depth: "डेप्थ",
  level: "लेवल",
  edge: "एज",
  edges: "एजेस",
  vertex: "वर्टेक्स",
  vertices: "वर्टिसेस",
  push: "पुश",
  pop: "पॉप",
  peek: "पीक",
  enqueue: "एनक्यू",
  dequeue: "डीक्यू",
  binary: "बाइनरी",
  sort: "सॉर्ट",
  sorting: "सॉर्टिंग",
  search: "सर्च",
  searching: "सर्चिंग",
  bubble: "बबल",
  merge: "मर्ज",
  quick: "क्विक",
  heap: "हीप",
  hash: "हैश",
  hashing: "हैशिंग",
  map: "मैप",
  set: "सेट",
  vector: "वेक्टर",
  list: "लिस्ट",
  tuple: "टपल",
  dictionary: "डिक्शनरी",
  branch: "ब्रांच",
  commit: "कमिट",
  repository: "रिपॉजिटरी",
  repo: "रेपो",
  terminal: "टर्मिनल",
  command: "कमांड",
  syntax: "सिंटैक्स",
  statement: "स्टेटमेंट",
  statements: "स्टेटमेंट्स",
  block: "ब्लॉक",
  scope: "स्कोप",
  closure: "क्लोज़र",
  thread: "थ्रेड",
  threads: "थ्रेड्स",
  process: "प्रोसेस",
  processes: "प्रोसेसेस",
  asynchronous: "एसिंक्रोनस",
  async: "असिंक",
  synchronous: "सिंक्रोनस",
  await: "अवेट",
  promise: "प्रॉमिस",
  promises: "प्रॉमिसेस",
  callback: "कॉलबैक",
  event: "इवेंट",
  events: "इवेंट्स",
  request: "रिक्वेस्ट",
  requests: "रिक्वेस्ट्स",
  response: "रिस्पॉन्स",
  responses: "रिस्पॉन्सेस",
  header: "हेडर",
  headers: "हेडर्स",
  body: "बॉडी",
  status: "स्टेटस",
  error: "एरर",
  errors: "एरर्स",
  exception: "एक्सेप्शन",
  exceptions: "एक्सेप्शन्स",
  warning: "वार्निंग",
  null: "नल",
  undefined: "अनडिफ़ाइन्ड",
  public: "पब्लिक",
  private: "प्राइवेट",
  protected: "प्रोटेक्टेड",
  static: "स्टैटिक",
  dynamic: "डायनामिक",
  package: "पैकेज",
  packages: "पैकेजेस",
  module: "मॉड्यूल",
  modules: "मॉड्यूल्स",
  import: "इम्पोर्ट",
  export: "एक्सपोर्ट",
  return: "रिटर्न",
  case: "केस",
  switch: "स्विच",
  break: "ब्रेक",
  type: "टाइप",
  types: "टाइप्स",
  network: "नेटवर्क",
  protocol: "प्रोटोकॉल",
  http: "एचटीटीपी",
  https: "एचटीटीपीएस",
  tcp: "टीसीपी",
  ip: "आईपी",
  dns: "डीएनएस",
  port: "पोर्ट",
  viva: "वाइवा",
  semester: "सेमेस्टर",
  exam: "एग्ज़ाम",
  interview: "इंटरव्यू",
  assignment: "असाइनमेंट",
  project: "प्रोजेक्ट",
  question: "क्वेश्चन",
  questions: "क्वेश्चन्स",
  answer: "आंसर",
  answers: "आंसर्स",
  solution: "सॉल्यूशन",
  explanation: "एक्स्प्लेनेशन",
  detail: "डिटेल",
  simple: "सिंपल",
  easy: "ईज़ी",
  hard: "हार्ड",
  form: "फ़ॉर्म",
  use: "यूज़",
  uses: "यूज़ेस",
  used: "यूज़्ड",
  using: "यूज़िंग",
  manage: "मैनेज",
  manages: "मैनेज",
  software: "सॉफ्टवेयर",
  application: "एप्लिकेशन",
  applications: "एप्लिकेशन्स",
  interface: "इंटरफ़ेस",
  communication: "कम्युनिकेशन",
  exchange: "एक्सचेंज",
  principle: "प्रिंसिपल",
  principles: "प्रिंसिपल्स",
  define: "डिफ़ाइन",
  defined: "डिफ़ाइन्ड",
  preparation: "प्रिपरेशन",
  private: "प्राइवेट",
  public: "पब्लिक",
  getter: "गेटर",
  getters: "गेटर्स",
  setter: "सेटर",
  setters: "सेटर्स",
  create: "क्रिएट",
  creates: "क्रिएट्स",
  created: "क्रिएटेड",
  creating: "क्रिएटिंग",
  optimize: "ऑप्टिमाइज़",
  optimizes: "ऑप्टिमाइज़",
  optimized: "ऑप्टिमाइज़्ड",
  optimizing: "ऑप्टिमाइज़िंग",
  encapsulate: "एन्कैप्सुलेट",
  encapsulates: "एन्कैप्सुलेट",
  encapsulating: "एन्कैप्सुलेटिंग",
  kitchen: "किचन",
  plates: "प्लेट्स",
  plate: "प्लेट",
  cafeteria: "कैफ़ेटेरिया",
  counter: "काउंटर",
  line: "लाइन",
  ticket: "टिकट",
  insertion: "इन्सर्शन",
  deletion: "डिलीशन",
  follow: "फ़ॉलो",
  follows: "फ़ॉलो",
  movie: "मूवी",
};

// Common Hinglish phrases mapped to Devanagari
export const HINGLISH_PHRASES = [
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
  { regex: /\bdetail\s+mein\b/gi, replacement: "डिटेल में" },
  { regex: /\bhota\s+hai\b/gi, replacement: "होता है" },
  { regex: /\bhoti\s+hai\b/gi, replacement: "होती है" },
  { regex: /\bhote\s+hain\b/gi, replacement: "होते हैं" },
  { regex: /\baaj\s+hum\b/gi, replacement: "आज हम" },
  { regex: /\baaj\s+ham\b/gi, replacement: "आज हम" },
];

// Single Romanized Hindi words dictionary mapped to Devanagari
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
  is: "इस",
  iska: "इसका",
  iski: "इसकी",
  iske: "इसके",
  uska: "उसका",
  uski: "उसकी",
  uske: "उसके",
  jiska: "जिसका",
  jiski: "जिसकी",
  jiske: "जिसके",
  jisme: "जिसमें",
  jismein: "जिसमें",
  isme: "इसमें",
  ismein: "इसमें",
  usme: "उसमें",
  usmein: "उसमें",
  ise: "इसे",
  usse: "उसे",
  usey: "उसे",
  inhe: "इन्हें",
  unhe: "उन्हें",
  inka: "इनका",
  unka: "उनका",
  inme: "इनमें",
  unme: "उनमें",
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
  honge: "होंगे",
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
  karke: "करके",
  karkar: "करके",
  kiya: "किया",
  kiye: "किए",
  kijiye: "कीजिए",
  hua: "हुआ",
  hue: "हुए",
  huye: "हुए",
  wala: "वाला",
  wali: "वाली",
  wale: "वाले",
  diya: "दिया",
  diye: "दिए",
  liya: "लिया",
  liye: "लिए",
  yaani: "यानी",
  yani: "यानी",
  beech: "बीच",
  karwane: "करवाने",
  chhota: "छोटा",
  chhoti: "छोटी",
  chote: "छोटे",
  bada: "बड़ा",
  badi: "बड़ी",
  bade: "बड़े",
  dono: "दोनों",
  jaise: "जैसे",
  sabse: "सबसे",
  upar: "ऊपर",
  rakhi: "रखी",
  rakha: "रखा",
  rakhe: "रखे",
  nikalti: "निकलती",
  nikalta: "निकलता",
  nikalte: "निकलते",
  chahta: "चाहता",
  chahti: "चाहती",
  chahte: "चाहते",
  chaho: "चाहो",
  chahunga: "चाहूँगा",
  chahungi: "चाहूँगी",
  chahiye: "चाहिए",
  samajh: "समझ",
  samjho: "समझो",
  samjhe: "समझें",
  samjhenge: "समझेंगे",
  samjhao: "समझाओ",
  samjhaiye: "समझाइए",
  samajhta: "समझता",
  samajhti: "समझती",
  samajhte: "समझते",
  samjhata: "समझाता",
  samjhati: "समझती",
  samjhate: "समझते",
  samajhna: "समझना",
  samajhne: "समझने",
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
  chal: "चल",
  chala: "चला",
  chali: "चली",
  chale: "चले",
  aao: "आओ",
  aaye: "आए",
  aate: "आते",
  aana: "आना",
  jao: "जाओ",
  jaye: "जाएं",
  jata: "जाता",
  jati: "जाती",
  jate: "जाते",
  jaata: "जाता",
  jaati: "जाती",
  jaate: "जाते",
  jaana: "जाना",
  raha: "रहा",
  rahi: "रही",
  rahe: "रहे",
  sakta: "सकता",
  sakti: "सकती",
  sakte: "सकते",
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
  me: "में",
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
  kaisa: "कैसा",
  kaisi: "कैसी",
  jabki: "जबकि",
  andar: "अंदर",
  baahar: "बाहर",
  banata: "बनाता",
  banati: "बनाती",
  banate: "बनाते",
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
  zaruri: "ज़रूरी",
  zaroori: "ज़रूरी",
  kaam: "काम",
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

// Technical words mapped to Gurmukhi for Punjabi speech
export const TECHNICAL_WORDS_PUNJABI = {
  inheritance: "ਇਨਹੈਰੀਟੈਂਸ",
  polymorphism: "ਪੋਲੀਮੌਰਫਿਜ਼ਮ",
  abstraction: "ਐਬਸਟਰੈਕਸ਼ਨ",
  encapsulation: "ਇਨਕੈਪਸੂਲੇਸ਼ਨ",
  data: "ਡਾਟਾ",
  structure: "ਸਟਰੱਕਚਰ",
  structures: "ਸਟਰੱਕਚਰ",
  algorithm: "ਐਲਗੋਰਿਦਮ",
  algorithms: "ਐਲਗੋਰਿਦਮ",
  database: "ਡਾਟਾਬੇਸ",
  api: "ਏਪੀਆਈ",
  tree: "ਟ੍ਰੀ",
  stack: "ਸਟੈਕ",
  queue: "ਕਤਾਰ",
  array: "ਐਰੇ",
  difference: "ਅੰਤਰ",
  example: "ਉਦਾਹਰਨ",
  class: "ਕਲਾਸ",
  object: "ਆਬਜੈਕਟ",
  function: "ਫੰਕਸ਼ਨ",
  programming: "ਪ੍ਰੋਗਰਾਮਿੰਗ",
  loop: "ਲੂਪ",
  code: "ਕੋਡ",
  coding: "ਕੋਡਿੰਗ"
};

// Punjabi multi-word phrases mapped to Gurmukhi script
export const PUNJABI_PHRASES = [
  { regex: /\bsat\s+sri\s+akal\b/gi, replacement: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ" },
  { regex: /\bsat\s+shri\s+akal\b/gi, replacement: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ" },
  { regex: /\bki\s+haal\s+hai\b/gi, replacement: "ਕੀ ਹਾਲ ਹੈ" },
  { regex: /\bki\s+hunda\s+hai\b/gi, replacement: "ਕੀ ਹੁੰਦਾ ਹੈ" },
  { regex: /\bki\s+hundi\s+hai\b/gi, replacement: "ਕੀ ਹੁੰਦੀ ਹੈ" },
  { regex: /\bki\s+hunde\s+han\b/gi, replacement: "ਕੀ ਹੁੰਦੇ ਹਨ" },
  { regex: /\bmadad\s+kar\s+sakda\s+haan\b/gi, replacement: "ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ" },
  { regex: /\bmadad\s+kar\s+sakdi\s+haan\b/gi, replacement: "ਮਦਦ ਕਰ ਸਕਦੀ ਹਾਂ" },
  { regex: /\bmadad\s+kar\s+sakde\s+haan\b/gi, replacement: "ਮਦਦ ਕਰ ਸਕਦੇ ਹਾਂ" },
  { regex: /\bstep\s+by\s+step\b/gi, replacement: "ਸਟੈਪ ਬਾਏ ਸਟੈਪ" },
  { regex: /\bline\s+by\s+line\b/gi, replacement: "ਲਾਈਨ ਬਾਏ ਲਾਈਨ" },
  { regex: /\brabb\s+rakha\b/gi, replacement: "ਰੱਬ ਰਾਖਾ" },
  { regex: /\bdata\s+structures?\b/gi, replacement: "ਡਾਟਾ ਸਟਰੱਕਚਰ" },
  { regex: /\breal\s+life\b/gi, replacement: "ਅਸਲ ਜ਼ਿੰਦਗੀ" },
];

// Single Romanized Punjabi words mapped to Gurmukhi script
export const PUNJABI_WORDS = {
  tusi: "ਤੁਸੀਂ",
  tussi: "ਤੁਸੀਂ",
  tuhanu: "ਤੁਹਾਨੂੰ",
  tuhada: "ਤੁਹਾਡਾ",
  tuhadi: "ਤੁਹਾਡੀ",
  tuhade: "ਤੁਹਾਡੇ",
  main: "ਮੈਂ",
  mai: "ਮੈਂ",
  mainu: "ਮੈਨੂੰ",
  mera: "ਮੇਰਾ",
  meri: "ਮੇਰੀ",
  mere: "ਮੇਰੇ",
  sanu: "ਸਾਨੂੰ",
  saada: "ਸਾਡਾ",
  saadi: "ਸਾਡੀ",
  saade: "ਸਾਡੇ",
  asi: "ਅਸੀਂ",
  assi: "ਅਸੀਂ",
  kiven: "ਕਿਵੇਂ",
  kive: "ਕਿਵੇਂ",
  kiwe: "ਕਿਵੇਂ",
  kiddan: "ਕਿੱਦਾਂ",
  kidda: "ਕਿੱਦਾਂ",
  ho: "ਹੋ",
  haan: "ਹਾਂ",
  han: "ਹਾਂ",
  hai: "ਹੈ",
  hain: "ਹਨ",
  si: "ਸੀ",
  san: "ਸਨ",
  madad: "ਮਦਦ",
  sahayata: "ਸਹਾਇਤਾ",
  kar: "ਕਰ",
  sakda: "ਸਕਦਾ",
  sakdi: "ਸਕਦੀ",
  sakde: "ਸਕਦੇ",
  karda: "ਕਰਦਾ",
  kardi: "ਕਰਦੀ",
  karde: "ਕਰਦੇ",
  karna: "ਕਰਨਾ",
  karo: "ਕਰੋ",
  hunda: "ਹੁੰਦਾ",
  hundi: "ਹੁੰਦੀ",
  hunde: "ਹੁੰਦੇ",
  hove: "ਹੋਵੇ",
  ajj: "ਅੱਜ",
  aj: "ਅੱਜ",
  kal: "ਕੱਲ੍ਹ",
  ethe: "ਇੱਥੇ",
  othe: "ਉੱਥੇ",
  changa: "ਚੰਗਾ",
  changi: "ਚੰਗੀ",
  change: "ਚੰਗੇ",
  vadiya: "ਵਧੀਆ",
  vadia: "ਵਧੀਆ",
  sohna: "ਸੋਹਣਾ",
  sohni: "ਸੋਹਣੀ",
  ki: "ਕੀ",
  kyun: "ਕਿਉਂ",
  kadon: "ਕਦੋਂ",
  kithe: "ਕਿੱਥੇ",
  kihda: "ਕਿਹਦਾ",
  daso: "ਦੱਸੋ",
  dasso: "ਦੱਸੋ",
  pucho: "ਪੁੱਛੋ",
  shuru: "ਸ਼ੁਰੂ",
  zaroor: "ਜ਼ਰੂਰ",
  taan: "ਤਾਂ",
  koi: "ਕੋਈ",
  vi: "ਵੀ",
  doubt: "ਡਾਊਟ",
  padhna: "ਪੜ੍ਹਨਾ",
  parhna: "ਪੜ੍ਹਨਾ",
  samajh: "ਸਮਝ",
  samjho: "ਸਮਝੋ",
  dhanwad: "ਧੰਨਵਾਦ",
  dhanyawad: "ਧੰਨਵਾਦ",
  shukriya: "ਸ਼ੁਕਰੀਆ",
  rabb: "ਰੱਬ",
  rakha: "ਰਾਖਾ",
  haanji: "ਹਾਂਜੀ",
  aaho: "ਆਹੋ",
  te: "ਤੇ",
  vich: "ਵਿੱਚ",
  lai: "ਲਈ",
  naal: "ਨਾਲ",
  to: "ਤੋਂ",
  ton: "ਤੋਂ",
  da: "ਦਾ",
  di: "ਦੀ",
  de: "ਦੇ",
  nahi: "ਨਹੀਂ",
  nahin: "ਨਹੀਂ",
  ni: "ਨਹੀਂ",
  chahida: "ਚਾਹੀਦਾ",
  chahidi: "ਚਾਹੀਦੀ",
  chahide: "ਚਾਹੀਦੇ",
  ik: "ਇੱਕ",
  do: "ਦੋ",
  tin: "ਤਿੰਨ",
  char: "ਚਾਰ",
  panj: "ਪੰਜ",
};

// Bengali multi-word phrases mapped to Bengali script
export const BENGALI_PHRASES = [
  { regex: /\bstep\s+by\s+step\b/gi, replacement: "স্টেপ বাই স্টেপ" },
  { regex: /\bsahajyo\s+korte\s+pari\b/gi, replacement: "সাহায্য করতে পারি" },
  { regex: /\bsahajyo\s+korte\s+parbo\b/gi, replacement: "সাহায্য করতে পারবো" },
  { regex: /\bkemon\s+aacho\b/gi, replacement: "কেমন আছো" },
  { regex: /\bkemon\s+achen\b/gi, replacement: "কেমন আছেন" },
];

// Single Romanized Bengali words mapped to Bengali script
export const BENGALI_WORDS = {
  tumi: "তুমি",
  apni: "আপনি",
  aami: "আমি",
  ami: "আমি",
  amra: "আমরা",
  amake: "আমাকে",
  amar: "আমার",
  tomar: "তোমার",
  apnar: "আপনার",
  tomake: "তোমাকে",
  kemon: "কেমন",
  aacho: "আছো",
  acho: "আছো",
  aachen: "আছেন",
  achen: "আছেন",
  aachi: "আছি",
  achi: "আছি",
  bhalo: "ভালো",
  sahajyo: "সাহায্য",
  korte: "করতে",
  kori: "করি",
  korbo: "করবো",
  pari: "পারি",
  parbo: "পারবো",
  ki: "কী",
  keno: "কেন",
  kothay: "কোথায়",
  kokhon: "কখন",
  kivabe: "কীভাবে",
  dhonnobad: "ধন্যবাদ",
  shob: "সব",
  shikhbo: "শিখবো",
  porashona: "পড়াশোনা",
  bujhte: "বুঝতে",
  hobe: "হবে",
  hoy: "হয়",
  na: "না",
  ebong: "এবং",
  ba: "বা",
  ek: "এক",
  dui: "দুই",
  tin: "তিন",
  char: "চার",
  paanch: "পাঁচ",
};

// Marathi multi-word phrases mapped to Devanagari script
export const MARATHI_PHRASES = [
  { regex: /\bstep\s+by\s+step\b/gi, replacement: "स्टेप बाय स्टेप" },
  { regex: /\bmadat\s+karu\s+shakto\b/gi, replacement: "मदत करू शकतो" },
  { regex: /\bmadat\s+karu\s+shakte\b/gi, replacement: "मदत करू शकते" },
  { regex: /\bkase\s+aahat\b/gi, replacement: "कसे आहात" },
  { regex: /\bkasa\s+aahes\b/gi, replacement: "कसा आहेस" },
];

// Single Romanized Marathi words mapped to Marathi Devanagari script
export const MARATHI_WORDS = {
  tumhi: "तुम्ही",
  me: "मी",
  mi: "मी",
  amhi: "आम्ही",
  aapan: "आपण",
  tumhala: "तुम्हाला",
  mala: "मला",
  mazhe: "माझे",
  tumche: "तुमचे",
  kase: "कसे",
  kasa: "कसा",
  kashi: "कशी",
  aahat: "आहात",
  aahe: "आहे",
  aahet: "आहेत",
  ahes: "आहेस",
  hote: "होते",
  hoti: "होती",
  madat: "मदत",
  karu: "करू",
  shakto: "शकतो",
  shakte: "शकते",
  shaktat: "शकतात",
  karto: "करतो",
  karte: "करते",
  karave: "करावे",
  kara: "करा",
  kay: "काय",
  kashala: "कशाला",
  kuthe: "कुठे",
  kevha: "केव्हा",
  kiti: "किती",
  dhanyawad: "धन्यवाद",
  namaskar: "नमस्कार",
  abhyas: "अभ्यास",
  samajla: "समजले",
  samjun: "समझून",
  ghya: "घ्या",
  nahi: "नाही",
  ani: "आणि",
  pan: "पण",
  ek: "एक",
  don: "दोन",
  teen: "तीन",
  char: "चार",
  paach: "पाच",
};

// Reserved English technical terms that MUST remain in English Latin script when in pure English mode
export const ENGLISH_TECHNICAL_PRESERVE = new Set([
  "java", "python", "c", "c++", "cpp", "csharp", "javascript", "typescript", "js", "ts",
  "react", "angular", "vue", "nextjs", "node", "nodejs", "express", "fastify", "django",
  "flask", "spring", "springboot", "html", "css", "tailwind", "sql", "nosql", "mongodb",
  "postgres", "postgresql", "mysql", "sqlite", "redis", "api", "apis", "rest", "restful",
  "graphql", "json", "xml", "dom", "props", "state", "usestate", "useeffect", "usememo",
  "usecallback", "hook", "hooks", "component", "components", "jsx", "tsx", "class", "classes",
  "object", "objects", "oop", "oops", "inheritance", "polymorphism", "abstraction", "encapsulation",
  "interface", "interfaces", "function", "functions", "method", "methods", "variable", "variables",
  "constant", "constants", "loop", "loops", "for", "while", "if", "else", "switch", "case",
  "break", "return", "array", "arrays", "string", "strings", "integer", "boolean", "float",
  "double", "pointer", "pointers", "reference", "stack", "stacks", "queue", "queues", "dequeue",
  "tree", "trees", "binary", "bst", "heap", "graph", "graphs", "node", "vertices", "vertex",
  "edge", "edges", "bfs", "dfs", "algorithm", "algorithms", "dsa", "complexity", "time", "space",
  "auxiliary", "big", "linear", "constant", "logarithmic", "quadratic", "git", "github", "gitlab",
  "commit", "push", "pull", "merge", "branch", "branching", "clone", "repo", "repository",
  "compiler", "interpreter", "runtime", "compile", "debug", "debugging", "debugger", "bug", "bugs",
  "test", "testing", "framework", "library", "libraries", "package", "packages", "npm", "pip",
  "maven", "module", "modules", "server", "servers", "client", "clients", "backend", "frontend",
  "fullstack", "database", "databases", "query", "queries", "table", "tables", "schema", "schemas",
  "key", "keys", "foreign", "primary", "index", "indexing", "transaction", "acid", "network",
  "http", "https", "tcp", "ip", "udp", "request", "requests", "response", "responses", "header",
  "headers", "payload", "status", "syntax", "statement", "statements", "expression", "expressions",
  "scope", "closure", "closures", "async", "await", "promise", "promises", "callback", "callbacks",
  "event", "events", "listener", "thread", "threads", "threading", "concurrency", "process",
  "processes", "memory", "allocation", "garbage", "collection", "collector", "leetcode", "viva",
  "semester", "exam", "assignment", "project", "projects", "code", "coding", "use", "uses",
  "used", "using", "hide", "details", "implementation", "design", "pattern", "patterns",
  "singleton", "factory", "the", "to", "do", "an", "is", "of", "and", "in", "on", "it"
]);

// Distinct Hindi/Hinglish vocabulary (excluding English homographs like to, do, the, me)
const DISTINCT_HINGLISH_WORDS = new Set([
  "aap", "aapka", "aapki", "aapke", "aapko", "tum", "tumhara", "tumhari", "tumhare", "tumhe", "tumko",
  "mujhe", "mujhko", "mera", "meri", "mere", "humara", "humari", "humare", "humein", "humko",
  "kaise", "kyun", "kyon", "kahan", "kaha", "kitna", "kitni", "kitne", "kaun", "kiska", "kiski",
  "karna", "karo", "kare", "karein", "karte", "karta", "karti", "karke", "karkar", "kiya", "kiye", "kijiye",
  "chahta", "chahti", "chahte", "chaho", "chahiye",
  "hai", "hain", "hoga", "hogi", "honge", "hota", "hoti", "hote", "hona", "hone", "hoon", "hu",
  "nahi", "nahin", "nhi", "mat",
  "samajh", "samjho", "samjhe", "samajhna", "samjhata", "samjhati", "samjhate", "samjhenge",
  "samjhao", "samjhaiye",
  "seekho", "seekhna", "seekhein", "padho", "padhna", "padhai", "padhaai",
  "dekho", "bolo", "batao", "bataiye", "pucho", "puchiye", "chalo", "chalein", "aao", "jao",
  "accha", "achha", "acchi", "acche", "bahut", "bohot", "thoda", "thodi", "zyada", "jyada",
  "shukriya", "dhanyawad", "namaste", "dost", "bhai", "yaar",
  "lekin", "kyunki", "isliye", "aur", "pehle", "baad", "hamesha", "kabhi", "aaj", "kal", "abhi",
  "ko", "se", "mein", "me", "jisme", "isme"
]);

/**
 * Checks whether a text chunk contains prominent Hinglish/Hindi content.
 */
export const isHinglishText = (text) => {
  if (!text) return false;
  // If Devanagari script is present, it is already Hindi
  if (/[\u0900-\u097F]/.test(text)) return true;

  const words = text.toLowerCase().split(/[^a-zA-Z]+/);
  let matchCount = 0;

  for (const w of words) {
    if (!w) continue;
    if (DISTINCT_HINGLISH_WORDS.has(w)) {
      matchCount++;
    }
  }

  return matchCount >= 2;
};

// Distinct Punjabi-only words (excluding cognates shared with Hindi like main, mera, kar, etc.)
const DISTINCT_PUNJABI_WORDS = new Set([
  "tusi", "tussi", "kiven", "kive", "kiwe", "kiddan", "kidda", "tuhanu", "tuhada", "tuhadi", "tuhade",
  "mainu", "sanu", "saada", "saadi", "saade", "asi", "assi", "ethe", "othe", "changa", "changi", "change",
  "vadiya", "vadia", "sohna", "sohni", "kadon", "kithe", "kihda", "daso", "dasso", "parhna", "dhanwad",
  "aaho", "chahida", "chahidi", "chahide", "panj", "karde", "kardi", "kehnde", "satsriakal", "satsriakaal",
  "hunda", "hundi", "hunde"
]);

/**
 * Checks whether text contains transliterated Punjabi.
 */
export const isTransliteratedPunjabi = (text) => {
  if (!text) return false;
  if (/[\u0A00-\u0A7F]/.test(text)) return true; // Gurmukhi

  const words = text.toLowerCase().split(/[^a-zA-Z]+/);
  let matchCount = 0;
  for (const w of words) {
    if (!w) continue;
    if (DISTINCT_PUNJABI_WORDS.has(w)) {
      matchCount++;
    }
  }
  return matchCount >= 1;
};

/**
 * Normalizes Romanized Hindi & English technical terms into native Devanagari representation.
 */
export const normalizeHindiDevanagari = (text) => {
  let normalized = text;

  // 1. Technical multi-word phrase substitutions
  for (const { regex, replacement } of TECHNICAL_PHRASES_HINDI) {
    normalized = normalized.replace(regex, replacement);
  }

  // 2. Multi-word Hinglish phrase substitutions
  for (const { regex, replacement } of HINGLISH_PHRASES) {
    normalized = normalized.replace(regex, replacement);
  }

  // 3. Tokenize and replace technical words and Hindi grammar words
  normalized = normalized.replace(/\b([a-zA-Z]+)\b/g, (match, word) => {
    const lower = word.toLowerCase();

    // Check technical phonetic mapping first (e.g. tree -> ट्री, node -> नोड)
    if (Object.prototype.hasOwnProperty.call(TECHNICAL_WORDS_HINDI, lower)) {
      return TECHNICAL_WORDS_HINDI[lower];
    }

    // Check Romanized Hindi grammar dictionary (e.g. hai -> है, jisme -> जिसमें)
    if (Object.prototype.hasOwnProperty.call(HINGLISH_WORDS, lower)) {
      return HINGLISH_WORDS[lower];
    }

    return word;
  });

  return normalized;
};

/**
 * Normalizes Romanized Punjabi & technical terms into native Gurmukhi representation.
 */
export const normalizePunjabiGurmukhi = (text) => {
  let normalized = text;

  // 1. Multi-word phrase substitutions
  for (const { regex, replacement } of PUNJABI_PHRASES) {
    normalized = normalized.replace(regex, replacement);
  }

  // 2. Tokenize and replace Punjabi & technical words
  normalized = normalized.replace(/\b([a-zA-Z]+)\b/g, (match, word) => {
    const lower = word.toLowerCase();

    if (Object.prototype.hasOwnProperty.call(TECHNICAL_WORDS_PUNJABI, lower)) {
      return TECHNICAL_WORDS_PUNJABI[lower];
    }

    if (Object.prototype.hasOwnProperty.call(PUNJABI_WORDS, lower)) {
      return PUNJABI_WORDS[lower];
    }

    return word;
  });

  return normalized;
};

/**
 * Normalizes Romanized Bengali into native Bengali script.
 */
export const normalizeBengaliScript = (text) => {
  let normalized = text;

  for (const { regex, replacement } of BENGALI_PHRASES) {
    normalized = normalized.replace(regex, replacement);
  }

  normalized = normalized.replace(/\b([a-zA-Z]+)\b/g, (match, word) => {
    const lower = word.toLowerCase();

    if (Object.prototype.hasOwnProperty.call(BENGALI_WORDS, lower)) {
      return BENGALI_WORDS[lower];
    }

    return word;
  });

  return normalized;
};

/**
 * Normalizes Romanized Marathi into native Devanagari script.
 */
export const normalizeMarathiDevanagari = (text) => {
  let normalized = text;

  for (const { regex, replacement } of MARATHI_PHRASES) {
    normalized = normalized.replace(regex, replacement);
  }

  normalized = normalized.replace(/\b([a-zA-Z]+)\b/g, (match, word) => {
    const lower = word.toLowerCase();

    if (Object.prototype.hasOwnProperty.call(MARATHI_WORDS, lower)) {
      return MARATHI_WORDS[lower];
    }

    return word;
  });

  return normalized;
};

/**
 * Main Speech Normalizer dispatcher.
 * Selects the proper native script transformer based on the target language code,
 * ensuring high naturalness for Indian language voice models like Sarvam Bulbul.
 */
export const normalizeSpeechText = (text, detectedLang = "en-IN") => {
  if (!text || !text.trim()) return "";

  let result = text;

  if (detectedLang === "pa-IN") {
    result = normalizePunjabiGurmukhi(result);
  } else if (detectedLang === "bn-IN") {
    result = normalizeBengaliScript(result);
  } else if (detectedLang === "mr-IN") {
    result = normalizeMarathiDevanagari(result);
  } else if (detectedLang === "hi-IN") {
    result = normalizeHindiDevanagari(result);
  } else {
    // If language is en-IN or unspecified, check if it actually contains transliterated Indian language
    if (isTransliteratedPunjabi(result)) {
      result = normalizePunjabiGurmukhi(result);
    } else if (isHinglishText(result)) {
      result = normalizeHindiDevanagari(result);
    }
  }

  // Ensure sentence pauses have clean spacing around punctuation (.,;:!?।)
  result = result.replace(/\s*([,.:;!?।])\s*/g, "$1 ");
  return result.trim();
};
