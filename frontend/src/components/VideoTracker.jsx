import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import Navbar from "./Navbar";
import { io } from "socket.io-client";
import { jsPDF } from "jspdf";
import { Link, useNavigate } from "react-router-dom";
import profileIcon from '../assets/profile_icon.png';
import studyBannerBg from '../assets/study_banner_bg.jpg';
import streakCardBg from '../assets/streak_card_bg.jpg';
import AuthModal from "./AuthModal";
import UserProfileModal from "./UserProfileModal";
import API_BASE, { STREAMLIT_URL, DETECTOR_URL } from "../services/apiBase";
import { BrowserDetector } from "../services/browserDetector";
import { getAllMonitoringLogs } from "../services/monitoringDB";
import { eachDayOfInterval, format, startOfMonth, endOfMonth } from "date-fns";





import {
  AreaChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
// import { io } from "socket.io-client";


// --- LOCAL STORAGE & HELPER FUNCTIONS ---

const STORAGE_KEY = "video_tracker_v3";
const INITIAL_COINS = 500;
const TAB_SWITCH_COST = 5;
const DAILY_BONUS = 1;
const STREAK_BONUS = 5;

// Popular educational search topics for fast 1-click discovery
const POPULAR_SEARCH_TOPICS = [
  "Data Structures",
  "Python",
  "React JS",
  "Machine Learning",
  "Calculus",
];

// ✅ Helper: Get local date string in YYYY-MM-DD format (respects timezone)
const getLocalDateString = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// ✅ Helper: Format seconds to clean hh:mm:ss or mm:ss string
const formatVideoTime = (totalSeconds) => {
  const total = Math.max(0, parseInt(totalSeconds, 10) || 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};




function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        history: [],
        notes: {},
        stats: {},
        coins: INITIAL_COINS,
        streak: 0,
        lastDayWatched: null,
      };
    }
    return JSON.parse(raw);
  } catch (e) {
    return {
      history: [],
      notes: {},
      stats: {},
      coins: INITIAL_COINS,
      streak: 0,
      lastDayWatched: null,
    };
  }
}
function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function extractYouTubeId(urlOrId) {
  if (!urlOrId) return null;
  if (/^[0-9A-Za-z_-]{11}$/.test(urlOrId)) return urlOrId;
  const regex =
    /(?:youtube\.com\/.*(?:v=|embed\/)|youtu\.be\/)([0-9A-Za-z_-]{11})/;
  const m = urlOrId.match(regex);
  return m ? m[1] : null;
}

// --- STUDY VIDEO FILTER ---
const ALLOWED_KEYWORDS = [
  // Preserved original keywords
  "study", "lecture", "tutorial", "math", "science", "google",
  "coding", "programming", "react", "java", "ds algo",
  "data structures", "education", "exam", "motivation", "MySQL",
  // Expanded educational & placement keywords for high recall
  "aptitude", "leetcode", "placement", "nqt", "tcs", "reasoning", "verbal", "quantitative",
  "interview", "preparation", "course", "learn", "learning", "solution", "questions",
  "gate", "jee", "neet", "dbms", "sql", "engineering", "class", "chapter", "guide",
  "algorithm", "computer", "system", "development", "web", "python", "cpp", "c++",
  "physics", "chemistry", "biology", "history", "geography", "civics", "economics",
  "revision", "notes", "crash course", "one shot", "syllabus", "paper", "mock", "solved"
];

const NON_STUDY_KEYWORDS = [
  "official music video", "official video", "full movie", "movie trailer",
  "lyric video", "remix song", "entertainment vlog", "funny prank",
  "bhajan", "bhakti", "kirtan", "aarti", "chalisa", "mantra", "geeta path", "devotional", "stotra", "pravachan", "satsang", "shyam baba", "krishna bhajan", "ram bhajan", "shiv bhajan",
  "comedy", "funny", "standup", "stand-up", "roast", "prank", "jokes", "mimicry", "lallantop comedy", "kapil sharma", "chotu dada",
  "movie", "film", "teaser", "cinema", "scene", "climax", "full movie hindi", "south movie",
  "song", "music", "singing", "dance", "dj", "remix", "lyrics", "album song", "punjabi song", "bhojpuri", "bollywood",
  "gaming", "gameplay", "gta", "gta5", "minecraft", "bgmi", "pubg", "freefire", "valorant", "techno gamerz",
  "vlog", "daily vlog", "family vlog", "lifestyle vlog", "travel vlog", "sourav joshi",
  "serial", "drama", "episode", "natak", "tarak mehta", "tmkoc"
];

async function isStudyVideo(videoId) {
  try {
    const res = await fetch(
      `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
    );
    const data = await res.json();

    if (!data.title) {
      console.log("⚠️ Title missing → allowing");
      return true;
    }

    const title = data.title.toLowerCase();

    // 1. Explicit NON-STUDY check first (highest priority)
    const isExplicitNonStudy = NON_STUDY_KEYWORDS.some((keyword) =>
      title.includes(keyword.toLowerCase())
    );
    if (isExplicitNonStudy) {
      console.log("⛔ Non-study keyword detected:", title);
      return false;
    }

    // 2. Study / Educational keyword check
    const hasStudyKeyword = ALLOWED_KEYWORDS.some((keyword) =>
      title.includes(keyword.toLowerCase())
    );
    if (hasStudyKeyword) return true;

    // 3. Block videos lacking educational keywords
    console.log("⛔ No educational keywords found in title:", title);
    return false;
  } catch (e) {
    console.error("Video title check failed:", e);
    return true;
  }
}






/// --- API FUNCTIONS FOR TRACKING ---
// ✅ updateBackendStreak function removed as it was redundant and used POST incorrectly.
// Rest of utilities moved inside component to access setAppState correctly.

const updateVideosSwitched = async (userId) => {
  try {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_BASE}/api/tracking/videos-switched`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      body: JSON.stringify({ userId }),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Error updating video switch:", err);
  }
};


// ✅ updateBackendStreak function removed as it was redundant and used POST incorrectly.

const playRestrictionSound = () => {
  const audio = new Audio("/alert_beep1.wav");
  audio.play().catch(() => { });
};






// --- VIDEO TRACKER COMPONENT ---

export default function VideoTracker() {

  // --- USER ID FROM LOCAL STORAGE ---
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const userId = storedUser?.id;

  // App state
  const {
    appState,
    setAppState,
    setIsChatOpen,
    isChatOpen,
    toggleVoiceRecognition,
    isVoiceListening,
    isSpeaking,
    stopSpeakingText,
    setActiveVideoContext,
    processVoiceQuestion,
    theme,
  } = useAppContext();

  const styles = getThemeStyles(theme);
  const isDark = theme === "dark";

  // --- UTILITY FUNCTIONS ---
  const updateBackendCoins = async (loss) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/tracking/coins-loss`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ loss }),
      });

      const data = await res.json();

      if (data.success) {
        setAppState((prev) => ({ ...prev, coins: data.coins }));
      }
    } catch (err) {
      console.error("Error updating backend coins:", err);
    }
  };

  const updateBackendCoinsGain = async (gain) => {
    try {
      const res = await fetch(`${API_BASE}/api/tracking/coins-gain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, gain }),
      });
      const data = await res.json();
      if (data.success) {
        setAppState((prev) => ({ ...prev, coins: data.coins }));
      }
    } catch (err) {
      console.error("❌ Error adding backend coins:", err);
    }
  };

  const updateVideosWatched = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/tracking/videos-watched`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        credentials: "include",
      });
      const data = await res.json();

      if (data.success && data.streak !== undefined) {
        setAppState((prev) => ({
          ...prev,
          streak: data.streak,
          lastDayWatched: data.lastDayWatched ?? prev.lastDayWatched,
        }));
        localStorage.setItem("streak", String(data.streak));
      }
    } catch (err) {
      console.error("❌ Error updating streak:", err);
    }
  };

  const [showBlockedPopup, setShowBlockedPopup] = useState(false);
  const [blockedTitle, setBlockedTitle] = useState("");

  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) setUser(storedUser);
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      localStorage.removeItem("user");
      setUser(null);
      setDropdownOpen(false);
      navigate("/");
    } catch (error) {
      console.error("Error during logout:", error);
      localStorage.removeItem("user");
      setUser(null);
      setDropdownOpen(false);
    }
  };

  const handleProtectedLinkClick = (e, path) => {
    if (!user) {
      e.preventDefault();
      setAuthModalOpen(true);
    }
  };

  const [inputUrl, setInputUrl] = useState("");
  const [videoId, setVideoId] = useState(null);
  const [localVideoFile, setLocalVideoFile] = useState(null);
  const [localVideoObjectUrl, setLocalVideoObjectUrl] = useState(null);



  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [sessionPlayedSeconds, setSessionPlayedSeconds] = useState(0);
  const [sessionViewsTaken, setSessionViewsTaken] = useState(0);

  const [tabSwitches, setTabSwitches] = useState(0);
  const [sessionTabSwitches, setSessionTabSwitches] = useState(0);

  const [noteText, setNoteText] = useState("");
  const [tagText, setTagText] = useState("");
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState("");
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showWatchHistoryModal, setShowWatchHistoryModal] = useState(false);
  const [openMenuCardId, setOpenMenuCardId] = useState(null);
  const videoSliderRef = useRef(null);
  const [selectedVideoForLogs, setSelectedVideoForLogs] = useState(null);
  const [showTimerPopup, setShowTimerPopup] = useState(false);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [focusRemaining, setFocusRemaining] = useState(null);

  // 🔍 YouTube In-App Search States
  const [searchMode, setSearchMode] = useState("search"); // "search" | "url"
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchQuotaExceeded, setSearchQuotaExceeded] = useState(false);
  const [searchNextPageToken, setSearchNextPageToken] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [playerError, setPlayerError] = useState(null);

  // 🔔 Custom Notification Popup Modal (same style as Focus Timer popup)
  const [notificationPopup, setNotificationPopup] = useState({
    show: false,
    title: "",
    subtitle: "",
    badge: "",
    badgeColor: "#10b981",
    icon: "🎉",
    details: [],
    buttonText: "Awesome!",
  });

  const triggerNotification = useCallback(({
    title,
    subtitle = "",
    badge = "",
    badgeColor = "#10b981",
    icon = "🎉",
    details = [],
    buttonText = "Awesome!",
  }) => {
    setNotificationPopup({
      show: true,
      title,
      subtitle,
      badge,
      badgeColor,
      icon,
      details,
      buttonText,
    });
  }, []);

  const focusRemainingRef = useRef(focusRemaining);
  useEffect(() => {
    focusRemainingRef.current = focusRemaining;
  }, [focusRemaining]);

  const sessionPlayedSecondsRef = useRef(sessionPlayedSeconds);
  useEffect(() => {
    sessionPlayedSecondsRef.current = sessionPlayedSeconds;
  }, [sessionPlayedSeconds]);

  const noteTextRef = useRef(noteText);
  useEffect(() => {
    noteTextRef.current = noteText;
  }, [noteText]);

  const tagTextRef = useRef(tagText);
  useEffect(() => {
    tagTextRef.current = tagText;
  }, [tagText]);

  const tabSwitchesRef = useRef(tabSwitches);
  useEffect(() => {
    tabSwitchesRef.current = tabSwitches;
  }, [tabSwitches]);

  const handleStopSaveRef = useRef(null);

  const [isPlayerMaximized, setIsPlayerMaximized] = useState(false);
  const [isFocusTimerPopupMaximized, setIsFocusTimerPopupMaximized] = useState(false);
  const [youtubePlayerInstance, setYoutubePlayerInstance] = useState(null);
  const [earnedThisSessionCoins, setEarnedThisSessionCoins] = useState(false);
  const [showZeroCoinsPopup, setShowZeroCoinsPopup] = useState(false);
  // NEW states for YouTube metadata and playlist
  const [videoMeta, setVideoMeta] = useState(null);
  const [playlistItems, setPlaylistItems] = useState([]);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);

  // Sync active video context for ChatBot AI
  useEffect(() => {
    if (videoId) {
      setActiveVideoContext({
        source: "video_tracker",
        videoId: videoId,
        videoTitle: videoMeta?.title || "Educational Lecture",
      });
    } else {
      setActiveVideoContext(null);
    }
  }, [videoId, videoMeta, setActiveVideoContext]);

  const playerContainerRef = useRef(null);

  const handleVoiceDoubtInTracker = useCallback(() => {
    toggleVoiceRecognition((transcript) => {
      if (transcript && transcript.trim()) {
        processVoiceQuestion(transcript.trim(), {
          source: "video_tracker",
          videoId: videoId,
          videoTitle: videoMeta?.title || "Educational Lecture",
        });
      }
    });
  }, [toggleVoiceRecognition, processVoiceQuestion, videoId, videoMeta]);

  const toggleMaximizePlayer = () => {
    setIsPlayerMaximized((prev) => !prev);
  };
  const [metaError, setMetaError] = useState('');
  const [coinsLoaded, setCoinsLoaded] = useState(false);
  const [resumePosition, setResumePosition] = useState(0);

  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const userName = useMemo(() => {
    return appState.user?.name ? appState.user.name.split(" ")[0] : "Ananya";
  }, [appState.user?.name]);


  // --- AI QUIZ STATES ---
  const [showQuizConfigModal, setShowQuizConfigModal] = useState(false);
  const [quizNumQuestions, setQuizNumQuestions] = useState(5);
  const [quizDifficulty, setQuizDifficulty] = useState("Medium");
  const [isQuizGenerating, setIsQuizGenerating] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState("");
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizResult, setQuizResult] = useState(null);


  // State for starting timer on play
  const [focusDuration, setFocusDuration] = useState(null);
  const [isFocusTimerPending, setIsFocusTimerPending] = useState(false);
  const [hasPlaybackStarted, setHasPlaybackStarted] = useState(false);

  // --- ON-DEVICE BROWSER CAMERA / DETECTOR INTEGRATION ---
  const [showCameraAnalysis, setShowCameraAnalysis] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [detectorStats, setDetectorStats] = useState(null);

  // refs
  const youtubePlayerRef = useRef(null);
  const localVideoRef = useRef(null);
  const pollRef = useRef(null);
  const lastSampleRef = useRef(0);
  const playerRef = useRef(null);
  const noteTextareaRef = useRef(null);

  // REFS FOR CAMERA MONITORING
  const cameraVideoRef = useRef(null);
  const cameraCanvasRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const browserDetectorRef = useRef(null);
  const isCameraActiveRef = useRef(false);
  const socketRef = useRef(null);
  // refs for swipe/trackpad navigation
  const wheelLastRef = useRef(0);
  const touchStartXRef = useRef(null);
  const wheelAccumRef = useRef(0);
  const resumeIntervalRef = useRef(null);
  const lastProgressSaveRef = useRef(0);
  const hasResumedRef = useRef(false);
  const isVideoEndingRef = useRef(false);
  const lastScoreSyncRef = useRef(0);

  // Initialize BrowserDetector instance on mount and pre-warm models
  useEffect(() => {
    const detector = new BrowserDetector({
      onStatsUpdate: (stats) => {
        setDetectorStats(stats);
        if (typeof stats.focus_score === "number") {
          const now = Date.now();
          const isDistracted = stats.phone_detected === 1 || (stats.status && stats.status.startsWith("Not Focused"));
          // If phone is detected or not focused, sync IMMEDIATELY without waiting 10s!
          const shouldSync = isDistracted || (now - lastScoreSyncRef.current > 5000);
          if (shouldSync) {
            lastScoreSyncRef.current = now;
            const token = localStorage.getItem("token");
            if (token) {
              fetch(`${API_BASE}/api/tracking/focus-score`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                credentials: "include",
                body: JSON.stringify({
                  focusScore: stats.focus_score,
                  phoneDetected: stats.phone_detected === 1,
                  lookAway: stats.status && stats.status.includes("Looking Away"),
                  faceAnomaly: (stats.status && stats.status.includes("Multiple/No Face")) || (Number(stats.faces_detected) !== 1),
                }),
              }).catch(() => {});
            }
          }
        }
      },
      onError: (err) => {
        setCameraError(err);
      },
      onStatusChange: (statusMsg) => {
        console.log("Browser AI Status:", statusMsg);
      },
    });
    browserDetectorRef.current = detector;

    // Silently pre-warm AI models in background for near 0s startup latency
    detector.loadModels().catch((e) => console.log("Background pre-warm note:", e));

    const handleKeyDown = (e) => {
      if (e.key === "s" || e.key === "S") {
        if (browserDetectorRef.current) {
          const enabled = browserDetectorRef.current.toggleSound();
          console.log(`Alert sound: ${enabled ? "ON" : "OFF"}`);
        }
      } else if (e.key === "r" || e.key === "R") {
        if (browserDetectorRef.current) {
          browserDetectorRef.current.resetScore();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      detector.stop();
    };
  }, []);

  // Camera monitoring cleanup
  const stopCameraMonitoring = useCallback(() => {
    isCameraActiveRef.current = false;
    if (browserDetectorRef.current) {
      browserDetectorRef.current.stop();

      // Read complete IndexedDB monitoring logs to compute final session score & sync
      getAllMonitoringLogs().then((logs) => {
        if (logs && logs.length > 0) {
          const total = logs.length;
          const focused = logs.filter(l => l.status && l.status.startsWith("Focused")).length;
          const phoneCount = logs.filter(l => Number(l.phone_detected) === 1 || (l.status && l.status.includes("Phone Detected"))).length;
          const lookAwayCount = logs.filter(l => l.status && l.status.includes("Looking Away")).length;
          const faceCount = logs.filter(l => (l.status && l.status.includes("Multiple/No Face")) || (Number(l.faces_detected) !== 1)).length;
          const totalScore = logs.reduce((sum, l) => sum + (Number(l.focus_score) || 0), 0);
          const avgScore = total > 0 ? Math.round(totalScore / total) : 100;
          const focusPct = total > 0 ? Math.round((focused / total) * 100) : 100;
          const penalty = (phoneCount * 20) + (lookAwayCount * 10) + (faceCount * 10);
          const computedScore = Math.max(0, Math.min(100, Math.min(avgScore, focusPct, 100 - penalty)));

          const token = localStorage.getItem("token");
          if (token) {
            fetch(`${API_BASE}/api/tracking/sync-monitoring`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              credentials: "include",
              body: JSON.stringify({
                focusScore: computedScore,
                phoneDetections: phoneCount,
                lookAwayEvents: lookAwayCount,
                faceAnomalies: faceCount,
                totalRecords: total,
                focusedRecords: focused,
              }),
            }).catch(() => {});
          }
        }
      }).catch(() => {});
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) { }
      });
      cameraStreamRef.current = null;
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
    setShowCameraAnalysis(false);
    setIsCameraLoading(false);
  }, []);

  // Request browser camera and begin on-device AI inference
  const startCameraMonitoring = async () => {
    setCameraError(null);
    setIsCameraLoading(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera access is not supported in this browser.");
      setIsCameraLoading(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      cameraStreamRef.current = stream;
      isCameraActiveRef.current = true;
      setShowCameraAnalysis(true);
      setIsCameraLoading(false);

      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await cameraVideoRef.current.play().catch(() => { });
      }

      // Start on-device browser AI inference engine
      if (browserDetectorRef.current && cameraVideoRef.current && cameraCanvasRef.current) {
        browserDetectorRef.current.start(cameraVideoRef.current, cameraCanvasRef.current);
      }
    } catch (err) {
      console.error("Camera permission error:", err);
      setIsCameraLoading(false);
      setShowCameraAnalysis(false);

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera permission denied. Please allow camera access in your browser settings to use focus tracking.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("No camera found on this device.");
      } else if (err.name === "NotReadableError") {
        setCameraError("Camera is currently in use by another application.");
      } else {
        setCameraError(`Camera error: ${err.message || "Unable to access camera"}`);
      }
    }
  };

  const toggleDetector = () => {
    if (showCameraAnalysis) {
      stopCameraMonitoring();
    } else {
      startCameraMonitoring();
    }
  };

  // Ensure video element receives stream once rendered & detector starts
  useEffect(() => {
    if (showCameraAnalysis && cameraStreamRef.current && cameraVideoRef.current) {
      if (cameraVideoRef.current.srcObject !== cameraStreamRef.current) {
        cameraVideoRef.current.srcObject = cameraStreamRef.current;
        cameraVideoRef.current.play().catch(() => { });
      }
      if (browserDetectorRef.current && !browserDetectorRef.current.isRunning && cameraCanvasRef.current) {
        browserDetectorRef.current.start(cameraVideoRef.current, cameraCanvasRef.current);
      }
    }
  }, [showCameraAnalysis]);

  // Turn off camera on unmount
  useEffect(() => {
    return () => {
      stopCameraMonitoring();
    };
  }, [stopCameraMonitoring]);




  const [history, setHistory] = useState([]);

  // Monthly 5-day sliding window state for performance chart
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthData, setMonthData] = useState([]); // full month data (one item per day)
  const [monthStartIndex, setMonthStartIndex] = useState(0); // start index for visible 5-day window

  // Study Activity Heatmap state (shifted from Student Dashboard)
  const [heatmapMonth, setHeatmapMonth] = useState(new Date().getMonth());
  const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear());

  const heatmapActivity = useMemo(() => {
    const act = {};
    const historyList = (appState.history && appState.history.length > 0)
      ? appState.history
      : JSON.parse(localStorage.getItem(`userHistory_${userId}`)) || [];

    if (historyList.length > 0) {
      historyList.forEach((h) => {
        let dayKey = "";
        if (h.watchedAt) {
          if (typeof h.watchedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(h.watchedAt.trim())) {
            dayKey = h.watchedAt.trim();
          } else if (typeof h.watchedAt === "string" && h.watchedAt.includes("T")) {
            dayKey = h.watchedAt.split("T")[0];
          } else {
            dayKey = getLocalDateString(h.watchedAt);
          }
        }
        if (!dayKey) return;
        if (!act[dayKey]) act[dayKey] = { totalSeconds: 0 };
        act[dayKey].totalSeconds += Number(h.seconds ?? h.secondsWatched ?? 0) || 0;
      });
    }

    try {
      const cached = JSON.parse(localStorage.getItem("monthlyActivity") || "{}");
      if (cached && Object.keys(cached).length > 0) {
        Object.keys(cached).forEach((key) => {
          if (!act[key]) act[key] = { totalSeconds: cached[key]?.totalSeconds || 0 };
          else if (cached[key]?.totalSeconds > act[key].totalSeconds) {
            act[key].totalSeconds = cached[key].totalSeconds;
          }
        });
      }
    } catch (e) {
      // ignore
    }

    return act;
  }, [appState.history, userId]);

  // ─── 5 TOP STAT CARDS COMPUTATIONS ───
  // Card 1: Total tab switches throughout
  const totalTabSwitchesAllTime = useMemo(() => {
    const historyList = (appState.history && appState.history.length > 0)
      ? appState.history
      : JSON.parse(localStorage.getItem(`userHistory_${userId}`)) || [];

    let sum = 0;
    historyList.forEach((h) => {
      sum += Number(h.tabSwitches || h.totalTabSwitches || 0);
    });
    const userSwitches = Number(appState.videosSwitched ?? appState.user?.videosSwitched ?? 0);
    return Math.max(sum + (tabSwitches || 0), userSwitches);
  }, [appState.history, appState.videosSwitched, appState.user?.videosSwitched, userId, tabSwitches]);

  // Card 2: Total tab switches today
  const totalTabSwitchesToday = useMemo(() => {
    const todayStr = getLocalDateString(new Date());
    const historyList = (appState.history && appState.history.length > 0)
      ? appState.history
      : JSON.parse(localStorage.getItem(`userHistory_${userId}`)) || [];

    let todaySum = 0;
    historyList.forEach((h) => {
      let itemDate = "";
      if (h.watchedAt) {
        if (typeof h.watchedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(h.watchedAt.trim())) {
          itemDate = h.watchedAt.trim();
        } else if (typeof h.watchedAt === "string" && h.watchedAt.includes("T")) {
          itemDate = h.watchedAt.split("T")[0];
        } else {
          itemDate = getLocalDateString(h.watchedAt);
        }
      }
      if (itemDate === todayStr) {
        todaySum += Number(h.tabSwitches || h.totalTabSwitches || 0);
      }
    });
    return todaySum + (tabSwitches || 0);
  }, [appState.history, userId, tabSwitches]);

  // Card 3: Total videos watched
  const totalVideosWatchedCount = useMemo(() => {
    const historyList = (appState.history && appState.history.length > 0)
      ? appState.history
      : JSON.parse(localStorage.getItem(`userHistory_${userId}`)) || [];

    const uniqueIds = new Set();
    historyList.forEach((h) => {
      if (h.videoId || h.url) {
        uniqueIds.add(h.videoId || h.url);
      }
    });
    const userVideos = Number(appState.videosWatched ?? appState.user?.videosWatched ?? 0);
    return Math.max(uniqueIds.size, historyList.length, userVideos);
  }, [appState.history, appState.videosWatched, appState.user?.videosWatched, userId]);

  // Card 4: Maximum streak achieved so far
  const maxStreakAchieved = useMemo(() => {
    const currentStreak = Number(appState.streak ?? appState.user?.streak ?? 0);
    const historyList = (appState.history && appState.history.length > 0)
      ? appState.history
      : JSON.parse(localStorage.getItem(`userHistory_${userId}`)) || [];

    const uniqueDates = Array.from(new Set(
      historyList.map((h) => {
        if (!h.watchedAt) return "";
        if (typeof h.watchedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(h.watchedAt.trim())) {
          return h.watchedAt.trim();
        }
        if (typeof h.watchedAt === "string" && h.watchedAt.includes("T")) {
          return h.watchedAt.split("T")[0];
        }
        return getLocalDateString(h.watchedAt);
      }).filter(Boolean)
    )).sort();

    let longestRun = 0;
    let currentRun = 0;
    let prevDate = null;

    uniqueDates.forEach((dStr) => {
      const curDate = new Date(dStr + "T00:00:00");
      if (prevDate) {
        const diffDays = Math.round((curDate - prevDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentRun += 1;
        } else if (diffDays > 1) {
          currentRun = 1;
        }
      } else {
        currentRun = 1;
      }
      if (currentRun > longestRun) longestRun = currentRun;
      prevDate = curDate;
    });

    const storedMax = Number(localStorage.getItem(`maxStreak_${userId}`)) || 0;
    const finalMax = Math.max(currentStreak, longestRun, storedMax, 1);
    if (finalMax > storedMax && userId) {
      localStorage.setItem(`maxStreak_${userId}`, finalMax);
    }
    return finalMax;
  }, [appState.streak, appState.user?.streak, appState.history, userId]);

  // Card 5: Weekly watch duration state & computations
  const [weeklySelectedMonth, setWeeklySelectedMonth] = useState(new Date().getMonth());
  const [weeklySelectedYear, setWeeklySelectedYear] = useState(new Date().getFullYear());

  // Current running week duration (Monday to Sunday)
  const currentWeekInfo = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0 is Sun, 1 is Mon...
    const diffToMon = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    let totalSec = 0;
    for (let d = new Date(monday); d <= sunday; d.setDate(d.getDate() + 1)) {
      const dKey = getLocalDateString(d);
      totalSec += heatmapActivity[dKey]?.totalSeconds || 0;
    }

    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const label = totalSec > 0 ? `${h > 0 ? `${h}h ` : ""}${m}m` : "0m";

    const monStr = monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const sunStr = sunday.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    return { totalSec, label, rangeStr: `${monStr} – ${sunStr}` };
  }, [heatmapActivity]);

  // Weeks for the selected month in dropdown (Monday to Sunday)
  const weeksInSelectedMonth = useMemo(() => {
    const year = Number(weeklySelectedYear);
    const month = Number(weeklySelectedMonth);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeks = [];
    let currentDays = [];
    let weekIndex = 1;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 1 is Monday...
      currentDays.push(day);

      // Sunday (0) ends a week, or the last day of the month ends the week
      if (dayOfWeek === 0 || day === daysInMonth) {
        let weekTotalSec = 0;
        currentDays.forEach((d) => {
          const dKey = getLocalDateString(new Date(year, month, d));
          weekTotalSec += heatmapActivity[dKey]?.totalSeconds || 0;
        });

        const startD = currentDays[0];
        const endD = currentDays[currentDays.length - 1];
        const monthShort = MONTHS[month].slice(0, 3);
        const rangeStr = `${monthShort} ${startD} – ${monthShort} ${endD}`;

        const h = Math.floor(weekTotalSec / 3600);
        const m = Math.floor((weekTotalSec % 3600) / 60);
        const durationLabel = weekTotalSec > 0 ? `${h > 0 ? `${h}h ` : ""}${m}m` : "0m";

        weeks.push({
          weekNumber: weekIndex++,
          startDay: startD,
          endDay: endD,
          rangeStr,
          totalSeconds: weekTotalSec,
          durationLabel,
        });

        currentDays = [];
      }
    }

    return weeks;
  }, [weeklySelectedYear, weeklySelectedMonth, heatmapActivity, MONTHS]);

  // Total duration for the selected month
  const selectedMonthTotalDuration = useMemo(() => {
    let totalSec = 0;
    weeksInSelectedMonth.forEach((w) => {
      totalSec += w.totalSeconds;
    });
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    return totalSec > 0 ? `${h > 0 ? `${h}h ` : ""}${m}m` : "0m";
  }, [weeksInSelectedMonth]);

  const loadState = async () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const storedCoins = storedUser?.coins ?? localStorage.getItem("coins") ?? 0;
    const storedStreak = storedUser?.streak ?? localStorage.getItem("streak") ?? 0;


    return {
      coins: storedCoins,
      userId: storedUser?._id || storedUser?.id || null,
      secondsWatched: 0,
      focusPoints: 0,
    };




  };


  // ✅ REMOVED: Redundant mount-time POST call that was resetting/incrementing streak incorrectly.
  // Streak is now fetched via fetchUserStats GET call below.





  // 🧠 Split-Screen Detection — Deducts 5 Coins Penalty
  useEffect(() => {
    let lastAlertTime = 0;
    let alertCooldown = 5000; // 5 sec cooldown to avoid rapid spam

    const detectSplitScreen = async () => {
      // Split screen check ONLY applies when focus timer is actively running with video playing
      const isLocalActive = Boolean(
        localVideoRef.current &&
        !localVideoRef.current.paused &&
        !localVideoRef.current.ended &&
        localVideoRef.current.readyState >= 2
      );
      const isYtActive = Boolean(
        youtubePlayerRef.current?.getPlayerState &&
        youtubePlayerRef.current.getPlayerState() === 1
      );
      const isVideoPlaying = isLocalActive || isYtActive || isPlaying;
      const isFocusTimerRunning = Boolean(
        focusRemainingRef.current !== null &&
        focusRemainingRef.current > 0 &&
        isVideoPlaying
      );
      if (!isFocusTimerRunning) return;

      const screenWidth = window.screen.width;
      const windowWidth = window.innerWidth;
      const ratio = windowWidth / screenWidth;

      // 🚨 Trigger when window width < 70% (Split Screen / Resized Window)
      if (ratio < 0.7) {
        const now = Date.now();

        // Avoid rapid-fire alerts (only allow after cooldown)
        if (now - lastAlertTime > alertCooldown) {
          lastAlertTime = now;

          // 💰 Deduct 5 coins penalty
          const deducted = 5;
          setAppState((prev) => {
            const newCoins = Math.max((prev.coins || 0) - deducted, 0);
            if (newCoins <= 0) setShowZeroCoinsPopup(true);
            return { ...prev, coins: newCoins };
          });
          setTabSwitches((prev) => prev + 1);

          try {
            await updateBackendCoins(deducted);
            console.log("📊 Split screen detected: -5 coins deducted!");
          } catch (e) {
            console.error("❌ Split screen coin deduction failed:", e);
          }

          // Show popup modal notification
          triggerNotification({
            title: "Split Screen Detected!",
            subtitle: "Split-screen distraction was detected during active focus study.",
            badge: "⚠️ Penalty: -5 Coins",
            badgeColor: "#ef4444",
            icon: "🚨",
            details: [
              "💰 5 coins deducted as distraction penalty",
              "🖥️ Please maximize your study window to stay focused",
            ],
            buttonText: "I'll Focus 🔥",
          });

          if (socketRef.current) {
            socketRef.current.emit("split_screen_detected", {
              timestamp: Date.now(),
              deducted: 5,
            });
          }
        }
      }
    };

    window.addEventListener("resize", detectSplitScreen);

    return () => {
      window.removeEventListener("resize", detectSplitScreen);
    };
  }, [isPlaying, userId]);


  useEffect(() => {
    const savedNotes = localStorage.getItem(`userNotes_${userId}`);

    const savedTags = localStorage.getItem(`userTags_${userId}`);


    if (savedNotes || savedTags) {
      setAppState(prev => ({
        ...prev,
        notes: savedNotes ? JSON.parse(savedNotes) : {},
        tags: savedTags ? JSON.parse(savedTags) : {}
      }));
    }
  }, []);





  // useEffect(() => {
  // const fetchCoins = async () => {
  // const user = JSON.parse(localStorage.getItem("user"));
  // if (!user) return;

  //   try {
  //     const res = await fetch(`/api/tracking/coins/${user._id || user.id}`);
  //     if (!res.ok) throw new Error("Failed to fetch coins");
  //     const data = await res.json();

  //     setAppState((prev) => ({ ...prev, coins: data.coins }));
  //     localStorage.setItem("coins", data.coins);
  //   } catch (err) {
  //     console.error("Coin fetch error:", err);
  //   }
  // };

  // fetchCoins();
  // }, [setAppState]);



  useEffect(() => {
    const fetchUserStats = async () => {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) return;

      try {
        const res = await fetch(`${API_BASE}/api/tracking/coins/${user._id || user.id}`);
        if (!res.ok) throw new Error("Failed to fetch user stats");
        const data = await res.json();

        if (data.success) {
          setAppState((prev) => ({
            ...prev,
            coins: data.coins ?? prev.coins,
            streak: data.streak ?? prev.streak,
          }));

          // Cache in localStorage
          if (data.coins !== undefined) localStorage.setItem(`coins_${userId}`, data.coins);
          if (data.streak !== undefined) localStorage.setItem("streak", data.streak);
        }

        setCoinsLoaded(true);
      } catch (err) {
        console.error("User stats fetch error:", err);
        setCoinsLoaded(true);
      }
    };

    fetchUserStats();
  }, [setAppState, userId]);

  // ✅ NEW: Fetch notes and tags from backend on mount
  useEffect(() => {
    const fetchNotesTags = async () => {
      if (!userId) return;
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/api/tracking/notes-tags`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        });
        const data = await res.json();
        if (data.success) {
          setAppState(prev => ({
            ...prev,
            notes: data.notes || {},
            tags: data.tags || {}
          }));
        }
      } catch (err) {
        console.error("⚠️ Error fetching notes/tags:", err);
      }
    };

    fetchNotesTags();
  }, [userId]);


  // load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) return;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
  }, []);



  // Create/Revoke Object URL for local video file
  useEffect(() => {
    if (localVideoFile) {
      const url = URL.createObjectURL(localVideoFile);
      setLocalVideoObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setLocalVideoObjectUrl(null);
      };
    } else {
      setLocalVideoObjectUrl(null);
    }
  }, [localVideoFile]);

  // persist overall state when appState changes
  useEffect(() => {
    saveState(appState);
  }, [appState]);

  // Focus timer countdown & session watched timer - checks native video playback
  useEffect(() => {
    const timerInterval = setInterval(() => {
      // Check native HTML5 video element state
      const isLocalActive = Boolean(
        localVideoRef.current &&
        !localVideoRef.current.paused &&
        !localVideoRef.current.ended &&
        localVideoRef.current.readyState >= 2
      );

      // Check YouTube player state
      const isYtActive = Boolean(
        youtubePlayerRef.current?.getPlayerState &&
        youtubePlayerRef.current.getPlayerState() === 1
      );

      const active = isLocalActive || isYtActive || isPlaying;

      if (!active) return;

      // 1. Live Watched Time increment every second
      setSessionPlayedSeconds((prev) => prev + 1);

      // 2. Live Focus Countdown decrement every second
      if (focusRemainingRef.current !== null && focusRemainingRef.current > 0) {
        const nextSec = focusRemainingRef.current - 1;
        focusRemainingRef.current = nextSec <= 0 ? null : nextSec;
        setFocusRemaining(nextSec <= 0 ? null : nextSec);

        if (nextSec <= 0) {
          // 🎉 Focus session complete! Auto-save session, notes & tags automatically
          setTimeout(() => {
            if (handleStopSaveRef.current) {
              handleStopSaveRef.current(true);
            }
          }, 100);
        }
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [isPlaying]);


  useEffect(() => {
    const fetchHistory = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/api/tracking/history`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });

        const data = await res.json();

        if (data.success) {
          const newHistory = data.history || [];

          setAppState((prev) => ({ ...prev, history: newHistory }));

          // Update cache
          localStorage.setItem(`userHistory_${userId}`, JSON.stringify(newHistory));
        }
      } catch (err) {
        console.error("Error fetching history:", err);
      }
    };

    fetchHistory();
  }, [userId, userId]); // Keep userId dependency




  useEffect(() => {
    const savedHistory = localStorage.getItem(`userHistory_${userId}`);
    if (savedHistory && (!appState.history || appState.history.length === 0)) {
      setAppState((prev) => ({
        ...prev,
        history: JSON.parse(savedHistory),
      }));
    }
  }, [userId]);

  // ✅ Build monthData (minutes per day) from appState.history whenever history / month / year change
  // IMPORTANT: This uses the FULL history array (ALL sessions from database), NOT just the last 5.
  // The history cards below are sliced to show only 5, but the graph must show ALL data.
  useEffect(() => {
    const buildMonthData = () => {
      const year = Number(selectedYear);
      const month = Number(selectedMonth);
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      // ✅ Use FULL history array - no slicing here!
      const historyArr = (appState.history && appState.history.length > 0)
        ? appState.history
        : JSON.parse(localStorage.getItem(`userHistory_${userId}`)) || [];


      // ✅ Aggregate ALL sessions by date (sum of all sessions per day)
      const dailySecs = {};
      historyArr.forEach(item => {
        let dateKey = "";
        if (item.watchedAt) {
          if (typeof item.watchedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.watchedAt.trim())) {
            dateKey = item.watchedAt.trim();
          } else if (typeof item.watchedAt === "string" && item.watchedAt.includes("T")) {
            dateKey = item.watchedAt.split("T")[0];
          } else {
            dateKey = getLocalDateString(item.watchedAt);
          }
        }
        if (!dateKey) return;
        const secs = Number(item.seconds ?? item.secondsWatched ?? 0) || 0;
        dailySecs[dateKey] = (dailySecs[dateKey] || 0) + secs;
      });

      const dailyTotals = {};
      Object.keys(dailySecs).forEach(key => {
        dailyTotals[key] = Math.floor(dailySecs[key] / 60);
      });

      const arr = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const dateKey = getLocalDateString(dateObj);
        arr.push({
          dateKey,
          label: `${MONTHS[month]} ${d}`,
          mins: dailyTotals[dateKey] || 0,
        });
      }

      setMonthData(arr);

      // Auto-position to show last 10 days ending on today
      const today = new Date();
      const todayDate = today.getDate();
      const todayMonth = today.getMonth();
      const todayYear = today.getFullYear();
      // Only auto-position if we're viewing the current month
      if (month === todayMonth && year === todayYear) {
        const endDay = Math.min(todayDate, daysInMonth);
        const startDay = Math.max(1, endDay - 9); // 10-day window
        setMonthStartIndex(startDay - 1); // -1 because arr is 0-indexed but days are 1-indexed
      } else {
        setMonthStartIndex(0);
      }
    };

    buildMonthData();
  }, [appState.history, selectedMonth, selectedYear]);

  // Handlers for trackpad (wheel) and touch swipes to navigate by 10-day frames
  const handleWheelNav = (e) => {
    // only react to primarily horizontal wheel gestures
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;

    // accumulate horizontal deltas to make transitions stable/smooth
    wheelAccumRef.current += e.deltaX;
    const THRESH = 120; // pixels accumulated before changing frame
    const acc = wheelAccumRef.current;

    if (Math.abs(acc) >= THRESH) {
      const steps = Math.max(1, Math.floor(Math.abs(acc) / THRESH));
      if (acc > 0) {
        setMonthStartIndex((s) => Math.min(Math.max(0, monthData.length - 10), s + steps * 10));
      } else {
        setMonthStartIndex((s) => Math.max(0, s - steps * 10));
      }
      wheelAccumRef.current = 0;
      wheelLastRef.current = Date.now();
    }
  };

  const onTouchStart = (e) => {
    touchStartXRef.current = e.touches?.[0]?.clientX ?? null;
  };

  const onTouchEnd = (e) => {
    const start = touchStartXRef.current;
    if (start == null) return;
    const end = e.changedTouches?.[0]?.clientX ?? start;
    const diff = start - end;
    // increased threshold for more stable swipes
    if (Math.abs(diff) < 80) {
      touchStartXRef.current = null;
      return;
    }
    if (diff > 0) {
      // swipe left -> next
      setMonthStartIndex((s) => Math.min(Math.max(0, monthData.length - 10), s + 10));
    } else {
      // swipe right -> prev
      setMonthStartIndex((s) => Math.max(0, s - 10));
    }
    touchStartXRef.current = null;
  };

  // ✅ fetchWeeklyStats removed from here as it's now handled by fetchHistory + buildMonthData



  useEffect(() => {
    const coins = Number(appState.coins);
    if (!isNaN(coins) && coins > 0) {
      setShowZeroCoinsPopup(false);
    }
  }, [appState.coins]);





  // Initialize YT player when videoId is set OR set up local video listeners
  useEffect(() => {
    if (!videoId && !localVideoObjectUrl) return;

    setPlayerReady(false);
    setIsPlaying(false);
    setSessionPlayedSeconds(0);
    setTabSwitches(0);
    setSessionViewsTaken(0);
    setEarnedThisSessionCoins(false);
    setHasPlaybackStarted(false);
    const currentVideoKey = videoId || localVideoFile?.name;
    setNoteText(""); // 📓 Running notebook: start with empty textarea for new entries
    setTagText(appState.tags?.[currentVideoKey] || "");

    stopPolling();


    if (videoId) {
      function createYoutubePlayer() {
        if (!window.YT || !window.YT.Player) {
          setTimeout(createYoutubePlayer, 300);
          return;
        }
        if (youtubePlayerRef.current) {
          try {
            youtubePlayerRef.current.destroy();
          } catch (e) { }
          youtubePlayerRef.current = null;
        }

        const p = new window.YT.Player("vt-youtube-player", {
          videoId,
          playerVars: { controls: 1, rel: 0, modestbranding: 1 },
          events: {
            onReady: (e) => {
              setPlayerReady(true);
              setYoutubePlayerInstance(p);
              lastSampleRef.current = p.getCurrentTime() || 0;
              const dur = Math.round(p.getDuration?.() || 0);
              if (dur > 0) {
                setVideoMeta((prev) => (prev ? { ...prev, duration: dur } : { duration: dur }));
              }
              // Resume from saved position if available
              if (resumePosition > 0 && !hasResumedRef.current) {
                p.seekTo(resumePosition, true);
                hasResumedRef.current = true;
              }
            },
            onStateChange: (e) => {
              const state = e.data;
              if (state === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                startPolling();
                const dur = Math.round(p.getDuration?.() || 0);
                if (dur > 0) {
                  setVideoMeta((prev) => (prev ? { ...prev, duration: dur } : { duration: dur }));
                }
                if (resumePosition > 0 && !hasResumedRef.current) {
                  p.seekTo(resumePosition, true);
                  hasResumedRef.current = true;
                }
                if (isFocusTimerPending && !hasPlaybackStarted) {
                  setFocusRemaining(focusDuration);
                  setIsFocusTimerPending(false);
                  setHasPlaybackStarted(true);
                }
              } else {
                setIsPlaying(false);
                stopPolling();
                // Save resume progress on pause
                if (state === window.YT.PlayerState.PAUSED) {
                  const pos = p.getCurrentTime?.() || 0;
                  saveResumeProgress(videoId, pos);
                }
                if (state === window.YT.PlayerState.ENDED) {
                  isVideoEndingRef.current = true;
                  saveResumeProgress(videoId, 0); // Reset position on completion
                  finalizeSession(true);
                  updateVideosWatched(userId);
                  setTimeout(() => {
                    isVideoEndingRef.current = false;
                  }, 3000);
                }
              }
            },
            onError: (e) => {
              console.warn("YouTube Player error:", e.data);
              let msg = "This video cannot be played.";
              if (e.data === 101 || e.data === 150) {
                msg =
                  "The video owner does not allow this video to be played in embedded players. Please select another video from the YouTube search or paste a different link.";
              } else if (e.data === 100) {
                msg = "This video was removed or marked as private on YouTube.";
              } else if (e.data === 2) {
                msg = "Invalid YouTube video ID or parameter.";
              } else if (e.data === 5) {
                msg = "HTML5 player error occurred while playing this video.";
              }
              setPlayerError(msg);
            },
          },
        });
        youtubePlayerRef.current = p;
      }
      createYoutubePlayer();
    } else if (localVideoObjectUrl) {
      const videoElement = localVideoRef.current;
      if (!videoElement) return;

      const onPlay = () => {
        setIsPlaying(true);
        startPolling();
        if (isFocusTimerPending && !hasPlaybackStarted) {
          setFocusRemaining(focusMinutes * 60);

          //setFocusRemaining(focusDuration);
          setIsFocusTimerPending(false);
          setHasPlaybackStarted(true);
        }
      };
      const onPause = () => {
        setIsPlaying(false);
        stopPolling();
      };
      const onEnded = () => {
        isVideoEndingRef.current = true;
        setIsPlaying(false);
        stopPolling();
        if (sessionPlayedSeconds >= 5) {
          handleStopSave();
        } else {
          finalizeSession(true);
          updateVideosWatched(userId);
        }
        setTimeout(() => {
          isVideoEndingRef.current = false;
        }, 3000);
      };
      const onTimeUpdate = () => {
        setCurrentTime(videoElement.currentTime);
      };
      const onReady = () => {
        setPlayerReady(true);
        lastSampleRef.current = videoElement.currentTime || 0;
      };


      videoElement.addEventListener("play", onPlay);
      videoElement.addEventListener("pause", onPause);
      videoElement.addEventListener("ended", onEnded);
      videoElement.addEventListener("timeupdate", onTimeUpdate);
      videoElement.addEventListener("loadedmetadata", onReady);

      if (videoElement.readyState >= 1) {
        onReady();
      }

      return () => {
        videoElement.removeEventListener("play", onPlay);
        videoElement.removeEventListener("pause", onPause);
        videoElement.removeEventListener("ended", onEnded);
        videoElement.removeEventListener("timeupdate", onTimeUpdate);
        videoElement.removeEventListener("loadedmetadata", onReady);
        stopPolling();
      };
    }

    return () => stopPolling();
  }, [videoId, localVideoObjectUrl]);

  // ─── Resume progress save: every 60 seconds while playing ──────────
  useEffect(() => {
    if (!videoId || !isPlaying) {
      if (resumeIntervalRef.current) {
        clearInterval(resumeIntervalRef.current);
        resumeIntervalRef.current = null;
      }
      return;
    }
    resumeIntervalRef.current = setInterval(() => {
      const player = youtubePlayerRef.current;
      if (player?.getCurrentTime) {
        const pos = player.getCurrentTime();
        saveResumeProgress(videoId, pos);
      }
    }, 60000); // every 60 seconds
    return () => {
      if (resumeIntervalRef.current) {
        clearInterval(resumeIntervalRef.current);
        resumeIntervalRef.current = null;
      }
    };
  }, [videoId, isPlaying]);

  // Save progress on unmount
  useEffect(() => {
    return () => {
      if (videoId && youtubePlayerRef.current?.getCurrentTime) {
        const pos = youtubePlayerRef.current.getCurrentTime();
        saveResumeProgress(videoId, pos);
      }
    };
  }, [videoId]);


  // useEffect(() => {
  //   if (!showCameraAnalysis) return;

  //   let camera = null;
  //   let faceMesh = null;

  //   // ✅ throttle (5 sec me 1 baar save)
  //   let lastSentTime = 0;

  //   const startFaceMesh = async () => {
  //     try {
  //       faceMesh = new FaceMesh({
  //         locateFile: (file) =>
  //           `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
  //       });

  //       faceMesh.setOptions({
  //         maxNumFaces: 3, // ✅ multiple faces detect
  //         refineLandmarks: true,
  //         minDetectionConfidence: 0.6,
  //         minTrackingConfidence: 0.6,
  //       });

  //       faceMesh.onResults((results) => {
  //         const facesCount = results?.multiFaceLandmarks?.length || 0;

  //         let direction = "unknown";
  //         let focused = false;

  //         // ✅ 1 face = focused
  //         if (facesCount === 1) {
  //           focused = true;

  //           const lm = results.multiFaceLandmarks[0];
  //           const nose = lm[1];

  //           // Left/Right/Center detection
  //           if (nose.x < 0.42) direction = "left";
  //           else if (nose.x > 0.58) direction = "right";
  //           else direction = "center";
  //         }

  //         // 🚨 No face or multiple faces => not focused
  //         if (facesCount === 0 || facesCount > 1) {
  //           focused = false;
  //         }

  //         // ✅ payload (backend ke according)
  //         const payload = {
  //           focused,
  //           faces_count: facesCount,
  //           direction,
  //         };

  //         // UI update
  //         setCameraAnalysisResult(JSON.stringify(payload));

  //         // ================== ✅ WARNINGS ==================
  //         if (facesCount === 0) {
  //           showTopWarning("Face not detected! Please sit properly 👀");
  //         } else if (facesCount > 1) {
  //           showTopWarning("Multiple faces detected! Only you should be present 🚫");
  //         } else {
  //           // 1 face but looking away
  //           if (direction === "left" || direction === "right") {
  //             showTopWarning(`You are looking ${direction}. Focus on screen 📌`);
  //           }
  //         }
  //         // =================================================

  //         // ✅ backend save (5 sec me 1 baar)
  //         const now = Date.now();
  //         if (now - lastSentTime > 60000) {
  //           lastSentTime = now;
  //           saveDetectionToBackend(payload);
  //         }
  //       });

  //       // ✅ Start camera
  //       camera = new Camera(cameraVideoRef.current, {
  //         onFrame: async () => {
  //           if (cameraVideoRef.current) {
  //             await faceMesh.send({ image: cameraVideoRef.current });
  //           }
  //         },
  //         width: 640,
  //         height: 480,
  //       });

  //       camera.start();
  //     } catch (err) {
  //       console.error("FaceMesh error:", err);
  //       setCameraAnalysisResult(
  //         JSON.stringify({ error: err.message || "FaceMesh failed" })
  //       );
  //     }
  //   };

  //   startFaceMesh();

  //   return () => {
  //     if (camera) camera.stop();
  //     if (faceMesh) faceMesh.close();
  //   };
  // }, [showCameraAnalysis]);



  // Polling logic
  const startPolling = () => {
    if (pollRef.current) return;

    const getPlayerCurrentTime = () => {
      if (videoId && youtubePlayerRef.current?.getCurrentTime) {
        return youtubePlayerRef.current.getCurrentTime() || 0;
      } else if (localVideoRef.current) {
        return localVideoRef.current.currentTime || 0;
      }
      return 0;
    };

    lastSampleRef.current = getPlayerCurrentTime();
    pollRef.current = setInterval(() => {
      const now = getPlayerCurrentTime();
      lastSampleRef.current = now;
      setCurrentTime(now);
    }, 1000);
  };
  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };





  // --- BACKEND SYNC ON TAB HIDE ---
  // other hooks, states, and helper functions above...

  // ✅ Unified visibility handler — only deduct coins if focus timer is running
  // // --- Deduct coins if focus timer is running ---
  // useEffect(() => {
  //   let lastHiddenTime = 0;
  //   let tabSwitchTriggered = false; 
  //   let timeoutId = null;
  //   let lastSwitchTimestamp = 0; // 🧠 prevents backend double fire within same second




  //   const handleVisibilityChange = async () => {
  //     const now = Date.now();

  //     // ✅ Case: Tab hidden → Deduct once
  //    if (document.visibilityState === "hidden" && focusRemaining > 0 && !tabSwitchTriggered) {

  //       // Prevent double-trigger if called twice quickly
  //       if (now - lastSwitchTimestamp < 800) return; // 🔒 stops 2 backend calls
  //       lastSwitchTimestamp = now;

  //       tabSwitchTriggered = true; 
  //       lastHiddenTime = now;

  //       if (focusRemaining > 0) {
  //         const deducted = TAB_SWITCH_COST;

  //         try {
  //           // ✅ 1. Deduct coins (backend)
  //           await updateBackendCoins(deducted);

  //           // ✅ 2. Update frontend coins
  //           setAppState((prev) => {
  //             const newCoins = Math.max((prev.coins || 0) - deducted, 0);
  //             if (newCoins <= 0) setShowZeroCoinsPopup(true);
  //             return { ...prev, coins: newCoins };
  //           });

  //           // ✅ 3. Update backend tab switch (only once)
  //           try {
  //             await updateVideosSwitched(userId);
  //             console.log("📡 Backend tab switch +1 ✅");
  //           } catch (e) {
  //             console.error("⚠️ Failed backend update:", e);
  //           }

  //           // ✅ 4. Update frontend display (+1)
  //           setTabSwitches((prev) => prev + 1);
  //           console.log("📊 Local tab switch +1 ✅");

  //         } catch (e) {
  //           console.error("❌ Coin deduction failed:", e);
  //         }
  //       }

  //       // ✅ Continue timer; don't reset watched seconds
  //       // if (sessionPlayedSeconds > 0 && !earnedThisSessionCoins) {
  //       //   finalizeSession(false);
  //       // }
  //       // console.log("▶️ Timer continuing normally after tab switch");
  //     }

  //     // ✅ Unlock next switch (after small delay)
  //     if (document.visibilityState === "visible") {
  //       clearTimeout(timeoutId);
  //       timeoutId = setTimeout(() => {
  //         tabSwitchTriggered = false;
  //       }, 600);
  //     }
  //   };

  //   document.addEventListener("visibilitychange", handleVisibilityChange);
  //   return () => {
  //     document.removeEventListener("visibilitychange", handleVisibilityChange);
  //     clearTimeout(timeoutId);
  //   };
  // }, [isPlaying, focusRemaining, sessionPlayedSeconds, earnedThisSessionCoins, userId]);



  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);


  useEffect(() => {
    let tabSwitchTriggered = false;
    let timeoutId = null;
    let lastSwitchTimestamp = 0;

    const handleVisibilityChange = async () => {
      // 1. When leaving this tab to go to another tab:
      if (document.visibilityState === "hidden") {
        if (isVideoEndingRef.current) return;

        // Tab switch ONLY counts when focus timer is active AND actively running with video playing
        // If video is paused, focus timer is paused, or focus timer is not active -> DO NOT count tab switch!
        const isLocalActive = Boolean(
          localVideoRef.current &&
          !localVideoRef.current.paused &&
          !localVideoRef.current.ended &&
          localVideoRef.current.readyState >= 2
        );
        const isYtActive = Boolean(
          youtubePlayerRef.current?.getPlayerState &&
          youtubePlayerRef.current.getPlayerState() === 1
        );
        const isVideoPlaying = isLocalActive || isYtActive || isPlayingRef.current;
        const isFocusTimerRunning = Boolean(
          focusRemainingRef.current !== null &&
          focusRemainingRef.current > 0 &&
          isVideoPlaying
        );

        if (!isFocusTimerRunning || tabSwitchTriggered) return;

        const now = Date.now();
        if (now - lastSwitchTimestamp < 1000) return;
        lastSwitchTimestamp = now;

        tabSwitchTriggered = true;

        const deducted = TAB_SWITCH_COST; // 5 coins

        // ✅ Optimistically deduct 5 coins once and increment tab switch counter
        setAppState((prev) => {
          const newCoins = Math.max((prev.coins || 0) - deducted, 0);
          if (newCoins <= 0) setShowZeroCoinsPopup(true);
          return { ...prev, coins: newCoins };
        });

        setTabSwitches((prev) => prev + 1);

        try {
          await updateBackendCoins(deducted);
          console.log("📊 Tab switch +1, -5 coins ✅");
        } catch (e) {
          console.error("❌ Coin deduction failed:", e);
        }
        return;
      }

      // 2. When returning to this tab:
      // Wapas aane par kuch nahi karna, sirf flag unlock karna hai next switch ke liye
      if (document.visibilityState === "visible") {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          tabSwitchTriggered = false;
        }, 500);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimeout(timeoutId);
    };
  }, [userId]);



  const cleanupAfterSession = () => {
    try {
      if (playerRef?.current) {
        playerRef.current.pauseVideo?.();
        playerRef.current = null;
      }
      // setSessionPlayedSeconds(0);
      setSessionViewsTaken(0);
      console.log("🧹 Focus session cleaned up!");
    } catch (err) {
      console.error("Cleanup failed:", err);
    }
  };





  // --- SESSION FINALIZE ---
  // ✅ Finalize and reward focus session
  const finalizeSession = async (ended = false) => {
    if (window.__alreadyFinalized) {
      console.log("⛔ finalize blocked (already ran)");
      return;
    }
    window.__alreadyFinalized = true;

    const currentVideoIdentifier = videoId || localVideoFile?.name;
    if (!currentVideoIdentifier) return;

    // ✅ +2 reward for completing focus session
    const reward = 2;

    try {
      console.log("🎬 Finalizing session... checking penalty order");

      // 🕒 Small delay ensures any -5 deduction from tab switch is processed first
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // ✅ Reward 2 coins for focus session completion
      if (!earnedThisSessionCoins) {
        await updateBackendCoinsGain(reward);
        setEarnedThisSessionCoins(true);
        console.log(`🎉 Focus session complete — +${reward} coins saved!`);
      }
    } catch (error) {
      console.error("❌ Error finalizing session:", error);
    } finally {
      cleanupAfterSession(ended);
      setTimeout(() => {
        window.__alreadyFinalized = false;
        console.log("🔓 finalize unlocked");
      }, 2000);
    }
  };


  // Data computation

  // Removed redundant effects


  // Save on unload
  useEffect(() => {
    const onBeforeUnload = () => {
      if (isPlaying && (sessionPlayedSeconds > 0 || sessionViewsTaken > 0)) {
        finalizeSession(false);
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isPlaying, sessionPlayedSeconds, sessionViewsTaken, videoId, localVideoFile]);

  // Utility
  const niceTime = (s) => {
    s = Math.floor(s);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h) return `${h}h ${m}m ${sec}s`;
    return m ? `${m}m ${sec}s` : `${sec}s`;
  };

  const currentActiveVideoIdentifier = videoId || localVideoFile?.name;
  const isVideoLoaded = videoId || localVideoObjectUrl;

  const displayTags = (() => {
    if (tagText?.trim()) return [tagText.trim()];
    if (appState.tags?.[currentActiveVideoIdentifier]) return [appState.tags[currentActiveVideoIdentifier]];
    if (videoMeta?.tags && Array.isArray(videoMeta.tags) && videoMeta.tags.length > 0) return videoMeta.tags.slice(0, 3);
    const title = (videoMeta?.title || localVideoFile?.name || "").toLowerCase();
    const tags = [];
    if (title.includes("graph") || title.includes("math") || title.includes("discrete")) tags.push("Discrete Maths");
    if (title.includes("gate") || title.includes("exam") || title.includes("cse")) tags.push("GATE 2024");
    if (tags.length === 0) {
      if (videoId || localVideoFile) tags.push("Study", "Focus");
      else tags.push("Focus Mode", "StudyBuddy", "Smart Tracking");
    }
    return tags;
  })();

  // --- THIS IS THE ONLY UPDATED PART ---
  const getAnalysisString = () => {
    if (!cameraAnalysisResult) return "Waiting for analysis...";

    try {
      const result = JSON.parse(cameraAnalysisResult);

      if (result.error) return `Error: ${result.error}`;

      let status = `Focused: ${result.focused ? "✅ Yes" : "❌ No"}\n`;
      status += `Faces Detected: ${result.faces_count}\n`;

      if (result.faces_count === 0) {
        status += "⚠️ No face detected";
      } else if (result.faces_count > 1) {
        status += "🚨 Multiple faces detected";
      } else {
        status += `Direction: ${result.direction}\n`;
        if (result.direction === "left" || result.direction === "right") {
          status += "⚠️ Please look at the screen";
        }
      }

      return status;
    } catch (e) {
      return "Waiting for valid data...";
    }
  };




  // ─── YouTube Data Fetchers ───────────────────────────────────────────
  const loadYouTubeData = async (vid) => {
    if (!vid) return;
    setMetaLoading(true);
    setMetaError('');
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/youtube/video?videoId=${vid}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setVideoMeta({
          title: data.title,
          description: data.description,
          channelTitle: data.channelTitle,
          thumbnail: data.thumbnail,
          duration: data.duration,
          studyScore: data.studyScore,
        });
        if (data.lastWatchedPosition) {
          setResumePosition(data.lastWatchedPosition);
        }
      } else {
        setMetaError(data.message || 'Failed to load video info');
      }
    } catch (err) {
      console.error("loadYouTubeData error:", err);
      setMetaError('Could not fetch video metadata');
    } finally {
      setMetaLoading(false);
    }
  };

  const saveResumeProgress = async (vid, position) => {
    if (!vid || position == null) return;
    try {
      const floorPos = Math.floor(position);
      setAppState((prev) => {
        const updated = (prev.history || []).map((h) => {
          const match = String(h.videoId || h.url || "").match(
            /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
          );
          const hId = match ? match[1] : h.videoId;
          if (hId === vid) {
            return { ...h, lastWatchedPosition: floorPos };
          }
          return h;
        });
        return { ...prev, history: updated };
      });

      const token = localStorage.getItem("token");
      await fetch(`${API_BASE}/api/youtube/save-progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        credentials: "include",
        body: JSON.stringify({ videoId: vid, position: floorPos }),
      });
      lastProgressSaveRef.current = Date.now();
    } catch (err) {
      console.error("saveResumeProgress error:", err);
    }
  };

  // Extract playlistId from a YouTube URL if present
  const extractPlaylistId = (url) => {
    if (!url) return null;
    const m = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  };

  const loadPlaylistForUrl = async (url) => {
    const plId = extractPlaylistId(url);
    if (!plId) { setPlaylistItems([]); return; }
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/youtube/playlist?playlistId=${plId}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data.success && data.items) {
        setPlaylistItems(data.items);
      }
    } catch (err) {
      console.error("loadPlaylistForUrl error:", err);
    }
  };

  // Handle clicking a video from the playlist panel
  const handlePlaylistVideoClick = async (vid) => {
    if (!vid) return;
    const allowed = await isStudyVideo(vid);
    if (!allowed) {
      setBlockedTitle("This video is not study related!");
      setShowBlockedPopup(true);
      playRestrictionSound();
      return;
    }
    const currentPlId = extractPlaylistId(inputUrl);
    const newUrl = currentPlId
      ? `https://www.youtube.com/watch?v=${vid}&list=${currentPlId}`
      : `https://www.youtube.com/watch?v=${vid}`;

    setInputUrl(newUrl);
    setVideoId(vid);
    setLocalVideoFile(null);
    setVideoMeta(null);
    setResumePosition(0);
    setSessionPlayedSeconds(0);
    setTabSwitches(0);
    hasResumedRef.current = false;
    loadYouTubeData(vid);

    // Command active YouTube player to load & play video in-place inside the tracker
    if (youtubePlayerRef.current) {
      try {
        if (typeof youtubePlayerRef.current.loadVideoById === "function") {
          youtubePlayerRef.current.loadVideoById({ videoId: vid });
        }
      } catch (err) {
        console.error("Error loading video in YT player:", err);
      }
    }

    // Smooth scroll up to top player container so user sees the video playing
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle clicking a saved session card to re-open in tracker
  const handleSessionCardClick = async (e, historyEntry) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!historyEntry?.videoId) return;
    const vid = historyEntry.videoId;
    const isLocal =
      !/^[0-9A-Za-z_-]{11}$/.test(vid) ||
      historyEntry.url === "Local Video" ||
      historyEntry.url === "Local File" ||
      (historyEntry.url && !historyEntry.url.startsWith("http"));

    if (isLocal) {
      if (
        localVideoFile &&
        (localVideoFile.name === vid || localVideoFile.name === historyEntry.videoTitle)
      ) {
        setShowWatchHistoryModal(false);
        setShowLogsModal(false);
        setSessionPlayedSeconds(0);
        setTabSwitches(0);
        if (localVideoRef.current) {
          const pos = historyEntry.lastWatchedPosition || 0;
          localVideoRef.current.currentTime = pos;
          localVideoRef.current.play().catch(() => { });
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setShowWatchHistoryModal(false);
        setShowLogsModal(false);
        alert(
          `📁 To resume "${historyEntry.videoTitle || vid}", please choose it using "Choose Video from System".`
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
        const fileInput = document.getElementById("local-video-upload");
        if (fileInput) fileInput.click();
      }
      return;
    }

    const allowed = await isStudyVideo(vid);
    if (!allowed) {
      setBlockedTitle("This video is not study related!");
      setShowBlockedPopup(true);
      playRestrictionSound();
      return;
    }
    const pos = historyEntry.lastWatchedPosition || historyEntry.secondsWatched || 0;
    setInputUrl(`https://youtu.be/${vid}`);
    setVideoId(vid);
    setLocalVideoFile(null);
    setVideoMeta(null);
    setResumePosition(pos);
    setSessionPlayedSeconds(0);
    setTabSwitches(0);
    hasResumedRef.current = false;
    loadYouTubeData(vid);
    setShowTimerPopup(true);
  };

  const getUniqueVideoCards = (historyArr = []) => {
    const cardsMap = new Map();
    historyArr.forEach((item) => {
      const rawId = item.videoId || item.url;
      if (!rawId) return;
      let key = String(rawId).trim();
      const match = key.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (match) key = match[1];

      const secs = Number(item.secondsWatched ?? item.seconds ?? 0) || 0;
      const switches = Number(item.tabSwitches || 0);
      const note = item.note || appState.notes?.[key] || "";
      const tag = item.tag || appState.tags?.[key] || "";
      const isYoutube = /^[0-9A-Za-z_-]{11}$/.test(key);
      const thumbnail = item.thumbnail || (isYoutube ? `https://img.youtube.com/vi/${key}/mqdefault.jpg` : null);

      const itemDuration = Number(item.duration || item.videoDuration || 0);
      const itemLastPos = Number(item.lastWatchedPosition || 0);

      if (!cardsMap.has(key)) {
        cardsMap.set(key, {
          ...item,
          videoId: key,
          thumbnail,
          channelTitle: item.channelTitle || (isYoutube ? "GATE Wallah CSE & DA" : "Local Video File"),
          studyScore: item.studyScore || 75,
          totalSecondsWatched: secs,
          totalTabSwitches: switches,
          latestWatchedAt: item.watchedAt,
          duration: itemDuration,
          lastWatchedPosition: itemLastPos,
          note,
          tag,
        });
      } else {
        const existing = cardsMap.get(key);
        existing.totalSecondsWatched += secs;
        existing.totalTabSwitches += switches;
        if (thumbnail && !existing.thumbnail) existing.thumbnail = thumbnail;
        if (note) existing.note = note;
        if (tag) existing.tag = tag;
        if (item.videoTitle) existing.videoTitle = item.videoTitle;
        if (item.watchedAt) existing.latestWatchedAt = item.watchedAt;
        if (item.channelTitle) existing.channelTitle = item.channelTitle;
        if (item.studyScore) existing.studyScore = item.studyScore;
        if (itemDuration > 0) {
          existing.duration = Math.max(existing.duration || 0, itemDuration);
        }
        if (itemLastPos > 0) {
          existing.lastWatchedPosition = Math.max(existing.lastWatchedPosition || 0, itemLastPos);
        }
      }
    });
    return Array.from(cardsMap.values());
  };

  const uniqueCards = useMemo(() => getUniqueVideoCards(appState.history || []), [appState.history, appState.notes, appState.tags]);

  const enrichedVideoIdsRef = useRef(new Set());

  // Auto-enrich any YouTube cards that lack actual duration
  useEffect(() => {
    if (!uniqueCards || uniqueCards.length === 0) return;
    const token = localStorage.getItem("token");
    const missingDurationItems = uniqueCards.filter(
      (c) =>
        /^[0-9A-Za-z_-]{11}$/.test(c.videoId) &&
        (!c.duration || Number(c.duration) <= 0) &&
        !enrichedVideoIdsRef.current.has(c.videoId)
    );
    if (missingDurationItems.length === 0) return;

    missingDurationItems.forEach((c) => enrichedVideoIdsRef.current.add(c.videoId));

    missingDurationItems.slice(0, 5).forEach((item) => {
      fetch(`${API_BASE}/api/youtube/video?videoId=${item.videoId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success && data.duration > 0) {
            setAppState((prev) => {
              const updated = (prev.history || []).map((h) => {
                const match = String(h.videoId || h.url || "").match(
                  /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
                );
                const hId = match ? match[1] : h.videoId;
                if (hId === item.videoId) {
                  return {
                    ...h,
                    duration: data.duration,
                    videoTitle: h.videoTitle || data.title,
                    thumbnail: h.thumbnail || data.thumbnail,
                  };
                }
                return h;
              });
              return { ...prev, history: updated };
            });
          }
        })
        .catch(() => {});
    });
  }, [uniqueCards]);

  const scrollSlider = (direction) => {
    if (videoSliderRef.current) {
      const scrollAmount = 280;
      videoSliderRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const handleOutsideClick = () => setOpenMenuCardId(null);
    if (openMenuCardId) {
      window.addEventListener("click", handleOutsideClick);
      return () => window.removeEventListener("click", handleOutsideClick);
    }
  }, [openMenuCardId]);

  // 🔍 YouTube In-App Search Handlers
  const handleYouTubeSearch = async (e, customQuery = null, pageToken = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const query = (customQuery !== null ? customQuery : searchQuery).trim();
    if (!query) return;

    if (customQuery !== null) {
      setSearchQuery(customQuery);
    }

    // If user entered or pasted a direct YouTube link into the search bar, directly load video!
    const ytMatch = query.match(
      /(?:v=|\/|youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([0-9A-Za-z_-]{11})(?:[?&]|$)/
    );
    if (!pageToken && ytMatch && ytMatch[1]) {
      handleLoadContent(query);
      return;
    }

    const isLoadMore = Boolean(pageToken);
    if (isLoadMore) {
      setSearchLoadingMore(true);
    } else {
      setSearchLoading(true);
      setSearchError(null);
      setSearchQuotaExceeded(false);
    }

    try {
      const token = localStorage.getItem("token");
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const queryParams = new URLSearchParams({
        q: query,
        maxResults: "10",
        ...(pageToken ? { pageToken } : {}),
      });

      const endpoint = `${API_BASE}/api/youtube/search?${queryParams.toString()}`;

      let res = await fetch(endpoint, {
        headers,
        credentials: "include",
      });

      // If server rejected with 401 due to stale/expired token, retry once without Authorization header
      if (res.status === 401 && token) {
        try {
          const fallbackRes = await fetch(endpoint, { credentials: "include" });
          if (fallbackRes.ok) {
            res = fallbackRes;
          }
        } catch (_) {}
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.quotaExceeded) {
          setSearchQuotaExceeded(true);
          setSearchError("YouTube API daily quota exceeded. You can still paste direct video URLs in the 'Paste Link' tab!");
        } else if (data.configured === false || data.message?.includes("YOUTUBE_API_KEY")) {
          setSearchError("YouTube API key is not configured on your deployed server. Please add YOUTUBE_API_KEY in your hosting dashboard environment variables (e.g. Render / Railway).");
        } else {
          setSearchError(data.message || "Failed to search YouTube videos.");
        }
        return;
      }

      setHasSearched(true);
      setSearchNextPageToken(data.nextPageToken || null);
      if (isLoadMore) {
        setSearchResults((prev) => {
          const existingIds = new Set(prev.map((i) => i.videoId));
          const newItems = (data.items || []).filter((i) => !existingIds.has(i.videoId));
          return [...prev, ...newItems];
        });
      } else {
        setSearchResults(data.items || []);
      }
    } catch (err) {
      console.error("YouTube search error:", err);
      setSearchError("Network error while searching YouTube. Please check your connection.");
    } finally {
      setSearchLoading(false);
      setSearchLoadingMore(false);
    }
  };

  const handleSelectSearchResult = async (item) => {
    if (!item || !item.videoId) return;

    if (appState.coins === 0) {
      setShowZeroCoinsPopup(true);
      return;
    }

    const vid = item.videoId;

    // Study relevance check
    const allowed = await isStudyVideo(vid);
    if (!allowed) {
      setBlockedTitle("This video is not study related!");
      setShowBlockedPopup(true);
      playRestrictionSound();
      return;
    }

    // Save previous video session cleanly if user watched >= 5s
    const playedSeconds = sessionPlayedSecondsRef.current ?? sessionPlayedSeconds;
    if (playedSeconds >= 5 && handleStopSaveRef.current) {
      try {
        await handleStopSaveRef.current(false);
      } catch (err) {
        console.warn("Could not save previous session:", err);
      }
    }

    setPlayerError(null);
    setInputUrl(`https://www.youtube.com/watch?v=${vid}`);
    setVideoId(vid);
    setLocalVideoFile(null);
    setLocalVideoObjectUrl(null);
    setVideoMeta({
      title: item.title,
      channelTitle: item.channelTitle,
      thumbnail: item.thumbnail,
      duration: item.duration || 0,
      description: item.description || "",
      isStudyVideo: true,
      studyScore: 100,
    });
    setResumePosition(0);
    setSessionPlayedSeconds(0);
    setTabSwitches(0);
    hasResumedRef.current = false;

    // Fetch full metadata & transcript from backend
    loadYouTubeData(vid);

    // If player is already loaded, switch video in-place
    if (youtubePlayerRef.current && typeof youtubePlayerRef.current.loadVideoById === "function") {
      try {
        youtubePlayerRef.current.loadVideoById({ videoId: vid });
      } catch (err) {
        console.warn("Could not load video in active player:", err);
      }
    }

    // Prompt focus timer setup modal just like handleLoadContent does
    setShowTimerPopup(true);

    // Smooth scroll up to top player container
    window.scrollTo({ top: 0, behavior: "smooth" });

    triggerNotification({
      title: "Lesson Loaded",
      subtitle: item.title,
      badge: "▶ Playing Now",
      badgeColor: "#10b981",
      icon: "🎓",
      details: [
        `Channel: ${item.channelTitle}`,
        `Duration: ${item.durationFormatted || "Full Video"}`,
      ],
      buttonText: "Let's Study",
    });
  };

  const handleLoadContent = async (overrideUrl = null) => {
    if (appState.coins === 0) {
      setShowZeroCoinsPopup(true);
      return;
    }

    const effectiveUrl = (typeof overrideUrl === "string" ? overrideUrl : inputUrl)?.trim() || "";

    if (!effectiveUrl && !localVideoFile) {
      alert("Please provide a video URL or upload a video file first!");
      return;
    }

    // If YouTube URL given
    if (effectiveUrl) {
      const match = effectiveUrl.match(
        /(?:v=|\/|youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([0-9A-Za-z_-]{11})(?:[?&]|$)/
      );

      if (!match || !match[1]) {
        alert("Invalid YouTube URL or ID!");
        return;
      }

      const id = match[1];

      // 🔥 Study Check
      const allowed = await isStudyVideo(id);
      if (!allowed) {
        setBlockedTitle("This video is not study related!");
        setShowBlockedPopup(true);
        playRestrictionSound();
        return;
      }

      // Set video ID and reset local file
      setVideoId(id);
      setInputUrl(effectiveUrl);
      setLocalVideoFile(null);
      setSessionPlayedSeconds(0);
      setTabSwitches(0);
      // Fetch video metadata and transcript from backend
      loadYouTubeData(id);
      // Load playlist if URL contains a playlist parameter
      loadPlaylistForUrl(effectiveUrl);
      setShowTimerPopup(true);
      return;
    }

    // If local video chosen
    if (localVideoFile) {
      setVideoId(null);
      setSessionPlayedSeconds(0);
      setTabSwitches(0);
      setShowTimerPopup(true);
      // Local video handling unchanged
    }
  };


  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (sessionPlayedSeconds >= 5) {
        handleStopSave();
      }
      setVideoId(null);
      setVideoMeta(null);
      setInputUrl(""); // Clear any YouTube link
      setLocalVideoFile(file);
      setSessionPlayedSeconds(0);
      setTabSwitches(0);
      setFocusRemaining(null);
      setIsPlaying(false);
      e.target.value = ""; // Allow re-selecting the same file if needed
      setShowTimerPopup(true); // Open the focus timer popup for local video
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("videoHistory");
    setVideoId(null);
    setLocalVideoFile(null);
    setLocalVideoObjectUrl(null);
    setInputUrl("");
    setIsPlaying(false);
    setSessionPlayedSeconds(0);
    setTabSwitches(0);
    console.log("History & player reset!");
  };

  const confirmStartFocus = () => {
    if (appState.coins <= 0) {
      alert("You don’t have enough coins to start a focus session!");
      return;
    }

    // Start the focus timer (or any logic you had before)
    setIsFocusTimerPending(true);
    setFocusRemaining(focusDuration);
    console.log("Focus session started!");
  };


  // ✅ fetchWeeklyStats removed from here as it's redundant







  const handleStopSave = async (isFocusComplete = false) => {
    try {
      const isFocus = isFocusComplete === true;
      isVideoEndingRef.current = true;
      setTimeout(() => {
        isVideoEndingRef.current = false;
      }, 3000);

      // 1. Instant Player Pause & Resume Save
      if (youtubePlayerInstance?.pauseVideo) youtubePlayerInstance.pauseVideo();
      else if (localVideoRef.current && !localVideoRef.current.paused)
        localVideoRef.current.pause();

      const currentVideoKey = videoId || localVideoFile?.name;
      const currentVideoTitle = videoMeta?.title || localVideoFile?.name || currentVideoKey || "Study Video";
      const isLocal = !videoId && Boolean(localVideoFile || localVideoObjectUrl);

      if (videoId && youtubePlayerRef.current?.getCurrentTime) {
        saveResumeProgress(videoId, youtubePlayerRef.current.getCurrentTime());
      } else if (isLocal && localVideoRef.current) {
        saveResumeProgress(currentVideoKey, localVideoRef.current.currentTime || 0);
      }

      const playedSeconds = sessionPlayedSecondsRef.current ?? sessionPlayedSeconds;
      if (!isFocus && (!playedSeconds || playedSeconds < 5)) {
        triggerNotification({
          title: "Session Too Short",
          subtitle: "Please watch at least 5 seconds before saving your study session.",
          badge: "⚠️ Notice",
          badgeColor: "#f59e0b",
          icon: "⏳",
          details: ["Sessions under 5 seconds are not logged to prevent clutter."],
          buttonText: "Understood",
        });
        return;
      }

      const watchedSeconds = Math.max(1, Math.round(playedSeconds || 1));
      const totalTabSwitches = tabSwitchesRef.current ?? tabSwitches;
      const currentNoteToSave = (noteTextRef.current ?? noteText).trim();
      const currentTagToSave = (tagTextRef.current ?? tagText).trim();

      const existingNote = appState.notes?.[currentVideoKey] || "";
      const cumulativeNote = (existingNote ? existingNote + (currentNoteToSave ? "\n" + currentNoteToSave : "") : currentNoteToSave).trim();

      const token = localStorage.getItem("token");

      // Reward 2 coins if completing focus session
      if (isFocus) {
        setAppState((app) => ({
          ...app,
          coins: (app.coins || 0) + 2,
        }));
        try {
          await updateBackendCoinsGain(2);
        } catch (e) {
          console.error("Coin gain error:", e);
        }
      }

      // 2. INSTANT Optimistic UI Update (Zero Latency)
      setAppState((prev) => {
        const updatedNotes = { ...(prev.notes || {}), [currentVideoKey]: cumulativeNote };
        const updatedTags = { ...(prev.tags || {}), [currentVideoKey]: currentTagToSave };

        const todayStr = getLocalDateString();
        const updatedHistory = [...(prev.history || [])];
        const existingIdx = updatedHistory.findIndex(
          (h) => (h.videoId === currentVideoKey || h.url?.includes(currentVideoKey) || currentVideoKey?.includes(h.videoId)) && (h.watchedAt ? (typeof h.watchedAt === "string" ? (h.watchedAt.split("T")[0] || h.watchedAt) : getLocalDateString(h.watchedAt)) : "") === todayStr
        );

        const currentPlaybackPos = Math.round(
          (videoId && youtubePlayerRef.current?.getCurrentTime ? youtubePlayerRef.current.getCurrentTime() : localVideoRef.current?.currentTime) ||
          currentTime ||
          0
        );

        if (existingIdx !== -1) {
          const item = { ...updatedHistory[existingIdx] };
          item.secondsWatched = (item.secondsWatched || item.seconds || 0) + watchedSeconds;
          item.tabSwitches = (item.tabSwitches || 0) + totalTabSwitches;
          item.watchedAt = todayStr;
          if (cumulativeNote) item.note = cumulativeNote;
          if (currentTagToSave) item.tag = currentTagToSave;
          if (!item.videoTitle || item.videoTitle === item.videoId) item.videoTitle = currentVideoTitle;
          if (videoMeta?.duration) item.duration = videoMeta.duration;
          if (videoMeta?.studyScore && !item.studyScore) item.studyScore = videoMeta.studyScore;
          if (currentPlaybackPos > 0) {
            item.lastWatchedPosition = Math.max(item.lastWatchedPosition || 0, currentPlaybackPos);
          }
          updatedHistory.splice(existingIdx, 1);
          updatedHistory.unshift(item);
        } else {
          updatedHistory.unshift({
            videoId: currentVideoKey,
            videoTitle: currentVideoTitle,
            url: videoId ? `https://youtu.be/${videoId}` : localVideoFile?.name || "Local Video",
            secondsWatched: watchedSeconds,
            tabSwitches: totalTabSwitches,
            watchedAt: todayStr,
            duration: videoMeta?.duration || Math.round(localVideoRef.current?.duration || 0),
            lastWatchedPosition: currentPlaybackPos,
            studyScore: videoMeta?.studyScore || 75,
            note: cumulativeNote,
            tag: currentTagToSave,
            isStudyVideo: true,
          });
        }

        if (userId) {
          localStorage.setItem(`userHistory_${userId}`, JSON.stringify(updatedHistory));
        }

        return {
          ...prev,
          notes: updatedNotes,
          tags: updatedTags,
          history: updatedHistory,
        };
      });

      // Clear note textarea and reset session timer
      setNoteText("");
      setSessionPlayedSeconds(0);
      setTabSwitches(0);
      finalizeSession(true);

      const currentPlaybackPos = Math.round(
        (videoId && youtubePlayerRef.current?.getCurrentTime ? youtubePlayerRef.current.getCurrentTime() : localVideoRef.current?.currentTime) ||
        currentTime ||
        0
      );

      // 3. Parallel background API requests (All in 1 click)
      fetch(`${API_BASE}/api/tracking/add-history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        body: JSON.stringify({
          videoId: currentVideoKey,
          videoTitle: currentVideoTitle,
          url: videoId
            ? `https://youtu.be/${videoId}`
            : localVideoFile?.name || "Local Video",
          secondsWatched: watchedSeconds,
          tabSwitches: totalTabSwitches,
          duration: videoMeta?.duration || Math.round(localVideoRef.current?.duration || 0),
          lastWatchedPosition: currentPlaybackPos,
          studyScore: videoMeta?.studyScore || 0,
          note: cumulativeNote,
          tag: currentTagToSave,
          isStudyVideo: true,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.history) {
            setAppState((prev) => ({ ...prev, history: data.history }));
            if (userId) {
              localStorage.setItem(`userHistory_${userId}`, JSON.stringify(data.history));
            }
          }
        })
        .catch((err) => console.error("Error saving history:", err));

      if (currentNoteToSave || currentTagToSave) {
        fetch(`${API_BASE}/api/tracking/save-note-tag`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : undefined,
          },
          credentials: "include",
          body: JSON.stringify({
            videoId: currentVideoKey,
            noteText: cumulativeNote,
            tagText: currentTagToSave,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setAppState((prev) => ({
                ...prev,
                notes: data.notes || prev.notes,
                tags: data.tags || prev.tags,
              }));
            }
          })
          .catch((err) => console.error("Error saving note/tag:", err));
      }

      if (isFocus) {
        triggerNotification({
          title: "Focus Session Completed!",
          subtitle: "Great job! You stayed committed and finished your focus study timer.",
          badge: "🎉 +2 Coins Gained",
          badgeColor: "#10b981",
          icon: "🎯",
          details: [
            "🪙 +2 Coins earned & credited to balance",
            "📓 Study notes saved to history automatically",
            "🏷️ Video tag saved successfully",
          ],
          buttonText: "Keep Learning! 🔥",
        });
      } else {
        triggerNotification({
          title: "Session Saved!",
          subtitle: "Your study video progress has been saved successfully.",
          badge: "✅ Saved",
          badgeColor: "#3b82f6",
          icon: "📚",
          details: [
            "⏱️ Watch time saved to history",
            "📓 Study notes & tag recorded",
          ],
          buttonText: "Got it!",
        });
      }
    } catch (error) {
      console.error("❌ Error saving session:", error);
    }
  };

  handleStopSaveRef.current = handleStopSave;
  useEffect(() => {
    handleStopSaveRef.current = handleStopSave;
  });



  const purchasePremium = () => {
    const options = {
      key: "rzp_test_123456789", // ← replace with your Razorpay test key
      amount: 299 * 100,         // ₹299
      currency: "INR",
      name: "StudyBuddy Premium",
      description: "Unlock premium coins and features",

      handler: function (response) {
        // SUCCESS → add coins
        setAppState(prev => ({
          ...prev,
          coins: (prev.coins || 0) + 100,
          premium: true,
        }));

        localStorage.setItem("coins", (appState.coins || 0) + 100);
        localStorage.setItem("premium", "true");

        alert("🎉 Payment Successful! Premium Activated!");
        setShowZeroCoinsPopup(false);
      },

      theme: { color: "#4f46e5" },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };




  // ⬇️ Download note as PDF
  const handleDownloadPDF = () => {
    if (!selectedNote.trim()) return;

    try {
      // Create a canvas element to render text
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 1100;
      const ctx = canvas.getContext('2d');

      // Set up the canvas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px Arial';
      ctx.fillText('Study Note', 40, 60);

      // Add date
      ctx.font = '12px Arial';
      ctx.fillStyle = '#666666';
      ctx.fillText(`Date: ${new Date().toLocaleDateString()}`, 40, 90);

      // Add note content
      ctx.fillStyle = '#000000';
      ctx.font = '14px Arial';
      const maxWidth = 720;
      const lineHeight = 20;
      let y = 130;

      // Word wrap text
      const words = selectedNote.split(' ');
      let line = '';

      for (let i = 0; i < words.length; i++) {
        const test = line + words[i] + ' ';
        const metrics = ctx.measureText(test);

        if (metrics.width > maxWidth && line) {
          ctx.fillText(line, 40, y);
          y += lineHeight;
          line = words[i] + ' ';
        } else {
          line = test;
        }
      }
      if (line) {
        ctx.fillText(line, 40, y);
      }

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `study-note-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Failed to download note');
    }
  };

  // 📝 Generate and handle Note PDF (View or Download)
  const generateNotePDF = (noteContent, fileName, mode = 'download') => {
    if (!noteContent) return;

    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - (margin * 2);

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Study Session Note", margin, 20);

    // Metadata
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, 30);
    doc.line(margin, 35, pageWidth - margin, 35);

    // Content
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(0);

    const splitText = doc.splitTextToSize(noteContent, maxWidth);
    doc.text(splitText, margin, 45);

    if (mode === 'view') {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        alert("Popup blocked! Please allow popups for this site to view the PDF.");
      }
    } else {
      doc.save(`${fileName}.pdf`);
    }
  };

  const handleToolbarFormat = (formatType) => {
    const textarea = noteTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const selected = noteText.substring(start, end);
    const before = noteText.substring(0, start);
    const after = noteText.substring(end);
    let inserted = "";

    switch (formatType) {
      case "bold":
        inserted = selected ? `**${selected}**` : "**bold text**";
        break;
      case "italic":
        inserted = selected ? `*${selected}*` : "*italic text*";
        break;
      case "underline":
        inserted = selected ? `<u>${selected}</u>` : "<u>underlined text</u>";
        break;
      case "bullet":
        inserted = selected ? `\n• ${selected}` : "\n• ";
        break;
      case "number":
        inserted = selected ? `\n1. ${selected}` : "\n1. ";
        break;
      case "table":
        inserted = `\n| Key Concept | Details |\n|---|---|\n| Point 1 | Description |\n`;
        break;
      case "link":
        inserted = selected ? `[${selected}](url)` : "[Link title](https://)";
        break;
      default:
        break;
    }

    const newText = before + inserted + after;
    setNoteText(newText);
    setTimeout(() => {
      textarea.focus();
      const newPos = start + inserted.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // ⬇️ put handleSaveNotes here, inside component ⬇️
  const handleSaveNotes = async () => {
    if (!noteText.trim() && !tagText.trim()) {
      triggerNotification({
        title: "Empty Notes / Tag",
        subtitle: "Please write a study note or enter a tag before saving.",
        badge: "⚠️ Input Required",
        badgeColor: "#f59e0b",
        icon: "✍️",
        details: ["Type some study takeaways, formula, or topic tag."],
        buttonText: "OK",
      });
      return;
    }

    const currentVideoKey = videoId || localVideoFile?.name;
    if (!currentVideoKey) {
      triggerNotification({
        title: "No Video Loaded",
        subtitle: "Please play or select a study video first to save notes.",
        badge: "⚠️ Missing Video",
        badgeColor: "#f59e0b",
        icon: "🎬",
        details: ["Load a YouTube URL or choose a video from your computer."],
        buttonText: "OK",
      });
      return;
    }

    const existingNote = appState.notes?.[currentVideoKey] || "";
    const updatedNote = (existingNote ? existingNote + "\n" + noteText : noteText).trim();

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/tracking/save-note-tag`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        credentials: "include",
        body: JSON.stringify({
          videoId: currentVideoKey,
          noteText: updatedNote,
          tagText,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to save notes");

      setAppState((prev) => ({
        ...prev,
        notes: data.notes || prev.notes,
        tags: data.tags || prev.tags,
        history: data.history || prev.history,
      }));

      setNoteText(""); // 📓 Clear textarea after appending

      localStorage.setItem(
        `userNotes_${userId}`,
        JSON.stringify({ ...appState.notes, ...data.notes })
      );

      localStorage.setItem(
        `userTags_${userId}`,
        JSON.stringify({ ...appState.tags, ...data.tags })
      );

      triggerNotification({
        title: "Notes & Tag Saved!",
        subtitle: "Your study notes and tag have been successfully saved for this video.",
        badge: "📝 Saved Successfully",
        badgeColor: "#10b981",
        icon: "✅",
        details: [
          noteText.trim() ? "📓 Study notes saved to history" : null,
          tagText.trim() ? `🏷️ Tag saved: "${tagText.trim()}"` : null,
        ].filter(Boolean),
        buttonText: "Awesome!",
      });
    } catch (err) {
      console.error("❌ Error saving note/tag:", err);
      triggerNotification({
        title: "Save Failed",
        subtitle: err.message || "Failed to save note or tag. Please try again.",
        badge: "❌ Error",
        badgeColor: "#ef4444",
        icon: "⚠️",
        details: ["Check your network connection and retry."],
        buttonText: "Dismiss",
      });
    }
  };



  // const handleStartFocusTimer = () => {
  //   if (!focusMinutes || focusMinutes <= 0) {
  //     alert("Please enter a valid focus time!");
  //     return;
  //   }

  //   // ⏱️ Start the focus timer
  //   setFocusRemaining(focusMinutes * 60);

  //   // 🔒 Close the popup
  //   setShowTimerPopup(false);

  //   // 🎬 Start video automatically after popup closes
  //   setTimeout(() => {
  //     if (playerRef.current && playerRef.current.playVideo) {
  //       playerRef.current.playVideo(); // for YouTube
  //     } else if (localVideoRef.current) {
  //       localVideoRef.current.play(); // for local file
  //     }
  //   }, 500);
  // };


  const handleStartFocusTimer = () => {
    if (!focusMinutes || focusMinutes <= 0) {
      triggerNotification({
        title: "Invalid Focus Time",
        subtitle: "Please enter a valid duration (e.g., 25 minutes) to start.",
        badge: "⏱️ Timer",
        badgeColor: "#f59e0b",
        icon: "⏱️",
        details: ["Enter a number between 1 and 180 minutes."],
        buttonText: "OK",
      });
      return;
    }

    setFocusRemaining(focusMinutes * 60);
    setFocusDuration(focusMinutes * 60);
    setIsFocusTimerPending(false);
    setHasPlaybackStarted(true);
    setShowTimerPopup(false);

    setTimeout(() => {
      if (youtubePlayerRef.current?.playVideo) {
        youtubePlayerRef.current.playVideo();
      } else if (localVideoRef.current) {
        localVideoRef.current.play().catch(() => { });
      }
    }, 300);
  };

  // ─── Render Panels for YouTube Metadata, Transcript, Playlist ──────

  const formatDuration = (totalSeconds) => {
    if (!totalSeconds) return '';
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h) return `${h}h ${m}m ${s}s`;
    return m ? `${m}m ${s}s` : `${s}s`;
  };

  const renderMetadataPanel = () => {
    if (!videoId || (!videoMeta && !metaLoading && !metaError)) return null;
    return (
      <div style={styles.panel}>
        <h3 style={styles.sectionTitle}>📋 Video Info</h3>
        {metaLoading && <p style={{ color: '#6b7280' }}>Loading video info...</p>}
        {metaError && <p style={{ color: '#dc2626' }}>⚠️ {metaError}</p>}
        {videoMeta && (
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: '700', color: '#1f2937' }}>
              {videoMeta.title}
            </h4>
            <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#6b7280' }}>
              📺 {videoMeta.channelTitle}
              {videoMeta.duration > 0 && <> &nbsp;·&nbsp; ⏱ {formatDuration(videoMeta.duration)}</>}
              {videoMeta.studyScore > 0 && <> &nbsp;·&nbsp; 📊 Study Score: {videoMeta.studyScore}%</>}
            </p>
            {videoMeta.description && (
              <details style={{ marginTop: '8px' }}>
                <summary style={{ cursor: 'pointer', color: '#4f46e5', fontWeight: '600', fontSize: '0.9rem' }}>
                  📝 Show Full Description
                </summary>
                <p style={{
                  marginTop: '8px',
                  fontSize: '0.85rem',
                  color: '#374151',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  padding: '12px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                }}>
                  {videoMeta.description}
                </p>
              </details>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPlaylistPanel = () => {
    if (!playlistItems || playlistItems.length === 0) return null;
    return (
      <div style={styles.panel}>
        <h3 style={styles.sectionTitle}>📃 Playlist ({playlistItems.length} videos)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
          {playlistItems.map((item, idx) => (
            <div
              key={item.videoId || idx}
              onClick={() => handlePlaylistVideoClick(item.videoId)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px',
                borderRadius: '8px',
                cursor: 'pointer',
                background: item.videoId === videoId ? '#eef2ff' : '#fff',
                border: item.videoId === videoId ? '2px solid #4f46e5' : '1px solid #e5e7eb',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { if (item.videoId !== videoId) e.currentTarget.style.background = '#f9fafb'; }}
              onMouseLeave={(e) => { if (item.videoId !== videoId) e.currentTarget.style.background = '#fff'; }}
            >
              {item.thumbnail && (
                <img
                  src={item.thumbnail}
                  alt=""
                  style={{ width: '80px', height: '45px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: 0,
                  fontSize: '0.85rem',
                  fontWeight: item.videoId === videoId ? '700' : '500',
                  color: item.videoId === videoId ? '#4f46e5' : '#1f2937',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {item.videoId === videoId ? '▶ ' : ''}{item.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- AI QUIZ HANDLERS ---
  const handleGenerateQuiz = async () => {
    if (!videoId) {
      alert("Please load a YouTube video first to generate a quiz.");
      return;
    }
    setShowQuizConfigModal(false);
    setIsQuizGenerating(true);
    setQuizError("");
    setQuizQuestions([]);
    setQuizCompleted(false);
    setQuizResult(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/quiz/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        credentials: "include",
        body: JSON.stringify({
          videoId,
          numQuestions: quizNumQuestions,
          difficulty: quizDifficulty,
          videoTitle: videoMeta?.title || "",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        setQuizQuestions(data.questions);
        setCurrentQuestionIndex(0);
        setSelectedOption("");
        setIsAnswerSubmitted(false);
        setUserAnswers([]);
        setQuizCompleted(false);
        setQuizResult(null);
        setTimeout(() => {
          const quizEl = document.getElementById("ai-quiz-section");
          if (quizEl) quizEl.scrollIntoView({ behavior: "smooth" });
        }, 300);
      } else {
        setQuizError(data.message || "Unable to analyze this video for quiz generation. Please try again.");
      }
    } catch (err) {
      console.error("Error generating quiz:", err);
      setQuizError("Unable to analyze this video for quiz generation. Please try again.");
    } finally {
      setIsQuizGenerating(false);
    }
  };

  const handleSubmitQuizAnswer = () => {
    if (!selectedOption || isAnswerSubmitted) return;
    const currentQ = quizQuestions[currentQuestionIndex];
    if (!currentQ) return;

    const isCorrect = selectedOption === currentQ.correctAnswer;
    setIsAnswerSubmitted(true);

    setUserAnswers((prev) => [
      ...prev,
      {
        questionIndex: currentQuestionIndex,
        question: currentQ.question,
        selectedOption,
        correctAnswer: currentQ.correctAnswer,
        isCorrect,
      },
    ]);
  };

  const handleNextQuizQuestion = async () => {
    const currentQ = quizQuestions[currentQuestionIndex];
    const isCorrect = selectedOption === currentQ.correctAnswer;
    const updatedAnswers = [
      ...userAnswers.filter((a) => a.questionIndex !== currentQuestionIndex),
      {
        questionIndex: currentQuestionIndex,
        question: currentQ.question,
        selectedOption,
        correctAnswer: currentQ.correctAnswer,
        isCorrect,
      },
    ];
    setUserAnswers(updatedAnswers);

    if (currentQuestionIndex + 1 < quizQuestions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption("");
      setIsAnswerSubmitted(false);
    } else {
      const correctCount = updatedAnswers.filter((a) => a.isCorrect).length;
      const total = quizQuestions.length;
      const accuracy = Math.round((correctCount / total) * 100);

      setQuizResult({
        score: correctCount,
        accuracy,
        total,
      });
      setQuizCompleted(true);

      // Save to MongoDB
      try {
        const token = localStorage.getItem("token");
        await fetch(`${API_BASE}/api/quiz/save-attempt`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : undefined,
          },
          credentials: "include",
          body: JSON.stringify({
            videoId,
            videoTitle: videoMeta?.title || "",
            difficulty: quizDifficulty,
            questionCount: total,
            score: correctCount,
            accuracy,
          }),
        });
      } catch (err) {
        console.error("Error saving quiz attempt:", err);
      }
    }
  };

  const renderQuizSection = () => {
    if (!videoId && !isQuizGenerating && quizQuestions.length === 0 && !quizError) return null;

    return (
      <div id="ai-quiz-section" style={{ ...styles.panel, marginTop: "24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #e5e7eb", paddingBottom: "12px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "800", color: "#4f46e5", display: "flex", alignItems: "center", gap: "8px" }}>
              🧠 AI Quiz
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "#6b7280" }}>
              Generated from actual video content
            </p>
          </div>
          {videoId && !isQuizGenerating && (
            <button
              onClick={() => setShowQuizConfigModal(true)}
              style={{
                padding: "8px 16px",
                background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "700",
                fontSize: "0.8rem",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(99, 102, 241, 0.3)",
              }}
            >
              ✨ Generate Quiz
            </button>
          )}
        </div>

        {/* Loading State */}
        {isQuizGenerating && (
          <div style={{ padding: "32px", textAlign: "center", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
            <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🤖</div>
            <h4 style={{ margin: "0 0 6px 0", fontSize: "1rem", fontWeight: "700", color: "#334155" }}>
              Gemini AI is analyzing the actual video content & generating your quiz...
            </h4>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              Please wait a moment while questions are generated directly from the lecture.
            </p>
          </div>
        )}

        {/* Error Banner */}
        {quizError && !isQuizGenerating && (
          <div style={{ padding: "16px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "10px", textAlign: "center", fontSize: "0.9rem", fontWeight: "600" }}>
            ⚠️ {quizError}
          </div>
        )}

        {/* Active Quiz Question */}
        {!isQuizGenerating && quizQuestions.length > 0 && !quizCompleted && (
          <div>
            {/* Progress & Difficulty Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#4f46e5", background: "#eef2ff", padding: "4px 12px", borderRadius: "20px" }}>
                Question {currentQuestionIndex + 1} / {quizQuestions.length}
              </span>
              <span style={{ fontSize: "0.75rem", fontWeight: "700", color: quizDifficulty === "Hard" ? "#dc2626" : quizDifficulty === "Medium" ? "#d97706" : "#059669", background: "#f9fafb", border: "1px solid #e5e7eb", padding: "4px 10px", borderRadius: "12px" }}>
                {quizDifficulty} Difficulty
              </span>
            </div>

            {/* Question Text */}
            <h4 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#1f2937", marginBottom: "16px", lineHeight: "1.5" }}>
              {quizQuestions[currentQuestionIndex]?.question}
            </h4>

            {/* 4 Radio Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              {quizQuestions[currentQuestionIndex]?.options.map((opt, idx) => {
                const isSelected = selectedOption === opt;
                const isCorrectOpt = opt === quizQuestions[currentQuestionIndex].correctAnswer;
                let bg = "#ffffff";
                let border = "1px solid #e5e7eb";
                let textColor = "#1f2937";
                let icon = isSelected ? "🔘" : "○";

                if (isAnswerSubmitted) {
                  if (isCorrectOpt) {
                    bg = "#ecfdf5";
                    border = "2px solid #10b981";
                    textColor = "#065f46";
                    icon = "✅";
                  } else if (isSelected && !isCorrectOpt) {
                    bg = "#fef2f2";
                    border = "2px solid #ef4444";
                    textColor = "#991b1b";
                    icon = "❌";
                  } else {
                    bg = "#f9fafb";
                    textColor = "#9ca3af";
                  }
                } else if (isSelected) {
                  bg = "#eef2ff";
                  border = "2px solid #6366f1";
                  textColor = "#4f46e5";
                }

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (!isAnswerSubmitted) setSelectedOption(opt);
                    }}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "10px",
                      background: bg,
                      border: border,
                      color: textColor,
                      fontWeight: isSelected || (isAnswerSubmitted && isCorrectOpt) ? "700" : "500",
                      cursor: isAnswerSubmitted ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      fontSize: "0.9rem",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>{icon}</span>
                    <span>{opt}</span>
                  </div>
                );
              })}
            </div>

            {/* Explanation Box */}
            {isAnswerSubmitted && (
              <div style={{ padding: "14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", color: "#166534", fontSize: "0.85rem", marginBottom: "20px" }}>
                <strong>💡 Explanation:</strong>
                <p style={{ margin: "4px 0 0 0", lineHeight: "1.4" }}>
                  {quizQuestions[currentQuestionIndex]?.explanation}
                </p>
              </div>
            )}

            {/* Action Button */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              {!isAnswerSubmitted ? (
                <button
                  onClick={handleSubmitQuizAnswer}
                  disabled={!selectedOption}
                  style={{
                    padding: "10px 24px",
                    background: selectedOption ? "#4f46e5" : "#cbd5e1",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: "700",
                    fontSize: "0.9rem",
                    cursor: selectedOption ? "pointer" : "not-allowed",
                  }}
                >
                  Submit Answer
                </button>
              ) : (
                <button
                  onClick={handleNextQuizQuestion}
                  style={{
                    padding: "10px 24px",
                    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: "700",
                    fontSize: "0.9rem",
                    cursor: "pointer",
                  }}
                >
                  {currentQuestionIndex + 1 < quizQuestions.length ? "Next Question ➡️" : "View Results 🏆"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Quiz Completion Screen */}
        {!isQuizGenerating && quizCompleted && quizResult && (
          <div style={{ textAlign: "center", padding: "20px 10px" }}>
            <div style={{ fontSize: "3rem", marginBottom: "8px" }}>🏆</div>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "1.4rem", fontWeight: "800", color: "#1f2937" }}>
              Quiz Completed
            </h3>
            <p style={{ margin: "0 0 20px 0", fontSize: "0.85rem", color: "#6b7280" }}>
              Here is your performance summary for this video lecture:
            </p>

            {/* Score Chips */}
            <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginBottom: "20px" }}>
              <div style={{ padding: "12px 24px", background: "#eef2ff", borderRadius: "12px", border: "1px solid #c7d2fe" }}>
                <span style={{ fontSize: "0.75rem", color: "#6366f1", fontWeight: "700", display: "block" }}>SCORE</span>
                <span style={{ fontSize: "1.5rem", fontWeight: "800", color: "#3730a3" }}>
                  {quizResult.score} / {quizResult.total}
                </span>
              </div>
              <div style={{ padding: "12px 24px", background: "#ecfdf5", borderRadius: "12px", border: "1px solid #a7f3d0" }}>
                <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: "700", display: "block" }}>ACCURACY</span>
                <span style={{ fontSize: "1.5rem", fontWeight: "800", color: "#065f46" }}>
                  {quizResult.accuracy}%
                </span>
              </div>
            </div>

            {/* Performance Message */}
            <div style={{ padding: "12px 18px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "0.9rem", fontWeight: "600", color: "#334155", marginBottom: "24px" }}>
              {quizResult.accuracy >= 80
                ? "🌟 Outstanding! You demonstrated strong understanding of the video content!"
                : quizResult.accuracy >= 50
                  ? "👍 Good effort! Review the missed concepts to solidify your knowledge."
                  : "📚 Keep practicing! Watch the video again to strengthen your understanding."}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
              <button
                onClick={() => {
                  setCurrentQuestionIndex(0);
                  setSelectedOption("");
                  setIsAnswerSubmitted(false);
                  setUserAnswers([]);
                  setQuizCompleted(false);
                }}
                style={{
                  padding: "10px 20px",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "1px solid #d1d5db",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                🔄 Retake Quiz
              </button>
              <button
                onClick={() => setShowQuizConfigModal(true)}
                style={{
                  padding: "10px 20px",
                  background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                ✨ Generate New Quiz
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ ...styles.page, padding: 0 }}>
      {/* Unified Navbar with ThemeToggle */}
      <Navbar />

      <div style={{ ...styles.container, padding: "24px" }}>
        {/* ================= HERO STUDY BANNER (IMAGE 1 DESIGN + IMAGE 2 BACKGROUND) ================= */}
        <div
          className={`relative w-full rounded-3xl overflow-hidden border shadow-sm transition-all mb-6 ${isDark
            ? "border-slate-800 bg-[#0d1319]"
            : "border-slate-200/90 bg-[#f9f8f6]"
            }`}
          style={{
            backgroundImage: `url(${studyBannerBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center 45%",
          }}
        >
          {/* Frosted Glass Translucent Gradient Overlay for crystal clear readability */}
          <div
            className={`w-full h-full p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 ${isDark
              ? "bg-gradient-to-r from-slate-950/95 via-slate-950/85 to-slate-950/40"
              : "bg-gradient-to-r from-[#fcfbfa]/95 via-[#fcfbfa]/85 to-[#fcfbfa]/25"
              }`}
          >
            {/* Left Content */}
            <div className="max-w-2xl flex-1">
              {/* Top Greeting */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-sm sm:text-base font-bold tracking-tight ${isDark ? "text-slate-200" : "text-slate-800"
                  }`}>
                  {greetingText}, {userName}! 👋
                </span>
              </div>

              {/* Headline: Small Steps Big Learning */}
              <h1 className="m-0 mb-3 text-3xl sm:text-4xl lg:text-5xl font-black font-serif tracking-tight leading-[1.15] text-[#1b3f30] dark:text-emerald-300">
                Small Steps <br />
                Big Learning
              </h1>

              {/* Subtitle */}
              <p className={`m-0 text-xs sm:text-sm font-medium leading-relaxed max-w-xl ${isDark ? "text-slate-300" : "text-slate-600"
                }`}>
                Track your study hours, stay focused and turn your every video into meaningful progress with AI.
              </p>
            </div>

            {/* Right Group: Floating Thought (in empty space) + 2 Stat Cards on far right */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-10 lg:gap-12 shrink-0 lg:ml-auto self-stretch lg:self-center justify-start lg:justify-end">
              {/* Thought Form (Bina card ke, center-aligned, top margin aligned with cards) */}
              <div className="flex flex-col items-center justify-center text-center max-w-[240px] select-none pt-3.5 sm:mr-8 lg:mr-14 relative -translate-x-5 sm:-translate-x-10">
                <p className={`m-0 font-serif italic text-xs sm:text-sm lg:text-[15px] leading-relaxed tracking-wide text-center ${isDark
                  ? "text-emerald-100 font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                  : "text-[#183e2b] font-semibold drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]"
                  }`}>
                  “A focused mind today builds a brighter tomorrow.”
                </p>
              </div>

              {/* 2 Small Stat Cards (Image 2 Style) */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Card 1: Your Learning Streak (Image 2 style) */}
                <div
                  className={`w-[145px] sm:w-[152px] h-[205px] rounded-2xl overflow-hidden border shadow-sm flex flex-col justify-between transition-all shrink-0 relative ${isDark
                    ? "bg-[#141c24] border-slate-700/70"
                    : "bg-[#fbf9f5] border-slate-200/90"
                    }`}
                  style={{
                    backgroundImage: `linear-gradient(to bottom, ${isDark
                      ? "rgba(20,28,36,0.96) 0%, rgba(20,28,36,0.90) 48%, rgba(20,28,36,0.2) 75%, transparent 100%"
                      : "rgba(251,249,245,0.98) 0%, rgba(251,249,245,0.92) 48%, rgba(251,249,245,0.15) 75%, transparent 100%"
                      }), url(${streakCardBg})`,
                    backgroundSize: "cover",
                    backgroundPosition: "bottom center",
                  }}
                >
                  <div className="p-3.5 flex flex-col h-full justify-between relative z-10">
                    <div>
                      {/* Top Row: Title + Flame Icon */}
                      <div className="flex items-start justify-between">
                        <div className={`text-[12px] font-bold leading-[1.25] ${isDark ? "text-slate-100" : "text-slate-800"
                          }`}>
                          Your<br />Learning<br />Streak
                        </div>
                        <div className="text-xl leading-none drop-shadow-xs">
                          🔥
                        </div>
                      </div>

                      {/* Streak Days Count */}
                      <div className={`text-base font-extrabold mt-2.5 leading-none ${isDark ? "text-white" : "text-slate-900"
                        }`}>
                        {appState.streak || 0} {appState.streak === 1 ? "day" : "days"}
                      </div>

                      {/* Subtitle */}
                      <p className={`text-[10px] font-medium leading-snug mt-1 m-0 ${isDark ? "text-slate-300" : "text-slate-600"
                        }`}>
                        {appState.streak > 0
                          ? "Keep building consistency!"
                          : "Start today and build consistency!"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card 2: Your Study Coins (Image 2 style) */}
                <div
                  className={`w-[145px] sm:w-[152px] h-[205px] rounded-2xl overflow-hidden border shadow-sm flex flex-col justify-between transition-all shrink-0 relative ${isDark
                    ? "bg-[#141c24] border-slate-700/70"
                    : "bg-[#fbf9f5] border-slate-200/90"
                    }`}
                  style={{
                    backgroundImage: `linear-gradient(to bottom, ${isDark
                      ? "rgba(20,28,36,0.96) 0%, rgba(20,28,36,0.90) 48%, rgba(20,28,36,0.2) 75%, transparent 100%"
                      : "rgba(251,249,245,0.98) 0%, rgba(251,249,245,0.92) 48%, rgba(251,249,245,0.15) 75%, transparent 100%"
                      }), url(${streakCardBg})`,
                    backgroundSize: "cover",
                    backgroundPosition: "bottom center",
                  }}
                >
                  <div className="p-3.5 flex flex-col h-full justify-between relative z-10">
                    <div>
                      {/* Top Row: Title + Coin Icon */}
                      <div className="flex items-start justify-between">
                        <div className={`text-[12px] font-bold leading-[1.25] ${isDark ? "text-slate-100" : "text-slate-800"
                          }`}>
                          Your<br />Study<br />Coins
                        </div>
                        <div className="text-xl leading-none drop-shadow-xs">
                          🪙
                        </div>
                      </div>

                      {/* Coins Count */}
                      <div className={`text-base font-extrabold mt-2.5 leading-none ${isDark ? "text-amber-300" : "text-amber-800"
                        }`}>
                        {appState.coins ?? 150} coins
                      </div>

                      {/* Subtitle */}
                      <p className={`text-[10px] font-medium leading-snug mt-1 m-0 ${isDark ? "text-slate-300" : "text-slate-600"
                        }`}>
                        Earn coins by focusing &amp; completing lessons!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Controls Grid: Lesson Input (Step 01) & Focus Companion (Camera Analysis) */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch mb-6">
          {/* CARD 1: Bring your lesson in */}
          <div
            className={`rounded-3xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 border h-[460px] lg:h-[460px] overflow-hidden ${theme === "dark"
              ? "bg-[#161a20] border-gray-800/90 shadow-[0_8px_32px_rgba(0,0,0,0.35)] text-white"
              : "bg-[#fbf9f3] border-[#eee8de] shadow-[0_8px_30px_rgba(0,0,0,0.03)] text-gray-900"
              }`}
          >
            {/* Header: Title, Icon & Step 01 badge */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${theme === "dark"
                    ? "bg-indigo-950/70 text-indigo-400 border border-indigo-800/40"
                    : "bg-[#f2edff] text-[#6366f1]"
                    }`}
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 17L17 7" />
                    <path d="M7 7h10v10" />
                  </svg>
                </div>
                <div>
                  <h2
                    className={`text-xl font-black tracking-tight ${theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                  >
                    Bring your lesson in
                  </h2>
                  <p
                    className={`text-xs font-medium mt-0.5 ${theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}
                  >
                    Search YouTube educational videos or paste a direct link.
                  </p>
                </div>
              </div>

              {/* Top-Right Action: Generate Quiz replaces STEP 01 badge permanently */}
              <button
                type="button"
                onClick={() => {
                  if (!videoId) {
                    triggerNotification({
                      title: "Load a Video First",
                      subtitle: "Please search or paste a YouTube video before generating an AI Quiz.",
                      badge: "ℹ️ Step Required",
                      badgeColor: "#6366f1",
                      icon: "💡",
                      buttonText: "Got it",
                    });
                    return;
                  }
                  setShowQuizConfigModal(true);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition active:scale-95 flex-shrink-0 cursor-pointer ${
                  isDark
                    ? "bg-[#4f46e5] hover:bg-[#4338ca] shadow-indigo-500/25"
                    : "bg-[#1b3f30] hover:bg-[#143024] shadow-emerald-950/20"
                }`}
                title={videoId ? "Generate AI Quiz from current lesson" : "Load a video first to generate quiz"}
              >
                <span>✨ Generate Quiz</span>
              </button>
            </div>

            {/* Mode Switcher Tabs: Search YouTube vs Direct Link */}
            <div className="flex items-center gap-2 mt-3 p-1 rounded-2xl bg-black/5 dark:bg-[#0d1014] border border-gray-200/70 dark:border-gray-800/80 w-fit select-none">
              <button
                type="button"
                onClick={() => setSearchMode("search")}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 ${
                  searchMode === "search"
                    ? isDark
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-[#1b3f30] text-white shadow-md shadow-emerald-950/20"
                    : isDark
                      ? "text-gray-400 hover:text-gray-200"
                      : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                </svg>
                <span>Search YouTube</span>
              </button>
              <button
                type="button"
                onClick={() => setSearchMode("url")}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 ${
                  searchMode === "url"
                    ? isDark
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-[#1b3f30] text-white shadow-md shadow-emerald-950/20"
                    : isDark
                      ? "text-gray-400 hover:text-gray-200"
                      : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span>Paste Link</span>
              </button>
            </div>

            {/* Middle Content Area */}
            <div className="flex-1 min-h-0 flex flex-col justify-start mt-2.5">
              {/* TAB 1: Search YouTube */}
              {searchMode === "search" && (
                <div className="space-y-2 flex-1 min-h-0 flex flex-col">
                  {/* Search Bar Form */}
                  <form onSubmit={handleYouTubeSearch} className="relative flex-shrink-0">
                  <div
                    className={`rounded-2xl p-1.5 sm:p-2 flex items-center gap-2.5 sm:gap-3 border transition-all ${
                      isDark
                        ? "bg-[#fbf8f0] border-[#eee8de] shadow-sm focus-within:border-indigo-500/70"
                        : "bg-[#252830] border-gray-700/80 shadow-md focus-within:border-indigo-400"
                    }`}
                  >
                    <div className="pl-2 flex-shrink-0 text-red-500">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                      </svg>
                    </div>

                    <input
                      type="text"
                      placeholder="Search topics (e.g. Data Structures, React, Calculus)..."
                      value={searchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearchQuery(val);
                        if (!val.trim()) {
                          setSearchResults([]);
                          setHasSearched(false);
                          setSearchError(null);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (!searchLoading && searchQuery.trim()) {
                            handleYouTubeSearch(e);
                          }
                        }
                      }}
                      disabled={searchLoading}
                      className={`flex-1 bg-transparent text-xs sm:text-sm outline-none min-w-0 font-medium ${
                        isDark
                          ? "text-slate-900 placeholder:text-slate-500"
                          : "text-white placeholder-gray-400"
                      }`}
                    />

                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setSearchResults([]);
                          setHasSearched(false);
                          setSearchError(null);
                        }}
                        className={`px-1.5 text-xs font-bold transition-colors ${
                          isDark
                            ? "text-slate-500 hover:text-slate-900"
                            : "text-gray-400 hover:text-white"
                        }`}
                        title="Clear query"
                      >
                        ✕
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={searchLoading || !searchQuery.trim()}
                      className={`px-3.5 sm:px-4 py-2 rounded-xl font-bold text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap flex-shrink-0 ${
                        isDark
                          ? "bg-[#4f46e5] hover:bg-[#4338ca] shadow-indigo-500/25"
                          : "bg-[#1b3f30] hover:bg-[#143024] shadow-emerald-950/20"
                      }`}
                    >
                      {searchLoading ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>Searching...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <span>Search</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Quick Topic Chips: ONLY visible when idle (not searched, not loading, no results) */}
                {!hasSearched && !searchLoading && searchResults.length === 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5 flex-shrink-0">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1 select-none">
                      Try:
                    </span>
                    {POPULAR_SEARCH_TOPICS.map((topic) => (
                      <button
                        key={topic}
                        type="button"
                        onClick={(e) => handleYouTubeSearch(e, topic)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all active:scale-95 whitespace-nowrap ${
                          isDark
                            ? "bg-[#0f1318] border-gray-800 text-gray-300 hover:bg-gray-800 hover:text-white hover:border-gray-700"
                            : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300 shadow-sm"
                        }`}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                )}

                {/* Error / Quota Notice */}
                {searchError && (
                  <div
                    className={`p-3 rounded-2xl border text-xs sm:text-sm flex items-start gap-2.5 ${
                      searchQuotaExceeded
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    }`}
                  >
                    <span className="text-base flex-shrink-0">⚠️</span>
                    <div className="flex-1">
                      <p className="font-semibold">{searchError}</p>
                      {searchQuotaExceeded && (
                        <button
                          type="button"
                          onClick={() => setSearchMode("url")}
                          className="mt-1.5 underline font-bold text-amber-200 hover:text-white block"
                        >
                          Switch to Paste Link mode →
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Skeleton Loading */}
                {searchLoading && (
                  <div className="space-y-2 py-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`p-2.5 rounded-2xl border animate-pulse flex items-center gap-3 ${
                          isDark ? "bg-[#0f1318] border-gray-800" : "bg-gray-100 border-gray-200"
                        }`}
                      >
                        <div className="w-24 h-16 rounded-xl bg-gray-700/40 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-700/40 rounded w-3/4" />
                          <div className="h-3 bg-gray-700/30 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {!searchLoading && hasSearched && searchResults.length === 0 && !searchError && (
                  <div
                    className={`p-5 rounded-2xl border text-center ${
                      isDark ? "bg-[#0f1318] border-gray-800 text-gray-400" : "bg-gray-50 border-gray-200 text-gray-600"
                    }`}
                  >
                    <p className="font-semibold text-sm">No educational videos found for "{searchQuery}"</p>
                    <p className="text-xs mt-1 text-gray-500">
                      Try a different keyword or paste a direct YouTube link in the Paste Link tab.
                    </p>
                  </div>
                )}

                {/* Results List */}
                {!searchLoading && searchResults.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold px-1 select-none">
                      <span className={isDark ? "text-gray-400" : "text-gray-600"}>
                        Search Results ({searchResults.length}{searchNextPageToken ? "+" : ""})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchResults([]);
                          setHasSearched(false);
                        }}
                        className="text-gray-400 hover:text-red-400 transition"
                      >
                        Clear results
                      </button>
                    </div>

                    <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1 custom-scrollbar flex-1 min-h-0">
                      {searchResults.map((item) => {
                        const isCurrent = videoId === item.videoId;
                        return (
                          <div
                            key={item.videoId}
                            onClick={() => handleSelectSearchResult(item)}
                            className={`p-2.5 rounded-2xl border transition-all duration-200 flex items-center gap-3 cursor-pointer group ${
                              isCurrent
                                ? isDark
                                  ? "bg-indigo-950/60 border-indigo-500/70 shadow-lg shadow-indigo-900/30 ring-1 ring-indigo-500/40"
                                  : "bg-emerald-50 border-emerald-500 shadow-md ring-1 ring-emerald-500/30"
                                : isDark
                                  ? "bg-[#0f1318] border-gray-800/90 hover:bg-[#181d24] hover:border-gray-700"
                                  : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm"
                            }`}
                          >
                            <div className="relative w-24 sm:w-28 h-16 sm:h-18 rounded-xl overflow-hidden flex-shrink-0 bg-black/40">
                              <img
                                src={item.thumbnail}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                              {item.durationFormatted && (
                                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-black/80 text-white tracking-wide">
                                  {item.durationFormatted}
                                </span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0 pr-1">
                              <h4
                                className={`text-xs sm:text-sm font-bold line-clamp-2 leading-snug group-hover:text-indigo-400 transition-colors ${
                                  isDark ? "text-white" : "text-gray-900"
                                }`}
                              >
                                {item.title}
                              </h4>
                              <p
                                className={`text-[11px] sm:text-xs mt-1 truncate flex items-center gap-1.5 ${
                                  isDark ? "text-gray-400" : "text-gray-500"
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                <span>{item.channelTitle}</span>
                              </p>
                            </div>

                            <div className="flex-shrink-0 pr-1">
                              {isCurrent ? (
                                <span className="px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-emerald-500 text-white flex items-center gap-1 shadow-sm">
                                  <span>▶</span> Playing
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectSearchResult(item);
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1 ${
                                    isDark
                                      ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                                      : "bg-[#1b3f30] hover:bg-[#143024] text-white shadow-sm"
                                  }`}
                                >
                                  <span>Play</span>
                                  <span className="text-[10px]">▶</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {searchNextPageToken && (
                        <button
                          type="button"
                          onClick={(e) => handleYouTubeSearch(e, null, searchNextPageToken)}
                          disabled={searchLoadingMore}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-98 flex items-center justify-center gap-2 ${
                            isDark
                              ? "bg-[#0f1318] hover:bg-gray-800 border-gray-800 text-gray-300"
                              : "bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700"
                          }`}
                        >
                          {searchLoadingMore ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                              <span>Loading more...</span>
                            </>
                          ) : (
                            <>
                              <span>Load More Results</span>
                              <span>↓</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
                </div>
              )}

              {/* TAB 2: Direct URL Input (Original input preserved) */}
              {searchMode === "url" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (appState.coins > 0 && (inputUrl.trim() || localVideoFile)) {
                      handleLoadContent();
                    }
                  }}
                  className="pt-1"
                >
                  <div
                    className={`rounded-2xl p-2 flex items-center gap-2.5 sm:gap-3 border transition-all ${
                      isDark
                        ? "bg-[#fbf8f0] border-[#eee8de] shadow-sm focus-within:border-indigo-500/70"
                        : "bg-[#252830] border-gray-700/80 shadow-md focus-within:border-indigo-400"
                    }`}
                  >
                    <div className="pl-2 flex-shrink-0 text-red-500">
                      <svg
                        className="w-5 h-5 sm:w-6 sm:h-6"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                      </svg>
                    </div>

                    <input
                      type="text"
                      placeholder="Paste a YouTube URL..."
                      value={inputUrl}
                      onChange={(e) => {
                        setInputUrl(e.target.value);
                        setLocalVideoFile(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (appState.coins > 0 && (inputUrl.trim() || localVideoFile)) {
                            handleLoadContent();
                          }
                        }
                      }}
                      disabled={appState.coins <= 0}
                      className={`flex-1 bg-transparent text-sm sm:text-base outline-none min-w-0 font-medium ${
                        isDark
                          ? "text-slate-900 placeholder:text-slate-500"
                          : "text-white placeholder-gray-400"
                      }`}
                    />

                    <button
                      type="submit"
                      disabled={
                        appState.coins <= 0 || (!inputUrl.trim() && !localVideoFile)
                      }
                      className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap flex-shrink-0 ${
                        isDark
                          ? "bg-[#4f46e5] hover:bg-[#4338ca] shadow-indigo-500/25"
                          : "bg-[#1b3f30] hover:bg-[#143024] shadow-emerald-950/20"
                      }`}
                    >
                      <span>
                        {appState.coins <= 0
                          ? "Locked"
                          : videoId || localVideoFile
                            ? "Load New"
                            : "Load video"}
                      </span>
                      <span className="font-extrabold text-sm">↗</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Bottom Local File & Reset Actions:
                Visible in 'url' mode, AND in 'search' mode when nothing is being searched/loaded */}
            {(searchMode === "url" || (!searchLoading && !hasSearched && searchResults.length === 0)) && (
              <div className="flex-shrink-0 pt-2 sm:pt-3 mt-auto">
                {/* Divider */}
                <div className="flex items-center mb-2.5 sm:mb-3 select-none">
                  <div
                    className={`flex-1 border-t ${theme === "dark" ? "border-gray-800" : "border-gray-200"
                      }`}
                  ></div>
                  <span className="px-4 text-[10px] sm:text-[11px] font-extrabold tracking-wider text-gray-400 uppercase">
                    OR OPEN A LOCAL FILE
                  </span>
                  <div
                    className={`flex-1 border-t ${theme === "dark" ? "border-gray-800" : "border-gray-200"
                      }`}
                  ></div>
                </div>

                {/* Local Video & Reset Actions */}
                <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
                  <label
                    htmlFor="local-video-upload"
                    className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all active:scale-95 border ${isDark
                      ? "bg-indigo-950/40 hover:bg-indigo-950/70 text-indigo-300 border-indigo-800/60"
                      : "bg-white hover:bg-emerald-50/50 text-[#1b3f30] border-[#1b3f30]/30 shadow-sm"
                      }`}
                  >
                    <span className="text-base leading-none font-black">+</span>
                    <span>Choose video</span>
                  </label>
                  <input
                    id="local-video-upload"
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                    disabled={appState.coins <= 0}
                  />

                  <button
                    onClick={clearHistory}
                    className={`px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all active:scale-95 ${theme === "dark"
                      ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
                      : "bg-[#f0f2ef] hover:bg-gray-200 text-gray-700"
                      }`}
                  >
                    <span className="text-sm">⟲</span>
                    <span>Reset player</span>
                  </button>

                  {localVideoFile && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 truncate max-w-xs">
                      Selected: {localVideoFile.name}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* CARD 2: Focus companion */}
          <div className="rounded-3xl p-5 sm:p-6 flex flex-col justify-between bg-[#15191e] border border-gray-800/90 shadow-[0_8px_32px_rgba(0,0,0,0.35)] text-white transition-all duration-300 h-[460px] lg:h-[460px] overflow-hidden">
            {/* Header: Title, Icon & Badge */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 bg-[#222831] text-[#ccff00] border border-gray-700/60 shadow-sm">
                  {/* Focus Bullseye Target Icon */}
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Focus companion
                  </h2>
                  <p className="text-xs sm:text-sm font-medium mt-0.5 text-gray-400">
                    Optional camera preview for your study session.
                  </p>
                </div>
              </div>
            </div>

            {/* Inner Content: Left preview box + Right 3 status cards */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 my-auto items-stretch">
              {/* Left Sub-Box: Camera Radar / Active Video Feed */}
              <div className="sm:col-span-7 rounded-2xl p-4 bg-[#0d1014] border border-gray-800/90 min-h-[220px] relative overflow-hidden flex flex-col items-center justify-center text-center">
                {/* Video element - kept rendered for seamless stream attachment */}
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={
                    showCameraAnalysis
                      ? "w-full h-full object-cover rounded-xl"
                      : "hidden"
                  }
                  style={showCameraAnalysis ? { minHeight: "190px" } : {}}
                />

                {/* Overlaid local canvas for live FaceMesh landmarks + Phone bounding box */}
                {showCameraAnalysis && (
                  <canvas
                    ref={cameraCanvasRef}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none rounded-xl"
                  />
                )}

                {/* Overlaid controls when camera is active */}
                {showCameraAnalysis ? (
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 z-10 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                    <span className="text-[11px] font-bold text-lime-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse"></span>
                      CAMERA LIVE
                    </span>
                    <button
                      onClick={toggleDetector}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow transition active:scale-95"
                    >
                      Stop Camera
                    </button>
                  </div>
                ) : (
                  /* Radar / Target concentric circles when camera is inactive */
                  <div className="flex flex-col items-center justify-center w-full h-full py-2 select-none">
                    <div className="relative flex items-center justify-center mb-3">
                      <div className="w-24 h-24 rounded-full border border-lime-500/15 flex items-center justify-center animate-pulse">
                        <div className="w-16 h-16 rounded-full border border-lime-500/25 flex items-center justify-center">
                          {/* Center neon lime square */}
                          <div className="w-11 h-11 rounded-2xl bg-[#ccff00] flex items-center justify-center text-black font-black shadow-[0_0_20px_rgba(204,255,0,0.4)]">
                            <svg
                              className="w-5 h-5 text-black"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="7" />
                              <circle cx="12" cy="12" r="3" />
                              <circle cx="12" cy="12" r="1" fill="currentColor" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-400 text-xs sm:text-[13px] leading-relaxed max-w-[210px] mb-4">
                      Make a little space for deep work.
                      <br />
                      Your camera stays in this browser.
                    </p>

                    <div className="flex items-center gap-2.5 flex-wrap justify-center">
                      <button
                        onClick={toggleDetector}
                        disabled={isCameraLoading}
                        className={`px-4 py-2 rounded-xl font-extrabold text-xs sm:text-sm text-white transition-all active:scale-95 disabled:opacity-60 flex items-center gap-1.5 ${
                          isDark
                            ? "bg-[#4f46e5] hover:bg-[#4338ca] shadow-[0_4px_14px_rgba(79,70,229,0.35)]"
                            : "bg-[#1b3f30] hover:bg-[#143024] shadow-[0_4px_14px_rgba(27,63,48,0.35)]"
                        }`}
                      >
                        <span>
                          {isCameraLoading ? "Starting..." : "Enable camera"}
                        </span>
                        <span className="text-sm font-black">↗</span>
                      </button>
                      <span className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-[#1f242b] text-gray-400 border border-gray-700/60 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                        CAMERA OFF
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Sub-Box: 3 Stacked Status Cards */}
              <div className="sm:col-span-5 flex flex-col justify-between gap-2.5">
                {/* 1: Face tracking */}
                <div className="bg-[#1b2027] border border-gray-800/80 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${showCameraAnalysis
                        ? "bg-lime-400 animate-pulse"
                        : "bg-gray-400"
                        }`}
                    ></span>
                    <span className="text-white font-bold text-xs sm:text-sm">
                      Face tracking
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 pl-4">
                    {showCameraAnalysis && detectorStats
                      ? detectorStats.status
                      : "Ready to start"}
                  </p>
                </div>

                {/* 2: Focus session */}
                <div className="bg-[#1b2027] border border-gray-800/80 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${showCameraAnalysis && detectorStats
                        ? "bg-indigo-400"
                        : "bg-gray-400"
                        }`}
                    ></span>
                    <span className="text-white font-bold text-xs sm:text-sm">
                      Focus session
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 pl-4">
                    {showCameraAnalysis && detectorStats
                      ? `Score: ${detectorStats.focus_score}/100`
                      : "Not running"}
                  </p>
                </div>

                {/* 3: Privacy */}
                <div className="bg-[#1b2027] border border-gray-800/80 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${showCameraAnalysis && detectorStats?.phone_detected
                        ? "bg-rose-400 animate-bounce"
                        : "bg-gray-400"
                        }`}
                    ></span>
                    <span className="text-white font-bold text-xs sm:text-sm">
                      Privacy
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 pl-4">
                    {showCameraAnalysis && detectorStats?.phone_detected
                      ? "Phone: Detected 📱"
                      : "On-device preview"}
                  </p>
                </div>
              </div>
            </div>

            {/* Error Notification Banner if any */}
            {cameraError && (
              <div className="mt-2 p-3 bg-red-950/70 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center justify-between gap-2">
                <span>⚠️ {cameraError}</span>
                <button
                  onClick={() => setCameraError(null)}
                  className="text-red-400 hover:text-white font-bold text-xs ml-2"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>







        {/* Popups */}
        {showTimerPopup && (
          <div style={styles.popup}>
            <div style={isFocusTimerPopupMaximized ? styles.maximizedPopupInner : styles.popupInner}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={styles.popupTitle}>Set Focus Timer</h3>
                <button
                  onClick={() => setIsFocusTimerPopupMaximized(!isFocusTimerPopupMaximized)}
                  style={{ ...styles.smallBtn, background: '#6b7280' }}
                >
                  {isFocusTimerPopupMaximized ? "Minimize" : "Maximize"}
                </button>
              </div>
              <div style={styles.focusInputContainer}>
                <input
                  type="number"
                  min={0}
                  max={180}
                  value={focusMinutes}
                  onChange={(e) => setFocusMinutes(Number(e.target.value))}
                  style={{ ...styles.input, fontSize: isFocusTimerPopupMaximized ? '1.5em' : '1em' }}
                />
                <span style={{ fontSize: isFocusTimerPopupMaximized ? '1.2em' : '1em' }}>minutes</span>
              </div>
              <div style={{ marginTop: "16px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                <button
                  onClick={handleStartFocusTimer}
                  style={{ ...styles.button, fontSize: isFocusTimerPopupMaximized ? '1.2em' : '1em' }}
                >
                  ⏱️ Set Timer ({focusMinutes} min)
                </button>
                <button
                  onClick={() => {
                    setShowTimerPopup(false);
                    setVideoId(null);
                    setLocalVideoFile(null);
                    setLocalVideoObjectUrl(null);
                    setIsFocusTimerPopupMaximized(false);
                  }}
                  style={{
                    ...styles.button,
                    ...styles.secondaryButton,
                    fontSize: isFocusTimerPopupMaximized ? '1.2em' : '1em',
                    background: '#f3f4f6',
                    color: '#6b7280'
                  }}
                >
                  Cancel
                </button>
              </div>
              <p style={{ ...styles.popupText, fontSize: isFocusTimerPopupMaximized ? '1.1em' : '14px' }}>
                The timer will begin when you start playing the. During
                the timer, each tab switch costs {TAB_SWITCH_COST} coins.
              </p>
            </div>
          </div>

        )}

        {/* 🔔 Notification / Alert Popup Modal (Exact style of Set Focus Timer popup) */}
        {notificationPopup.show && (
          <div
            style={{
              ...styles.popup,
              zIndex: 9999,
            }}
            onClick={() => setNotificationPopup((prev) => ({ ...prev, show: false }))}
          >
            <div
              style={{
                ...styles.popupInner,
                maxWidth: "420px",
                textAlign: "center",
                position: "relative",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setNotificationPopup((prev) => ({ ...prev, show: false }))}
                style={{
                  position: "absolute",
                  top: "14px",
                  right: "14px",
                  background: "transparent",
                  border: "none",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  color: isDark ? "#94a3b8" : "#64748b",
                  padding: "4px 8px",
                  borderRadius: "8px",
                  fontWeight: "bold",
                }}
                title="Close"
              >
                ✕
              </button>

              {/* Big Icon */}
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  margin: "0 auto 14px auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "32px",
                  background: isDark ? "rgba(255,255,255,0.06)" : "rgba(27,63,48,0.08)",
                  border: `2px solid ${notificationPopup.badgeColor || (isDark ? "#a855f7" : "#1b3f30")}`,
                  boxShadow: `0 8px 24px ${notificationPopup.badgeColor ? `${notificationPopup.badgeColor}33` : "rgba(0,0,0,0.1)"}`,
                }}
              >
                {notificationPopup.icon || "🎉"}
              </div>

              {/* Badge Pill */}
              {notificationPopup.badge && (
                <div style={{ marginBottom: "10px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      padding: "4px 12px",
                      borderRadius: "999px",
                      color: notificationPopup.badgeColor || (isDark ? "#a855f7" : "#1b3f30"),
                      background: isDark ? "rgba(255,255,255,0.08)" : "rgba(27,63,48,0.1)",
                      border: `1px solid ${notificationPopup.badgeColor || "#1b3f30"}40`,
                    }}
                  >
                    {notificationPopup.badge}
                  </span>
                </div>
              )}

              {/* Title */}
              <h3
                style={{
                  ...styles.popupTitle,
                  fontSize: "1.35em",
                  marginBottom: "8px",
                  color: isDark ? "#f8fafc" : "#0f172a",
                }}
              >
                {notificationPopup.title}
              </h3>

              {/* Subtitle Message */}
              {notificationPopup.subtitle && (
                <p
                  style={{
                    fontSize: "0.95em",
                    color: isDark ? "#cbd5e1" : "#475569",
                    margin: "0 0 16px 0",
                    lineHeight: "1.5",
                  }}
                >
                  {notificationPopup.subtitle}
                </p>
              )}

              {/* Details List */}
              {notificationPopup.details && notificationPopup.details.length > 0 && (
                <div
                  style={{
                    background: isDark ? "rgba(15,23,42,0.6)" : "rgba(248,250,252,0.85)",
                    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0",
                    borderRadius: "14px",
                    padding: "12px 16px",
                    margin: "0 0 18px 0",
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {notificationPopup.details.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        fontSize: "0.9em",
                        fontWeight: "600",
                        color: isDark ? "#e2e8f0" : "#1e293b",
                      }}
                    >
                      <span style={{ fontSize: "1.1em" }}>•</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Dismiss Button */}
              <button
                type="button"
                onClick={() => setNotificationPopup((prev) => ({ ...prev, show: false }))}
                style={{
                  ...styles.button,
                  width: "100%",
                  padding: "12px 20px",
                  fontSize: "1em",
                }}
              >
                {notificationPopup.buttonText || "Got it!"}
              </button>
            </div>
          </div>
        )}


        {showBlockedPopup && (
          <div style={blockedStyles.overlay}>
            <div style={blockedStyles.popup}>
              <h2 style={blockedStyles.title}>⚠️ Access Blocked</h2>
              <p style={blockedStyles.message}>
                {blockedTitle || "This video is not allowed because it is not study-related."}
              </p>

              <button
                onClick={() => setShowBlockedPopup(false)}
                style={blockedStyles.button}
              >
                Go Back
              </button>
            </div>
          </div>
        )}


        {showZeroCoinsPopup && appState.coins <= 0 && (
          <div style={styles.popup}>
            <div style={{ ...styles.popupInner, border: "2px solid #f59e0b", position: "relative" }}>
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowZeroCoinsPopup(false)}
                style={{
                  position: "absolute",
                  top: "14px",
                  right: "14px",
                  background: "transparent",
                  border: "none",
                  color: isDark ? "#cbd5e1" : "#475569",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "8px",
                  fontWeight: "bold",
                }}
                title="Close"
              >
                ✕
              </button>

              <h3 style={{ ...styles.popupTitle, color: "#d97706" }}>
                ⚠️ You’re out of coins!
              </h3>

              <p style={styles.popupText}>
                Upgrade to <strong>Premium</strong> to continue watching videos and using focus mode.
              </p>

              <div style={{
                fontSize: "1.4em",
                fontWeight: "700",
                margin: "10px 0",
                color: isDark ? "#fff" : "#111",
              }}>
                💎 Premium – <span style={{ color: "#16a34a" }}>₹299</span>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "12px", flexDirection: "column" }}>
                <button
                  onClick={purchasePremium}
                  style={{
                    ...styles.button,
                    background: "#16a34a",
                    width: "100%",
                    padding: "12px",
                    fontSize: "1.05em",
                    fontWeight: "bold",
                  }}
                >
                  Unlock Premium for ₹299
                </button>
                <button
                  type="button"
                  onClick={() => setShowZeroCoinsPopup(false)}
                  style={{
                    ...styles.button,
                    background: isDark ? "#334155" : "#e2e8f0",
                    color: isDark ? "#f1f5f9" : "#334155",
                    width: "100%",
                    padding: "10px",
                    fontSize: "0.95em",
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}


        {/* ========================================================================= */}
        {/* 🎬 HERO VIDEO PLAYER SECTION (Left: Video Info & 3 Stat Cards | Right: Video) */}
        {/* ========================================================================= */}
        <div
          className="w-full rounded-3xl p-5 sm:p-7 lg:p-8 transition-all shadow-xl"
          style={{
            background: isDark
              ? "linear-gradient(145deg, #0b0f19 0%, #0f172a 50%, #0d1527 100%)"
              : "#fbf9f3",
            border: isDark
              ? "1px solid rgba(255, 255, 255, 0.1)"
              : "1px solid #eee8de",
            color: isDark ? "#ffffff" : "#0f172a",
            boxShadow: isDark
              ? "0 20px 40px rgba(0,0,0,0.4)"
              : "0 10px 30px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">

            {/* ─── LEFT COLUMN: Video Info + 3 Live Stat Cards + Actions ─── */}
            <div className="lg:col-span-5 flex flex-col justify-between h-full space-y-5">

              {/* 1. Video Info Header (Image 1 style) */}
              <div>
                {/* NOW STUDYING Eyebrow */}
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-widest uppercase border ${isDark
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full animate-pulse ${isDark ? "bg-amber-400" : "bg-amber-500"
                        }`}
                    ></span>
                    NOW STUDYING
                  </span>
                </div>

                {/* Video Title */}
                <h2
                  className={`text-xl sm:text-2xl lg:text-3xl font-extrabold leading-tight tracking-tight line-clamp-2 ${isDark ? "text-white" : "text-slate-900"
                    }`}
                  title={
                    videoMeta?.title ||
                    (localVideoFile
                      ? localVideoFile.name
                      : videoId
                        ? "YouTube Video"
                        : "Ready to Learn?")
                  }
                >
                  {videoMeta?.title ||
                    (localVideoFile
                      ? localVideoFile.name.replace(/\.[^/.]+$/, "")
                      : videoId
                        ? "Loading Video Details..."
                        : "Ready to Learn?")}
                </h2>

                {/* Subtitle / Channel */}
                <p
                  className={`mt-2 text-xs sm:text-sm font-medium flex items-center flex-wrap gap-2 ${isDark ? "text-slate-300" : "text-slate-600"
                    }`}
                >
                  <span>
                    {videoMeta?.channelTitle ||
                      (localVideoFile
                        ? "Offline Video File"
                        : videoId
                          ? "YouTube Study Video"
                          : "Paste a YouTube link or open a video to start")}
                  </span>
                  {videoMeta?.duration > 0 && (
                    <>
                      <span>·</span>
                      <span>⏱ {formatDuration(videoMeta.duration)}</span>
                    </>
                  )}
                  {videoMeta?.studyScore > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-emerald-500 font-semibold">
                        📊 {videoMeta.studyScore}% score
                      </span>
                    </>
                  )}
                </p>

                {/* Tags / Chips (Image 1 style) */}
                <div className="flex flex-wrap gap-2 mt-3.5">
                  {displayTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide border transition-all ${isDark
                        ? "border-white/20 bg-white/10 text-white/90 backdrop-blur-sm"
                        : "border-slate-200 bg-slate-100 text-slate-700"
                        }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* 2. THE 3 STAT CARDS (Image 2 style: Focus Time Remaining, Watched, Tab Switches) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                {/* Card 1: Focus Time Remaining with Circular Progress Ring */}
                <div
                  onClick={() => setShowTimerPopup(true)}
                  className={`rounded-2xl p-3.5 sm:p-4 border transition-all cursor-pointer hover:scale-[1.02] text-slate-900 group ${isDark
                    ? "bg-white/95 border-white/80 shadow-md"
                    : "bg-white/95 border-slate-200/90 shadow-sm hover:border-slate-300"
                    }`}
                  title="Click to set or adjust focus timer"
                >
                  <div className="flex items-center gap-1.5 text-slate-600 font-medium text-xs mb-2">
                    <svg
                      className="w-4 h-4 text-slate-600 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span className="truncate">Focus Time Remaining</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {focusRemaining !== null
                        ? `${Math.floor(focusRemaining / 60)}:${String(
                          focusRemaining % 60
                        ).padStart(2, "0")}`
                        : "00:00"}
                    </span>

                    {/* Circular Progress Indicator Ring */}
                    <svg
                      className="w-9 h-9 shrink-0 -rotate-90"
                      viewBox="0 0 36 36"
                    >
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#d1fae5"
                        strokeWidth="3.5"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#059669"
                        strokeWidth="3.5"
                        strokeDasharray={2 * Math.PI * 14}
                        strokeDashoffset={
                          2 *
                          Math.PI *
                          14 *
                          (1 -
                            Math.max(
                              0,
                              Math.min(
                                1,
                                (focusRemaining !== null
                                  ? focusRemaining
                                  : 0) /
                                ((focusDuration || focusMinutes * 60) || 1)
                              )
                            ))
                        }
                        strokeLinecap="round"
                        className="transition-all duration-500 ease-out"
                      />
                    </svg>
                  </div>
                </div>

                {/* Card 2: Watched */}
                <div
                  className={`rounded-2xl p-3.5 sm:p-4 border transition-all text-slate-900 ${isDark
                    ? "bg-white/95 border-white/80 shadow-md"
                    : "bg-white/95 border-slate-200/90 shadow-sm"
                    }`}
                >
                  <div className="flex items-center gap-1.5 text-slate-600 font-medium text-xs mb-2">
                    <svg
                      className="w-4 h-4 text-sky-500 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span>Watched</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {niceTime(sessionPlayedSeconds)}
                  </div>
                </div>

                {/* Card 3: Tab Switches */}
                <div
                  className={`rounded-2xl p-3.5 sm:p-4 border transition-all text-slate-900 ${isDark
                    ? "bg-white/95 border-white/80 shadow-md"
                    : "bg-white/95 border-slate-200/90 shadow-sm"
                    }`}
                >
                  <div className="flex items-center gap-1.5 text-slate-600 font-medium text-xs mb-2">
                    <svg
                      className="w-4 h-4 text-sky-500 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    <span className="truncate">Tab Switches</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {tabSwitches}
                  </div>
                </div>

              </div>

              {/* 3. Action Buttons: Only Stop & Save at bottom-left */}
              <div className="flex items-center justify-start pt-1">
                <button
                  onClick={handleStopSave}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <span>⏹</span>
                  <span>Stop & Save</span>
                </button>
              </div>

            </div>

            {/* ─── RIGHT COLUMN: The Video Player (Image 1 style) ─── */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center">
              <div
                ref={playerContainerRef}
                style={
                  isPlayerMaximized
                    ? styles.playerMax
                    : {
                      position: "relative",
                      width: "100%",
                      aspectRatio: "16 / 9",
                      minHeight: "260px",
                      maxHeight: "480px",
                      background: "#000",
                      borderRadius: "20px",
                      overflow: "hidden",
                      boxShadow: isDark
                        ? "0 14px 40px rgba(0, 0, 0, 0.45)"
                        : "0 10px 30px rgba(0, 0, 0, 0.15)",
                      border: isDark
                        ? "2px solid rgba(255, 255, 255, 0.12)"
                        : "2px solid #e2e8f0",
                    }
                }
              >
                {/* Floating Controls when Maximized */}
                <div
                  style={{
                    display: isPlayerMaximized ? "flex" : "none",
                    position: "absolute",
                    top: "16px",
                    right: "20px",
                    zIndex: 210,
                    gap: "10px",
                    alignItems: "center",
                  }}
                >
                  <button
                    onClick={handleVoiceDoubtInTracker}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "10px",
                      background: isVoiceListening
                        ? "#ef4444"
                        : isDark ? "#4f46e5" : "#1b3f30",
                      color: "#fff",
                      fontWeight: "bold",
                      fontSize: "14px",
                      border: "none",
                      cursor: "pointer",
                      boxShadow: isDark
                        ? "0 4px 15px rgba(79, 70, 229, 0.4)"
                        : "0 4px 15px rgba(27, 63, 48, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                    title="Speak doubt out loud to StudyBuddy AI (or press V)"
                  >
                    {isVoiceListening ? "🎙️ Listening... Speak Now" : "🎙️ Voice Doubt (V)"}
                  </button>
                  <button
                    onClick={() => setIsChatOpen((s) => !s)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "10px",
                      background: isDark ? "#4f46e5" : "#1b3f30",
                      color: "#fff",
                      fontWeight: "bold",
                      fontSize: "14px",
                      border: "none",
                      cursor: "pointer",
                      boxShadow: isDark
                        ? "0 4px 15px rgba(79, 70, 229, 0.4)"
                        : "0 4px 15px rgba(27, 63, 48, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    💬 {isChatOpen ? "Close AI Chat" : "Open AI Chat"}
                  </button>
                  <button
                    onClick={toggleMaximizePlayer}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "10px",
                      background: "rgba(0,0,0,0.7)",
                      color: "#fff",
                      fontWeight: "bold",
                      fontSize: "14px",
                      border: "1px solid rgba(255,255,255,0.3)",
                      cursor: "pointer",
                      boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
                    }}
                  >
                    📉 Minimize
                  </button>
                </div>

                {/* Video Elements */}
                {videoId ? (
                  <div style={{ width: "100%", height: "100%", position: "relative" }}>
                    <div
                      id="vt-youtube-player"
                      style={{ width: "100%", height: "100%" }}
                    />
                    {playerError && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-black/90 backdrop-blur-md rounded-2xl">
                        <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-2xl mb-3">
                          ⚠️
                        </div>
                        <h4 className="text-white font-bold text-base sm:text-lg mb-1">
                          Video Playback Restricted
                        </h4>
                        <p className="text-gray-300 text-xs sm:text-sm max-w-md mb-4 leading-relaxed">
                          {playerError}
                        </p>
                        <div className="flex gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPlayerError(null);
                              setSearchMode("search");
                              window.scrollTo({ top: 300, behavior: "smooth" });
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg active:scale-95"
                          >
                            🔍 Search Another Video
                          </button>
                          <button
                            type="button"
                            onClick={() => setPlayerError(null)}
                            className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl transition active:scale-95"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : localVideoObjectUrl ? (
                  <video
                    ref={localVideoRef}
                    src={localVideoObjectUrl}
                    controls
                    playsInline
                    autoPlay
                    onPlay={() => {
                      setIsPlaying(true);
                      startPolling();
                      if (isFocusTimerPending && !hasPlaybackStarted) {
                        setFocusRemaining(focusMinutes * 60);
                        setIsFocusTimerPending(false);
                        setHasPlaybackStarted(true);
                      }
                    }}
                    onPlaying={() => {
                      setIsPlaying(true);
                      startPolling();
                    }}
                    onPause={() => {
                      setIsPlaying(false);
                      stopPolling();
                    }}
                    onEnded={() => {
                      isVideoEndingRef.current = true;
                      setIsPlaying(false);
                      stopPolling();
                      if (sessionPlayedSeconds >= 5) {
                        handleStopSave();
                      } else {
                        finalizeSession(true);
                        updateVideosWatched(userId);
                      }
                      setTimeout(() => {
                        isVideoEndingRef.current = false;
                      }, 3000);
                    }}
                    onTimeUpdate={(e) => {
                      setCurrentTime(e.target.currentTime);
                    }}
                    onLoadedMetadata={() => {
                      setPlayerReady(true);
                      if (localVideoRef.current) {
                        lastSampleRef.current =
                          localVideoRef.current.currentTime || 0;
                      }
                    }}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      display: "block",
                      backgroundColor: "#000",
                    }}
                  />
                ) : (
                  /* Placeholder with Circular Gold Play Button (matching Image 2: Green in light mode, original in dark mode) */
                  <div className={`w-full h-full flex flex-col items-center justify-center p-6 text-center select-none group ${
                    isDark
                      ? "bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/80"
                      : "bg-gradient-to-br from-[#07130d] via-[#0d2218] to-[#1b3f30]"
                  }`}>
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform duration-300">
                      <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-amber-500 flex items-center justify-center shadow-md">
                        <svg
                          className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950 translate-x-0.5"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      </div>
                    </div>
                    <p className={`mt-4 text-xs sm:text-sm font-semibold max-w-xs ${
                      isDark ? "text-slate-300" : "text-emerald-100/90"
                    }`}>
                      Load a YouTube link or choose a local video from your device to begin.
                    </p>
                  </div>
                )}

                {/* Maximize / Minimize button */}
                {(videoId || localVideoObjectUrl) && (
                  <button
                    onClick={toggleMaximizePlayer}
                    style={styles.toggleMaxMinButton}
                  >
                    {isPlayerMaximized ? "Minimize" : "Maximize"}
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Notes Section: Side-by-Side (Take Notes on Left, Saved Notes on Right) */}
          {(videoId || localVideoObjectUrl) && (
            <div className="mt-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              {/* LEFT COLUMN: Take Notes & Save Important Points */}
              <div
                className={`p-5 sm:p-6 rounded-3xl border transition-all duration-300 shadow-sm flex flex-col justify-between ${isDark
                  ? "bg-[#151921] border-slate-700/80 text-white"
                  : "bg-[#fbf9f3] border-[#eee8de] text-slate-800"
                  }`}
              >
              {/* Header with Step Badge, Title & Spiral Notebook Graphic */}
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3.5">
                  {/* Step 3 Number Badge */}
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#1b3d2f] text-white flex items-center justify-center font-bold text-lg sm:text-xl shrink-0 shadow-xs">
                    3
                  </div>

                  <div>
                    <h3 className="m-0 text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                      Take Notes &amp; Save Important Points
                    </h3>
                    <p className="m-0 mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                      Write, organize and save your notes for this video.
                    </p>
                  </div>
                </div>

                {/* Spiral Notebook & Pen Vector Illustration (Adapts to Light & Dark themes) */}
                <div className="relative shrink-0 hidden sm:block select-none pointer-events-none">
                  <svg
                    className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-md transition-all duration-300"
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Notebook Group (rotated -8 deg like reference image) */}
                    <g transform="rotate(-8 45 48)">
                      {/* Back Cover / Under-pages Drop Layer for 3D depth */}
                      <rect
                        x="18"
                        y="12"
                        width="54"
                        height="72"
                        rx="5"
                        fill={isDark ? "#090d13" : "#e5e0d8"}
                      />
                      <rect
                        x="17"
                        y="11"
                        width="54"
                        height="72"
                        rx="5"
                        fill={isDark ? "#0e1520" : "#eeeae3"}
                      />

                      {/* Main Notepad Page */}
                      <rect
                        x="16"
                        y="10"
                        width="54"
                        height="72"
                        rx="5"
                        fill={isDark ? "#17202c" : "#faf8f5"}
                        stroke={isDark ? "#2a3749" : "#e2ded4"}
                        strokeWidth="1.2"
                      />

                      {/* Ruled Horizontal Lines */}
                      {[22, 29, 36, 43, 50, 57, 64, 71].map((y) => (
                        <line
                          key={y}
                          x1="28"
                          y1={y}
                          x2="63"
                          y2={y}
                          stroke={isDark ? "#2d3b4d" : "#e2ded6"}
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      ))}

                      {/* Left Margin Accent Line */}
                      <line
                        x1="25"
                        y1="12"
                        x2="25"
                        y2="80"
                        stroke={isDark ? "#f43f5e" : "#fca5a5"}
                        strokeWidth="0.8"
                        strokeOpacity={isDark ? "0.35" : "0.5"}
                      />

                      {/* Spiral Wire Coils & Binding Holes */}
                      {[16, 23, 30, 37, 44, 51, 58, 65, 72].map((y) => (
                        <g key={y}>
                          {/* Punched Hole */}
                          <ellipse
                            cx="17"
                            cy={y}
                            rx="1.5"
                            ry="1.8"
                            fill={isDark ? "#0c1219" : "#44403c"}
                          />
                          {/* Spiral Metallic Ring Loop */}
                          <path
                            d={`M 11.5 ${y - 1.5} C 11.5 ${y - 4.5}, 18.5 ${y - 4.5}, 18.5 ${y} C 18.5 ${y + 2.5}, 13.5 ${y + 2.5}, 13.5 ${y}`}
                            fill="none"
                            stroke={isDark ? "#94a3b8" : "#292524"}
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                          {/* Subtle Ring Highlight */}
                          <path
                            d={`M 13 ${y - 3} C 15 ${y - 3.5}, 17 ${y - 2}, 17.5 ${y - 0.5}`}
                            fill="none"
                            stroke={isDark ? "#e2e8f0" : "#78716c"}
                            strokeWidth="0.8"
                            strokeLinecap="round"
                          />
                        </g>
                      ))}
                    </g>

                    {/* Pen Group (angled next to notebook on right) */}
                    <g transform="rotate(24 74 52)">
                      {/* Pen Drop Shadow */}
                      <rect
                        x="72"
                        y="17"
                        width="5"
                        height="46"
                        rx="2.5"
                        fill="black"
                        fillOpacity="0.18"
                      />

                      {/* Pen Body */}
                      <rect
                        x="71"
                        y="16"
                        width="5.5"
                        height="48"
                        rx="2.5"
                        fill={isDark ? "#064e3b" : "#0f172a"}
                        stroke={isDark ? "#059669" : "#1e293b"}
                        strokeWidth="0.8"
                      />

                      {/* Metallic Pen Clip */}
                      <path
                        d="M 70.5 21 L 70.5 37 Q 70.5 39 72 39"
                        fill="none"
                        stroke={isDark ? "#cbd5e1" : "#94a3b8"}
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />

                      {/* Metallic Rings */}
                      <rect
                        x="70.5"
                        y="20"
                        width="6.5"
                        height="1.8"
                        rx="0.5"
                        fill={isDark ? "#e2e8f0" : "#cbd5e1"}
                      />
                      <rect
                        x="70.5"
                        y="58"
                        width="6.5"
                        height="1.8"
                        rx="0.5"
                        fill={isDark ? "#e2e8f0" : "#cbd5e1"}
                      />

                      {/* Pen Top Cap */}
                      <path
                        d="M 71 16 Q 73.75 13 76.5 16 Z"
                        fill={isDark ? "#cbd5e1" : "#64748b"}
                      />

                      {/* Pen Nib Cone */}
                      <polygon
                        points="71,60 76.5,60 74.3,70 73.2,70"
                        fill={isDark ? "#94a3b8" : "#cbd5e1"}
                      />
                      {/* Pen Ballpoint Tip */}
                      <polygon
                        points="73.2,70 74.3,70 73.9,72.5 73.6,72.5"
                        fill={isDark ? "#022c22" : "#090d16"}
                      />
                    </g>
                  </svg>
                </div>
              </div>

              {/* Notes Editor Box */}
              <div
                className={`rounded-2xl border transition-all overflow-hidden ${isDark
                  ? "bg-slate-900/60 border-slate-700 focus-within:border-emerald-600/60"
                  : "bg-white border-slate-200 focus-within:border-emerald-700/60"
                  }`}
              >
                {/* Formatting Toolbar */}
                <div
                  className={`px-3 py-2 border-b flex items-center gap-1 sm:gap-2 flex-wrap ${isDark
                    ? "bg-slate-800/40 border-slate-700/80 text-slate-300"
                    : "bg-slate-50/80 border-slate-200 text-slate-600"
                    }`}
                >
                  {/* Bold */}
                  <button
                    type="button"
                    onClick={() => handleToolbarFormat("bold")}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200/70 dark:hover:bg-slate-700 font-extrabold text-sm transition-colors cursor-pointer"
                    title="Bold (**text**)"
                  >
                    B
                  </button>

                  {/* Italic */}
                  <button
                    type="button"
                    onClick={() => handleToolbarFormat("italic")}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200/70 dark:hover:bg-slate-700 font-serif italic text-sm transition-colors cursor-pointer"
                    title="Italic (*text*)"
                  >
                    I
                  </button>

                  {/* Underline */}
                  <button
                    type="button"
                    onClick={() => handleToolbarFormat("underline")}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200/70 dark:hover:bg-slate-700 underline text-sm font-semibold transition-colors cursor-pointer"
                    title="Underline (<u>text</u>)"
                  >
                    U
                  </button>

                  <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-0.5" />

                  {/* Bullet List */}
                  <button
                    type="button"
                    onClick={() => handleToolbarFormat("bullet")}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Bullet List"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="9" y1="6" x2="20" y2="6" />
                      <line x1="9" y1="12" x2="20" y2="12" />
                      <line x1="9" y1="18" x2="20" y2="18" />
                      <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
                      <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
                      <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
                    </svg>
                  </button>

                  {/* Numbered List */}
                  <button
                    type="button"
                    onClick={() => handleToolbarFormat("number")}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Numbered List"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="10" y1="6" x2="21" y2="6" />
                      <line x1="10" y1="12" x2="21" y2="12" />
                      <line x1="10" y1="18" x2="21" y2="18" />
                      <text x="2" y="8" fontSize="8" fontWeight="bold" fill="currentColor" stroke="none">1</text>
                      <text x="2" y="14" fontSize="8" fontWeight="bold" fill="currentColor" stroke="none">2</text>
                      <text x="2" y="20" fontSize="8" fontWeight="bold" fill="currentColor" stroke="none">3</text>
                    </svg>
                  </button>

                  {/* Table */}
                  <button
                    type="button"
                    onClick={() => handleToolbarFormat("table")}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Insert Table"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18" />
                      <path d="M3 15h18" />
                      <path d="M9 3v18" />
                    </svg>
                  </button>

                  {/* Link */}
                  <button
                    type="button"
                    onClick={() => handleToolbarFormat("link")}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Insert Link"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  </button>
                </div>

                {/* Textarea */}
                <textarea
                  ref={noteTextareaRef}
                  placeholder="Write your notes here... (e.g. important concepts, formulas, questions, etc.)"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className={`w-full p-4 bg-transparent outline-none border-none text-sm leading-relaxed resize-y min-h-[140px] ${isDark
                    ? "text-slate-100 placeholder:text-slate-500"
                    : "text-slate-800 placeholder:text-slate-400"
                    }`}
                />
              </div>

              {/* Bottom Tag & Save Actions Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-3.5">
                {/* Tag Input */}
                <div
                  className={`flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all ${isDark
                    ? "bg-slate-900/70 border-slate-700 focus-within:border-emerald-600/70"
                    : "bg-white border-slate-200 focus-within:border-emerald-600/70"
                    }`}
                >
                  <svg className="w-4 h-4 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7z" />
                  </svg>
                  <input
                    placeholder="Tag (e.g., 'Graph Theory', 'GATE', 'Important')"
                    value={tagText}
                    onChange={(e) => setTagText(e.target.value)}
                    className={`flex-1 bg-transparent border-none outline-none text-xs sm:text-sm font-medium ${isDark
                      ? "text-slate-100 placeholder:text-slate-500"
                      : "text-slate-800 placeholder:text-slate-400"
                      }`}
                  />
                </div>

                {/* Save Notes Button */}
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className={`active:scale-95 text-white px-5 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 ${
                    isDark
                      ? "bg-[#4f46e5] hover:bg-[#4338ca] shadow-indigo-500/25"
                      : "bg-[#1b3f30] hover:bg-[#143024] shadow-emerald-950/20"
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  <span>Save Notes</span>
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: Saved Notes Section (Side by side with Take Notes) */}
            <div
              className={`p-5 sm:p-6 rounded-3xl border transition-all duration-300 shadow-sm flex flex-col justify-between min-w-0 w-full overflow-hidden ${isDark
                ? "bg-[#151921] border-slate-700/80 text-white"
                : "bg-[#fbf9f3] border-[#eee8de] text-slate-800"
                }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#1b3d2f] text-white flex items-center justify-center font-bold text-lg sm:text-xl shrink-0 shadow-xs">
                    📌
                  </div>
                  <div>
                    <h3 className="m-0 text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                      Saved Notes
                    </h3>
                    <p className="m-0 mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                      Your saved insights and pinned sticky notes for this lesson.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sticky Note Content */}
              {!currentActiveVideoIdentifier ? (
                <div className="flex-1 flex items-center justify-center py-10 text-center">
                  <p style={stickyNotes.emptyMsg}>Load a video to view saved notes.</p>
                </div>
              ) : (() => {
                const existing = appState.notes?.[currentActiveVideoIdentifier] || "";
                const cumulative = (existing ? existing + (noteText.trim() ? "\n" + noteText : "") : noteText).trim();

                if (!cumulative) {
                  return (
                    <div className="flex-1 flex items-center justify-center py-10 text-center">
                      <p style={stickyNotes.emptyMsg}>No notes saved yet for this video. Add one! ✨</p>
                    </div>
                  );
                }

                return (
                  <div className="flex-1 flex flex-col justify-start min-w-0 w-full overflow-hidden">
                    <div
                      style={{
                        ...stickyNotes.stickyCard,
                        height: "100%",
                        minHeight: "240px",
                        maxHeight: "380px",
                        boxSizing: "border-box",
                        overflowY: "auto",
                        overflowX: "hidden",
                        wordBreak: "break-word",
                        overflowWrap: "anywhere"
                      }}
                    >
                      <div style={stickyNotes.pin}></div>
                      <div style={stickyNotes.noteText}>{cumulative}</div>
                      {appState.tags?.[currentActiveVideoIdentifier] && (
                        <div style={stickyNotes.tag}>#{appState.tags[currentActiveVideoIdentifier]}</div>
                      )}
                      <div style={stickyNotes.date}>
                        Last updated: <strong>{new Date().toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

      </div>



        {/* Stats & History */}
        <div style={styles.panel}>
          <h3 style={styles.sectionTitle}>📊 Monthly Study Performance</h3>

          {/* Month selector & Controls */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 14 }}>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                background: isDark ? "#1e293b" : "#ffffff",
                color: isDark ? "#f8fafc" : "#0f172a",
                border: isDark ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid #cbd5e1",
                fontSize: "14px",
                fontWeight: 600,
                outline: "none",
                cursor: "pointer",
                boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>

            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{
                width: 95,
                padding: "8px 12px",
                borderRadius: 10,
                background: isDark ? "#1e293b" : "#ffffff",
                color: isDark ? "#f8fafc" : "#0f172a",
                border: isDark ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid #cbd5e1",
                fontSize: "14px",
                fontWeight: 600,
                outline: "none",
                boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.06)",
              }}
            />

            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => setMonthStartIndex((s) => Math.max(0, s - 10))}
                style={{
                  padding: "7px 13px",
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 10,
                  background: isDark ? "rgba(99, 102, 241, 0.15)" : "#eaf3ee",
                  color: isDark ? "#a5b4fc" : "#1b3f30",
                  border: isDark ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid rgba(27, 63, 48, 0.25)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                ◀ Prev 10
              </button>
              <button
                onClick={() => setMonthStartIndex((s) => Math.min(Math.max(0, monthData.length - 10), s + 10))}
                style={{
                  padding: "7px 13px",
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 10,
                  background: isDark ? "rgba(99, 102, 241, 0.15)" : "#eaf3ee",
                  color: isDark ? "#a5b4fc" : "#1b3f30",
                  border: isDark ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid rgba(27, 63, 48, 0.25)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                Next 10 ▶
              </button>
            </div>
          </div>

          {/* Info - swipe/trackpad to move by 10 days */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
            <span style={{ color: isDark ? "#94a3b8" : "#64748b", fontSize: 13, fontWeight: 500 }}>
              Showing {monthData.length ? monthData[Math.min(monthStartIndex, monthData.length - 1)].label : "—"}
              {" "}to{" "}
              {monthData.length ? monthData[Math.min(monthStartIndex + 9, monthData.length - 1)].label : "—"}
            </span>
          </div>

          {/* Chart area: Smooth Spline Area Chart matching StudyBuddy 'Study' Logo Indigo/Violet Theme */}
          <div
            onWheel={handleWheelNav}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            style={{ height: 330, marginTop: "6px", touchAction: "pan-y", cursor: "grab" }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthData.slice(monthStartIndex, monthStartIndex + 10)}
                margin={{ top: 20, right: 20, left: -10, bottom: 5 }}
              >
                <defs>
                  {/* Indigo/Violet in Dark Mode (Original), Forest Green #1b3f30 in Light Mode */}
                  <linearGradient id="studyLogoArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isDark ? "#6366f1" : "#1b3f30"} stopOpacity={isDark ? 0.42 : 0.42} />
                    <stop offset="55%" stopColor={isDark ? "#6366f1" : "#1b3f30"} stopOpacity={isDark ? 0.10 : 0.10} />
                    <stop offset="100%" stopColor={isDark ? "#6366f1" : "#1b3f30"} stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="studyLogoStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={isDark ? "#4f46e5" : "#1b3f30"} />
                    <stop offset="50%" stopColor={isDark ? "#6366f1" : "#265944"} />
                    <stop offset="100%" stopColor={isDark ? "#7c3aed" : "#1b3f30"} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={true}
                  horizontal={true}
                  stroke={isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"}
                />

                <XAxis
                  dataKey="label"
                  tickFormatter={(lbl) => {
                    if (!lbl) return "";
                    const parts = lbl.split(" ");
                    return parts.length === 2 ? `${parts[0].slice(0, 3)} ${parts[1]}` : lbl;
                  }}
                  tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 11, fontWeight: 500 }}
                  axisLine={{ stroke: isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(0, 0, 0, 0.12)" }}
                  tickLine={{ stroke: isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(0, 0, 0, 0.12)" }}
                  dy={6}
                />

                {/* Flexible Minutes Y-Axis (Image 2 style values & elasticity) */}
                <YAxis
                  stroke={isDark ? "#94a3b8" : "#64748b"}
                  tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 11, fontWeight: 500 }}
                  axisLine={{ stroke: isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(0, 0, 0, 0.12)" }}
                  tickLine={{ stroke: isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(0, 0, 0, 0.12)" }}
                  allowDecimals={false}
                  domain={[0, (dataMax) => {
                    if (!dataMax || dataMax <= 0) return 10;
                    if (dataMax <= 5) return 6;
                    if (dataMax <= 10) return 12;
                    if (dataMax <= 20) return 24;
                    if (dataMax <= 60) return Math.ceil(dataMax * 1.25 / 5) * 5;
                    return Math.ceil(dataMax * 1.2 / 10) * 10;
                  }]}
                  tickFormatter={(v) => (v === 0 ? "0" : `${v}m`)}
                  dx={-4}
                />

                {/* Floating Sleek Tooltip */}
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const mins = Number(payload[0].value) || 0;
                      const hrs = Math.floor(mins / 60);
                      const rem = mins % 60;
                      const formatted =
                        hrs > 0
                          ? `${hrs}h ${rem > 0 ? `${rem}m` : ""}`.trim()
                          : `${rem} min`;

                      return (
                        <div
                          style={{
                            background: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.98)",
                            backdropFilter: "blur(16px)",
                            border: isDark ? "1px solid rgba(99, 102, 241, 0.45)" : "1px solid rgba(27, 63, 48, 0.35)",
                            borderRadius: "14px",
                            padding: "10px 16px",
                            boxShadow: isDark
                              ? "0 12px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(99, 102, 241, 0.35)"
                              : "0 10px 25px rgba(27, 63, 48, 0.2), 0 4px 10px rgba(0, 0, 0, 0.05)",
                            textAlign: "center",
                            minWidth: "120px",
                            pointerEvents: "none",
                          }}
                        >
                          <div style={{
                            fontSize: "15px",
                            fontWeight: "800",
                            color: isDark ? "#a5b4fc" : "#1b3f30",
                            letterSpacing: "-0.01em",
                            lineHeight: 1.2,
                          }}>
                            {formatted}
                          </div>
                          <div style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            color: isDark ? "#94a3b8" : "#64748b",
                            marginTop: "3px",
                          }}>
                            {label}
                          </div>
                          <div style={{
                            fontSize: "11px",
                            color: isDark ? "#cbd5e1" : "#475569",
                            marginTop: "6px",
                            paddingTop: "6px",
                            borderTop: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.06)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px",
                          }}>
                            <span>🕒 Total Watched:</span>
                            <span style={{ fontWeight: "700", color: isDark ? "#818cf8" : "#143024" }}>
                              {mins} min
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Smooth curved Area with theme gradients & glowing nodes */}
                <Area
                  type="monotone"
                  dataKey="mins"
                  stroke="url(#studyLogoStroke)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#studyLogoArea)"
                  dot={{
                    r: 4.5,
                    fill: isDark ? "#0f172a" : "#ffffff",
                    stroke: isDark ? "#6366f1" : "#1b3f30",
                    strokeWidth: 2.5,
                  }}
                  activeDot={{
                    r: 7,
                    fill: "#ffffff",
                    stroke: isDark ? "#4f46e5" : "#1b3f30",
                    strokeWidth: 3.5,
                    style: { filter: isDark ? "drop-shadow(0 0 10px rgba(99, 102, 241, 0.9))" : "drop-shadow(0 0 10px rgba(27, 63, 48, 0.7))" },
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 🎬 SAVED STUDY VIDEOS CAROUSEL / SLIDER (Matching Reference Image)        */}
        {/* ========================================================================= */}
        <div
          className="w-full rounded-3xl p-5 sm:p-7 transition-all shadow-md mt-6"
          style={{
            background: isDark ? "rgba(15, 23, 42, 0.85)" : "#fbf9f3",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #eee8de",
            color: isDark ? "#ffffff" : "#0f172a",
          }}
        >
          {/* Header Row: Count Badge + Title + Subtitle on Left | View History + Nav Arrows on Right */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3.5">
              <div className={`w-11 h-11 rounded-full text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0 ${
                isDark ? "bg-[#4f46e5]" : "bg-[#1b3f30]"
              }`}>
                {uniqueCards.length}
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold font-serif tracking-tight leading-tight">
                  Your Study Videos
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  All your saved study videos and daily logs.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowWatchHistoryModal(true)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 ${
                  isDark
                    ? "bg-[#4f46e5] hover:bg-[#4338ca] shadow-indigo-500/25"
                    : "bg-[#1b3f30] hover:bg-[#143024] shadow-emerald-950/20"
                }`}
              >
                View Watch History →
              </button>

              {/* Slider Arrow Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => scrollSlider("left")}
                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-sm font-bold text-base select-none"
                  title="Previous videos"
                >
                  ‹
                </button>
                <button
                  onClick={() => scrollSlider("right")}
                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-sm font-bold text-base select-none"
                  title="Next videos"
                >
                  ›
                </button>
              </div>
            </div>
          </div>

          {/* Horizontal Slider Track */}
          <div
            ref={videoSliderRef}
            className="flex items-stretch gap-4 overflow-x-auto pb-4 pt-1 scroll-smooth select-none scrollbar-none"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {uniqueCards.length > 0 ? (
              uniqueCards.map((h, i) => {
                const rawActualDuration = Number(
                  h.duration ||
                  h.videoDuration ||
                  (videoMeta && (h.videoId === videoId || h.videoId === videoMeta?.videoId) ? videoMeta.duration : 0)
                );
                const actualDurationSec = rawActualDuration > 0 ? rawActualDuration : 0;
                const watchedSeconds = Number(h.totalSecondsWatched ?? h.secondsWatched ?? h.seconds ?? 0);
                const completedPositionSec = Number(
                  h.lastWatchedPosition ||
                  (h.videoId === videoId && currentTime > 0 ? Math.round(currentTime) : 0) ||
                  watchedSeconds ||
                  0
                );

                const cumulativeWatchTime = formatVideoTime(watchedSeconds);
                const completedBadgeText = completedPositionSec > 0
                  ? formatVideoTime(completedPositionSec)
                  : (actualDurationSec > 0 ? formatVideoTime(actualDurationSec) : cumulativeWatchTime);

                const switches = h.totalTabSwitches ?? h.tabSwitches ?? 0;
                const rawDate = h.latestWatchedAt || h.watchedAt;
                const watchDate = rawDate
                  ? rawDate.includes("T")
                    ? new Date(rawDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : rawDate
                  : "Recent";
                const isLocal =
                  !/^[0-9A-Za-z_-]{11}$/.test(h.videoId) ||
                  h.url === "Local Video" ||
                  h.url === "Local File" ||
                  (h.url && !h.url.startsWith("http"));
                const actualNote = h.note || h.notes || appState.notes?.[h.videoId] || "";

                // Calculate watch completion percentage directly from actual video duration
                let completionPct = 0;
                if (actualDurationSec > 0 && completedPositionSec > 0) {
                  completionPct = Math.min(100, Math.max(1, Math.round((completedPositionSec / actualDurationSec) * 100)));
                } else if (actualDurationSec > 0 && watchedSeconds > 0) {
                  completionPct = Math.min(100, Math.max(1, Math.round((watchedSeconds / actualDurationSec) * 100)));
                }

                return (
                  <div
                    key={h.videoId || i}
                    onClick={(e) => handleSessionCardClick(e, h)}
                    className={`w-[260px] sm:w-[280px] shrink-0 rounded-2xl p-3.5 border transition-all flex flex-col justify-between cursor-pointer select-none group shadow-sm hover:shadow-md ${isDark
                      ? "bg-slate-800/95 border-slate-700/80 hover:border-slate-600"
                      : "bg-white/95 border-slate-200/90 hover:border-slate-300"
                      }`}
                  >
                    <div>
                      {/* Top Video Preview Thumbnail */}
                      <div className="aspect-video w-full rounded-xl overflow-hidden relative bg-slate-950 mb-2.5 shadow-xs">
                        {h.thumbnail ? (
                          <img
                            src={h.thumbnail}
                            alt={h.videoTitle || "Video Thumbnail"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-950 text-white">
                            <span className="text-2xl">🎬</span>
                            <span className="text-[10px] text-slate-300 mt-1 font-semibold">Local Video</span>
                          </div>
                        )}

                        {/* Clickable Play Overlay */}
                        <div
                          onClick={(e) => handleSessionCardClick(e, h)}
                          className="absolute inset-0 bg-black/25 hover:bg-black/10 flex items-center justify-center transition-all cursor-pointer"
                          title="Click to play video in tracker"
                        >
                          <div className="w-9 h-9 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <svg className="w-4 h-4 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                          </div>
                        </div>

                        {/* Watched Portion Badge on Thumbnail */}
                        <span className="absolute bottom-2.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-semibold text-white z-20">
                          {completedBadgeText}
                        </span>

                        {/* YouTube-Style Red Watch Progress Bar */}
                        {completionPct > 0 && (
                          <div
                            className="absolute bottom-0 left-0 right-0 h-1 sm:h-1.5 bg-black/60 z-10 overflow-hidden pointer-events-none"
                            title={`${completionPct}% completed (${formatVideoTime(completedPositionSec)} of ${formatVideoTime(actualDurationSec || completedPositionSec)})`}
                          >
                            <div
                              className="h-full bg-red-600 transition-all duration-300"
                              style={{ width: `${completionPct}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Title row */}
                      <h4 className="m-0 mb-2 text-sm font-semibold">
                        <div
                          className={`flex items-center gap-1.5 truncate text-[0.88rem] font-bold ${isDark ? "text-indigo-400 hover:text-indigo-300" : "text-[#1b3f30] hover:text-[#143024]"
                            }`}
                          title={h.videoTitle || h.videoId}
                        >
                          <span className="shrink-0">{isLocal ? "📁" : "▶️"}</span>
                          <span className="truncate">{h.videoTitle || (isLocal ? "Local Video" : `Video ${h.videoId}`)}</span>
                        </div>
                      </h4>

                      {/* Stats Grid: DURATION & SWITCHES */}
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <p className={`m-0 text-[10px] tracking-wider font-bold uppercase mb-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            DURATION
                          </p>
                          <p className={`m-0 text-[0.92rem] font-extrabold ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                            {cumulativeWatchTime}
                          </p>
                        </div>
                        <div>
                          <p className={`m-0 text-[10px] tracking-wider font-bold uppercase mb-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            SWITCHES
                          </p>
                          <p className={`m-0 text-[0.92rem] font-extrabold ${switches > 0 ? (isDark ? "text-rose-400" : "text-rose-600") : (isDark ? "text-slate-300" : "text-slate-700")}`}>
                            {switches}
                          </p>
                        </div>
                      </div>

                      {/* Date */}
                      <p className={`m-0 mb-2 text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        {watchDate}
                      </p>

                      {/* Optional Tag badge */}
                      {h.tag && (
                        <div className="mb-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${isDark
                            ? "bg-indigo-950/60 text-indigo-300 border-indigo-800/60"
                            : "bg-emerald-50 text-[#1b3f30] border-[#1b3f30]/25"
                            }`}>
                            #{h.tag}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons: Original in Dark Mode, #1b3f30 Green in Light Mode */}
                    <div className="mt-2 flex flex-col gap-1.5">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedVideoForLogs(h);
                          setShowLogsModal(true);
                        }}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs border ${isDark
                          ? "bg-blue-950/70 text-blue-300 border-blue-800/80 hover:bg-blue-900/80"
                          : "bg-[#eaf3ee] text-[#1b3f30] border-[#1b3f30]/30 hover:bg-[#d4e7dd]"
                          }`}
                      >
                        📊 Daily Watch Logs
                      </button>

                      {actualNote && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedNote(actualNote);
                            setShowNoteModal(true);
                          }}
                          className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs border ${isDark
                            ? "bg-indigo-950/70 text-indigo-300 border-indigo-800/80 hover:bg-indigo-900/80"
                            : "bg-[#eaf3ee] text-[#1b3f30] border-[#1b3f30]/30 hover:bg-[#d4e7dd]"
                            }`}
                        >
                          📝 View Note
                        </button>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (actualNote) {
                              generateNotePDF(actualNote, `note-${h.videoId}-${i}`, "view");
                            } else {
                              alert("No notes saved yet for this video.");
                            }
                          }}
                          disabled={!actualNote}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center gap-1 ${actualNote
                            ? isDark
                              ? "bg-indigo-950/70 text-indigo-300 border-indigo-800/80 hover:bg-indigo-900/80 cursor-pointer"
                              : "bg-[#eaf3ee] text-[#1b3f30] border-[#1b3f30]/30 hover:bg-[#d4e7dd] cursor-pointer"
                            : isDark
                              ? "bg-slate-800/60 text-slate-400 border-slate-700/60 cursor-not-allowed"
                              : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            }`}
                        >
                          📄 View PDF
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (actualNote) {
                              generateNotePDF(actualNote, `note-${h.videoId}-${i}`, "download");
                            } else {
                              alert("No notes to download.");
                            }
                          }}
                          disabled={!actualNote}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center gap-1 ${actualNote
                            ? isDark
                              ? "bg-indigo-950/70 text-indigo-300 border-indigo-800/80 hover:bg-indigo-900/80 cursor-pointer"
                              : "bg-[#eaf3ee] text-[#1b3f30] border-[#1b3f30]/30 hover:bg-[#d4e7dd] cursor-pointer"
                            : isDark
                              ? "bg-slate-800/60 text-slate-400 border-slate-700/60 cursor-not-allowed"
                              : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            }`}
                        >
                          📥 Download PDF
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : null}

            {/* Banner Card at the end of slider (Build Your Learning Library - Always Shown) */}
            <div
              onClick={() => setShowWatchHistoryModal(true)}
              className={`w-[240px] sm:w-[260px] shrink-0 rounded-2xl p-4 text-white flex flex-col justify-between shadow-lg hover:scale-[1.02] transition-transform cursor-pointer relative overflow-hidden min-h-[200px] border ${
                isDark
                  ? "bg-gradient-to-br from-[#3730a3] via-[#312e81] to-[#1e1b4b] border-indigo-500/30 shadow-indigo-950/40"
                  : "bg-gradient-to-br from-[#1b3f30] via-[#163327] to-[#0f241b] border-emerald-800/40 shadow-emerald-950/20"
              }`}
            >
              <div>
                <h4 className={`font-bold text-base sm:text-lg leading-snug font-serif ${isDark ? "text-white" : "text-emerald-100"}`}>
                  Build Your Learning Library
                </h4>
                <p className={`text-xs mt-2 leading-relaxed ${isDark ? "text-indigo-100/90" : "text-emerald-200/80"}`}>
                  Organize, Revisit and Master Topics.
                </p>
              </div>
              <div className="flex items-center justify-between mt-6">
                <span className="text-3xl select-none">🪴</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowWatchHistoryModal(true);
                  }}
                  className={`w-8 h-8 rounded-full text-white flex items-center justify-center transition-all cursor-pointer shadow-md text-sm ${
                    isDark
                      ? "bg-[#4f46e5] hover:bg-[#4338ca]"
                      : "bg-[#143024] hover:bg-[#0f241b] border border-emerald-600/40"
                  }`}
                  title="Open full watch history"
                >
                  →
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ─── YouTube Enhancement Panels ─── */}
        {renderPlaylistPanel()}
        {renderQuizSection()}

      </div>

      {/* Quiz Config Modal */}
      {showQuizConfigModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowQuizConfigModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              background: isDark ? "#1e293b" : "#fdfbf7",
              border: isDark ? "1px solid #334155" : "1px solid #eee8de",
              borderRadius: "20px",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "800", color: "#1f2937" }}>
                ✨ AI Quiz Generator
              </h3>
              <button
                onClick={() => setShowQuizConfigModal(false)}
                style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#9ca3af" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "0 0 20px 0" }}>
              Gemini AI will analyze the actual educational video content and generate questions. Select your quiz options:
            </p>

            {/* Number of Questions */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#374151", marginBottom: "8px" }}>
                Number of Questions:
              </label>
              <div style={{ display: "flex", gap: "12px" }}>
                {[5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setQuizNumQuestions(num)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "10px",
                      border: quizNumQuestions === num ? "2px solid #6366f1" : "1px solid #e5e7eb",
                      background: quizNumQuestions === num ? "#eef2ff" : "#ffffff",
                      color: quizNumQuestions === num ? "#4f46e5" : "#374151",
                      fontWeight: "700",
                      fontSize: "0.9rem",
                      cursor: "pointer",
                    }}
                  >
                    {num} Questions
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#374151", marginBottom: "8px" }}>
                Difficulty:
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                {[
                  { level: "Easy", icon: "🟢" },
                  { level: "Medium", icon: "🟡" },
                  { level: "Hard", icon: "🔴" },
                ].map(({ level, icon }) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setQuizDifficulty(level)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "10px",
                      border: quizDifficulty === level ? "2px solid #6366f1" : "1px solid #e5e7eb",
                      background: quizDifficulty === level ? "#eef2ff" : "#ffffff",
                      color: quizDifficulty === level ? "#4f46e5" : "#374151",
                      fontWeight: "700",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    {icon} {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setShowQuizConfigModal(false)}
                style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #d1d5db", background: "#ffffff", color: "#374151", fontWeight: "600", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateQuiz}
                style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)", color: "#ffffff", fontWeight: "700", cursor: "pointer", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}
              >
                🚀 Start Quiz Generation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Watch History Modal */}
      {showWatchHistoryModal && (
        <div
          style={{
            position: "fixed",
            top: "0",
            left: "0",
            right: "0",
            bottom: "0",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: "10000",
            padding: "20px",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowWatchHistoryModal(false)}
        >
          <div
            style={{
              backgroundColor: isDark ? "#1e293b" : "#fdfbf7",
              border: isDark ? "1px solid #334155" : "1px solid #eee8de",
              borderRadius: "16px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
              maxWidth: "1050px",
              width: "100%",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "18px 24px",
                background: isDark ? "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" : "linear-gradient(135deg, #1b3f30 0%, #265944 100%)",
                color: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h3 style={{ margin: "0 0 2px 0", fontSize: "1.2rem", fontWeight: "700" }}>
                  📜 Study Video Watch History
                </h3>
                <p style={{ margin: 0, fontSize: "0.82rem", opacity: 0.9 }}>
                  All saved video sessions & study stats
                </p>
              </div>
              <button
                onClick={() => setShowWatchHistoryModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  padding: "0 4px",
                  lineHeight: "1",
                }}
              >
                ✖
              </button>
            </div>

            {/* Modal Body */}
            <div
              className={`p-5 overflow-y-auto flex-1 ${isDark ? "bg-slate-900" : "bg-slate-50"
                }`}
            >
              {(() => {
                if (uniqueCards.length === 0) {
                  return (
                    <div className="py-12 text-center">
                      <p className="text-slate-400 text-sm m-0">No study video cards found.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {uniqueCards.map((h, i) => {
                      const rawActualDuration = Number(
                        h.duration ||
                        h.videoDuration ||
                        (videoMeta && (h.videoId === videoId || h.videoId === videoMeta?.videoId) ? videoMeta.duration : 0)
                      );
                      const actualDurationSec = rawActualDuration > 0 ? rawActualDuration : 0;
                      const watchedSeconds = Number(h.totalSecondsWatched ?? h.secondsWatched ?? h.seconds ?? 0);
                      const completedPositionSec = Number(
                        h.lastWatchedPosition ||
                        (h.videoId === videoId && currentTime > 0 ? Math.round(currentTime) : 0) ||
                        watchedSeconds ||
                        0
                      );

                      const cumulativeWatchTime = formatVideoTime(watchedSeconds);
                      const completedBadgeText = completedPositionSec > 0
                        ? formatVideoTime(completedPositionSec)
                        : (actualDurationSec > 0 ? formatVideoTime(actualDurationSec) : cumulativeWatchTime);

                      const switches = h.totalTabSwitches ?? h.tabSwitches ?? 0;
                      const rawDate = h.latestWatchedAt || h.watchedAt;
                      const watchDate = rawDate
                        ? rawDate.includes("T")
                          ? new Date(rawDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                          : rawDate
                        : "Recent";
                      const isLocal =
                        !/^[0-9A-Za-z_-]{11}$/.test(h.videoId) ||
                        h.url === "Local Video" ||
                        h.url === "Local File" ||
                        (h.url && !h.url.startsWith("http"));
                      const actualNote = h.note || h.notes || appState.notes?.[h.videoId] || "";

                      // Calculate watch completion percentage directly from actual video duration
                      let completionPct = 0;
                      if (actualDurationSec > 0 && completedPositionSec > 0) {
                        completionPct = Math.min(100, Math.max(1, Math.round((completedPositionSec / actualDurationSec) * 100)));
                      } else if (actualDurationSec > 0 && watchedSeconds > 0) {
                        completionPct = Math.min(100, Math.max(1, Math.round((watchedSeconds / actualDurationSec) * 100)));
                      }

                      return (
                        <div
                          key={h.videoId || i}
                          onClick={(e) => {
                            handleSessionCardClick(e, h);
                            setShowWatchHistoryModal(false);
                          }}
                          className={`rounded-2xl p-3.5 border transition-all flex flex-col justify-between cursor-pointer select-none group shadow-sm hover:shadow-md ${isDark
                            ? "bg-slate-800/95 border-slate-700/80 hover:border-slate-600"
                            : "bg-white/95 border-slate-200/80 hover:border-slate-300"
                            }`}
                        >
                          <div>
                            {/* Top Video Preview Thumbnail */}
                            <div className="aspect-video w-full rounded-xl overflow-hidden relative bg-slate-950 mb-2.5 shadow-xs">
                              {h.thumbnail ? (
                                <img
                                  src={h.thumbnail}
                                  alt={h.videoTitle || "Video Thumbnail"}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-950 text-white">
                                  <span className="text-2xl">🎬</span>
                                  <span className="text-[10px] text-slate-300 mt-1 font-semibold">Local Video</span>
                                </div>
                              )}

                              {/* Clickable Play Overlay */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSessionCardClick(e, h);
                                  setShowWatchHistoryModal(false);
                                }}
                                className="absolute inset-0 bg-black/25 hover:bg-black/10 flex items-center justify-center transition-all cursor-pointer"
                                title="Click to play video in tracker"
                              >
                                <div className="w-9 h-9 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                  <svg className="w-4 h-4 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                  </svg>
                                </div>
                              </div>

                              {/* Watched Portion Badge on Thumbnail */}
                              <span className="absolute bottom-2.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-semibold text-white z-20">
                                {completedBadgeText}
                              </span>

                              {/* YouTube-Style Red Watch Progress Bar */}
                              {completionPct > 0 && (
                                <div
                                  className="absolute bottom-0 left-0 right-0 h-1 sm:h-1.5 bg-black/60 z-10 overflow-hidden pointer-events-none"
                                  title={`${completionPct}% completed (${formatVideoTime(completedPositionSec)} of ${formatVideoTime(actualDurationSec || completedPositionSec)})`}
                                >
                                  <div
                                    className="h-full bg-red-600 transition-all duration-300"
                                    style={{ width: `${completionPct}%` }}
                                  />
                                </div>
                              )}
                            </div>

                            {/* Title row */}
                            <h4 className="m-0 mb-2 text-sm font-semibold">
                              <div
                                className={`flex items-center gap-1.5 truncate text-[0.88rem] font-bold ${isDark ? "text-indigo-400 hover:text-indigo-300" : "text-[#1b3f30] hover:text-[#143024]"
                                  }`}
                                title={h.videoTitle || h.videoId}
                              >
                                <span className="shrink-0">{isLocal ? "📁" : "▶️"}</span>
                                <span className="truncate">{h.videoTitle || (isLocal ? "Local Video" : `Video ${h.videoId}`)}</span>
                              </div>
                            </h4>

                            {/* Stats Grid: DURATION & SWITCHES */}
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div>
                                <p className={`m-0 text-[10px] tracking-wider font-bold uppercase mb-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                  DURATION
                                </p>
                                <p className={`m-0 text-[0.92rem] font-extrabold ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                                  {cumulativeWatchTime}
                                </p>
                              </div>
                              <div>
                                <p className={`m-0 text-[10px] tracking-wider font-bold uppercase mb-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                  SWITCHES
                                </p>
                                <p className={`m-0 text-[0.92rem] font-extrabold ${switches > 0 ? (isDark ? "text-rose-400" : "text-rose-600") : (isDark ? "text-slate-300" : "text-slate-700")}`}>
                                  {switches}
                                </p>
                              </div>
                            </div>

                            {/* Date */}
                            <p className={`m-0 mb-2 text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                              {watchDate}
                            </p>

                            {/* Optional Tag badge */}
                            {h.tag && (
                              <div className="mb-2">
                                <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${isDark
                                  ? "bg-indigo-950/60 text-indigo-300 border-indigo-800/60"
                                  : "bg-emerald-50 text-[#1b3f30] border-[#1b3f30]/25"
                                  }`}>
                                  #{h.tag}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons matching top cards */}
                          <div className="mt-2 flex flex-col gap-1.5">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedVideoForLogs(h);
                                setShowLogsModal(true);
                              }}
                              className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs border ${isDark
                                ? "bg-blue-950/70 text-blue-300 border-blue-800/80 hover:bg-blue-900/80"
                                : "bg-[#eaf3ee] text-[#1b3f30] border-[#1b3f30]/30 hover:bg-[#d4e7dd]"
                                }`}
                            >
                              📊 Daily Watch Logs
                            </button>

                            {actualNote && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedNote(actualNote);
                                  setShowNoteModal(true);
                                }}
                                className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs border ${isDark
                                  ? "bg-indigo-950/70 text-indigo-300 border-indigo-800/80 hover:bg-indigo-900/80"
                                  : "bg-[#eaf3ee] text-[#1b3f30] border-[#1b3f30]/30 hover:bg-[#d4e7dd]"
                                  }`}
                              >
                                📝 View Note
                              </button>
                            )}

                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (actualNote) {
                                    generateNotePDF(actualNote, `note-${h.videoId}-${i}`, "view");
                                  } else {
                                    alert("No notes saved yet for this video.");
                                  }
                                }}
                                disabled={!actualNote}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center gap-1 ${actualNote
                                  ? isDark
                                    ? "bg-indigo-950/70 text-indigo-300 border-indigo-800/80 hover:bg-indigo-900/80 cursor-pointer"
                                    : "bg-[#eaf3ee] text-[#1b3f30] border-[#1b3f30]/30 hover:bg-[#d4e7dd] cursor-pointer"
                                  : isDark
                                    ? "bg-slate-800/60 text-slate-400 border-slate-700/60 cursor-not-allowed"
                                    : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                  }`}
                              >
                                📄 View PDF
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (actualNote) {
                                    generateNotePDF(actualNote, `note-${h.videoId}-${i}`, "download");
                                  } else {
                                    alert("No notes to download.");
                                  }
                                }}
                                disabled={!actualNote}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center gap-1 ${actualNote
                                  ? isDark
                                    ? "bg-indigo-950/70 text-indigo-300 border-indigo-800/80 hover:bg-indigo-900/80 cursor-pointer"
                                    : "bg-[#eaf3ee] text-[#1b3f30] border-[#1b3f30]/30 hover:bg-[#d4e7dd] cursor-pointer"
                                  : isDark
                                    ? "bg-slate-800/60 text-slate-400 border-slate-700/60 cursor-not-allowed"
                                    : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                  }`}
                              >
                                📥 Download PDF
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Daily Watch Logs Modal */}
      {showLogsModal && selectedVideoForLogs && (
        <div
          style={{
            position: "fixed",
            top: "0",
            left: "0",
            right: "0",
            bottom: "0",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: "10000",
            padding: "20px",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowLogsModal(false)}
        >
          <div
            style={{
              backgroundColor: isDark ? "#1e293b" : "#fdfbf7",
              border: isDark ? "1px solid #334155" : "1px solid #eee8de",
              borderRadius: "16px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
              maxWidth: "650px",
              width: "100%",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "18px 24px",
                background: isDark ? "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" : "linear-gradient(135deg, #1b3f30 0%, #265944 100%)",
                color: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "1.15rem", fontWeight: "700" }}>
                  📊 Daily Watch Logs
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "450px" }}>
                  {selectedVideoForLogs.videoTitle || selectedVideoForLogs.videoId}
                </p>
              </div>
              <button
                onClick={() => setShowLogsModal(false)}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* Body - Logs Table */}
            <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
              {(() => {
                const vidKey = selectedVideoForLogs.videoId || selectedVideoForLogs.url;
                const logs = (appState.history || []).filter(
                  (item) =>
                    item.videoId === vidKey ||
                    item.url === vidKey ||
                    (item.videoTitle && selectedVideoForLogs.videoTitle && item.videoTitle === selectedVideoForLogs.videoTitle)
                );

                const totalSecs = selectedVideoForLogs.totalSecondsWatched ?? selectedVideoForLogs.secondsWatched ?? 0;
                const totalMins = Math.floor(totalSecs / 60);
                const totalRemSecs = totalSecs % 60;
                const totalDurStr = totalMins > 0 ? `${totalMins}m ${totalRemSecs}s` : `${totalRemSecs}s`;

                if (logs.length === 0) {
                  return (
                    <p style={{ color: "#6b7280", textAlign: "center", margin: "20px 0" }}>
                      No per-day log history recorded yet for this video.
                    </p>
                  );
                }

                return (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", padding: "14px 18px", background: "#f3f4f6", borderRadius: "12px" }}>
                      <div>
                        <span style={{ fontSize: "0.7rem", color: "#6b7280", fontWeight: "700", textTransform: "uppercase" }}>TOTAL CUMULATIVE WATCH TIME</span>
                        <h4 style={{ margin: "2px 0 0 0", color: "#059669", fontWeight: "700", fontSize: "1.1rem" }}>
                          {totalDurStr}
                        </h4>
                      </div>
                      <button
                        onClick={(e) => {
                          setShowLogsModal(false);
                          handleSessionCardClick(e, selectedVideoForLogs);
                        }}
                        style={{
                          backgroundColor: isDark ? "#4f46e5" : "#1b3f30",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "8px",
                          padding: "8px 16px",
                          fontWeight: "600",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          boxShadow: isDark ? "0 2px 5px rgba(79, 70, 229, 0.3)" : "0 2px 5px rgba(27, 63, 48, 0.3)",
                        }}
                      >
                        ▶️ Resume Video
                      </button>
                    </div>

                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left", color: "#4b5563" }}>
                          <th style={{ padding: "10px" }}>📅 Date</th>
                          <th style={{ padding: "10px" }}>⏱️ Duration Watched</th>
                          <th style={{ padding: "10px" }}>🔄 Tab Switches</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log, idx) => {
                          const rawDate = log.watchedAt;
                          const formattedDate = rawDate
                            ? rawDate.includes("T")
                              ? new Date(rawDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : rawDate
                            : "N/A";
                          const secs = log.secondsWatched ?? log.seconds ?? 0;
                          const mins = Math.floor(secs / 60);
                          const remSecs = secs % 60;
                          const durStr = mins > 0 ? `${mins}m ${remSecs}s` : `${remSecs}s`;

                          return (
                            <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                              <td style={{ padding: "12px 10px", fontWeight: "600", color: "#1f2937" }}>
                                {formattedDate}
                              </td>
                              <td style={{ padding: "12px 10px", color: "#059669", fontWeight: "700" }}>
                                {durStr}
                              </td>
                              <td style={{ padding: "12px 10px", color: log.tabSwitches > 0 ? "#dc2626" : "#6b7280" }}>
                                {log.tabSwitches || 0}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <div
          style={{
            position: "fixed",
            top: "0",
            left: "0",
            right: "0",
            bottom: "0",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: "10000",
            padding: "20px",
          }}
          onClick={() => setShowNoteModal(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: "0", fontSize: "1.1rem", fontWeight: "700", color: "#1f2937" }}>
                📝 Study Note
              </h3>
              <button
                onClick={() => setShowNoteModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  padding: "0",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6b7280",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.target.style.color = "#111827")}
                onMouseLeave={(e) => (e.target.style.color = "#6b7280")}
              >
                ✕
              </button>
            </div>

            {/* Content - Scrollable */}
            <div
              style={{
                flex: "1",
                overflowY: "auto",
                padding: "20px",
                fontSize: "0.95rem",
                lineHeight: "1.6",
                color: "#374151",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {selectedNote}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  generateNotePDF(selectedNote, `note-${Date.now()}`, 'view');
                }}
                disabled={!selectedNote}
                style={{
                  padding: "8px 16px",
                  backgroundColor: selectedNote ? "#f0f4ff" : "#f9fafb",
                  border: `1px solid ${selectedNote ? "#c7d2fe" : "#e5e7eb"}`,
                  borderRadius: "6px",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  color: selectedNote ? "#4f46e5" : "#9ca3af",
                  cursor: selectedNote ? "pointer" : "not-allowed",
                }}
              >
                📄 View PDF
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  generateNotePDF(selectedNote, `note-${Date.now()}`, 'download');
                }}
                disabled={!selectedNote}
                style={{
                  padding: "8px 16px",
                  backgroundColor: selectedNote ? "#10b981" : "#f9fafb",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                  color: selectedNote ? "#ffffff" : "#9ca3af",
                  cursor: selectedNote ? "pointer" : "not-allowed",
                }}
              >
                📥 Download PDF
              </button>
              <button
                onClick={() => setShowNoteModal(false)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                  color: "#111827",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onUpdateUser={(updated) => setUser(updated)}
      />
    </div>
  );
}

// Dual-theme styles function for Light and Dark modes
const getThemeStyles = (theme) => {
  const isDark = theme === "dark";
  return {
    page: {
      background: "transparent",
      width: "100%",
      minHeight: "100vh",
      padding: "0",
      boxSizing: "border-box",
      fontFamily: "'Inter', sans-serif",
      position: "relative",
      zIndex: 10,
      color: isDark ? "#ffffff" : "#1e293b",
    },
    container: {
      width: "100%",
      maxWidth: "100%",
      margin: "0",
      display: "flex",
      flexDirection: "column",
      gap: "24px",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "16px",
    },
    title: {
      fontSize: "2.5rem",
      fontWeight: "800",
      background: "linear-gradient(to right, #6366f1, #ec4899)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      margin: 0,
      fontFamily: "'Inter', sans-serif",
      letterSpacing: "-0.03em",
    },
    wallet: { display: "flex", gap: "12px", alignItems: "center" },
    statChip: isDark
      ? {
        background: "rgba(30, 41, 59, 0.8)",
        color: "#e2e8f0",
        padding: "8px 16px",
        borderRadius: "16px",
        fontSize: "14px",
        fontWeight: "600",
        border: "1px solid rgba(168,85,247,0.3)",
        boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
      }
      : {
        background: "rgba(255, 255, 255, 0.85)",
        color: "#1e293b",
        padding: "8px 16px",
        borderRadius: "16px",
        fontSize: "14px",
        fontWeight: "600",
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.06)",
        border: "1px solid rgba(255,255,255,0.9)",
      },
    panel: isDark
      ? {
        background: "rgba(15, 23, 42, 0.82)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRadius: "24px",
        padding: "24px",
        border: "1px solid rgba(168, 85, 247, 0.2)",
        boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        color: "#f8fafc",
      }
      : {
        background: "#fbf9f3",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRadius: "24px",
        padding: "24px",
        border: "1px solid #eee8de",
        boxShadow:
          "0 10px 35px rgba(0,0,0,0.04), inset 0 1px 1px rgba(255,255,255,0.95)",
        color: "#1e293b",
      },
    input: isDark
      ? {
        flexGrow: 1,
        padding: "10px 16px",
        borderRadius: "12px",
        border: "1px solid rgba(168,85,247,0.35)",
        background: "rgba(30,41,59,0.8)",
        color: "#ffffff",
        fontSize: "1em",
      }
      : {
        flexGrow: 1,
        padding: "10px 16px",
        borderRadius: "12px",
        border: "1px solid #cbd5e1",
        background: "rgba(255,255,255,0.9)",
        color: "#0f172a",
        fontSize: "1em",
      },
    button: {
      padding: "10px 22px",
      borderRadius: "12px",
      border: "none",
      background: isDark ? "#4f46e5" : "#1b3f30",
      color: "white",
      fontSize: "1em",
      fontWeight: "600",
      cursor: "pointer",
      boxShadow: isDark
        ? "0 4px 14px rgba(79, 70, 229, 0.35)"
        : "0 4px 14px rgba(27, 63, 48, 0.30)",
      transition: "all 0.2s ease",
    },
    secondaryButton: isDark
      ? {
        background: "rgba(51, 65, 85, 0.8)",
        color: "#f1f5f9",
        border: "1px solid rgba(255,255,255,0.1)",
      }
      : {
        background: "rgba(241, 245, 249, 0.9)",
        color: "#334155",
        border: "1px solid #cbd5e1",
      },
    sectionTitle: {
      fontSize: "1.25em",
      color: isDark ? "#e2e8f0" : "#0f172a",
      margin: "0 0 16px 0",
      fontWeight: "700",
    },
    popup: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.65)",
      backdropFilter: "blur(6px)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 100,
    },
    popupInner: isDark
      ? {
        background: "rgba(15, 23, 42, 0.95)",
        backdropFilter: "blur(20px)",
        padding: "24px",
        borderRadius: "20px",
        width: "90%",
        maxWidth: "400px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
        border: "1px solid rgba(168,85,247,0.3)",
        color: "#fff",
      }
      : {
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(20px)",
        padding: "24px",
        borderRadius: "20px",
        width: "90%",
        maxWidth: "400px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
        border: "1px solid rgba(255,255,255,0.85)",
        color: "#0f172a",
      },
    maximizedPopupInner: isDark
      ? {
        background: "rgba(15, 23, 42, 0.96)",
        padding: "28px",
        borderRadius: "24px",
        width: "80vw",
        height: "80vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        border: "1px solid rgba(168,85,247,0.3)",
        color: "#fff",
      }
      : {
        background: "rgba(255,255,255,0.96)",
        padding: "28px",
        borderRadius: "24px",
        width: "80vw",
        height: "80vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        border: "1px solid rgba(255,255,255,0.85)",
        color: "#0f172a",
      },
    popupTitle: { fontSize: "1.5em", margin: "0 0 16px 0", fontWeight: "700" },
    focusInputContainer: { display: "flex", alignItems: "center", gap: "12px" },
    popupText: {
      color: isDark ? "#94a3b8" : "#475569",
      lineHeight: 1.5,
      marginTop: "16px",
    },
    smallBtn: {
      padding: "6px 14px",
      borderRadius: "8px",
      border: "none",
      color: "white",
      cursor: "pointer",
      fontWeight: "600",
    },
    focusBar: isDark
      ? {
        background: "rgba(30, 41, 59, 0.8)",
        color: "#93c5fd",
        padding: "12px",
        borderRadius: "12px",
        marginBottom: "16px",
        textAlign: "center",
        fontWeight: "600",
        border: "1px solid rgba(59, 130, 246, 0.3)",
      }
      : {
        background: "#dbeafe",
        color: "#1e40af",
        padding: "12px",
        borderRadius: "12px",
        marginBottom: "16px",
        textAlign: "center",
        fontWeight: "600",
      },
    player: {
      position: "relative",
      width: "100%",
      height: "70vh",
      background: "#000",
      borderRadius: "16px",
      overflow: "hidden",
    },
    playerMax: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      zIndex: 200,
      background: "#000",
    },
    toggleMaxMinButton: {
      position: "absolute",
      bottom: "10px",
      right: "10px",
      zIndex: 210,
      background: "rgba(0,0,0,0.6)",
      color: "white",
      border: "none",
      padding: "8px 12px",
      borderRadius: "6px",
      cursor: "pointer",
    },
    controlsAndStats: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "16px",
      flexWrap: "wrap",
      gap: "10px",
    },
    statsText: {
      display: "flex",
      gap: "24px",
      color: isDark ? "#94a3b8" : "#475569",
      fontWeight: "500",
    },
    textarea: isDark
      ? {
        width: "100%",
        height: "200px",
        padding: "14px 16px",
        borderRadius: "12px",
        border: "1px solid rgba(168,85,247,0.3)",
        background: "rgba(30, 41, 59, 0.8)",
        color: "#ffffff",
        fontSize: "1.05em",
        resize: "none",
        overflowY: "auto",
        lineHeight: "1.6",
      }
      : {
        width: "100%",
        height: "200px",
        padding: "14px 16px",
        borderRadius: "12px",
        border: "1px solid #cbd5e1",
        background: "rgba(255,255,255,0.9)",
        color: "#0f172a",
        fontSize: "1.05em",
        resize: "none",
        overflowY: "auto",
        lineHeight: "1.6",
      },
    placeholder: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "200px",
      background: isDark ? "rgba(30, 41, 59, 0.5)" : "#f9fafb",
      borderRadius: "12px",
      color: isDark ? "#94a3b8" : "#6b7280",
    },
    tooltip: {
      background: isDark ? "#0f172a" : "#fff",
      border: isDark ? "1px solid #334155" : "1px solid #d1d5db",
      padding: "8px",
      borderRadius: "8px",
      color: isDark ? "#fff" : "#111827",
    },
    warningBanner: {
      position: "fixed",
      top: 12,
      left: "50%",
      transform: "translateX(-50%)",
      background: "#111827",
      color: "white",
      padding: "10px 16px",
      borderRadius: "12px",
      fontWeight: "600",
      zIndex: 99999,
      boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
    },
  };
};

const styles = getThemeStyles("dark");


const blockedStyles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.45)",
    backdropFilter: "blur(4px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },

  popup: {
    background: "rgba(255,255,255,0.95)",
    padding: "24px",
    width: "90%",
    maxWidth: "380px",
    borderRadius: "16px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
    textAlign: "center",
  },

  title: {
    fontSize: "1.5em",
    fontWeight: "700",
    color: "#dc2626",
    marginBottom: "10px",
  },

  message: {
    fontSize: "1em",
    color: "#374151",
    lineHeight: "1.5",
    marginBottom: "20px",
  },

  button: {
    padding: "10px 20px",
    background: "#4f46e5",
    color: "white",
    borderRadius: "8px",
    cursor: "pointer",
    border: "none",
    fontSize: "1em",
    width: "100%",
  },
};


const stylesNotes = {
  panel: {
    background: "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)",
    padding: "22px",
    borderRadius: "16px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 4px 18px rgba(0,0,0,0.05)",
  },

  heading: {
    fontSize: "1.4rem",
    fontWeight: "700",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#1f2937",
  },

  icon: {
    fontSize: "1.4em",
  },

  emptyMsg: {
    color: "#6b7280",
    fontSize: "0.95em",
    padding: "6px 0",
  },

  noteCard: {
    padding: "18px",
    borderRadius: "14px",
    background: "rgba(255,255,255,0.65)",
    backdropFilter: "blur(6px)",
    border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 6px 14px rgba(0,0,0,0.08)",
  },

  noteText: {
    fontSize: "1rem",
    color: "#111827",
    lineHeight: "1.6",
    marginBottom: "12px",
    whiteSpace: "pre-wrap",
  },

  tag: {
    display: "inline-block",
    background: "#e0e7ff",
    padding: "6px 12px",
    borderRadius: "8px",
    color: "#3730a3",
    fontWeight: "600",
    fontSize: "0.85rem",
    marginBottom: "12px",
    boxShadow: "0px 3px 8px rgba(88, 80, 255, 0.25)",
  },

  divider: {
    height: "1px",
    background: "#e5e7eb",
    margin: "14px 0",
  },

  date: {
    fontSize: "0.85rem",
    color: "#6b7280",
  },
};

const stickyNotes = {
  panel: {
    background: "#fff",
    padding: "22px",
    borderRadius: "16px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 4px 18px rgba(0,0,0,0.05)",
  },

  heading: {
    fontSize: "1.4rem",
    fontWeight: "700",
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#1f2937",
  },

  icon: {
    fontSize: "1.4em",
  },

  emptyMsg: {
    color: "#6b7280",
    fontSize: "0.95em",
    padding: "6px 0",
  },

  stickyCard: {
    position: "relative",
    background: "#fff8a8",
    padding: "20px",
    height: "100%",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    borderRadius: "10px",
    fontFamily: "'Patrick Hand', cursive, sans-serif",
    fontSize: "1.1rem",
    color: "#374151",
    lineHeight: "1.6",

    // Scrollable content
    overflowY: "auto",        // ✅ scroll inside
    overflowX: "hidden",
    wordBreak: "break-word",
    overflowWrap: "anywhere",

    // Sticky note shadow + tilt
    boxShadow: "0 10px 18px rgba(0,0,0,0.12)",
    transform: "rotate(-1.5deg)",
  },


  // Red pin on top center
  pin: {
    width: "18px",
    height: "18px",
    background: "#ef4444",
    borderRadius: "50%",
    position: "absolute",
    top: "-8px",
    left: "50%",
    transform: "translateX(-50%)",
    boxShadow: "0 3px 6px rgba(0,0,0,0.3)",
  },

  noteText: {
    marginBottom: "12px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    wordWrap: "break-word",
    maxWidth: "100%",
  },

  tag: {
    display: "inline-block",
    background: "#fde047",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "0.85rem",
    fontWeight: "600",
    boxShadow: "0 3px 6px rgba(0,0,0,0.15)",
    marginBottom: "10px",
  },

  date: {
    marginTop: "12px",
    color: "#6b7280",
    fontSize: "0.85rem",
  },
};
