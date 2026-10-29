import React, { useState, useContext } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";
import { AppContext } from "../../context/AppContext";
import ThemeToggle from "../ThemeToggle";

const AdminLayout = () => {
  const { admin, logout, stats } = useAdmin();
  const { theme, toggleTheme } = useContext(AppContext);
  const isDark = theme === "dark";
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login?role=admin");
  };

  const navItems = [
    {
      name: "Dashboard",
      path: "/admin/dashboard",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: "Feedback Requests",
      path: "/admin/feedback-requests",
      badge: stats.pendingFeedbacks > 0 ? stats.pendingFeedbacks : null,
      badgeColor: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: "Approved Feedback",
      path: "/admin/approved-feedback",
      badge: stats.approvedFeedbacks > 0 ? stats.approvedFeedbacks : null,
      badgeColor: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: "Rejected Feedback",
      path: "/admin/rejected-feedback",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: "FAQ Questions",
      path: "/admin/faq-questions",
      badge: stats.pendingFAQs > 0 ? stats.pendingFAQs : null,
      badgeColor: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: "Published FAQs",
      path: "/admin/published-faqs",
      badge: stats.publishedFAQs > 0 ? stats.publishedFAQs : null,
      badgeColor: "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      name: "Notifications",
      path: "/admin/notifications",
      badge: stats.unreadNotifications > 0 ? stats.unreadNotifications : null,
      badgeColor: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
  ];

  // Helper to get current page title
  const getPageTitle = () => {
    const item = navItems.find((n) => n.path === location.pathname);
    return item ? item.name : "Admin Panel";
  };

  return (
    <div
      className={`min-h-screen flex font-sans relative z-10 transition-colors duration-500 ${
        isDark ? "text-slate-100" : "text-slate-800"
      }`}
    >
      {/* ======================================================== */}
      {/* DESKTOP SIDEBAR */}
      {/* ======================================================== */}
      <aside
        className={`hidden lg:flex flex-col w-72 shrink-0 border-r transition-colors duration-300 fixed inset-y-0 left-0 z-40 backdrop-blur-2xl ${
          isDark
            ? "bg-slate-900/85 border-white/10 shadow-[4px_0_24px_rgba(0,0,0,0.4)] text-white"
            : "bg-[#fbf9f3] border-[#eee8de] shadow-sm text-slate-800"
        }`}
      >
        {/* Brand Logo & Admin Pill */}
        <div className={`h-20 flex items-center justify-between px-6 border-b ${
          isDark ? "border-white/10" : "border-[#eee8de]"
        }`}>
          <Link to="/" className="flex flex-col justify-center group">
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-extrabold tracking-tight bg-clip-text text-transparent transition-all duration-300 ${
                isDark
                  ? "bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]"
                  : "bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600"
              }`}>
                StudyBuddy
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                isDark
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : "bg-[#eaf3ee] text-[#1b3f30] border border-[#1b3f30]/30"
              }`}>
                Admin
              </span>
            </div>
            <p className={`text-[11px] font-medium mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Control Dashboard
            </p>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? isDark
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30"
                      : "bg-[#1b3f30] text-white shadow-md shadow-[#1b3f30]/25"
                    : isDark
                    ? "text-slate-400 hover:text-white hover:bg-white/5 active:bg-white/10"
                    : "text-slate-700 hover:text-slate-900 hover:bg-[#1b3f30]/5 active:bg-[#1b3f30]/10"
                }`
              }
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  !isDark
                    ? "bg-[#eaf3ee] text-[#1b3f30] border border-[#1b3f30]/30"
                    : item.badgeColor || "bg-purple-500/20 text-purple-300"
                }`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom User Card & Logout */}
        <div className={`p-4 border-t ${isDark ? "border-white/10" : "border-[#eee8de]"}`}>
          <div
            className={`p-3 rounded-2xl flex items-center justify-between border ${
              isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-[#eee8de] text-slate-800 shadow-xs"
            }`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                isDark
                  ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                  : "bg-[#eaf3ee] text-[#1b3f30] border border-[#1b3f30]/30"
              }`}>
                {admin?.name ? admin.name[0].toUpperCase() : "A"}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold truncate">{admin?.name || "Administrator"}</p>
                <p className={`text-[10px] truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {admin?.email}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isDark
                  ? "hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                  : "hover:bg-rose-100 text-slate-500 hover:text-rose-600"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* MOBILE DRAWER */}
      {/* ======================================================== */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div
            className={`fixed inset-y-0 left-0 w-72 flex flex-col z-50 p-4 border-r shadow-2xl backdrop-blur-2xl transition-all ${
              isDark ? "bg-slate-900/95 border-white/10 text-white" : "bg-[#fbf9f3]/98 border-[#eee8de] text-slate-900"
            }`}
          >
            <div className={`flex items-center justify-between pb-4 border-b ${isDark ? "border-white/10" : "border-[#eee8de]"}`}>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-extrabold tracking-tight bg-clip-text text-transparent ${
                  isDark
                    ? "bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300"
                    : "bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600"
                }`}>
                  StudyBuddy
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                  isDark
                    ? "bg-purple-500/20 text-purple-400"
                    : "bg-[#eaf3ee] text-[#1b3f30] border border-[#1b3f30]/30"
                }`}>
                  Admin
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`p-2 rounded-xl cursor-pointer ${isDark ? "hover:bg-white/10 text-slate-400" : "hover:bg-[#1b3f30]/10 text-slate-600"}`}
              >
                ✕
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold ${
                      isActive
                        ? isDark
                          ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                          : "bg-[#1b3f30] text-white shadow-sm"
                        : isDark
                        ? "text-slate-400 hover:bg-white/5"
                        : "text-slate-700 hover:bg-[#1b3f30]/5"
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor || "bg-purple-500/20 text-purple-300"}`}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-auto w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-xs flex items-center justify-center gap-2 border border-rose-500/20 cursor-pointer"
            >
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MAIN VIEWPORT AREA */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col lg:pl-72 min-w-0">
        {/* Top Header */}
        <header
          className={`h-20 shrink-0 border-b flex items-center justify-between px-4 sm:px-8 transition-colors duration-300 sticky top-0 z-30 backdrop-blur-2xl ${
            isDark ? "bg-slate-900/80 border-white/10 text-white" : "bg-[#fbf9f3]/90 border-[#eee8de] text-slate-800 shadow-xs"
          }`}
        >
          {/* Left: Mobile hamburger & Page Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className={`p-2 rounded-xl lg:hidden border cursor-pointer ${
                isDark
                  ? "border-white/10 text-slate-300 hover:bg-white/5"
                  : "border-[#eee8de] text-slate-700 hover:bg-white"
              }`}
              aria-label="Toggle Navigation Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">{getPageTitle()}</h1>
          </div>

          {/* Right: Actions (Public Website Link, Theme Toggle, Notifications Bell) */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* View Public Website */}
            <Link
              to="/"
              className={`hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isDark
                  ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                  : "border-[#1b3f30]/30 bg-[#eaf3ee] text-[#1b3f30] hover:bg-[#d4e7dd] shadow-xs"
              }`}
            >
              <span>Public Website</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>

            {/* Standard ThemeToggle Component */}
            <ThemeToggle />

            {/* Notification Bell */}
            <Link
              to="/admin/notifications"
              className={`relative p-2.5 rounded-xl border transition-all cursor-pointer ${
                isDark
                  ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                  : "border-[#1b3f30]/30 bg-[#eaf3ee] text-[#1b3f30] hover:bg-[#d4e7dd] shadow-xs"
              }`}
              title="Notifications"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {stats.unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white font-extrabold text-[10px] flex items-center justify-center animate-pulse shadow-md shadow-rose-500/50">
                  {stats.unreadNotifications > 9 ? "9+" : stats.unreadNotifications}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

