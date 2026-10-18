import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import API_BASE from "../services/apiBase";
import ThemeToggle from "../components/ThemeToggle";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { theme } = useAppContext();
  const isDark = theme === "dark";

  const [status, setStatus] = useState("loading"); // "loading" | "success" | "error"
  const [message, setMessage] = useState("");
  
  // Resend form state
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided in the link.");
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (res.ok && data.success) {
          setStatus("success");
          setMessage(data.message || "Your email address has been successfully verified!");
        } else {
          setStatus("error");
          setMessage(data.message || "Invalid or expired verification token.");
        }
      } catch (err) {
        console.error("Verification Error:", err);
        setStatus("error");
        setMessage("Server error during email verification. Please try again later.");
      }
    };

    verifyToken();
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail) return;

    setResendLoading(true);
    setResendMessage("");
    setResendSuccess(false);

    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });
      const data = await res.json();

      if (res.ok) {
        setResendSuccess(true);
        setResendMessage(data.message || "A new verification email has been sent!");
      } else {
        setResendSuccess(false);
        setResendMessage(data.message || "Failed to resend verification email.");
      }
    } catch (err) {
      console.error(err);
      setResendSuccess(false);
      setResendMessage("Server error while sending email. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className={`min-h-screen relative z-10 flex flex-col justify-between p-6 font-sans transition-colors duration-500 ${isDark ? "text-white" : "text-slate-800"}`}>
      {/* Top Bar */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <Link
          to="/"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold backdrop-blur-xl border transition-all duration-300 hover:scale-105 ${
            isDark
              ? "bg-slate-900/70 border-purple-500/30 text-purple-200 hover:bg-slate-800"
              : "bg-white/80 border-white/80 text-slate-700 shadow-sm hover:bg-white"
          }`}
        >
          <span>← Back to Home</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md mx-auto my-auto">
        <div className={`p-8 rounded-3xl backdrop-blur-2xl border transition-all duration-300 shadow-2xl text-center ${
          isDark
            ? "bg-slate-900/85 border-purple-500/25 text-white"
            : "bg-[#fdfbf7] border-[#eee8de] shadow-[0_10px_35px_rgba(0,0,0,0.04)] text-slate-800"
        }`}>
          <h1 className="text-3xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-6">
            StudyBuddy
          </h1>

          {status === "loading" && (
            <div className="space-y-4 py-8">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className={`font-medium text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>Verifying your email address...</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-6 py-4">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-3xl font-bold shadow-sm">
                ✓
              </div>
              <h2 className="text-2xl font-bold">Email Verified!</h2>
              <p className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>{message}</p>

              <Link
                to="/login"
                className="inline-block w-full py-3.5 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg transition-all duration-300 hover:scale-[1.01]"
              >
                Go to Login
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-6 py-4 text-left">
              <div className="text-center">
                <div className="w-16 h-16 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto text-3xl font-bold mb-4">
                  ✕
                </div>
                <h2 className="text-2xl font-bold">Verification Failed</h2>
                <p className={`text-sm mt-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>{message}</p>
              </div>

              <div className={`border-t pt-6 mt-6 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? "text-purple-300" : "text-slate-700"}`}>Need a new verification link?</h3>
                <form onSubmit={handleResend} className="space-y-3">
                  <input
                    type="email"
                    placeholder="Enter your registered email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    required
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                      isDark
                        ? "bg-slate-800/80 border-purple-500/30 text-white placeholder-slate-400"
                        : "bg-white/90 border-slate-300 text-slate-800 placeholder-slate-400"
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={resendLoading}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50"
                  >
                    {resendLoading ? "Sending..." : "Resend Verification Email"}
                  </button>
                </form>

                {resendMessage && (
                  <p className={`mt-3 text-xs text-center font-medium ${resendSuccess ? "text-emerald-400" : "text-rose-400"}`}>
                    {resendMessage}
                  </p>
                )}
              </div>

              <div className="text-center pt-2">
                <Link to="/login" className="text-purple-500 text-sm font-bold hover:underline">
                  Back to Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`text-center py-4 text-xs font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>
        © {new Date().getFullYear()} StudyBuddy • All rights reserved
      </div>
    </div>
  );
};

export default VerifyEmail;
