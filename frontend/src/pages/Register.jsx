import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import API_BASE from "../services/apiBase";
import { GoogleLogin } from "@react-oauth/google";
import ThemeToggle from "../components/ThemeToggle";

const Register = () => {
  const navigate = useNavigate();
  const { setAppState, theme } = useAppContext();
  const isDark = theme === "dark";

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    className: "",
    course: "",
    year: "",
    domain: "",
    email: "",
    phone: "",
    college: "",
    city: "",
    state: "",
    nation: "",
    password: "",
  });

  // Handle input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submit
  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || "Registration successful! Please check your email to verify your account.");
        navigate("/login");
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
        alert(data.message || "Google sign-up failed.");
      }
    } catch (err) {
      console.error("Google signup error:", err);
      alert("Server error during Google sign-up.");
    }
  };

  return (
    <div className={`min-h-screen relative z-10 flex flex-col justify-between p-6 font-sans transition-colors duration-500 ${isDark ? "text-white" : "text-slate-800"}`}>
      {/* Top Bar with Home Link & Permanent Theme Toggle */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between mb-6">
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

      {/* Main Register Card */}
      <div className="w-full max-w-2xl mx-auto my-auto">
        <div className={`rounded-3xl backdrop-blur-2xl border transition-all duration-300 shadow-2xl overflow-hidden ${
          isDark
            ? "bg-slate-900/95 border-emerald-500/30 text-white shadow-emerald-950/40"
            : "bg-[#fdfbf7] border-[#eee8de] shadow-[0_20px_50px_rgba(0,0,0,0.15)] text-slate-800"
        }`}>
          {/* Card Header Banner matching Profile */}
          <div className="bg-[#1b3f30] p-6 text-white text-center shadow-md">
            <h2 className="text-2xl font-extrabold flex items-center justify-center gap-2 tracking-tight">
              ✨ Create Your Account
            </h2>
            <p className="text-xs opacity-90 font-medium text-emerald-100">
              Join StudyBuddy and elevate your daily learning experience
            </p>
          </div>

          <div className="p-6 md:p-8">
            {/* Google Sign-Up Button */}
            <div className="flex justify-center mb-6">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => alert("Google sign-up failed. Please try again.")}
                text="signup_with"
                shape="rectangular"
                size="large"
                width="350"
                theme={isDark ? "filled_black" : "outline"}
              />
            </div>

            {/* Divider */}
            <div className="flex items-center mb-6">
              <div className={`flex-1 border-t ${isDark ? "border-slate-800" : "border-slate-200"}`}></div>
              <span className={`px-4 text-xs uppercase font-bold tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                or register with details
              </span>
              <div className={`flex-1 border-t ${isDark ? "border-slate-800" : "border-slate-200"}`}></div>
            </div>

            <form onSubmit={handleSignup} className="grid md:grid-cols-2 gap-4">
              {[
                { label: "Full Name", name: "name", type: "text", required: true, placeholder: "John Doe" },
                { label: "Class", name: "className", type: "text", placeholder: "B.Tech" },
                { label: "Course", name: "course", type: "text", placeholder: "CSE" },
                { label: "Year", name: "year", type: "text", placeholder: "3rd Year" },
                { label: "Domain / Interest", name: "domain", type: "text", placeholder: "Web Dev / AI" },
                { label: "Email", name: "email", type: "email", required: true, placeholder: "you@example.com" },
                { label: "Phone No.", name: "phone", type: "tel", required: true, placeholder: "+91 9876543210" },
                { label: "College / School", name: "college", type: "text", required: true, placeholder: "Institute Name" },
                { label: "City", name: "city", type: "text", required: true, placeholder: "City" },
                { label: "State", name: "state", type: "text", required: true, placeholder: "State" },
                { label: "Nation", name: "nation", type: "text", required: true, placeholder: "Country" },
                { label: "Password", name: "password", type: "password", required: true, placeholder: "••••••••" },
              ].map((field, idx) => (
                <div key={idx}>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? "text-emerald-300" : "text-slate-700"}`}>
                    {field.label}{field.required ? " *" : ""}
                  </label>
                  <input
                    type={field.type}
                    name={field.name}
                    required={field.required || false}
                    placeholder={field.placeholder}
                    value={formData[field.name]}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium outline-none focus:ring-2 focus:ring-[#1b3f30] transition-all ${
                      isDark
                        ? "bg-slate-800/80 border-emerald-500/30 text-white placeholder-slate-400"
                        : "bg-white/90 border-slate-300 text-slate-800 placeholder-slate-400"
                    }`}
                  />
                </div>
              ))}

              <div className="md:col-span-2 mt-4">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#1b3f30] hover:bg-[#143024] text-white rounded-xl font-bold shadow-lg shadow-emerald-950/20 transition-all duration-300 hover:scale-[1.01] cursor-pointer"
                >
                  Complete Registration
                </button>
              </div>
            </form>

            <p className={`mt-6 text-center text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Already have an account?{" "}
              <Link to="/login" className="text-[#1b3f30] dark:text-emerald-400 font-bold hover:underline">
                Log in instead
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

export default Register;
