import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";

const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAdmin();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-400">Verifying Admin Credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login?role=admin" state={{ from: location }} replace />;
  }

  return children;
};

export default AdminProtectedRoute;

