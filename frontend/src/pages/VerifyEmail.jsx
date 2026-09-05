import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import API_BASE from "../services/apiBase";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-200 to-pink-100 px-6 py-12">
      <div className="w-full max-w-md bg-white/60 backdrop-blur-lg shadow-2xl rounded-2xl p-8 text-center border border-white/40">
        <h1 className="text-3xl font-extrabold text-indigo-700 mb-6">StudyBuddy</h1>

        {status === "loading" && (
          <div className="space-y-4 py-8">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-700 font-medium">Verifying your email address...</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6 py-4">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold shadow-sm">
              ✓
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Email Verified!</h2>
            <p className="text-gray-600 text-sm">{message}</p>

            <Link
              to="/login"
              className="inline-block w-full py-3 bg-gradient-to-r from-indigo-700 to-pink-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              Go to Login
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6 py-4 text-left">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold mb-4">
                ✕
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Verification Failed</h2>
              <p className="text-gray-600 text-sm mt-2">{message}</p>
            </div>

            <div className="border-t border-gray-300 pt-6 mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Need a new verification link?</h3>
              <form onSubmit={handleResend} className="space-y-3">
                <input
                  type="email"
                  placeholder="Enter your registered email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white/80"
                />
                <button
                  type="submit"
                  disabled={resendLoading}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {resendLoading ? "Sending..." : "Resend Verification Email"}
                </button>
              </form>

              {resendMessage && (
                <p className={`mt-3 text-xs text-center font-medium ${resendSuccess ? "text-green-600" : "text-red-600"}`}>
                  {resendMessage}
                </p>
              )}
            </div>

            <div className="text-center pt-2">
              <Link to="/login" className="text-indigo-700 text-sm font-semibold hover:underline">
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
