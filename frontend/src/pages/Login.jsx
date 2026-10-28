import React, { useState } from "react";
import { useAppContext } from "../context/AppContext";
import API_BASE from "../services/apiBase";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import ThemeToggle from "../components/ThemeToggle";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { setAppState, theme } = useAppContext();
  const isDark = theme === "dark";

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        if (data.token) localStorage.setItem("token", data.token);

        setAppState((prev) => ({
          ...prev,
          user: data.user,
          coins: data.user.coins,
          streak: data.user.streak || 0,
          name: data.user.name,
          email: data.user.email,
        }));
        localStorage.setItem("streak", data.user.streak || 0);

        navigate("/intro", { state: { destination: "/" }, replace: true });
      } else if (data.needsVerification) {
        const resend = confirm(data.message + "\nWould you like to resend the verification email?");
        if (resend) {
          fetch(`${API_BASE}/api/auth/resend-verification`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          })
            .then((r) => r.json())
            .then((resp) => alert(resp.message || "Verification email sent"))
            .catch(() => alert("Failed to resend verification email"));
        }
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/google-login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        if (data.token) localStorage.setItem("token", data.token);

        setAppState((prev) => ({
          ...prev,
          user: data.user,
          coins: data.user.coins,
          streak: data.user.streak || 0,
          name: data.user.name,
          email: data.user.email,
        }));
        localStorage.setItem("streak", data.user.streak || 0);

        navigate("/intro", { state: { destination: "/" }, replace: true });
      } else {
        alert(data.message || "Google login failed.");
      }
    } catch (err) {
      console.error("Google login error:", err);
      alert("Server error during Google login.");
    }
  };

  return (
    <div className={`min-h-screen relative z-10 flex flex-col justify-between p-6 font-sans transition-colors duration-500 ${isDark ? "text-white" : "text-slate-800"}`}>
      {/* Top Bar with Home Link & Permanent Theme Toggle */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <Link
          to="/"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold backdrop-blur-xl border transition-all duration-300 hover:scale-105 ${
            isDark
              ? "bg-slate-900/70 border-emerald-500/30 text-emerald-200 hover:bg-slate-800"
              : "bg-white/80 border-white/80 text-slate-700 shadow-sm hover:bg-white"
          }`}
        >
          <span>← Back to Home</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-auto">
        <div className={`rounded-3xl backdrop-blur-2xl border transition-all duration-300 shadow-2xl overflow-hidden ${
          isDark
            ? "bg-slate-900/95 border-emerald-500/30 text-white shadow-emerald-950/40"
            : "bg-[#fdfbf7] border-[#eee8de] shadow-[0_20px_50px_rgba(0,0,0,0.15)] text-slate-800"
        }`}>
          {/* Card Header Banner matching Profile */}
          <div className="bg-[#1b3f30] p-6 text-white text-center shadow-md">
            <h2 className="text-2xl font-extrabold flex items-center justify-center gap-2 tracking-tight">
              🔐 Welcome Back
            </h2>
            <p className="text-xs opacity-90 font-medium text-emerald-100">
              Log in to continue your personalized study flow
            </p>
          </div>

          <div className="p-6 md:p-8">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? "text-emerald-300" : "text-slate-700"}`}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none focus:ring-2 focus:ring-[#1b3f30] transition-all ${
                    isDark
                      ? "bg-slate-800/80 border-emerald-500/30 text-white placeholder-slate-400"
                      : "bg-white/90 border-slate-300 text-slate-800 placeholder-slate-400"
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? "text-emerald-300" : "text-slate-700"}`}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none focus:ring-2 focus:ring-[#1b3f30] transition-all ${
                    isDark
                      ? "bg-slate-800/80 border-emerald-500/30 text-white placeholder-slate-400"
                      : "bg-white/90 border-slate-300 text-slate-800 placeholder-slate-400"
                  }`}
                />
              </div>
              <button
                type="submit"
                className="w-full py-3.5 bg-[#1b3f30] hover:bg-[#143024] text-white rounded-xl font-bold shadow-lg shadow-emerald-950/20 transition-all duration-300 hover:scale-[1.01] cursor-pointer"
              >
                Sign In
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center my-6">
              <div className={`flex-1 border-t ${isDark ? "border-slate-800" : "border-slate-200"}`}></div>
              <span className={`px-4 text-xs uppercase font-bold tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                or continue with
              </span>
              <div className={`flex-1 border-t ${isDark ? "border-slate-800" : "border-slate-200"}`}></div>
            </div>

            {/* Google Login Button */}
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => alert("Google login failed. Please try again.")}
                text="continue_with"
                shape="rectangular"
                size="large"
                width="350"
                theme={isDark ? "filled_black" : "outline"}
              />
            </div>

            <p className={`mt-6 text-center text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Don't have an account?{" "}
              <Link to="/register" className="text-[#1b3f30] dark:text-emerald-400 font-bold hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className={`text-center py-4 text-xs font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>
        © {new Date().getFullYear()} StudyBuddy • All rights reserved
      </div>
    </div>
  );
};

export default Login;
