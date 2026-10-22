import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import profileIcon from '../assets/profile_icon.png';
import API_BASE, { STREAMLIT_URL, getStreamlitEmbedUrl } from "../services/apiBase";
import AssignmentCard from "../components/AssignmentCard";
import VideoTracker from "../components/VideoTracker";
import AuthModal from "../components/AuthModal";
import UserProfileModal from "../components/UserProfileModal";
import Leaderboard from "../components/Leaderboard";
import ThemeToggle from "../components/ThemeToggle";
import Lottie from "lottie-react";
import chatAnimation from "../assets/chatAnimation.json";
import { useAppContext } from "../context/AppContext";
import ankit from "../assets/ankit1.jpeg"
import anshika from "../assets/anshika1.jpeg"
import ananya from "../assets/ananya1.jpeg"
import setu from "../assets/Setu1.jpeg"
import yash from "../assets/yash.jpeg"
import heroBgVideo from "../assets/fourth.mp4";



// ------------------- Chatbot Component -------------------
const Chatbot = () => {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hey there! I’m StudyBuddy AI 🤖, your personal study companion." },
    { sender: "bot", text: "My goal is to help you stay organized and motivated." },
    { sender: "bot", text: "Here's what I can do:" },
    { sender: "bot", text: "1. Give you quick study tips." },
    { sender: "bot", text: "2. Track your learning progress." },
    { sender: "bot", text: "3. Help manage your assignments and reminders." },
    { sender: "bot", text: "4. Provide analytics to visualize your study streaks." },
    { sender: "bot", text: "What's on your mind? Just type your question or choose from the options below!" },
  ]);
  const [input, setInput] = useState("");

  const responses = {
    reminders: "You can set smart reminders to never miss a session!",
    assignments: "Assignments can be viewed and submitted under the Assignments section.",
    "video tracker": "Track your study videos easily from the Video Tracker section.",
    streaks: "Maintain daily streaks to boost motivation. Don’t break the chain!",
    analytics: "Analytics shows your study trends, streaks, and consistency.",
  };

  const sendMessage = (text) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { sender: "user", text }]);
    let response =
      responses[text.toLowerCase()] ||
      "I’m not sure about that. Try asking about reminders, videos, or analytics.";
    setTimeout(() => {
      setMessages((prev) => [...prev, { sender: "bot", text: response }]);
    }, 500);
  };

  const handleSend = () => {
    sendMessage(input);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`p-2 rounded-lg max-w-[80%] ${m.sender === "bot"
              ? "bg-indigo-100 text-gray-900 self-start rounded-bl-none"
              : "bg-indigo-700 text-white self-end rounded-br-none"
              }`}
          >
            {m.text}
          </div>
        ))}
      </div>

      {/* Predefined buttons */}
      <div className="flex flex-wrap gap-2 p-3 border-t border-gray-200 bg-white">
        {["Reminders", "Assignments", "Video Tracker", "Streaks", "Analytics"].map(
          (btn, idx) => (
            <button
              key={idx}
              onClick={() => sendMessage(btn)}
              className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm hover:bg-gray-300 transition-colors"
            >
              {btn}
            </button>
          )
        )}
      </div>

      {/* Input field */}
      <div className="flex p-3 border-t border-gray-200 bg-white">
        <input
          type="text"
          className="flex-1 p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question..."
        />
        <button
          onClick={handleSend}
          className="bg-indigo-700 text-white px-4 rounded-r-lg hover:bg-indigo-800 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
};

// ------------------- HomePage Component -------------------
const HomePage = () => {
  const { isChatOpen, setIsChatOpen, theme, toggleTheme } = useAppContext();
  const [user, setUser] = useState(null);
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false); // ✨ NEW: State for modal
  const [isDashboardModalOpen, setDashboardModalOpen] = useState(false); // ✨ NEW: Dashboard modal state
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeTimedOut, setIframeTimedOut] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const navigate = useNavigate();

  // Reset and manage iframe timeout when modal opens
  useEffect(() => {
    let timer;
    if (isDashboardModalOpen) {
      setIframeLoaded(false);
      setIframeTimedOut(false);
      // If deployed Streamlit Cloud takes too long to load (due to cookie / redirect loop), show fallback
      if (!STREAMLIT_URL.includes("localhost") && !STREAMLIT_URL.includes("127.0.0.1")) {
        timer = setTimeout(() => {
          setIframeTimedOut(true);
        }, 5000);
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isDashboardModalOpen]);

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

      const data = await res.json();

      // Remove user from storage & state regardless of API response
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setUser(null);
      setDropdownOpen(false);

      if (res.ok) {
        navigate("/");
      } else {
        console.error("Logout failed:", data.message);
      }
    } catch (error) {
      console.error("Error during logout:", error);
      // Ensure frontend logout even if server call fails
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setUser(null);
      setDropdownOpen(false);
      alert("An error occurred during logout.");
    }
  };

  // Click handler for all protected links
  const handleProtectedLinkClick = (e, path) => {
    if (!user) {
      // If user is not logged in
      e.preventDefault(); // Stop the <Link> from navigating
      setAuthModalOpen(true); // Open the login/signup modal
      return;
    }

    if (path === "/chatbot") {
      // AI Chatbot opens the Chatbot modal
      e.preventDefault(); // Stop navigation
      setIsChatOpen(true); // Open the chat window
      return;
    }

    // Normal navigation proceeds for /dashboard (Student Dashboard) and all other pages!
  };

  // ✨ NEW: Click handler for the floating chat button
  const handleChatClick = () => {
    if (!user) {
      setAuthModalOpen(true); // Show modal if not logged in
    } else {
      setIsChatOpen(!isChatOpen); // Toggle chat window if logged in
    }
  };


  const displayName = user
    ? (user.name || user.username || "BUDDY").trim().split(" ")[0].toUpperCase()
    : "BUDDY";
  const greetingText = `HI! ${displayName}`;

  // Continuous letter animation helper matching first.mp4
  const renderContinuousLetters = (text, baseDelay = 0, delayStep = 0.08) => {
    return text.split("").map((char, i) => {
      if (char === " ") {
        return <span key={i} className="inline-block">&nbsp;</span>;
      }
      return (
        <span
          key={i}
          className="inline-block hero-letter-anim"
          style={{ animationDelay: `${(baseDelay + i * delayStep).toFixed(2)}s` }}
        >
          {char}
        </span>
      );
    });
  };

  return (
    <div className="flex flex-col min-h-screen relative overflow-x-hidden transition-colors duration-500 text-white">



      {/* Navbar */}
      <nav
        className={`backdrop-blur-xl shadow-lg py-4 px-6 md:px-8 flex justify-between items-center sticky top-0 z-50 rounded-b-2xl transition-all duration-300 ${
          theme === "dark"
            ? "bg-slate-950/80 border-b border-white/10 shadow-purple-950/20 text-slate-100"
            : "bg-white/90 border-b border-indigo-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.08)] text-gray-800"
        }`}
      >
        <Link
          to="/"
          className={`text-2xl font-extrabold tracking-tight bg-clip-text text-transparent transition-colors duration-300 ${
            theme === "dark"
              ? "bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]"
              : "bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600"
          }`}
        >
          StudyBuddy
        </Link>

        <div className="hidden md:flex gap-8 font-semibold">
          <button
            onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}
            className={`transition-colors duration-300 cursor-pointer ${
              theme === "dark" ? "text-white/90 hover:text-white" : "text-gray-700 hover:text-indigo-600"
            }`}
          >
            About Us
          </button>
          <Link
            to="/blogs"
            className={`transition-colors duration-300 ${
              theme === "dark" ? "text-white/90 hover:text-white" : "text-gray-700 hover:text-indigo-600"
            }`}
          >
            Blogs
          </Link>
          <Link
            to="/contact"
            className={`transition-colors duration-300 ${
              theme === "dark" ? "text-white/90 hover:text-white" : "text-gray-700 hover:text-indigo-600"
            }`}
          >
            Contact Us
          </Link>
        </div>

        {/* Right side: Theme Toggle & Auth / Profile */}
        <div className="flex items-center gap-3">
          {/* Permanent Theme Toggle Switch */}
          <ThemeToggle />

          {/* Conditional Profile / Auth */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <img
                  src={user.profileImage || profileIcon}
                  alt="Profile"
                  className={`w-10 h-10 rounded-full border-2 ${
                    theme === "dark" ? "border-purple-400" : "border-indigo-600 shadow-sm"
                  }`}
                />
                <span className={`font-semibold hidden sm:inline ${theme === "dark" ? "text-white" : "text-gray-800"}`}>
                  {user.name}
                </span>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div
                  className={`absolute right-0 mt-2 py-2 w-52 rounded-xl shadow-2xl z-50 border animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl ${
                    theme === "dark"
                      ? "bg-slate-900/95 border-white/20 text-white"
                      : "bg-white/95 border-gray-100 text-gray-800 shadow-xl"
                  }`}
                >
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      setIsProfileModalOpen(true);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors ${
                      theme === "dark" ? "hover:bg-slate-800 text-white" : "hover:bg-indigo-50 text-gray-700"
                    }`}
                  >
                    👤 View Profile
                  </button>
                  <div className={`border-t my-1 ${theme === "dark" ? "border-white/10" : "border-gray-100"}`} />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 font-bold hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2 sm:gap-3">
              <Link
                to="/login"
                className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all duration-300 border ${
                  theme === "dark"
                    ? "border-white/60 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
                    : "border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 shadow-sm"
                }`}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-3 sm:px-4 py-2 bg-gradient-to-r from-indigo-600 to-pink-600 text-white rounded-lg text-sm sm:text-base font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transform transition-all duration-300"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section (Slides over the static animated wallpaper) */}
      <header className="flex-1 flex flex-col items-center justify-center text-center px-6 py-28 md:py-36 min-h-[85vh] relative z-10">
        {/* Hero Content */}
        <div className="relative z-10 flex flex-col items-center justify-center max-w-4xl">
          {/* Website Brand Presentation (Prominent, spacious, static & presentable) */}
          <div className="mb-6 md:mb-8 flex flex-col items-center pointer-events-none select-none">
            <div className="w-48 sm:w-72 md:w-96 h-[2px] mb-3 md:mb-4 bg-gradient-to-r from-transparent via-white/85 to-transparent shadow-[0_2px_8px_rgba(0,0,0,0.5)]"></div>
            <div className="flex items-center gap-3 md:gap-4 px-4 py-1">
              <span className="text-white/85 text-xs sm:text-sm md:text-base drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">✦</span>
              <span className="text-lg sm:text-2xl md:text-3xl font-black tracking-[0.38em] md:tracking-[0.45em] uppercase text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.85)] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                STUDY BUDDY
              </span>
              <span className="text-white/85 text-xs sm:text-sm md:text-base drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">✦</span>
            </div>
            <div className="w-48 sm:w-72 md:w-96 h-[2px] mt-3 md:mt-4 bg-gradient-to-r from-transparent via-white/85 to-transparent shadow-[0_2px_8px_rgba(0,0,0,0.5)]"></div>
          </div>

          {/* Heading Flanked by Stars (Continuous animation ONLY on HI! {displayName}) */}
          <div className="relative flex items-center justify-center w-full my-4 md:my-6">
            <span className="hero-star hidden sm:inline-block absolute -left-8 md:-left-14 lg:-left-20 text-3xl md:text-5xl select-none pointer-events-none text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)] drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]">
              ✦
            </span>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-wider leading-tight max-w-4xl uppercase text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
              {renderContinuousLetters(greetingText, 0.2, 0.06)}
            </h1>

            <span className="hero-star hidden sm:inline-block absolute -right-8 md:-right-14 lg:-right-20 text-3xl md:text-5xl select-none pointer-events-none text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)] drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]">
              ✦
            </span>
          </div>

          {/* Subtitle Lines (Static, clean & readable) */}
          <div className="mt-6 md:mt-8 text-sm sm:text-base md:text-xl font-bold tracking-[0.22em] md:tracking-[0.28em] uppercase space-y-2.5 md:space-y-3 text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.85)] drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
            <div>FOCUS BETTER. LEARN SMARTER.</div>
            <div>ACHIEVE MORE WITH STUDY BUDDY.</div>
          </div>

          {/* Action Buttons (Visible only when user is not logged in) */}
          {!user && (
            <div className="mt-10 md:mt-12 flex flex-wrap justify-center gap-4 sm:gap-6 hero-anim-buttons">
              <Link
                to="/register"
                className="px-8 py-3.5 sm:px-9 sm:py-4 bg-gradient-to-r from-indigo-700 to-pink-600 text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transform transition-all duration-300 text-base sm:text-lg"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="px-8 py-3.5 sm:px-9 sm:py-4 font-semibold rounded-2xl backdrop-blur-md transition-all duration-300 shadow-md border border-white/60 bg-white/15 text-white hover:bg-white/25 text-base sm:text-lg hover:scale-105 transform"
              >
                Login
              </Link>
            </div>
          )}
        </div>

        {/* Reference Animation Keyframes from first.mp4 */}
        <style>{`
          .hero-anim-badge {
            animation: heroBadgePulse 6s ease-in-out infinite;
          }
          .hero-star {
            animation: heroStarPulse 5s ease-in-out infinite;
          }
          .hero-letter-anim {
            display: inline-block;
            animation: heroLetterLoop 9s cubic-bezier(0.25, 1, 0.5, 1) infinite;
            will-change: transform, filter, opacity;
          }
          .hero-anim-buttons {
            animation: heroButtonReveal 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both;
          }

          @keyframes heroBadgePulse {
            0%, 100% {
              opacity: 0.85;
              transform: scale(1);
            }
            50% {
              opacity: 1;
              transform: scale(1.02);
              filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.4));
            }
          }

          @keyframes heroStarPulse {
            0%, 100% {
              opacity: 0.8;
              transform: scale(1) rotate(0deg);
              filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
            }
            50% {
              opacity: 1;
              transform: scale(1.2) rotate(90deg);
              filter: drop-shadow(0 0 18px rgba(255, 255, 255, 1)) drop-shadow(0 0 30px rgba(168, 85, 247, 0.8));
            }
          }

          @keyframes heroLetterLoop {
            0% {
              opacity: 0.45;
              filter: blur(5px);
              transform: translateY(3px) scale(0.97);
            }
            12%, 86% {
              opacity: 1;
              filter: blur(0px);
              transform: translateY(0px) scale(1);
            }
            94% {
              opacity: 0.65;
              filter: blur(3px);
              transform: translateY(-2px) scale(1.02);
            }
            100% {
              opacity: 0.45;
              filter: blur(5px);
              transform: translateY(3px) scale(0.97);
            }
          }

          @keyframes heroButtonReveal {
            0% {
              opacity: 0;
              transform: translateY(14px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .hero-anim-badge,
            .hero-star,
            .hero-letter-anim,
            .hero-anim-buttons {
              animation: none !important;
              opacity: 1 !important;
              filter: none !important;
              transform: none !important;
            }
          }
        `}</style>
      </header>

      {/* Features Section */}
      <section className="py-24 relative z-10">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-10 text-center">
          {[
            { icon: "🎥", title: "Video Tracker", desc: "Log study videos and monitor progress effortlessly.", link: "/videos" },
            { icon: "🎯", title: "Monitoring Dashboard", desc: "Track your real-time focus analytics and session insights.", link: "/monitoring" },
            { icon: "🔥", title: "Leaderboard", desc: "Maintain daily study streaks and boost motivation.", link: "/leaderboard" },
            { icon: "📈", title: "Performance Dashboard", desc: "Track your study streaks, activity heatmaps, and session metrics.", link: "/dashboard" },
            { icon: "📊", title: "Analytics", desc: "Download and access all monitoring dashboard reports, focus logs, and learning trends.", link: "/analytics" },
            { icon: "📝", title: "Assignments", desc: "Organize, track, and submit assignments on time.", link: "/assignments" },
          ].map((f, idx) => (
            <Link
              to={f.link}
              key={idx}
              onClick={(e) => {
                handleProtectedLinkClick(e, f.link);
              }}
              className={`group relative overflow-hidden p-8 rounded-3xl backdrop-blur-2xl border transform hover:-translate-y-2 transition-all duration-300 flex flex-col items-center cursor-pointer ${
                theme === "dark"
                  ? "bg-gradient-to-b from-slate-900/80 to-slate-950/85 hover:from-slate-800/85 hover:to-slate-900/90 border-purple-500/20 hover:border-purple-400/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] hover:shadow-[0_12px_36px_0_rgba(168,85,247,0.25)] text-white"
                  : "bg-gradient-to-b from-white/70 via-white/55 to-white/65 hover:from-white/85 hover:via-white/70 hover:to-white/80 border-white/70 hover:border-white shadow-[0_10px_35px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.95)] hover:shadow-[0_18px_45px_rgba(31,38,135,0.18),inset_0_1px_2px_rgba(255,255,255,1)] text-slate-800"
              }`}
            >
              {theme !== "dark" && (
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              )}
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-5 transition-transform duration-300 group-hover:scale-110 ${
                theme === "dark"
                  ? "bg-purple-900/40 border border-purple-500/30 text-purple-200 shadow-[0_0_20px_rgba(168,85,247,0.25)] group-hover:shadow-[0_0_25px_rgba(168,85,247,0.45)]"
                  : "bg-white/80 border border-white/90 text-indigo-600 shadow-sm group-hover:bg-white group-hover:shadow-md"
              }`}>
                {f.icon}
              </div>
              <h3 className={`text-xl font-bold tracking-tight ${theme === "dark" ? "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" : "text-slate-900"}`}>
                {f.title}
              </h3>
              <p className={`mt-2.5 text-sm md:text-base leading-relaxed ${theme === "dark" ? "text-white/90" : "text-slate-700/90 font-medium"}`}>
                {f.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-24 text-center relative z-10">
        <h2 className="text-4xl font-extrabold mb-4 text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
          What Students Say
        </h2>
        <p className="max-w-3xl mx-auto mb-12 text-lg text-white/90 drop-shadow-sm font-medium">
          Join thousands of students who boosted their productivity with StudyBuddy.
        </p>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto px-6">
          {[
            { name: "Ananya", role: "CS Student", review: "Reminders keep me punctual and streaks keep me motivated. It’s addictive in a good way!" },
            { name: "Raj", role: "Engineering Student", review: "The AI Chatbot is my study buddy at 2 AM. Never thought an app could help this much." },
            { name: "Priya", role: "MBA Student", review: "Analytics make me realize how consistent I’ve been. It’s like fitness tracking, but for studying." },
          ].map((r, idx) => (
            <div
              key={idx}
              className={`relative overflow-hidden rounded-3xl p-7 backdrop-blur-2xl transition-all duration-300 transform hover:-translate-y-2 border ${
                theme === "dark"
                  ? "bg-gradient-to-b from-slate-900/80 to-slate-950/85 hover:from-slate-800/85 hover:to-slate-900/90 border border-purple-500/25 hover:border-purple-400/50 shadow-2xl hover:shadow-[0_12px_36px_rgba(147,51,234,0.2)] text-white"
                  : "bg-gradient-to-b from-white/70 via-white/55 to-white/65 hover:from-white/85 hover:via-white/70 hover:to-white/80 border-white/70 hover:border-white shadow-[0_10px_35px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.95)] hover:shadow-[0_18px_45px_rgba(31,38,135,0.18)] text-slate-800"
              }`}
            >
              <div className="flex justify-center text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] mb-3.5 text-lg">
                {"★★★★★"}
              </div>
              <p className={`text-base md:text-lg mb-4 font-medium leading-relaxed italic ${
                theme === "dark" ? "text-white" : "text-slate-800"
              }`}>
                “{r.review}”
              </p>
              <p className={`font-bold text-base ${theme === "dark" ? "text-white" : "text-slate-950"}`}>{r.name}</p>
              <p className={`text-xs md:text-sm mt-0.5 ${theme === "dark" ? "text-white/80" : "text-indigo-600 font-semibold"}`}>{r.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 relative z-10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-8 text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6 text-left">
            {[
              { q: "Is StudyBuddy free to use?", a: "Yes! StudyBuddy offers a free plan with core features. You can upgrade for advanced analytics and AI tools." },
              { q: "Can I use it on mobile?", a: "Absolutely. StudyBuddy is fully responsive and works on all devices." },
              { q: "How does streak tracking work?", a: "Each day you log study sessions, your streak grows. Miss a day, and it resets — motivating you to stay consistent." },
            ].map((f, idx) => (
              <div
                key={idx}
                className={`rounded-2xl p-6 backdrop-blur-2xl transition-all duration-300 border ${
                  theme === "dark"
                    ? "bg-gradient-to-b from-slate-900/75 to-slate-950/85 hover:from-slate-800/85 hover:to-slate-900/90 border-white/15 hover:border-purple-500/40 shadow-xl hover:shadow-[0_8px_25px_rgba(168,85,247,0.15)] text-white"
                    : "bg-gradient-to-b from-white/70 via-white/55 to-white/65 hover:from-white/85 hover:via-white/70 hover:to-white/80 border-white/70 hover:border-white shadow-[0_8px_25px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.95)] hover:shadow-[0_14px_35px_rgba(31,38,135,0.15)] text-slate-800"
                }`}
              >
                <h3 className={`font-bold text-lg md:text-xl ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                  {f.q}
                </h3>
                <p className={`mt-2 text-sm md:text-base leading-relaxed ${theme === "dark" ? "text-white/90" : "text-slate-700/90 font-medium"}`}>
                  {f.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 text-center relative z-10">
        <h2 className="text-3xl md:text-4xl font-extrabold mb-6 text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
          Choose Your Plan
        </h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto px-6">
          <div className={`p-8 rounded-3xl shadow-xl hover:shadow-2xl hover:scale-105 transform transition-all duration-300 backdrop-blur-2xl border ${
            theme === "dark"
              ? "bg-gradient-to-b from-slate-900/80 to-slate-950/85 hover:from-slate-800/85 hover:to-slate-900/90 border-white/20 hover:border-purple-500/50 shadow-2xl hover:shadow-[0_12px_36px_rgba(168,85,247,0.2)] text-white"
              : "bg-gradient-to-b from-white/70 via-white/55 to-white/65 hover:from-white/85 hover:via-white/70 hover:to-white/80 border-white/70 hover:border-white shadow-[0_10px_35px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.95)] hover:shadow-[0_18px_45px_rgba(31,38,135,0.18)] text-slate-800"
          }`}>
            <h3 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
              Free Plan
            </h3>
            <p className={`mt-3 ${theme === "dark" ? "text-white/90" : "text-slate-600 font-medium"}`}>
              Perfect for beginners
            </p>
            <p className={`mt-4 text-4xl font-extrabold ${theme === "dark" ? "text-white" : "text-slate-950"}`}>
              ₹0
            </p>
            <ul className={`mt-5 space-y-2 text-sm ${theme === "dark" ? "text-white/90" : "text-slate-700 font-medium"}`}>
              <li>✔ Reminders & Assignments</li>
              <li>✔ Basic Analytics</li>
              <li>✔ AI Chatbot (limited)</li>
            </ul>
            <Link
              to="/register"
              className="mt-6 inline-block px-6 py-3 bg-gradient-to-r from-indigo-700 to-pink-600 text-white font-semibold rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transform transition-all duration-300"
            >
              Get Started
            </Link>
          </div>
          <div className={`p-8 rounded-3xl shadow-xl hover:shadow-2xl hover:scale-105 transform transition-all duration-300 backdrop-blur-2xl ${
            theme === "dark"
              ? "bg-gradient-to-b from-slate-900/90 via-purple-950/50 to-slate-950/90 hover:from-slate-800/90 hover:to-slate-900/95 border-2 border-purple-500/70 hover:border-pink-500 shadow-[0_12px_40px_rgba(168,85,247,0.3)] hover:shadow-[0_16px_50px_rgba(236,72,153,0.35)] text-white"
              : "bg-gradient-to-b from-white/80 via-indigo-50/75 to-white/75 hover:from-white/90 hover:via-indigo-50/85 hover:to-white/85 border-2 border-indigo-400/80 shadow-[0_16px_45px_rgba(79,70,229,0.18),inset_0_1px_2px_rgba(255,255,255,1)] hover:shadow-[0_22px_55px_rgba(79,70,229,0.26)] text-slate-800"
          }`}>
            <h3 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-indigo-950"}`}>
              Pro Plan
            </h3>
            <p className={`mt-3 ${theme === "dark" ? "text-white/90" : "text-indigo-600 font-semibold"}`}>
              For serious learners
            </p>
            <p className={`mt-4 text-4xl font-extrabold ${theme === "dark" ? "text-white" : "text-indigo-950"}`}>
              ₹299/month
            </p>
            <ul className={`mt-5 space-y-2 text-sm ${theme === "dark" ? "text-white/90" : "text-slate-700 font-medium"}`}>
              <li>✔ All Free Plan Features</li>
              <li>✔ Advanced Analytics & Graphs</li>
              <li>✔ Unlimited AI Chatbot Access</li>
              <li>✔ Priority Support</li>
            </ul>
            <Link
              to="/register"
              className="mt-6 inline-block px-6 py-3 bg-gradient-to-r from-indigo-700 to-pink-600 text-white font-semibold rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transform transition-all duration-300"
            >
              Upgrade Now
            </Link>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-24 text-center relative z-10">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
          ABOUT US
        </h2>
        <p className="mt-3 max-w-2xl mx-auto text-white/90 drop-shadow-sm font-medium">
          We are a passionate team dedicated to making self-learning more effective and engaging.
          Our mission is to provide students with the right tools, structure, and motivation
          to achieve their goals without distractions.
        </p>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 max-w-7xl mx-auto px-6">
          {[
            { img: ananya, name: "Ananya Srivastava", role: "Backend Developer", objectClass: "object-cover" },
            { img: anshika, name: "Anshika Jain", role: "Frontend Designer", objectClass: "object-cover" },
            { img: ankit, name: "Ankit Kumar", role: "Ideation and Open CV", objectClass: "object-cover object-top" },
            { img: setu, name: "Setu Arya", role: "Frontend Designer", objectClass: "object-cover" },
            { img: yash, name: "Yash Jain", role: "AI/ML", objectClass: "object-cover" },
          ].map((m, idx) => (
            <div
              key={idx}
              className={`group rounded-2xl p-6 backdrop-blur-2xl transition-all duration-300 transform hover:-translate-y-2 border ${
                theme === "dark"
                  ? "bg-gradient-to-b from-slate-900/80 to-slate-950/85 hover:from-slate-800/85 hover:to-slate-900/90 border border-purple-500/20 hover:border-purple-400/50 shadow-2xl hover:shadow-[0_12px_36px_rgba(168,85,247,0.25)] text-white"
                  : "bg-gradient-to-b from-white/70 via-white/55 to-white/65 hover:from-white/85 hover:via-white/70 hover:to-white/80 border-white/70 hover:border-white shadow-[0_10px_35px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.95)] hover:shadow-[0_18px_45px_rgba(31,38,135,0.18)] text-slate-800"
              }`}
            >
              <img
                src={m.img}
                alt={m.name}
                className={`w-40 h-40 mx-auto rounded-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                  theme === "dark"
                    ? "border-4 border-purple-400/40 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                    : "border-4 border-white shadow-md"
                }`}
              />
              <h3 className={`mt-4 text-lg font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                {m.name}
              </h3>
              <p className={`text-sm ${theme === "dark" ? "text-white/80" : "text-indigo-600 font-semibold"}`}>
                {m.role}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 mt-auto relative z-10 bg-slate-950/70 backdrop-blur-xl border-t border-white/15 text-white/80">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold text-white">StudyBuddy</h3>
            <p className="mt-3 text-sm text-white/80">Your AI-powered study partner for smarter learning.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-white">Product</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li><Link to="/reminders" onClick={(e) => handleProtectedLinkClick(e, '/reminders')} className="hover:text-white transition-colors">Reminders</Link></li>
              <li><Link to="/assignments" onClick={(e) => handleProtectedLinkClick(e, '/assignments')} className="hover:text-white transition-colors">Assignments</Link></li>
              <li><Link to="/analytics" onClick={(e) => handleProtectedLinkClick(e, '/analytics')} className="hover:text-white transition-colors">Analytics</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-white">Company</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link to="/careers" className="hover:text-white transition-colors">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-white">Follow Us</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
              <li><a href="#" className="hover:text-white transition-colors">LinkedIn</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Instagram</a></li>
            </ul>
          </div>
        </div>
        <p className="text-center text-white/60 text-sm mt-10">
          © {new Date().getFullYear()} StudyBuddy. All rights reserved.
        </p>
      </footer>

      {/* ✨ NEW: Render the modal component */}
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

      {/* Dashboard Modal */}
      {isDashboardModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-8 bg-black/70 backdrop-blur-md">
          <div className="relative w-full h-full max-w-7xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 p-4 md:p-6 text-white flex justify-between items-center shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl shrink-0">
                  🎯
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-bold flex items-center gap-2">
                    Monitoring Dashboard
                  </h2>
                  <p className="text-xs md:text-sm text-indigo-100 hidden sm:block">
                    Real-time focus analytics, session trends, and attention monitoring
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                {/* Open in New Tab Button (Always available) */}
                <a
                  href={STREAMLIT_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 active:scale-95 text-white px-3.5 py-2 rounded-xl transition-all text-xs md:text-sm font-semibold shadow-sm"
                  title="Open Dashboard in a dedicated browser tab"
                >
                  <span>Open in New Tab</span>
                  <span className="text-sm">↗</span>
                </a>

                {/* Close Button */}
                <button
                  onClick={() => setDashboardModalOpen(false)}
                  className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/10 hover:bg-white/25 active:scale-95 flex items-center justify-center text-xl transition-all"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Embedded Streamlit Dashboard */}
            <div className="relative flex-1 w-full h-full bg-slate-900 flex flex-col">
              <iframe
                src={getStreamlitEmbedUrl(STREAMLIT_URL)}
                className="flex-1 w-full h-full border-none"
                title="Streamlit Dashboard"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                onLoad={() => setIframeLoaded(true)}
              />

              {/* Graceful Fallback Overlay if Iframe took too long on production */}
              {iframeTimedOut && !iframeLoaded && !STREAMLIT_URL.includes("localhost") && (
                <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white z-10 animate-in fade-in duration-300">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-3xl mb-4 shadow-inner border border-indigo-500/30">
                    📊
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-2">
                    Cross-Site Cookie Notice
                  </h3>
                  <p className="text-slate-300 max-w-lg mb-6 text-sm leading-relaxed">
                    Streamlit Community Cloud requires third-party cookie access, which modern browsers restrict inside embedded iframes.
                    You can view your full analytics and real-time scores directly:
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <a
                      href={STREAMLIT_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-sm"
                    >
                      <span>Open Dashboard in New Tab</span>
                      <span>↗</span>
                    </a>
                    <button
                      onClick={() => {
                        setIframeTimedOut(false);
                        setIframeLoaded(false);
                      }}
                      className="px-4 py-3 bg-white/10 hover:bg-white/20 text-slate-200 font-medium rounded-xl transition-all text-sm"
                    >
                      Retry Embedded View ↻
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Animation style */}
      <style>{`
        @keyframes pulse {0%,100%{opacity:0.2}50%{opacity:1}}
        .animate-pulse {animation:pulse 3s infinite;}
      `}</style>
    </div>
  );
};

export default HomePage;