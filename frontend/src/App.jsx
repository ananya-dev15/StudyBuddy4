import React, { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
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
import GlobalReminderAlarmModal from "./components/GlobalReminderAlarmModal";

// Admin Imports
import { AdminProvider } from "./context/AdminContext";
import AdminProtectedRoute from "./components/admin/AdminProtectedRoute";
import AdminLayout from "./components/admin/AdminLayout";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminFeedbackRequests from "./pages/admin/AdminFeedbackRequests";
import AdminApprovedFeedback from "./pages/admin/AdminApprovedFeedback";
import AdminRejectedFeedback from "./pages/admin/AdminRejectedFeedback";
import AdminFAQQuestions from "./pages/admin/AdminFAQQuestions";
import AdminPublishedFAQs from "./pages/admin/AdminPublishedFAQs";
import AdminNotifications from "./pages/admin/AdminNotifications";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  const isAdminRoute = location.pathname.startsWith("/admin");

  // Play intro only on fresh link open (NOT on page refresh, NOT on /intro, /verify-email, or /admin)
  const [showFreshIntro, setShowFreshIntro] = useState(() => {
    if (["/intro", "/verify-email"].includes(location.pathname) || location.pathname.startsWith("/admin")) {
      return false;
    }

    // Check if the user refreshed the webpage (F5 / Cmd+R / browser reload)
    let isReload = false;
    try {
      const navEntries = performance.getEntriesByType("navigation");
      if (navEntries && navEntries.length > 0) {
        isReload = navEntries[0].type === "reload";
      } else if (performance.navigation) {
        isReload = performance.navigation.type === 1;
      }
    } catch (e) {
      isReload = false;
    }

    // Check if link was already opened in this browser session
    let alreadyOpenedInSession = false;
    try {
      alreadyOpenedInSession = sessionStorage.getItem("studybuddy_intro_played") === "true";
    } catch (e) {
      alreadyOpenedInSession = false;
    }

    // Never play on page refresh or if already played in this session
    if (isReload || alreadyOpenedInSession) {
      return false;
    }

    return true;
  });

  const handleFreshIntroComplete = () => {
    try {
      sessionStorage.setItem("studybuddy_intro_played", "true");
    } catch (e) {}
    setShowFreshIntro(false);
  };

  return (
    <>
      <ThemeBackground />
      {!isAdminRoute && <PageTransitionLoader />}
      {!isAdminRoute && <GlobalReminderAlarmModal />}
      {showFreshIntro && !isAdminRoute && (
        <IntroAnimation
          onComplete={handleFreshIntroComplete}
          destination={location.pathname}
        />
      )}

      <Routes>
        {/* Public Student Routes */}
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

        {/* Admin Login redirects to unified card with Admin tab selected */}
        <Route path="/admin/login" element={<Navigate to="/login?role=admin" replace />} />

        {/* Protected Admin Routes */}
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="feedback-requests" element={<AdminFeedbackRequests />} />
          <Route path="approved-feedback" element={<AdminApprovedFeedback />} />
          <Route path="rejected-feedback" element={<AdminRejectedFeedback />} />
          <Route path="faq-questions" element={<AdminFAQQuestions />} />
          <Route path="published-faqs" element={<AdminPublishedFAQs />} />
          <Route path="notifications" element={<AdminNotifications />} />
        </Route>
      </Routes>

      {/* Floating Chatbot only for student pages */}
      {!isAdminRoute && <ChatBot />}
    </>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AdminProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AdminProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
