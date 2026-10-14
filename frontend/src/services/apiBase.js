// Returns the base URL for all API calls.
// In development: empty string (Vite proxy handles /api -> localhost:6000)
// In production: the deployed Render backend URL from env var
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// Streamlit Dashboard URL:
// In development (localhost): http://localhost:8501
// In production: Deployed Streamlit Cloud URL
export const STREAMLIT_URL =
  import.meta.env.VITE_STREAMLIT_URL ||
  (typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:8501"
    : "https://studybuddy4-zak4c3ibjknae5vhjfpkjh.streamlit.app");

export default API_BASE;

