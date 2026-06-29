// Returns the base URL for all API calls.
// In development: empty string (Vite proxy handles /api -> localhost:6000)
// In production: the deployed Render backend URL from env var
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export default API_BASE;
