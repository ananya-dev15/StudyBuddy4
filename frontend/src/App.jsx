import React, { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import VideoTracker from "./components/VideoTracker";
import RemindersPanel from "./components/RemindersPanel";
import ChatBot from "./components/ChatBot";
import AssignmentCard from "./components/AssignmentCard";
import Blog from "./components/blogs";
import AuthModal from "./components/AuthModal";
import Leaderboard from "./components/Leaderboard";
import Analytics from "./components/Analytics";
import Contact from "./components/contact";
import VerifyEmail from "./pages/VerifyEmail";
import IntroPage from "./pages/IntroPage";
import IntroAnimation from "./components/IntroAnimation";
import ThemeBackground from "./components/ThemeBackground";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  const [showFreshIntro, setShowFreshIntro] = useState(() => {
    // 1. Never show initial overlay on /intro, /login, or /register
    if (location.pathname === "/intro" || location.pathname === "/login" || location.pathname === "/register") {
      return false;
    }

    // 2. Refresh detection: NEVER play intro on page reload/refresh of any page
    let isReload = false;
    try {
      const navEntries = performance.getEntriesByType?.("navigation");
      if (navEntries && navEntries[0] && navEntries[0].type === "reload") {
        isReload = true;
      } else if (performance.navigation && performance.navigation.type === 1) {
        isReload = true;
      }
    } catch (e) {
      // ignore
    }

    if (isReload) {
      return false;
    }

    // 3. Opening the website link: fresh entry on root path ("/")
    if (location.pathname === "/") {
      return true;
    }

    return false;
  });

  const handleFreshIntroComplete = () => {
    setShowFreshIntro(false);
  };

  return (
    <>
      <ThemeBackground />
      {showFreshIntro && (
        <IntroAnimation
          onComplete={handleFreshIntroComplete}
          destination={location.pathname}
        />
      )}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/intro" element={<IntroPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/videos" element={<VideoTracker />} />
        <Route path="/chatbot" element={<ChatBot standalone={true} />} />
        <Route path="/reminders" element={<RemindersPanel />} />
        <Route path="/assignments" element={<AssignmentCard />} />
        <Route path="/blogs" element={<Blog />} />
        <Route path="/authmodal" element={<AuthModal />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
      </Routes>
      <ChatBot />
    </>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;