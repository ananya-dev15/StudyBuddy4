import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import studyBannerBg from "../assets/study_banner_bg.jpg";
import videoTrackerIcon from "../assets/icons/video tracker.png";
import monitoringDashboardIcon from "../assets/icons/monitoring dashboard.png";
import leaderboardIcon from "../assets/icons/leaderboard.png";
import performanceDashboardIcon from "../assets/good-feedback.png";
import analyticsIcon from "../assets/icons/analytics.png";
import assignmentsIcon from "../assets/icons/assignments.png";
import blogIcon from "../assets/icons/blog.png";
import contactUsIcon from "../assets/icons/contact us.png";
import smartAlarmIcon from "../assets/icons/smart alarm.png";
import focusCompanionIcon from "../assets/icons/focus companion.png";

/**
 * Route-specific default intro data dictionary.
 * Fallbacks if props are not explicitly provided.
 */
const ROUTE_INTRO_CONFIG = {
  "/dashboard": {
    title: "Dashboard",
    description: "Your personalized overview of study progress and focus.",
    icon: (
      <img
        src={performanceDashboardIcon}
        alt="Dashboard"
        className="w-10 h-10 sm:w-12 sm:h-12 object-contain select-none"
        draggable={false}
      />
    ),
  },
  "/videos": {
    title: "Video Tracker",
    description: "Track your learning videos and stay focused.",
    icon: (
      <img
        src={videoTrackerIcon}
        alt="Video Tracker"
        className="w-10 h-10 sm:w-12 sm:h-12 object-contain select-none"
        draggable={false}
      />
    ),
  },
  "/monitoring": {
    title: "Monitoring Dashboard",
    description: "Real-time biometric focus tracking, attention analytics, and session insights.",
    icon: (
      <img
        src={monitoringDashboardIcon}
        alt="Monitoring Dashboard"
        className="w-10 h-10 sm:w-12 sm:h-12 object-contain select-none"
        draggable={false}
      />
    ),
  },
  "/analytics": {
    title: "Analytics",
    description: "Understand your focus patterns and study performance.",
    icon: (
      <img
        src={analyticsIcon}
        alt="Analytics"
        className="w-10 h-10 sm:w-12 sm:h-12 object-contain select-none"
        draggable={false}
      />
    ),
  },
  "/assignments": {
    title: "Assignments",
    description: "Organize your academic tasks, deadlines, and study reminders.",
    icon: (
      <img
        src={assignmentsIcon}
        alt="Assignments"
        className="w-10 h-10 sm:w-12 sm:h-12 object-contain select-none"
        draggable={false}
      />
    ),
  },
  "/leaderboard": {
    title: "Leaderboard",
    description: "See your progress and stay motivated.",
    icon: (
      <img
        src={leaderboardIcon}
        alt="Leaderboard"
        className="w-10 h-10 sm:w-12 sm:h-12 object-contain select-none"
        draggable={false}
      />
    ),
  },
  "/blogs": {
    title: "Blogs",
    description: "Explore useful insights, tips, and learning resources.",
    icon: (
      <img
        src={blogIcon}
        alt="Blogs"
        className="w-10 h-10 sm:w-12 sm:h-12 object-contain select-none"
        draggable={false}
      />
    ),
  },
  "/contact": {
    title: "Contact Us",
    description: "Connect with the StudyBuddy team.",
    icon: (
      <img
        src={contactUsIcon}
        alt="Contact Us"
        className="w-10 h-10 sm:w-12 sm:h-12 object-contain select-none"
        draggable={false}
      />
    ),
  },
  "/reminders": {
    title: "Reminders & Alerts",
    description: "Manage your study alarms, deadlines, and smart focus notifications.",
    icon: (
      <img
        src={smartAlarmIcon}
        alt="Reminders"
        className="w-10 h-10 sm:w-12 sm:h-12 object-contain select-none"
        draggable={false}
      />
    ),
  },
  "/chatbot": {
    title: "AI Study Buddy",
    description: "Instant help, Q&A, and motivation while studying.",
    icon: (
      <img
        src={focusCompanionIcon}
        alt="AI Study Buddy"
        className="w-10 h-10 sm:w-12 sm:h-12 object-contain select-none"
        draggable={false}
      />
    ),
  },
  "/login": {
    title: "Login",
    description: "Welcome back! Sign in to continue your personalized study flow.",
    icon: "🔐",
  },
  "/register": {
    title: "Create Account",
    description: "Join StudyBuddy to start tracking your learning and focus.",
    icon: "✨",
  },
  "/verify-email": {
    title: "Email Verification",
    description: "Verify your email address to secure your StudyBuddy account.",
    icon: "✉️",
  },
};

/**
 * Reusable Page Introduction Card with the Nature/Mountain Theme
 * Styled to match the exact aesthetic of the StudyBanner (watercolor forest background,
 * frosted glass overlay, elegant serif typography, and motivational thought).
 *
 * @param {string} [title] - Optional override title
 * @param {string} [description] - Optional override description
 * @param {string} [icon] - Optional override icon emoji
 * @param {string} [className] - Optional extra Tailwind classes
 */
export default function PageIntroCard({ title, description, icon, className = "" }) {
  const location = useLocation();
  const { theme, appState } = useAppContext();
  const isDark = theme === "dark";

  // Resolve config from current pathname if not explicitly passed as props
  const routeData = ROUTE_INTRO_CONFIG[location.pathname] || {};
  const displayTitle = title || routeData.title || "StudyBuddy";
  const displayDesc = description || routeData.description || "Empower your study sessions with smart focus tracking.";
  const displayIcon = icon || routeData.icon || "✦";

  // Greeting & user name
  const userName = useMemo(() => {
    const user = appState?.user || JSON.parse(localStorage.getItem("user") || "null");
    return user?.name ? user.name.trim().split(" ")[0] : "Buddy";
  }, [appState?.user]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  return (
    <div
      className={`relative w-full rounded-3xl overflow-hidden border shadow-sm transition-all duration-300 ${
        isDark
          ? "border-slate-800 bg-[#0d1319]"
          : "border-slate-200/90 bg-[#f9f8f6]"
      } ${className}`}
      style={{
        backgroundImage: `url(${studyBannerBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center 45%",
      }}
    >
      {/* Frosted Glass Translucent Gradient Overlay for crystal clear readability */}
      <div
        className={`w-full h-full p-5 sm:p-7 lg:py-6 lg:px-9 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6 ${
          isDark
            ? "bg-gradient-to-r from-slate-950/95 via-slate-950/85 to-slate-950/40 text-white"
            : "bg-gradient-to-r from-[#fcfbfa]/95 via-[#fcfbfa]/88 to-[#fcfbfa]/30 text-slate-800"
        }`}
      >
        {/* Left Content */}
        <div className="max-w-2xl flex-1">
          {/* Top Greeting */}
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`text-xs sm:text-sm font-bold tracking-tight ${
                isDark ? "text-slate-200" : "text-slate-800"
              }`}
            >
              {greeting}, {userName}! 👋
            </span>
          </div>

          {/* Headline Title */}
          <h1
            className={`m-0 text-2xl sm:text-3xl lg:text-4xl font-black font-serif tracking-tight leading-[1.15] ${
              isDark ? "text-emerald-300" : "text-[#1b3f30]"
            }`}
          >
            {displayTitle}
          </h1>

          {/* Subtitle Description */}
          <p
            className={`m-0 text-xs sm:text-sm font-medium leading-relaxed max-w-xl mt-1 ${
              isDark ? "text-slate-300" : "text-slate-600"
            }`}
          >
            {displayDesc}
          </p>
        </div>

        {/* Right Section: Thought Quote & Icon Badge */}
        <div className="flex items-center gap-5 sm:gap-8 shrink-0 self-stretch md:self-center justify-between md:justify-end">
          {/* Floating Thought (matching the image) */}
          <div className="hidden sm:flex flex-col items-center justify-center text-center max-w-[220px] select-none">
            <p
              className={`m-0 font-serif italic text-xs sm:text-[13px] leading-relaxed tracking-wide text-center ${
                isDark
                  ? "text-emerald-100 font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                  : "text-[#183e2b] font-semibold drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]"
              }`}
            >
              “A focused mind today builds a brighter tomorrow.”
            </p>
          </div>

          {/* Icon Badge */}
          {displayIcon && (
            <div
              className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center shrink-0 transition-transform duration-300 hover:scale-105 select-none"
              aria-hidden="true"
            >
              {displayIcon}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
