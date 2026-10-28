import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import profileIcon from "../assets/profile_icon.png";
import { useAppContext } from "../context/AppContext";
import ThemeToggle from "./ThemeToggle";
import UserProfileModal from "./UserProfileModal";

const NAV_LINKS = [
  { name: "Video Tracker", path: "/videos" },
  { name: "Monitoring dashboard", path: "/monitoring" },
  { name: "Leaderboard", path: "/leaderboard" },
  { name: "Performance Dashboard", path: "/dashboard" },
  { name: "Analytics", path: "/analytics" },
  { name: "Assignment", path: "/assignments" },
];

export default function Navbar({ onOpenAuthModal }) {
  const { theme, appState, setAppState } = useAppContext();
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const user = appState?.user || JSON.parse(localStorage.getItem("user"));

  const currentPath = location.pathname.replace(/\/+$/, "") || "/";
  const visibleNavLinks = NAV_LINKS.filter((item) => item.path !== currentPath);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setAppState((prev) => ({
      ...prev,
      user: null,
      coins: 0,
      streak: 0,
      videosWatched: 0,
      videosSwitched: 0,
    }));
    setDropdownOpen(false);
    navigate("/login");
  };

  const handleProtectedLinkClick = (e, targetPath) => {
    if (!user) {
      e.preventDefault();
      if (onOpenAuthModal) {
        onOpenAuthModal();
      } else {
        navigate("/login");
      }
    }
  };

  return (
    <>
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

        {/* Dynamic Navigation Links (Strict order, omitting the current page) */}
        <div className="hidden md:flex items-center gap-4 lg:gap-6 xl:gap-8 font-semibold">
          {visibleNavLinks.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={(e) => handleProtectedLinkClick(e, item.path)}
              className={`transition-colors duration-300 whitespace-nowrap text-sm lg:text-base ${
                theme === "dark"
                  ? "text-white/90 hover:text-white"
                  : "text-gray-700 hover:text-indigo-600"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Right side: Theme Toggle & Auth / Profile */}
        <div className="flex items-center gap-3">
          {/* Permanent Theme Toggle */}
          <ThemeToggle />

          {/* Conditional Profile / Auth */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2.5 sm:gap-3 cursor-pointer"
              >
                <img
                  src={user.profileImage || profileIcon}
                  alt="Profile"
                  className={`w-10 h-10 rounded-full border-2 object-cover ${
                    theme === "dark" ? "border-emerald-400" : "border-[#1b3f30] shadow-sm"
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
                      ? "bg-slate-900/95 border-emerald-500/20 text-white"
                      : "bg-white/95 border-gray-100 text-gray-800 shadow-xl"
                  }`}
                >
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      setIsProfileModalOpen(true);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors ${
                      theme === "dark" ? "hover:bg-slate-800 text-white" : "hover:bg-emerald-50 text-gray-700"
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
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 backdrop-blur-sm"
                    : "border-[#1b3f30]/30 bg-white text-[#1b3f30] hover:bg-emerald-50 shadow-sm"
                }`}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-3 sm:px-4 py-2 bg-[#1b3f30] hover:bg-[#143024] text-white rounded-lg text-sm sm:text-base font-semibold shadow-md hover:shadow-lg hover:scale-105 transform transition-all duration-300"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onUpdateUser={(updated) => {
          localStorage.setItem("user", JSON.stringify(updated));
          setAppState((prev) => ({ ...prev, user: updated }));
        }}
      />
    </>
  );
}
