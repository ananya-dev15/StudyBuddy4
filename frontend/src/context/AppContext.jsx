import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import API_BASE from "../services/apiBase";
import { alarmSound } from "../utils/alarmSound";

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [appState, setAppState] = useState(() => {
    const user = JSON.parse(localStorage.getItem("user")) || null;
    const cachedCoins = user?.coins !== undefined && user?.coins !== null
      ? Number(user.coins)
      : (localStorage.getItem("coins") !== null ? Number(localStorage.getItem("coins")) : 150);
    return {
      user,
      coins: cachedCoins,
      streak: Number(user?.streak ?? localStorage.getItem("streak") ?? 0),
      history: [],
      notes: JSON.parse(localStorage.getItem("userNotes")) || {},
      tags: JSON.parse(localStorage.getItem("userTags")) || {},
      videosWatched: 0,
      videosSwitched: 0,
    };
  });
  const userId = appState.user?.id || appState.user?._id;

  // --- Assignments, Hackathons, Reminders Global State ---
  const [assignments, setAssignments] = useState(() => {
    if (!userId) return [];
    const saved = localStorage.getItem(`assignments_${userId}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [hackathons, setHackathons] = useState(() => {
    if (!userId) return [];
    const saved = localStorage.getItem(`hackathons_${userId}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [reminders, setReminders] = useState(() => {
    if (!userId) return [];
    const saved = localStorage.getItem(`reminders_${userId}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [reminderTriggers, setReminderTriggers] = useState(() => {
    if (!userId) return {};
    const saved = localStorage.getItem(`reminderTriggers_${userId}`);
    return saved ? JSON.parse(saved) : {};
  });

  const [highlightedReminders, setHighlightedReminders] = useState(() => {
    if (!userId) return new Set();
    const saved = localStorage.getItem(`reminderTriggers_${userId}`);
    if (!saved) return new Set();
    const triggers = JSON.parse(saved);
    const highlighted = new Set();
    Object.keys(triggers).forEach(id => {
      if (triggers[id].early || triggers[id].final) {
        highlighted.add(id);
      }
    });
    return highlighted;
  });
  const [activeToast, setActiveToast] = useState(null);
  const [activeReminderAlert, setActiveReminderAlert] = useState(null);

  // --- Theme State (Light / Dark) ---
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("studybuddy_theme") || "dark";
  });

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    localStorage.setItem("studybuddy_theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // --- Global Chatbot State ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: "bot", text: "Hey there! I’m StudyBuddy AI 🤖, your personal study companion." },
    { sender: "bot", text: "My goal is to help you stay organized, focused, and answer any doubt while studying." },
    { sender: "bot", text: "What's on your mind? Type a question or ask by voice!" },
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeVideoContext, setActiveVideoContext] = useState(null);
  const activeRecognitionRef = useRef(null);
  const activeAudioRef = useRef(null);
  const allAudiosRef = useRef(new Set());
  const activeUtteranceRef = useRef(null);
  const currentSpeechIdRef = useRef(0);
  const isVoiceStartingRef = useRef(false);
  const lastProcessedTranscriptRef = useRef({ text: "", timestamp: 0 });
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const isVoiceListeningRef = useRef(false);
  const audioContextRef = useRef(null);
  const animationFrameRef = useRef(null);
  const currentTranscriptCallbackRef = useRef(null);

  const cleanTextForSpeech = (rawText) => {
    if (!rawText) return "";
    let clean = rawText;
    clean = clean.replace(/```[\s\S]*?```/g, " code snippet ");
    clean = clean.replace(/`([^`]+)`/g, "$1");
    clean = clean.replace(/^#+\s+/gm, "");
    clean = clean.replace(/\*\*([^*]+)\*\*/g, "$1");
    clean = clean.replace(/\*([^*]+)\*/g, "$1");
    clean = clean.replace(/__([^_]+)__/g, "$1");
    clean = clean.replace(/_([^_]+)_/g, "$1");
    clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    clean = clean.replace(/^[\s*-]+\s+/gm, "");
    
    // Remove all Emojis & Pictographs so TTS reads only text
    try {
      clean = clean.replace(/[\p{Extended_Pictographic}\p{Emoji_Component}]/gu, "");
    } catch (e) {
      clean = clean.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/gu, "");
    }

    clean = clean.replace(/\\rightarrow/g, "leads to");
    clean = clean.replace(/[\$\\]/g, "");

    return clean.replace(/\s+/g, " ").trim();
  };

  const stopSpeakingText = () => {
    // 1. Invalidate any pending TTS fetch or delayed audio play
    currentSpeechIdRef.current++;

    // 2. Stop and purge all active HTML5 Audio instances
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.src = "";
        activeAudioRef.current.currentTime = 0;
      } catch (err) {}
      activeAudioRef.current = null;
    }
    allAudiosRef.current.forEach((audioItem) => {
      try {
        audioItem.pause();
        audioItem.src = "";
        audioItem.currentTime = 0;
      } catch (e) {}
    });
    allAudiosRef.current.clear();

    // 3. Stop browser SpeechSynthesis completely
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.pause();
        window.speechSynthesis.cancel();
      } catch (err) {}
    }
    activeUtteranceRef.current = null;

    setIsSpeaking(false);
  };

  const speakWithSpeechSynthesis = (textToSpeak, langCode) => {
    if (!("speechSynthesis" in window)) {
      setIsSpeaking(false);
      return;
    }
    try {
      window.speechSynthesis.pause();
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      activeUtteranceRef.current = utterance;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        activeUtteranceRef.current = null;
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        activeUtteranceRef.current = null;
      };

      const containsHindiScript = /[\u0900-\u097F]/.test(textToSpeak);
      const isHindi = containsHindiScript || langCode === "hi-IN";
      const isPunjabi = /[\u0A00-\u0A7F]/.test(textToSpeak) || langCode === "pa-IN";
      utterance.lang = isPunjabi ? "pa-IN" : isHindi ? "hi-IN" : "en-IN";

      try {
        const voices = window.speechSynthesis.getVoices() || [];
        const femaleVoice = voices.find((v) => {
          const vName = v.name.toLowerCase();
          const matchesLang = isPunjabi
            ? v.lang.startsWith("pa") || v.lang.startsWith("hi")
            : isHindi
            ? v.lang.startsWith("hi")
            : v.lang.startsWith("en") || v.lang.startsWith("hi");
          return (
            matchesLang &&
            (vName.includes("female") ||
              vName.includes("samantha") ||
              vName.includes("lekha") ||
              vName.includes("zira") ||
              vName.includes("veena") ||
              vName.includes("kavya") ||
              vName.includes("shruti"))
          );
        });
        if (femaleVoice) utterance.voice = femaleVoice;
      } catch (_) {}

      utterance.rate = 1.0;
      utterance.pitch = 1.15;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      setIsSpeaking(false);
    }
  };

  const speakText = async (text, langCode = null) => {
    if (!text) return;
    
    // Always stop and cancel any previous speech immediately
    stopSpeakingText();

    const textToSpeak = cleanTextForSpeech(text);
    if (!textToSpeak) return;

    // Unique speech request ID to prevent race conditions & overlapping audios
    const thisSpeechId = ++currentSpeechIdRef.current;
    setIsSpeaking(true);

    // 1. Try Studio AI TTS via backend endpoint
    try {
      const res = await fetch(`${API_BASE}/api/chat/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSpeak,
          language_code: langCode,
        }),
      });

      // If speech was cancelled or a newer speech was requested while fetching, abort!
      if (currentSpeechIdRef.current !== thisSpeechId) {
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (currentSpeechIdRef.current !== thisSpeechId) return;

        if (data.success && data.audio) {
          const audio = new Audio(`data:audio/${data.format || "mp3"};base64,${data.audio}`);
          activeAudioRef.current = audio;
          allAudiosRef.current.add(audio);

          audio.onplay = () => {
            if (currentSpeechIdRef.current !== thisSpeechId) {
              audio.pause();
              audio.src = "";
              allAudiosRef.current.delete(audio);
              return;
            }
            setIsSpeaking(true);
          };
          audio.onended = () => {
            allAudiosRef.current.delete(audio);
            if (currentSpeechIdRef.current === thisSpeechId) {
              setIsSpeaking(false);
              activeAudioRef.current = null;
            }
          };
          audio.onerror = (e) => {
            allAudiosRef.current.delete(audio);
            if (currentSpeechIdRef.current === thisSpeechId) {
              speakWithSpeechSynthesis(textToSpeak, langCode);
            }
          };

          try {
            await audio.play();
            return;
          } catch (playErr) {
            console.warn("Audio autoplay blocked by browser policy, falling back:", playErr);
            speakWithSpeechSynthesis(textToSpeak, langCode);
            return;
          }
        }
      }

      // If backend TTS endpoint returned non-OK or failed on deployed host, fall back safely
      speakWithSpeechSynthesis(textToSpeak, langCode);
    } catch (ttsErr) {
      console.warn("AI TTS error, falling back to speech synthesis:", ttsErr);
      speakWithSpeechSynthesis(textToSpeak, langCode);
    }
  };

  const sendMessageToChatbot = async (text, overrideContext = null) => {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();

    stopSpeakingText();

    setChatMessages((prev) => [...prev, { sender: "user", text: cleanText }]);
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: cleanText,
          context: overrideContext || activeVideoContext,
        }),
      });

      const data = await res.json();
      const botReply = data.reply || "I couldn't process that. Please try asking again!";
      setChatMessages((prev) => [...prev, { sender: "bot", text: botReply }]);
      speakText(botReply, data.detected_language);
    } catch (err) {
      console.error("Chat error:", err);
      setChatMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Sorry, I had trouble reaching the server. Please try again!" },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const processVoiceQuestion = (transcript, overrideContext = null) => {
    if (!transcript || !transcript.trim()) return;
    const clean = transcript.trim();

    // Prevent duplicate transcript execution within 2 seconds
    const now = Date.now();
    if (
      lastProcessedTranscriptRef.current.text === clean &&
      now - lastProcessedTranscriptRef.current.timestamp < 2000
    ) {
      console.log("Duplicate voice transcript ignored:", clean);
      return;
    }
    lastProcessedTranscriptRef.current = { text: clean, timestamp: now };

    setIsChatOpen(true);
    sendMessageToChatbot(clean, overrideContext);
  };

  const stopVoiceRecognition = () => {
    isVoiceListeningRef.current = false;
    setIsVoiceListening(false);

    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== "closed") {
          audioContextRef.current.close();
        }
      } catch (e) {}
      audioContextRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn("Error stopping MediaRecorder:", err);
      }
    }

    if (activeRecognitionRef.current) {
      try {
        if (typeof activeRecognitionRef.current.abort === "function") {
          activeRecognitionRef.current.abort();
        } else if (typeof activeRecognitionRef.current.stop === "function") {
          activeRecognitionRef.current.stop();
        }
      } catch (err) {
        console.warn("Error stopping voice recognition:", err);
      }
      activeRecognitionRef.current = null;
    }
  };

  const startBrowserSpeechRecognition = (onTranscript, onError) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return null;
    }
    try {
      stopSpeakingText();
      const recognition = new SpeechRecognition();
      activeRecognitionRef.current = recognition;
      recognition.lang = "en-IN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isVoiceStartingRef.current = false;
        isVoiceListeningRef.current = true;
        setIsVoiceListening(true);
      };
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        activeRecognitionRef.current = null;
        isVoiceStartingRef.current = false;
        isVoiceListeningRef.current = false;
        setIsVoiceListening(false);
        if (transcript && transcript.trim()) {
          setIsChatOpen(true);
          const cb = currentTranscriptCallbackRef.current;
          currentTranscriptCallbackRef.current = null;
          if (cb) {
            cb(transcript.trim());
          } else if (onTranscript) {
            onTranscript(transcript.trim());
          } else {
            processVoiceQuestion(transcript.trim());
          }
        }
      };
      recognition.onerror = (err) => {
        console.warn("Browser speech recognition error:", err);
        activeRecognitionRef.current = null;
        isVoiceStartingRef.current = false;
        isVoiceListeningRef.current = false;
        setIsVoiceListening(false);
        if (onError) onError(err);
      };
      recognition.onend = () => {
        activeRecognitionRef.current = null;
        isVoiceStartingRef.current = false;
        isVoiceListeningRef.current = false;
        setIsVoiceListening(false);
      };

      recognition.start();
      return recognition;
    } catch (e) {
      console.error("Browser speech recognition failed:", e);
      activeRecognitionRef.current = null;
      isVoiceStartingRef.current = false;
      isVoiceListeningRef.current = false;
      setIsVoiceListening(false);
      if (onError) onError(e);
      return null;
    }
  };

  const startVoiceRecognition = async (onTranscript, onError) => {
    if (isVoiceListeningRef.current || (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") || activeRecognitionRef.current) {
      isVoiceStartingRef.current = false;
      stopVoiceRecognition();
      return;
    }

    stopSpeakingText();
    currentTranscriptCallbackRef.current = onTranscript || null;
    setIsChatOpen(true);

    // Prefer native SpeechRecognition (Google Chrome / Edge / Safari native engine - instant, free, unlimited, works natively in browser)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      isVoiceStartingRef.current = false;
      return startBrowserSpeechRecognition(onTranscript, onError);
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") {
      isVoiceStartingRef.current = false;
      startBrowserSpeechRecognition(onTranscript, onError);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else {
          mimeType = "";
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstart = () => {
        isVoiceStartingRef.current = false;
        isVoiceListeningRef.current = true;
        setIsVoiceListening(true);
      };

      recorder.onstop = async () => {
        isVoiceStartingRef.current = false;
        isVoiceListeningRef.current = false;
        setIsVoiceListening(false);

        if (mediaStreamRef.current) {
          try {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          } catch (e) {}
          mediaStreamRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
        if (audioBlob.size < 200) {
          console.log("Audio recording too short, skipping transcription.");
          return;
        }

        // Send recorded audio to Sarvam Saaras STT (Multilingual)
        try {
          const formData = new FormData();
          formData.append("file", audioBlob, `recording.${mimeType.includes("mp4") ? "mp4" : "webm"}`);

          const res = await fetch(`${API_BASE}/api/chat/stt`, {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.transcript && data.transcript.trim()) {
              const cb = currentTranscriptCallbackRef.current;
              currentTranscriptCallbackRef.current = null;
              if (cb) {
                cb(data.transcript.trim(), data.language_code);
              } else {
                processVoiceQuestion(data.transcript.trim());
              }
              return;
            }
          } else {
            console.warn("Sarvam STT server response:", res.status);
          }
        } catch (sttErr) {
          console.error("Sarvam STT network error:", sttErr);
          if (onError) onError(sttErr);
        }
      };

      recorder.start(250);
      isVoiceStartingRef.current = false;
      isVoiceListeningRef.current = true;
      setIsVoiceListening(true);

      // Web Audio API Silence & Voice Activity Detection (Auto-stop when speaker finishes)
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          let hasSpoken = false;
          let silenceStart = null;

          const detectSilence = () => {
            if (!isVoiceListeningRef.current) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;

            if (avg > 10) {
              hasSpoken = true;
              silenceStart = null;
            } else if (hasSpoken) {
              if (!silenceStart) {
                silenceStart = Date.now();
              } else if (Date.now() - silenceStart > 1600) {
                // User spoke and then paused for 1.6s -> auto-finish and transcribe!
                stopVoiceRecognition();
                return;
              }
            }
            animationFrameRef.current = requestAnimationFrame(detectSilence);
          };

          animationFrameRef.current = requestAnimationFrame(detectSilence);
        }
      } catch (vadErr) {
        console.warn("VAD init note:", vadErr);
      }

      // Max timeout: auto-stop after 12 seconds
      recordingTimerRef.current = setTimeout(() => {
        if (isVoiceListeningRef.current) {
          stopVoiceRecognition();
        }
      }, 12000);
    } catch (err) {
      isVoiceStartingRef.current = false;
      console.warn("Microphone access error:", err);
      isVoiceListeningRef.current = false;
      setIsVoiceListening(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        alert("Microphone permission was denied. Please allow microphone access in your browser settings to ask voice doubts.");
      } else {
        startBrowserSpeechRecognition(onTranscript, onError);
      }
      if (onError) onError(err);
    }
  };

  const toggleVoiceRecognition = (onTranscript, onError) => {
    if (isVoiceStartingRef.current) {
      return;
    }
    if (isVoiceListeningRef.current || (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") || activeRecognitionRef.current) {
      stopVoiceRecognition();
    } else {
      isVoiceStartingRef.current = true;
      setIsChatOpen(true);
      startVoiceRecognition(onTranscript, onError);
    }
  };

  // 🎙️ Global Hotkey: Press standalone 'V' to toggle voice recognition on/off
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore key repeats when holding the key down
      if (e.repeat) return;

      // DO NOT trigger if any modifier key (Ctrl, Cmd/Meta, Alt) is pressed!
      // This ensures Ctrl+V (paste) or Cmd+V (paste) works normally everywhere!
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const activeTag = document.activeElement?.tagName;
      const isEditable = document.activeElement?.isContentEditable;

      // If user is focused on any input, textarea, select or editable element, type normally
      if (["INPUT", "TEXTAREA", "SELECT"].includes(activeTag) || isEditable) return;

      // ONLY standalone 'v' or 'V' key press:
      if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        setIsChatOpen(true);
        toggleVoiceRecognition();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // --- Adders (Append NOT Replace) & Removers ---
  const addAssignment = (newAssignment) => {
    if (!userId) return;
    setAssignments((prev) => {
      const updated = [...prev, newAssignment];
      localStorage.setItem(`assignments_${userId}`, JSON.stringify(updated));
      return updated;
    });
  };

  const removeAssignment = (id) => {
    if (!userId) return;
    setAssignments((prev) => {
      const updated = (prev || []).filter((a) => (a._id || a.id) !== id);
      localStorage.setItem(`assignments_${userId}`, JSON.stringify(updated));
      return updated;
    });
  };

  const addHackathon = (newHackathon) => {
    if (!userId) return;
    setHackathons((prev) => {
      const updated = [...prev, newHackathon];
      localStorage.setItem(`hackathons_${userId}`, JSON.stringify(updated));
      return updated;
    });
  };

  const addReminder = (newReminder) => {
    if (!userId) return;
    setReminders((prev) => {
      const updated = [...prev, newReminder];
      localStorage.setItem(`reminders_${userId}`, JSON.stringify(updated));
      return updated;
    });
  };

  const removeReminder = (id) => {
    if (!userId) return;
    setReminders((prev) => {
      const updated = (prev || []).filter((r) => (r._id || r.id) !== id);
      localStorage.setItem(`reminders_${userId}`, JSON.stringify(updated));
      return updated;
    });
    // Also clean up from triggers and highlighted sets
    setReminderTriggers((prev) => {
      const updated = { ...prev };
      delete updated[id];
      localStorage.setItem(`reminderTriggers_${userId}`, JSON.stringify(updated));
      return updated;
    });
    setHighlightedReminders((prev) => {
      const updated = new Set(prev);
      updated.delete(id);
      return updated;
    });
  };

  // Keep localStorage in sync whenever assignments or reminders change
  useEffect(() => {
    if (userId) {
      localStorage.setItem(`assignments_${userId}`, JSON.stringify(assignments || []));
    }
  }, [assignments, userId]);

  useEffect(() => {
    if (userId) {
      localStorage.setItem(`reminders_${userId}`, JSON.stringify(reminders || []));
    }
  }, [reminders, userId]);

  // --- Backend Sync on App Load ---
  useEffect(() => {
    if (!userId) {
      setAssignments([]);
      setHackathons([]);
      setReminders([]);
      return;
    }
    const syncTasks = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const [aRes, hRes, rRes] = await Promise.all([
          fetch(`${API_BASE}/api/assignments/list`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          }),
          fetch(`${API_BASE}/api/hackathons/list`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          }),
          fetch(`${API_BASE}/api/reminders/list`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          }),
        ]);

        const [aData, hData, rData] = await Promise.all([aRes.json(), hRes.json(), rRes.json()]);

        if (aData.success) {
          setAssignments(aData.assignments);
          localStorage.setItem(`assignments_${userId}`, JSON.stringify(aData.assignments));
        }
        if (hData.success) {
          setHackathons(hData.hackathons);
          localStorage.setItem(`hackathons_${userId}`, JSON.stringify(hData.hackathons));
        }
        if (rData.success) {
          setReminders(rData.reminders);
          localStorage.setItem(`reminders_${userId}`, JSON.stringify(rData.reminders));
        }
      } catch (err) {
        console.error("❌ Task sync error:", err);
      }
    };
    syncTasks();
  }, [userId]);

  // --- Global Notification Sound ---
  const playNotificationSound = () => {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    audio.play().catch((err) => console.log("🔇 Audio play blocked or failed:", err));
  };

  // Helper to parse reminder target timestamp
  const parseReminderTargetTime = (r) => {
    if (!r) return null;
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    let day = now.getDate();

    if (r.date && String(r.date).trim()) {
      const d = new Date(String(r.date).trim());
      if (!isNaN(d.getTime())) {
        year = d.getFullYear();
        month = d.getMonth();
        day = d.getDate();
      }
    }

    let hours = 20;
    let minutes = 0;

    if (r.time && String(r.time).trim()) {
      const raw = String(r.time).trim().toLowerCase();
      const isPM = raw.includes("pm");
      const isAM = raw.includes("am");
      const clean = raw.replace(/[a-z]/g, "").trim();
      const parts = clean.split(":").map((p) => parseInt(p, 10));

      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        let h = parts[0];
        let m = parts[1];
        if (isPM && h < 12) h += 12;
        if (isAM && h === 12) h = 0;
        hours = h;
        minutes = m;
      } else if (parts.length === 1 && !isNaN(parts[0])) {
        let h = parts[0];
        if (isPM && h < 12) h += 12;
        if (isAM && h === 12) h = 0;
        hours = h;
      }
    }

    return new Date(year, month, day, hours, minutes, 0, 0).getTime();
  };

  // --- Smart Reminder Engine (50%, 90%, 95%, 100% Triggers & Alarm) ---
  useEffect(() => {
    if (!reminders || reminders.length === 0) return;

    const checkReminders = () => {
      const now = Date.now();
      const updatedTriggers = { ...reminderTriggers };
      let changed = false;
      let pendingAlert = null;

      reminders.forEach((r) => {
        const remId = r._id || r.id;
        if (!remId) return;
        if (r.status === "Completed") return;

        const targetTimestamp = parseReminderTargetTime(r);
        if (!targetTimestamp) return;

        const triggerState = updatedTriggers[remId] || {
          startTime: null,
          p50: false,
          p90: false,
          p95: false,
          p100: false,
          snoozedUntil: null,
          dismissedAt: null,
        };

        // Initialize startTime: use r.createdAt if available, or first seen
        if (!triggerState.startTime) {
          triggerState.startTime = r.createdAt ? new Date(r.createdAt).getTime() : now;
          changed = true;
        }

        // Handle snooze
        if (triggerState.snoozedUntil) {
          if (now < triggerState.snoozedUntil) {
            return; // Still snoozed
          } else {
            // Snooze expired!
            triggerState.snoozedUntil = null;
            changed = true;
            if (!activeReminderAlert && !pendingAlert) {
              pendingAlert = {
                id: remId,
                reminder: r,
                stage: "100%",
                percentage: 100,
                title: r.title,
                category: r.category || "Study",
                time: r.time,
                date: r.date,
                targetTime: targetTimestamp,
                isMissed: false,
              };
            }
            return;
          }
        }

        const totalDuration = targetTimestamp - triggerState.startTime;
        const elapsed = now - triggerState.startTime;

        // If target time has passed (100% / due)
        if (now >= targetTimestamp || totalDuration <= 0) {
          if (!triggerState.p100) {
            triggerState.p50 = true;
            triggerState.p90 = true;
            triggerState.p95 = true;
            triggerState.p100 = true;
            changed = true;

            const isMissed = now - targetTimestamp > 30000;
            if (!activeReminderAlert && !pendingAlert) {
              pendingAlert = {
                id: remId,
                reminder: r,
                stage: "100%",
                percentage: 100,
                title: r.title,
                category: r.category || "Study",
                time: r.time,
                date: r.date,
                targetTime: targetTimestamp,
                isMissed,
              };
            }
          }
          updatedTriggers[remId] = triggerState;
          return;
        }

        // Target is in future, calculate percentage
        const percentage = Math.min(99.9, Math.max(0, (elapsed / totalDuration) * 100));

        // 95% milestone
        if (percentage >= 95) {
          if (!triggerState.p95) {
            triggerState.p50 = true;
            triggerState.p90 = true;
            triggerState.p95 = true;
            changed = true;
            const isMissed = percentage >= 97;
            if (!activeReminderAlert && !pendingAlert) {
              pendingAlert = {
                id: remId,
                reminder: r,
                stage: "95%",
                percentage: Math.round(percentage),
                title: r.title,
                category: r.category || "Study",
                time: r.time,
                date: r.date,
                targetTime: targetTimestamp,
                isMissed,
              };
            }
          }
        }
        // 90% milestone
        else if (percentage >= 90) {
          if (!triggerState.p90) {
            triggerState.p50 = true;
            triggerState.p90 = true;
            changed = true;
            const isMissed = percentage >= 93;
            if (!activeReminderAlert && !pendingAlert) {
              pendingAlert = {
                id: remId,
                reminder: r,
                stage: "90%",
                percentage: Math.round(percentage),
                title: r.title,
                category: r.category || "Study",
                time: r.time,
                date: r.date,
                targetTime: targetTimestamp,
                isMissed,
              };
            }
          }
        }
        // 50% milestone
        else if (percentage >= 50) {
          if (!triggerState.p50) {
            triggerState.p50 = true;
            changed = true;
            const isMissed = percentage >= 65;
            if (!activeReminderAlert && !pendingAlert) {
              pendingAlert = {
                id: remId,
                reminder: r,
                stage: "50%",
                percentage: Math.round(percentage),
                title: r.title,
                category: r.category || "Study",
                time: r.time,
                date: r.date,
                targetTime: targetTimestamp,
                isMissed,
              };
            }
          }
        }

        updatedTriggers[remId] = triggerState;
      });

      if (changed) {
        setReminderTriggers(updatedTriggers);
        if (userId) {
          localStorage.setItem(`reminderTriggers_${userId}`, JSON.stringify(updatedTriggers));
        }
      }

      if (pendingAlert && !activeReminderAlert) {
        setActiveReminderAlert(pendingAlert);
        alarmSound.start();
        setHighlightedReminders((prev) => new Set([...prev, pendingAlert.id]));
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 1000);
    return () => clearInterval(interval);
  }, [reminders, reminderTriggers, activeReminderAlert, userId]);

  const dismissReminderAlert = () => {
    alarmSound.stop();
    if (activeReminderAlert && userId) {
      const remId = activeReminderAlert.id;
      setReminderTriggers((prev) => {
        const current = prev[remId] || {};
        const updated = {
          ...prev,
          [remId]: {
            ...current,
            dismissedAt: Date.now(),
          },
        };
        localStorage.setItem(`reminderTriggers_${userId}`, JSON.stringify(updated));
        return updated;
      });
    }
    setActiveReminderAlert(null);
  };

  const snoozeReminderAlert = (minutes = 5) => {
    alarmSound.stop();
    if (activeReminderAlert && userId) {
      const remId = activeReminderAlert.id;
      const snoozedUntil = Date.now() + minutes * 60 * 1000;
      setReminderTriggers((prev) => {
        const current = prev[remId] || {};
        const updated = {
          ...prev,
          [remId]: {
            ...current,
            snoozedUntil,
          },
        };
        localStorage.setItem(`reminderTriggers_${userId}`, JSON.stringify(updated));
        return updated;
      });
    }
    setActiveReminderAlert(null);
  };

  const clearToast = () => setActiveToast(null);


  // 🪙 Fetch latest user coins + streak from backend (if logged in)
  useEffect(() => {
    const fetchUserCoins = async () => {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser?._id && !storedUser?.id) return; // user not logged in
      const token = localStorage.getItem("token");

      try {
        const res = await fetch(`${API_BASE}/api/tracking/coins/${storedUser._id || storedUser.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch coins");
        const data = await res.json();

        setAppState((prev) => ({
          ...prev,
          user: storedUser,
          coins: data.coins || prev.coins,
          streak: data.streak || prev.streak,
          videosWatched: data.videosWatched ?? prev.videosWatched,
          videosSwitched: data.videosSwitched ?? prev.videosSwitched,
        }));

        // update localStorage coins
        localStorage.setItem("coins", data.coins || 0);
      } catch (err) {
        console.error("Coin fetch error:", err);
      }
    };

    fetchUserCoins();
  }, [userId]);


  // 🕒 Fetch last 5 study sessions
  useEffect(() => {
    const fetchHistory = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/api/tracking/history`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch history");
        const data = await res.json();

        setAppState((prev) => ({
          ...prev,
          history: data.history || [],
        }));

      } catch (err) {
        console.error("History fetch error:", err);
      }
    };

    fetchHistory();
  }, [userId]);

  // 📝 Fetch saved notes + tags once on load
  useEffect(() => {
    const fetchNotesTags = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/api/tracking/notes-tags`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        const data = await res.json();
        if (data.success) {
          setAppState((prev) => ({
            ...prev,
            notes: data.notes || {},
            tags: data.tags || {},
          }));

          localStorage.setItem("userNotes", JSON.stringify(data.notes || {}));
          localStorage.setItem("userTags", JSON.stringify(data.tags || {}));
        }
      } catch (err) {
        console.error("⚠️ Error fetching notes/tags:", err);
      }
    };

    fetchNotesTags();
  }, [userId]);


  return (
    <AppContext.Provider
      value={{
        appState,
        setAppState,
        assignments,
        setAssignments,
        hackathons,
        setHackathons,
        reminders,
        setReminders,
        addAssignment,
        removeAssignment,
        addHackathon,
        addReminder,
        removeReminder,
        activeToast,
        clearToast,
        activeReminderAlert,
        dismissReminderAlert,
        snoozeReminderAlert,
        highlightedReminders,
        isChatOpen,
        setIsChatOpen,
        chatMessages,
        setChatMessages,
        chatLoading,
        isVoiceListening,
        setIsVoiceListening,
        isSpeaking,
        stopSpeakingText,
        activeVideoContext,
        setActiveVideoContext,
        sendMessageToChatbot,
        processVoiceQuestion,
        startVoiceRecognition,
        stopVoiceRecognition,
        toggleVoiceRecognition,
        speakText,
        theme,
        setTheme,
        toggleTheme,
      }}
    >
      {activeToast && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 9999,
          padding: "1rem 2rem",
          borderRadius: "12px",
          backgroundColor: "#4b5563", // Neutral gray-600
          color: "white",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
          fontWeight: "bold",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          animation: "slideIn 0.3s ease-out"
        }}>
          <span>{activeToast.message}</span>
          <button onClick={clearToast} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
        </div>
      )}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
