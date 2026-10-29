import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import API_BASE from "../services/apiBase";

export const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("adminToken") || null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalFeedbacks: 0,
    pendingFeedbacks: 0,
    approvedFeedbacks: 0,
    rejectedFeedbacks: 0,
    totalFAQs: 0,
    pendingFAQs: 0,
    publishedFAQs: 0,
    rejectedFAQs: 0,
    unreadNotifications: 0,
    totalNotifications: 0,
  });

  // Verify and fetch current admin profile
  const refreshAdmin = useCallback(async (activeToken = token) => {
    if (!activeToken) {
      setAdmin(null);
      setLoading(false);
      return false;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/me`, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.admin) {
          setAdmin(data.admin);
          setLoading(false);
          return true;
        }
      }

      // If token is invalid or expired
      localStorage.removeItem("adminToken");
      setToken(null);
      setAdmin(null);
      setLoading(false);
      return false;
    } catch (err) {
      console.error("Admin refresh error:", err);
      setLoading(false);
      return false;
    }
  }, [token]);

  // Fetch dashboard stats & notification counts
  const fetchStats = useCallback(async (activeToken = token) => {
    if (!activeToken) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error("Error fetching admin stats:", err);
    }
  }, [token]);

  // On mount: restore session
  useEffect(() => {
    refreshAdmin();
  }, [refreshAdmin]);

  // Periodic stats poll every 30 seconds when authenticated
  useEffect(() => {
    if (!token || !admin) return;
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [token, admin, fetchStats]);

  // Admin Login
  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        throw new Error("Unable to reach backend admin service. Please ensure the backend server is running.");
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid admin credentials");
      }

      const receivedToken = data.token;
      localStorage.setItem("adminToken", receivedToken);
      setToken(receivedToken);
      setAdmin(data.admin);
      fetchStats(receivedToken);

      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Admin Logout
  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_BASE}/api/admin/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (err) {
      console.error("Logout request error:", err);
    } finally {
      localStorage.removeItem("adminToken");
      setToken(null);
      setAdmin(null);
    }
  };

  const isAuthenticated = !!admin && !!token;

  return (
    <AdminContext.Provider
      value={{
        admin,
        token,
        loading,
        isAuthenticated,
        stats,
        login,
        logout,
        refreshAdmin,
        fetchStats,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};

export default AdminContext;

