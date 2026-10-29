import React, { useEffect, useRef, useState } from "react";
import profileIcon from "../assets/profile_icon.png";
import API_BASE from "../services/apiBase";
import { useAppContext } from "../context/AppContext";

export default function UserProfileModal({ isOpen, onClose, user, onUpdateUser }) {
  const fileInputRef = useRef(null);
  const { theme } = useAppContext();
  const isDark = theme === "dark";
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [profileData, setProfileData] = useState(user || {});

  // Form edit fields
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    college: "",
    className: "",
    course: "",
    year: "",
    domain: "",
    city: "",
    state: "",
    nation: "",
  });

  // Fetch full user profile directly from MongoDB on modal open
  useEffect(() => {
    if (user) {
      setProfileData(user);
      initFormData(user);
    }
    if (isOpen && user) {
      const fetchProfile = async () => {
        setLoadingProfile(true);
        try {
          const uid = user.id || user._id || "";
          const uemail = user.email || "";
          const token = localStorage.getItem("token");
          const res = await fetch(`${API_BASE}/api/auth/profile?userId=${uid}&email=${encodeURIComponent(uemail)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            credentials: "include",
          });
          const data = await res.json();
          if (data.success && data.user) {
            setProfileData(data.user);
            initFormData(data.user);
            const updatedUser = { ...user, ...data.user };
            localStorage.setItem("user", JSON.stringify(updatedUser));
            if (onUpdateUser) onUpdateUser(updatedUser);
          }
        } catch (err) {
          console.error("Error fetching full user profile:", err);
        } finally {
          setLoadingProfile(false);
        }
      };
      fetchProfile();
    }
  }, [isOpen, user?.id, user?._id, user?.email]);

  const initFormData = (userData = {}) => {
    setFormData({
      name: userData.name || "",
      phone: userData.phone || "",
      college: userData.college || "",
      className: userData.className || "",
      course: userData.course || "",
      year: userData.year || "",
      domain: userData.domain || "",
      city: userData.city || "",
      state: userData.state || "",
      nation: userData.nation || "",
    });
  };

  if (!isOpen || !user) return null;

  // Compress image before base64 upload for fast & reliable saving
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 500;
          const MAX_HEIGHT = 500;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.8);
          resolve(compressedBase64);
        };
      };
    });
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage("");

    try {
      const compressedBase64 = await compressImage(file);
      const token = localStorage.getItem("token");
      const uid = profileData.id || profileData._id || user.id || user._id || "";
      const uemail = profileData.email || user.email || "";

      const res = await fetch(`${API_BASE}/api/auth/update-profile-photo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        credentials: "include",
        body: JSON.stringify({
          userId: uid,
          email: uemail,
          profileImage: compressedBase64,
        }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        const updatedUser = { ...user, ...data.user, profileImage: compressedBase64 };
        setProfileData(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        if (onUpdateUser) onUpdateUser(updatedUser);
        setMessage("✅ Profile photo updated successfully!");
      } else {
        alert(data.message || "Failed to update profile photo.");
      }
    } catch (err) {
      console.error("Error uploading profile picture:", err);
      alert("An error occurred while uploading profile picture.");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      const uid = profileData.id || profileData._id || user.id || user._id || "";
      const uemail = profileData.email || user.email || "";

      const res = await fetch(`${API_BASE}/api/auth/update-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        credentials: "include",
        body: JSON.stringify({
          userId: uid,
          email: uemail,
          ...formData,
        }),
      });

      const data = await res.json();
      if (res.ok && (data.success || data.user)) {
        setProfileData(data.user);
        const updatedUser = { ...user, ...data.user };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        if (onUpdateUser) onUpdateUser(updatedUser);
        setIsEditing(false);
        setMessage("✅ Profile details updated & saved to MongoDB!");
      } else {
        alert(data.message || "Failed to update profile details.");
      }
    } catch (err) {
      console.error("Error updating profile details:", err);
      alert("An error occurred while saving profile details.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Uses exact user data stored in MongoDB from signup
  const displayUser = {
    ...user,
    ...profileData,
  };

  const fieldConfigs = [
    { name: "name", label: "Full Name", icon: "👤", locked: false },
    { name: "email", label: "Email Address", icon: "📧", locked: true, value: displayUser.email || "Not specified" },
    { name: "phone", label: "Phone Number", icon: "📞", locked: false },
    { name: "college", label: "College / Institution", icon: "🏫", locked: false },
    { name: "className", label: "Class", icon: "📚", locked: false },
    { name: "course", label: "Course", icon: "📖", locked: false },
    { name: "year", label: "Year", icon: "📅", locked: false },
    { name: "domain", label: "Domain / Interest", icon: "🎯", locked: false },
    { name: "city", label: "City", icon: "🏙️", locked: false },
    { name: "state", label: "State", icon: "🗺️", locked: false },
    { name: "nation", label: "Nation", icon: "🌐", locked: false },
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`relative w-full max-w-4xl rounded-3xl shadow-2xl border overflow-hidden flex flex-col backdrop-blur-2xl transition-all ${
        isDark
          ? "bg-slate-900/95 border-pink-500/30 text-white shadow-pink-950/40"
          : "bg-[#fdfbf7] border-[#eee8de] text-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
      }`}>
        {/* Header */}
        <div className={`p-6 text-white flex justify-between items-center shadow-md transition-colors ${
          isDark
            ? "bg-gradient-to-r from-purple-700 via-pink-600 to-rose-600"
            : "bg-[#1b3f30]"
        }`}>
          <div>
            <h2 className="text-2xl font-extrabold flex items-center gap-2 tracking-tight">
              👤 User Profile
            </h2>
            <p className={`text-sm opacity-90 font-medium ${isDark ? "text-pink-100" : "text-emerald-100"}`}>
              Signup & Account Information
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-xl font-bold transition-all text-white"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 overflow-y-auto max-h-[80vh]">
          {message && (
            <div className={`mb-6 p-3 rounded-xl text-center text-sm font-semibold border ${
              isDark
                ? "bg-pink-500/10 border-pink-500/30 text-pink-400"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            }`}>
              {message}
            </div>
          )}

          {loadingProfile && (
            <div className={`mb-4 text-center text-xs font-semibold animate-pulse ${
              isDark ? "text-pink-400" : "text-emerald-400"
            }`}>
              🔄 Syncing profile details from database...
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-8 items-start">
            {/* Left Side: Circular Profile Picture & Upload Option */}
            <div className={`md:col-span-1 flex flex-col items-center p-6 rounded-2xl border backdrop-blur-xl shadow-lg text-center ${
              isDark ? "bg-slate-800/80 border-pink-500/20 text-white" : "bg-white/80 border-white/80 text-slate-800"
            }`}>
              <div className="relative group">
                <img
                  src={displayUser.profileImage || profileIcon}
                  alt="Profile"
                  className={`w-36 h-36 rounded-full border-4 shadow-xl object-cover bg-white ${
                    isDark ? "border-pink-500" : "border-[#1b3f30]"
                  }`}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`absolute bottom-1 right-1 text-white p-2.5 rounded-full shadow-lg transition-transform hover:scale-110 ${
                    isDark
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-pink-900/40"
                      : "bg-[#1b3f30] hover:bg-[#143024]"
                  }`}
                  title="Upload / Change Photo"
                >
                  📷
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />

              <h3 className={`mt-4 text-xl font-bold ${isDark ? "text-pink-300" : "text-slate-900"}`}>{displayUser.name}</h3>
              <p className={`text-xs font-medium break-all ${isDark ? "text-slate-400" : "text-slate-500"}`}>{displayUser.email}</p>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={`mt-5 px-4 py-2.5 w-full font-semibold text-xs rounded-xl shadow-md transition-all duration-300 hover:shadow-lg disabled:opacity-50 text-white ${
                  isDark
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-pink-900/30"
                    : "bg-[#1b3f30] hover:bg-[#143024]"
                }`}
              >
                {uploading ? "Uploading..." : "📷 Change Profile Photo"}
              </button>

              {/* Stats badges */}
              <div className={`mt-6 w-full grid grid-cols-2 gap-2 text-center pt-4 border-t ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                <div className={`p-2 rounded-xl ${isDark ? "bg-slate-700/60" : "bg-emerald-50"}`}>
                  <span className={`text-xs ${isDark ? "text-pink-400" : "text-[#1b3f30]"} font-semibold block`}>🪙 Coins</span>
                  <span className="text-lg font-bold text-amber-500">{displayUser.coins ?? 500}</span>
                </div>
                <div className={`p-2 rounded-xl ${isDark ? "bg-slate-700/60" : "bg-emerald-50"}`}>
                  <span className={`text-xs ${isDark ? "text-pink-400" : "text-[#1b3f30]"} font-semibold block`}>🔥 Streak</span>
                  <span className={`text-lg font-bold ${isDark ? "text-pink-400" : "text-[#1b3f30]"}`}>{displayUser.streak ?? 0}d</span>
                </div>
              </div>
            </div>

            {/* Right Side: Complete User Information & Edit Mode */}
            <div className={`md:col-span-2 p-6 rounded-2xl border backdrop-blur-xl shadow-lg ${
              isDark ? "bg-slate-800/80 border-pink-500/20 text-white" : "bg-white/80 border-white/80 text-slate-800"
            }`}>
              <div className={`flex justify-between items-center mb-4 pb-2 border-b ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                <h4 className={`text-lg font-bold flex items-center gap-2 ${isDark ? "text-pink-200" : "text-slate-900"}`}>
                  📋 Account Information
                </h4>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-3.5 py-1.5 font-bold text-xs rounded-lg transition-all ${
                    isDark
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-sm shadow-pink-900/30"
                      : "bg-emerald-50 text-[#1b3f30] border border-[#1b3f30]/20 hover:bg-emerald-100"
                  }`}
                >
                  {isEditing ? "❌ Cancel Edit" : "✏️ Edit Profile"}
                </button>
              </div>

              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {fieldConfigs.map((field) => (
                      <div key={field.name} className="flex flex-col">
                        <label className={`text-xs font-semibold mb-1 flex items-center gap-1 ${isDark ? "text-pink-300" : "text-slate-600"}`}>
                          <span>{field.icon}</span>
                          <span>{field.label}</span>
                          {field.locked && (
                            <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                              🔒 Non-editable
                            </span>
                          )}
                        </label>
                        {field.locked ? (
                          <input
                            type="text"
                            value={field.value || ""}
                            disabled
                            className={`p-2.5 text-xs font-semibold border rounded-xl cursor-not-allowed ${
                              isDark ? "bg-slate-900/60 border-slate-700 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-500"
                            }`}
                          />
                        ) : (
                          <input
                            type="text"
                            value={formData[field.name] || ""}
                            onChange={(e) =>
                              setFormData({ ...formData, [field.name]: e.target.value })
                            }
                            placeholder={`Enter ${field.label}`}
                            className={`p-2.5 text-xs font-semibold border rounded-xl focus:ring-2 focus:outline-none ${
                              isDark
                                ? "bg-slate-900 border-pink-500/30 text-white placeholder-slate-400 focus:ring-pink-500"
                                : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-[#1b3f30]"
                            }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
                        isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-200 text-slate-800 hover:bg-slate-300"
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className={`px-6 py-2 font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 text-white ${
                        isDark
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-pink-900/30"
                          : "bg-[#1b3f30] hover:bg-[#143024]"
                      }`}
                    >
                      {savingProfile ? "Saving..." : "💾 Save Changes"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {fieldConfigs.map((item) => {
                    const rawVal = item.locked ? item.value : displayUser[item.name];
                    const val = rawVal || "Not specified";
                    return (
                      <div key={item.name} className={`p-3.5 rounded-xl border transition ${
                        isDark
                          ? "bg-slate-800/60 border-pink-500/15 text-white"
                          : "bg-white/90 border-slate-100 text-slate-800 shadow-sm"
                      }`}>
                        <div className={`flex items-center gap-2 text-xs font-semibold mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                          {item.locked && <span className="text-[10px] text-amber-500 font-bold">🔒</span>}
                        </div>
                        <div className={`text-sm font-bold truncate ${
                          val === "Not specified"
                            ? isDark ? "text-slate-500 font-normal italic" : "text-slate-400 font-normal italic"
                            : isDark ? "text-slate-100" : "text-slate-900"
                        }`}>
                          {val}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
