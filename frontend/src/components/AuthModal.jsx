import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const AuthModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { theme } = useAppContext();
  const isDark = theme === "dark";

  if (!isOpen) return null;

  const handleLogin = () => {
    onClose();
    navigate('/login');
  };

  const handleSignUp = () => {
    onClose();
    navigate('/register');
  };

  return (
    <div
      className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 transition-all animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`rounded-3xl backdrop-blur-2xl border max-w-md w-full text-center shadow-2xl transition-all overflow-hidden ${
          isDark
            ? "bg-slate-900/95 border-emerald-500/30 text-white shadow-emerald-950/40"
            : "bg-[#fdfbf7] border-[#eee8de] shadow-[0_20px_50px_rgba(0,0,0,0.15)] text-slate-800"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon / Banner matching UserProfileModal */}
        <div className="bg-[#1b3f30] p-5 text-white flex justify-between items-center shadow-md">
          <div className="text-left">
            <h2 className="text-xl font-extrabold flex items-center gap-2 tracking-tight">
              🔐 Login / Sign Up
            </h2>
            <p className="text-xs opacity-90 font-medium text-emerald-100">StudyBuddy Student Account</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-base font-bold transition-all text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-3xl mx-auto mb-4 shadow-md">
            🔒
          </div>
          <h2 className={`text-2xl font-black mb-2 ${isDark ? "text-emerald-200" : "text-slate-900"}`}>
            Access Restricted
          </h2>
          <p className={`text-sm mb-7 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            Please log in or sign up to access this feature and track your personalized study journey.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleLogin}
              className="flex-1 py-3.5 bg-[#1b3f30] hover:bg-[#143024] text-white font-bold rounded-xl shadow-lg shadow-emerald-950/20 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
            >
              Login
            </button>
            <button
              onClick={handleSignUp}
              className="flex-1 py-3.5 bg-[#1b3f30] hover:bg-[#143024] text-white font-bold rounded-xl shadow-lg shadow-emerald-950/20 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
            >
              Sign Up
            </button>
          </div>

          <div className="mt-5 flex items-center justify-center gap-4 text-xs font-semibold">
            <button
              onClick={onClose}
              className={`transition-colors cursor-pointer ${
                isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Cancel
            </button>
            <span className="text-slate-400">•</span>
            <button
              onClick={() => {
                onClose();
                navigate('/login?role=admin');
              }}
              className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Login as Admin &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;