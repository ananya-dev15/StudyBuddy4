import React, { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { useAdmin } from "../context/AdminContext";
import API_BASE from "../services/apiBase";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import ThemeToggle from "../components/ThemeToggle";

const Login = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAppState, theme } = useAppContext();
  const { login: adminLogin, isAuthenticated: isAdminAuthenticated } = useAdmin();
  const isDark = theme === "dark";

  // Tab mode: "user" | "admin"
  const [loginRole, setLoginRole] = useState(() => {
    return searchParams.get("role") === "admin" ? "admin" : "user";
  });

  // User form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isUserSubmitting, setIsUserSubmitting] = useState(false);

  // Admin form state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [isAdminSubmitting, setIsAdminSubmitting] = useState(false);

  // If already logged in as admin and switching to admin tab, can auto-redirect
  useEffect(() => {
    if (loginRole === "admin" && isAdminAuthenticated) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [loginRole, isAdminAuthenticated, navigate]);

  // Handle Student / User Login
  const handleUserLogin = async (e) => {
    e.preventDefault();
    setIsUserSubmitting(true);
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
    } finally {
      setIsUserSubmitting(false);
    }
  };

  // Handle Google Login for Users
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

  // Handle Admin Login
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError("");

    if (!adminEmail.trim() || !adminPassword) {
      setAdminError("Please provide both administrator email and password.");
      return;
    }

    setIsAdminSubmitting(true);
    const result = await adminLogin(adminEmail.trim(), adminPassword);
    setIsAdminSubmitting(false);

    if (result.success) {
      navigate("/admin/dashboard", { replace: true });
    } else {
      setAdminError(result.message || "Invalid administrator credentials.");
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

      {/* Main Login Card with Dual Role Switcher */}
      <div className="w-full max-w-md mx-auto my-auto animate-fadeIn">
        <div
          className={`rounded-3xl backdrop-blur-2xl border transition-all duration-300 shadow-2xl overflow-hidden ${
            isDark
              ? loginRole === "admin"
                ? "bg-slate-900/95 border-indigo-500/30 text-white shadow-indigo-950/40"
                : "bg-slate-900/95 border-emerald-500/30 text-white shadow-emerald-950/40"
              : "bg-white border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.1)] text-slate-800"
          }`}
        >
          {/* Card Header Banner with dynamic colors based on selected tab */}
          <div
            className={`p-6 text-white text-center shadow-md transition-colors duration-300 ${
              loginRole === "admin"
                ? isDark
                  ? "bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700"
                  : "bg-[#1b3f30]"
                : "bg-[#1b3f30]"
            }`}
          >
            <h2 className="text-2xl font-extrabold flex items-center justify-center gap-2 tracking-tight">
              {loginRole === "admin" ? (
                <>
                  <span>🛡️ Admin Portal</span>
                </>
              ) : (
                <>
                  <span>🔐 Welcome Back</span>
                </>
              )}
            </h2>
            <p className="text-xs opacity-90 font-medium text-white/90 mt-1">
              {loginRole === "admin"
                ? "Sign in with administrator credentials to manage StudyBuddy"
                : "Log in to continue your personalized study flow"}
            </p>
          </div>

          {/* Segmented Dual Role Toggle inside the same card */}
          <div className="p-1.5 mx-6 sm:mx-8 mt-6 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setLoginRole("user");
                setAdminError("");
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                loginRole === "user"
                  ? isDark
                    ? "bg-[#1b3f30] text-white shadow-md shadow-emerald-950/40"
                    : "bg-[#1b3f30] text-white shadow-md"
                  : isDark
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Login as User</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginRole("admin");
                setAdminError("");
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                loginRole === "admin"
                  ? isDark
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-950/40"
                    : "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                  : isDark
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Login as Admin</span>
            </button>
          </div>

          {/* Form Content: USER LOGIN */}
          {loginRole === "user" && (
            <div className="p-6 md:p-8 pt-5 animate-fadeIn">
              <form onSubmit={handleUserLogin} className="space-y-4">
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
                        : "bg-white border-slate-300 text-slate-800 placeholder-slate-400"
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
                        : "bg-white border-slate-300 text-slate-800 placeholder-slate-400"
                    }`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isUserSubmitting}
                  className="w-full py-3.5 bg-[#1b3f30] hover:bg-[#143024] text-white rounded-xl font-bold shadow-lg shadow-emerald-950/20 transition-all duration-300 hover:scale-[1.01] cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isUserSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Sign In as Student</span>
                  )}
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
          )}

          {/* Form Content: ADMIN LOGIN */}
          {loginRole === "admin" && (
            <div className="p-6 md:p-8 pt-5 animate-fadeIn">
              {/* Error banner */}
              {adminError && (
                <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-start gap-2.5">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{adminError}</span>
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? "text-indigo-300" : "text-slate-700"}`}>
                    Admin Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@studybuddy.com"
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${
                        isDark
                          ? "bg-slate-800/80 border-indigo-500/30 text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500"
                          : "bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-600"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? "text-indigo-300" : "text-slate-700"}`}>
                    Admin Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      type={showAdminPassword ? "text" : "password"}
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className={`w-full pl-10 pr-11 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${
                        isDark
                          ? "bg-slate-800/80 border-indigo-500/30 text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500"
                          : "bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-600"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      aria-label={showAdminPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                    >
                      {showAdminPassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAdminSubmitting}
                  className={`w-full py-3.5 text-white rounded-xl font-bold shadow-lg transition-all duration-300 hover:scale-[1.01] cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 ${
                    isDark
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-950/20"
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25 active:scale-[0.98]"
                  }`}
                >
                  {isAdminSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying Admin...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Admin Panel</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <div className={`mt-6 p-3 rounded-xl border text-center ${
                isDark
                  ? "bg-indigo-500/10 border-indigo-500/20"
                  : "bg-emerald-50 border-emerald-200"
              }`}>
                <p className={`text-xs font-medium flex items-center justify-center gap-1.5 ${
                  isDark ? "text-indigo-300" : "text-emerald-800"
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Protected administrator access with JWT verification.</span>
                </p>
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

export default Login;
