import React, { useEffect, useRef, useState } from "react";
import profileIcon from "../assets/profile_icon.png";
import API_BASE from "../services/apiBase";

export default function UserProfileModal({ isOpen, onClose, user, onUpdateUser }) {
  const fileInputRef = useRef(null);
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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-3xl shadow-2xl border border-white/40 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 p-6 text-white flex justify-between items-center shadow-md">
          <div>
            <h2 className="text-2xl font-extrabold flex items-center gap-2 tracking-tight">
              👤 User Profile
            </h2>
            <p className="text-sm opacity-90 font-medium">Signup & Account Information</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xl font-bold transition-all text-white"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 overflow-y-auto max-h-[80vh]">
          {message && (
            <div className="mb-6 p-3 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-center text-sm font-semibold">
              {message}
            </div>
          )}

          {loadingProfile && (
            <div className="mb-4 text-center text-xs text-indigo-600 font-semibold animate-pulse">
              🔄 Syncing profile details from database...
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-8 items-start">
            {/* Left Side: Circular Profile Picture & Upload Option */}
            <div className="md:col-span-1 flex flex-col items-center bg-white/60 backdrop-blur-lg p-6 rounded-2xl border border-white/60 shadow-lg text-center">
              <div className="relative group">
                <img
                  src={displayUser.profileImage || profileIcon}
                  alt="Profile"
                  className="w-36 h-36 rounded-full border-4 border-indigo-600 shadow-xl object-cover bg-white"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-full shadow-lg transition-transform hover:scale-110"
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

              <h3 className="mt-4 text-xl font-bold text-gray-900">{displayUser.name}</h3>
              <p className="text-xs text-gray-500 font-medium break-all">{displayUser.email}</p>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-5 px-4 py-2.5 w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all duration-300 hover:shadow-lg disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "📷 Change Profile Photo"}
              </button>

              {/* Stats badges */}
              <div className="mt-6 w-full grid grid-cols-2 gap-2 text-center pt-4 border-t border-gray-200/80">
                <div className="bg-indigo-50 p-2 rounded-xl">
                  <span className="text-xs text-indigo-600 font-semibold block">🪙 Coins</span>
                  <span className="text-lg font-bold text-indigo-900">{displayUser.coins ?? 500}</span>
                </div>
                <div className="bg-pink-50 p-2 rounded-xl">
                  <span className="text-xs text-pink-600 font-semibold block">🔥 Streak</span>
                  <span className="text-lg font-bold text-pink-900">{displayUser.streak ?? 0}d</span>
                </div>
              </div>
            </div>

            {/* Right Side: Complete User Information & Edit Mode */}
            <div className="md:col-span-2 bg-white/60 backdrop-blur-lg p-6 rounded-2xl border border-white/60 shadow-lg">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200/80">
                <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  📋 Account Information
                </h4>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-3.5 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold text-xs rounded-lg transition-all"
                >
                  {isEditing ? "❌ Cancel Edit" : "✏️ Edit Profile"}
                </button>
              </div>

              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {fieldConfigs.map((field) => (
                      <div key={field.name} className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                          <span>{field.icon}</span>
                          <span>{field.label}</span>
                          {field.locked && (
                            <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                              🔒 Non-editable
                            </span>
                          )}
                        </label>
                        {field.locked ? (
                          <input
                            type="text"
                            value={field.value || ""}
                            disabled
                            className="p-2.5 text-xs font-semibold border border-gray-200 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed"
                          />
                        ) : (
                          <input
                            type="text"
                            value={formData[field.name] || ""}
                            onChange={(e) =>
                              setFormData({ ...formData, [field.name]: e.target.value })
                            }
                            placeholder={`Enter ${field.label}`}
                            className="p-2.5 text-xs font-semibold border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-gray-900"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
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
                      <div key={item.name} className="bg-white/80 p-3.5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition">
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                          {item.locked && <span className="text-[10px] text-amber-600 font-bold">🔒</span>}
                        </div>
                        <div className={`text-sm font-bold truncate ${val === "Not specified" ? "text-gray-400 font-normal italic" : "text-gray-900"}`}>
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
