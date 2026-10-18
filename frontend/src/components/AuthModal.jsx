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
      className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all"
      onClick={onClose}
    >
      <div
        className={`p-8 rounded-3xl backdrop-blur-2xl border max-w-md w-full text-center shadow-2xl transition-all ${
          isDark
            ? "bg-slate-900/90 border-purple-500/30 text-white"
            : "bg-[#fdfbf7] border-[#eee8de] shadow-[0_15px_40px_rgba(0,0,0,0.08)] text-slate-800"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-500 flex items-center justify-center text-3xl mx-auto mb-4">
          🔒
        </div>
        <h2 className="text-2xl font-black mb-2">Access Restricted</h2>
        <p className={`text-sm mb-8 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
          Please log in or sign up to access this feature and track your study journey.
        </p>
        
        <div className="flex flex-col gap-3">
          <button
            onClick={handleLogin}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:scale-[1.01]"
          >
            Login
          </button>
          <button
            onClick={handleSignUp}
            className={`w-full py-3.5 border rounded-xl font-bold transition-all duration-300 ${
              isDark
                ? "border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
                : "border-purple-300 text-purple-700 hover:bg-purple-50"
            }`}
          >
            Sign Up
          </button>
        </div>

        <button
          onClick={onClose}
          className={`mt-6 text-sm font-semibold transition-colors ${
            isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default AuthModal;