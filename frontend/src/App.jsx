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
import MonitoringDashboard from "./components/MonitoringDashboard";
import Contact from "./components/contact";
import VerifyEmail from "./pages/VerifyEmail";
import IntroPage from "./pages/IntroPage";
import IntroAnimation from "./components/IntroAnimation";
import ThemeBackground from "./components/ThemeBackground";
import PageTransitionLoader from "./components/PageTransitionLoader";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  // Play intro on initial link open (except on /intro or /verify-email)
  const [showFreshIntro, setShowFreshIntro] = useState(() => {
    return !["/intro", "/verify-email"].includes(location.pathname);
  });

  const handleFreshIntroComplete = () => {
    setShowFreshIntro(false);
  };

  return (
    <>
      <ThemeBackground />
      <PageTransitionLoader />
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
        <Route path="/monitoring" element={<MonitoringDashboard />} />
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