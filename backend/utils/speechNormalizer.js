/**
 * Comprehensive Multilingual & Indic Script Speech Normalizer for Text-to-Speech Engines.
 * 
 * Transforms Romanized/transliterated Indian speech into authentic native scripts
 * (Hindi -> Devanagari, Punjabi -> Gurmukhi, Bengali -> Bengali script, Marathi -> Devanagari)
 * while keeping English technical terms and programming keywords strictly preserved.
 * 
 * The student-visible UI response is NEVER touched; only the internal spoken TTS audio
 * uses this normalized phonetic representation.
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
  { regex: /\bke\s+bare\s+mein\b/gi, replacement: "के बारे में" },
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
  { regex: /\b(main|mai)\s+use\b/gi, replacement: "मैं use" },
  { regex: /\b(hum|ham)\s+use\b/gi, replacement: "हम use" },
  { regex: /\b(tum|aap)\s+use\b/gi, replacement: "आप use" },
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

// Punjabi multi-word phrases mapped to Gurmukhi script
export const PUNJABI_PHRASES = [
  { regex: /\bsat\s+sri\s+akal\b/gi, replacement: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ" },
  { regex: /\bsat\s+shri\s+akal\b/gi, replacement: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ" },
  { regex: /\bki\s+haal\s+hai\b/gi, replacement: "ਕੀ ਹਾਲ ਹੈ" },
  { regex: /\bmadad\s+kar\s+sakda\s+haan\b/gi, replacement: "ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ" },
  { regex: /\bmadad\s+kar\s+sakdi\s+haan\b/gi, replacement: "ਮਦਦ ਕਰ ਸਕਦੀ ਹਾਂ" },
  { regex: /\bmadad\s+kar\s+sakde\s+haan\b/gi, replacement: "ਮਦਦ ਕਰ ਸਕਦੇ ਹਾਂ" },
  { regex: /\bstep\s+by\s+step\b/gi, replacement: "ਸਟੈਪ ਬਾਏ ਸਟੈਪ" },
  { regex: /\bline\s+by\s+line\b/gi, replacement: "ਲਾਈਨ ਬਾਏ ਲਾਈਨ" },
  { regex: /\brabb\s+rakha\b/gi, replacement: "ਰੱਬ ਰਾਖਾ" },
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

// Reserved English technical terms that MUST remain in English Latin script
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
  "seekho", "seekhna", "seekhein", "padho", "padhna", "padhai", "padhaai",
  "dekho", "bolo", "batao", "bataiye", "pucho", "puchiye", "chalo", "chalein", "aao", "jao",
  "accha", "achha", "acchi", "acche", "bahut", "bohot", "thoda", "thodi", "zyada", "jyada",
  "shukriya", "dhanyawad", "namaste", "dost", "bhai", "yaar",
  "lekin", "kyunki", "isliye", "aur", "pehle", "baad", "hamesha", "kabhi", "aaj", "kal", "abhi"
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
  "aaho", "chahida", "chahidi", "chahide", "panj", "karde", "kardi", "kehnde", "satsriakal", "satsriakaal"
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
 * Normalizes Romanized Hindi into native Devanagari representation.
 */
export const normalizeHindiDevanagari = (text) => {
  let normalized = text;

  // 1. Multi-word phrase substitutions
  for (const { regex, replacement } of HINGLISH_PHRASES) {
    normalized = normalized.replace(regex, replacement);
  }

  // 2. Tokenize and replace Hindi words while preserving technical English terms
  normalized = normalized.replace(/\b([a-zA-Z]+)\b/g, (match, word) => {
    const lower = word.toLowerCase();

    // Preserve technical vocabulary
    if (ENGLISH_TECHNICAL_PRESERVE.has(lower)) {
      return word;
    }

    if (Object.prototype.hasOwnProperty.call(HINGLISH_WORDS, lower)) {
      return HINGLISH_WORDS[lower];
    }

    return word;
  });

  return normalized;
};

/**
 * Normalizes Romanized Punjabi into native Gurmukhi representation.
 */
export const normalizePunjabiGurmukhi = (text) => {
  let normalized = text;

  // 1. Multi-word phrase substitutions
  for (const { regex, replacement } of PUNJABI_PHRASES) {
    normalized = normalized.replace(regex, replacement);
  }

  // 2. Tokenize and replace Punjabi words while preserving technical English terms
  normalized = normalized.replace(/\b([a-zA-Z]+)\b/g, (match, word) => {
    const lower = word.toLowerCase();

    if (ENGLISH_TECHNICAL_PRESERVE.has(lower)) {
      return word;
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

    if (ENGLISH_TECHNICAL_PRESERVE.has(lower)) {
      return word;
    }

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

    if (ENGLISH_TECHNICAL_PRESERVE.has(lower)) {
      return word;
    }

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
