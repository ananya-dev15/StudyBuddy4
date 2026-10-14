import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import profileIcon from '../assets/profile_icon.png';
import API_BASE, { STREAMLIT_URL, getStreamlitEmbedUrl } from "../services/apiBase";
import AssignmentCard from "../components/AssignmentCard";
import VideoTracker from "../components/VideoTracker";
import AuthModal from "../components/AuthModal";
import UserProfileModal from "../components/UserProfileModal";
import Leaderboard from "../components/Leaderboard";
import Lottie from "lottie-react";
import chatAnimation from "../assets/chatAnimation.json";
import { useAppContext } from "../context/AppContext";
import ankit from "../assets/ankit1.jpeg"
import anshika from "../assets/anshika1.jpeg"
import ananya from "../assets/ananya1.jpeg"
import setu from "../assets/Setu1.jpeg"
import yash from "../assets/yash.jpeg"


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
  const { isChatOpen, setIsChatOpen } = useAppContext();
  const [user, setUser] = useState(null);
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false); // ✨ NEW: State for modal
  const [isDashboardModalOpen, setDashboardModalOpen] = useState(false); // ✨ NEW: Dashboard modal state
  const [dashboardTab, setDashboardTab] = useState("embed"); // "embed" | "direct"
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
    if (path === "/dashboard") {
      // Focus Score Dashboard opens the full-screen dashboard modal (8501)
      e.preventDefault();
      setDashboardModalOpen(true);
      return;
    }
    if (!user) {
      // If user is not logged in
      e.preventDefault(); // Stop the <Link> from navigating
      setAuthModalOpen(true); // Open the login/signup modal
    } else if (path === "/chatbot") {
      // AI Chatbot opens the Chatbot modal
      e.preventDefault(); // Stop navigation
      setIsChatOpen(true); // Open the chat window
    }
  };

  // ✨ NEW: Click handler for the floating chat button
  const handleChatClick = () => {
    if (!user) {
      setAuthModalOpen(true); // Show modal if not logged in
    } else {
      setIsChatOpen(!isChatOpen); // Toggle chat window if logged in
    }
  };


  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-100 via-purple-200 to-pink-100 relative overflow-hidden text-gray-800">

      {/* Glittery Particle Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {Array.from({ length: 80 }).map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full opacity-20 animate-pulse"
            style={{
              width: `${Math.random() * 3 + 2}px`,
              height: `${Math.random() * 3 + 2}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 4 + 2}s`,
            }}
          ></div>
        ))}
      </div>

      {/* Navbar */}
      <nav className="bg-white/30 backdrop-blur-lg shadow-lg py-4 px-8 flex justify-between items-center sticky top-0 z-50 rounded-b-2xl">
        <Link
          to="/"
          className="text-2xl font-extrabold bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 bg-clip-text text-transparent tracking-tight"
        >
          StudyBuddy
        </Link>

        <div className="hidden md:flex gap-8 font-medium">
          {/* ✨ MODIFIED: Added onClick handler */}
          <Link
            to="/dashboard"
            onClick={(e) => handleProtectedLinkClick(e, '/dashboard')}
            className="hover:text-pink-500 transition-colors duration-300"
          >
            Dashboard
          </Link>
          <button
            onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}
            className="hover:text-pink-500 transition-colors duration-300"
          >
            About Us
          </button>
          <Link to="/blogs" className="hover:text-pink-500 transition-colors duration-300">Blogs</Link>
          <Link to="/contact" className="hover:text-pink-500 transition-colors duration-300">Contact Us</Link>
        </div>

        {/* Conditional Navbar with Logout Dropdown */}
        {user ? (
          <div className="relative">
            {/* Clickable profile icon to toggle dropdown */}
            <button onClick={() => setDropdownOpen(!isDropdownOpen)} className="flex items-center gap-3 cursor-pointer">
              <img
                src={user.profileImage || profileIcon}
                alt="Profile"
                className="w-10 h-10 rounded-full border-2 border-indigo-700"
              />
              <span className="font-semibold text-gray-900">{user.name}</span>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 py-2 w-52 bg-white rounded-xl shadow-2xl z-50 border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 font-semibold flex items-center gap-2 transition-colors"
                >
                  👤 View Profile
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 font-bold hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-3">
            <Link
              to="/login"
              className="px-4 py-2 border border-indigo-700 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-all duration-300"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 bg-gradient-to-r from-indigo-700 to-pink-600 text-white rounded-lg shadow-xl hover:shadow-2xl hover:scale-105 transform transition-all duration-300"
            >
              Sign Up
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <header className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 relative z-10">
        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight max-w-3xl">
          <span className="bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 bg-clip-text text-transparent">
            Focus Better. Learn Smarter.
          </span>
          <br />
          <span className="text-gray-900">Achieve More with StudyBuddy</span>
        </h1>
        <p className="mt-6 text-lg text-gray-800 max-w-2xl">
          Your all-in-one study companion: track sessions, set reminders, chat with AI, and stay motivated with analytics and streaks.
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            to="/register"
            className="px-6 py-3 bg-gradient-to-r from-indigo-700 to-pink-600 text-white font-semibold rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transform transition-all duration-300"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="px-6 py-3 border border-indigo-700 text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-all duration-300"
          >
            Login
          </Link>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-20 bg-white/50 backdrop-blur-lg relative z-10">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-10 text-center">
          {[
            { icon: "🎥", title: "Video Tracker", desc: "Log study videos and monitor progress effortlessly.", link: "/videos" },
            { icon: "🎯", title: "Focus Score Dashboard", desc: "Track your real-time focus analytics and session insights.", link: "/dashboard" },
            { icon: "🤖", title: "AI Chatbot", desc: "Instant help, Q&A, and motivation while studying.", link: "/chatbot" },
            { icon: "📊", title: "Analytics", desc: "Visualize your learning trends and stay consistent.", link: "/analytics" },
            { icon: "📝", title: "Assignments", desc: "Organize, track, and submit assignments on time.", link: "/assignments" },
            { icon: "🔥", title: "Leaderboard", desc: "Maintain daily study streaks and boost motivation.", link: "/leaderboard" },
          ].map((f, idx) => (
            <Link
              to={f.link}
              key={idx}
              onClick={(e) => handleProtectedLinkClick(e, f.link)}
              className="p-8 rounded-3xl bg-white/20 backdrop-blur-lg border border-white/20 shadow-xl hover:shadow-2xl transform hover:-translate-y-3 transition-all duration-300 flex flex-col items-center"
            >
              <div className="text-5xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900">{f.title}</h3>
              <p className="text-gray-800 mt-2">{f.desc}</p>
              {f.link === "/dashboard" && (
                <span className="mt-4 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Open Dashboard Dash →</span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-20 bg-gradient-to-r from-purple-700 to-indigo-700 text-white text-center relative z-10">
        <h2 className="text-4xl font-bold mb-6">What Students Say</h2>
        <p className="max-w-3xl mx-auto mb-12 text-lg opacity-90">
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
              className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              <p className="text-lg mb-3">“{r.review}”</p>
              <div className="flex justify-center text-yellow-400/90 mb-2">{"★★★★★"}</div>
              <p className="font-semibold">{r.name}</p>
              <p className="text-sm opacity-80">{r.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white/50 backdrop-blur-lg relative z-10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6 text-left">
            {[
              { q: "Is StudyBuddy free to use?", a: "Yes! StudyBuddy offers a free plan with core features. You can upgrade for advanced analytics and AI tools." },
              { q: "Can I use it on mobile?", a: "Absolutely. StudyBuddy is fully responsive and works on all devices." },
              { q: "How does streak tracking work?", a: "Each day you log study sessions, your streak grows. Miss a day, and it resets — motivating you to stay consistent." },
            ].map((f, idx) => (
              <div key={idx} className="border-b pb-4 bg-white/20 backdrop-blur-lg rounded-xl p-4">
                <h3 className="font-semibold text-lg text-gray-900">{f.q}</h3>
                <p className="text-gray-800 mt-2">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gradient-to-r from-indigo-100 to-purple-200 text-center relative z-10">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Choose Your Plan</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto px-6">
          <div className="p-8 bg-white/30 backdrop-blur-lg rounded-3xl shadow-xl hover:shadow-2xl hover:scale-105 transform transition-all duration-300">
            <h3 className="text-2xl font-semibold text-gray-900">Free Plan</h3>
            <p className="mt-3 text-gray-800">Perfect for beginners</p>
            <p className="mt-4 text-3xl font-bold text-indigo-700">₹0</p>
            <ul className="mt-4 text-gray-800 space-y-2 text-sm">
              <li>✔ Reminders & Assignments</li>
              <li>✔ Basic Analytics</li>
              <li>✔ AI Chatbot (limited)</li>
            </ul>
            <Link
              to="/register"
              className="mt-6 inline-block px-6 py-3 bg-gradient-to-r from-indigo-7A00 to-pink-600 text-white rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transform transition-all duration-300"
            >
              Get Started
            </Link>
          </div>
          <div className="p-8 bg-white/30 backdrop-blur-lg rounded-3xl shadow-xl border-2 border-indigo-700 hover:shadow-2xl hover:scale-105 transform transition-all duration-300">
            <h3 className="text-2xl font-semibold text-gray-900">Pro Plan</h3>
            <p className="mt-3 text-gray-800">For serious learners</p>
            <p className="mt-4 text-3xl font-bold text-indigo-700">₹299/month</p>
            <ul className="mt-4 text-gray-800 space-y-2 text-sm">
              <li>✔ All Free Plan Features</li>
              <li>✔ Advanced Analytics & Graphs</li>
              <li>✔ Unlimited AI Chatbot Access</li>
              <li>✔ Priority Support</li>
            </ul>
            <Link
              to="/register"
              className="mt-6 inline-block px-6 py-3 bg-gradient-to-r from-indigo-700 to-pink-600 text-white rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transform transition-all duration-300"
            >
              Upgrade Now
            </Link>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-16 text-center bg-white/50 backdrop-blur-lg relative z-10">
        <h2 className="text-3xl font-bold text-gray-900">ABOUT US</h2>
        <p className="mt-3 text-gray-800 max-w-2xl mx-auto">
          We are a passionate team dedicated to making self-learning more effective and engaging.
          Our mission is to provide students with the right tools, structure, and motivation
          to achieve their goals without distractions.
        </p>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 max-w-7xl mx-auto px-6">

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition">
            <img
              src={ananya}
              alt="Team Member"
              className="w-48 h-48 mx-auto rounded-full border-4 border-indigo-600 shadow-md object-cover"
            />

            <h3 className="mt-4 text-xl font-semibold text-gray-900">Ananya Srivastava</h3>
            <p className="text-gray-600 text-sm">Backend Developer</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition">
            <img src={anshika} alt="Team Member"
              className="w-48 h-48 mx-auto rounded-full border-4 border-indigo-600 shadow-md object-cover" />
            <h3 className="mt-4 text-xl font-semibold text-gray-900">Anshika Jain</h3>
            <p className="text-gray-600 text-sm">Frontend Designer</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition">
            <img
              src={ankit}
              alt="Team Member"
              className="w-48 h-48 mx-auto rounded-full border-4 border-indigo-600 shadow-md object-cover object-top"

            />
            <h3 className="mt-4 text-xl font-semibold text-gray-900">Ankit Kumar</h3>
            <p className="text-gray-600 text-sm">Ideation and Open CV</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition">
            <img src={setu} alt="Team Member"
              className="w-48 h-48 mx-auto rounded-full border-4 border-indigo-600 shadow-md object-cover" />

            <h3 className="mt-4 text-xl font-semibold text-gray-900">Setu Arya</h3>
            <p className="text-gray-600 text-sm">Frontend Designer</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition">
            <img
              src={yash} alt="Team Member"
              className="w-48 h-48 mx-auto rounded-full border-4 border-indigo-600 shadow-md object-cover"
            />
            <h3 className="mt-4 text-xl font-semibold text-gray-900">Yash Jain</h3>
            <p className="text-gray-600 text-sm">AI/ML</p>
          </div>

        </div>
      </section>


      {/* Footer */}
      <footer className="bg-gray-900 text-gray-200 py-10 mt-auto border-t-4 border-gradient-to-r from-purple-700 to-indigo-700 relative z-10">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold text-white">StudyBuddy</h3>
            <p className="mt-3 text-sm">Your AI-powered study partner for smarter learning.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-white">Product</h4>
            <ul className="space-y-2 text-sm">
              {/* ✨ MODIFIED: Added onClick handlers */}
              <li><Link to="/reminders" onClick={(e) => handleProtectedLinkClick(e, '/reminders')} className="hover:text-white">Reminders</Link></li>
              <li><Link to="/assignments" onClick={(e) => handleProtectedLinkClick(e, '/assignments')} className="hover:text-white">Assignments</Link></li>
              <li><Link to="/analytics" onClick={(e) => handleProtectedLinkClick(e, '/analytics')} className="hover:text-white">Analytics</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-white">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="hover:text-white">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
              <li><Link to="/careers" className="hover:text-white">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-white">Follow Us</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">Twitter</a></li>
              <li><a href="#" className="hover:text-white">LinkedIn</a></li>
              <li><a href="#" className="hover:text-white">Instagram</a></li>
            </ul>
          </div>
        </div>
        <p className="text-center text-gray-400 text-sm mt-10">
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
                  📊
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-bold flex items-center gap-2">
                    Focus & Study Dashboard
                  </h2>
                  <p className="text-xs md:text-sm text-indigo-100 hidden sm:block">
                    Real-time analytics, session trends, and smart reminder insights
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                {/* View toggle (Embedded vs Direct Launch) */}
                <div className="bg-black/20 p-1 rounded-xl flex items-center text-xs font-semibold">
                  <button
                    onClick={() => setDashboardTab("embed")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      dashboardTab === "embed"
                        ? "bg-white text-indigo-900 shadow-sm"
                        : "text-white/80 hover:text-white"
                    }`}
                  >
                    Embedded
                  </button>
                  <button
                    onClick={() => setDashboardTab("direct")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      dashboardTab === "direct"
                        ? "bg-white text-indigo-900 shadow-sm"
                        : "text-white/80 hover:text-white"
                    }`}
                  >
                    Direct View
                  </button>
                </div>

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

            {/* Cookie / Redirect helper banner for production */}
            {dashboardTab === "embed" && !STREAMLIT_URL.includes("localhost") && (
              <div className="bg-indigo-50/90 border-b border-indigo-100 px-4 py-2 flex items-center justify-between text-xs text-indigo-950">
                <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
                  <span className="text-indigo-600 font-bold shrink-0">💡 Tip:</span>
                  <span className="truncate">
                    If your browser blocks cross-site cookies or shows a redirect notice, launch the dashboard directly:
                  </span>
                </div>
                <a
                  href={STREAMLIT_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-3 shrink-0 text-indigo-700 hover:text-indigo-900 font-semibold underline flex items-center gap-1"
                >
                  Launch directly ↗
                </a>
              </div>
            )}

            {/* Modal Body: Embedded Iframe or Direct Fallback View */}
            {dashboardTab === "embed" ? (
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
                      Streamlit Community Cloud requires third-party cookie access, which modern browsers restrict inside embedded iframes (causing redirect notices).
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
            ) : (
              /* Direct View Mode: Dedicated beautiful landing & launch screen */
              <div className="flex-1 w-full bg-gradient-to-b from-slate-50 to-indigo-50/40 p-6 md:p-12 flex flex-col items-center justify-center text-center overflow-y-auto">
                <div className="max-w-xl mx-auto flex flex-col items-center">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-4xl mb-6 shadow-xl shadow-indigo-500/20">
                    🎯
                  </div>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">
                    Study Focus & Productivity Analytics
                  </h3>
                  <p className="text-gray-600 text-sm md:text-base leading-relaxed mb-8">
                    Access your deep session trends, gaze focus breakdowns, time focused percentages, and downloadable performance PDF reports in full resolution.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                    <a
                      href={STREAMLIT_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-all text-base flex items-center justify-center gap-2"
                    >
                      <span>Launch Full Dashboard</span>
                      <span>↗</span>
                    </a>
                    <button
                      onClick={() => setDashboardTab("embed")}
                      className="px-6 py-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-2xl shadow-sm transition-all text-sm"
                    >
                      Try Embedded Frame 🖥️
                    </button>
                  </div>
                </div>
              </div>
            )}
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