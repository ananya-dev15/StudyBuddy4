import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import VideoTracker from "./components/VideoTracker";
import RemindersPanel from "./components/RemindersPanel"; // ✅ yaha import karo
import ChatBot from "./components/ChatBot";
import AssignmentCard from "./components/AssignmentCard";
import Blog from "./components/blogs";
import AuthModal from "./components/AuthModal";
import Leaderboard from "./components/Leaderboard";
import Analytics from "./components/Analytics";
import Contact from "./components/contact";
import VerifyEmail from "./pages/VerifyEmail";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/videos" element={<VideoTracker />} />
          <Route path="/chatbot" element={<ChatBot />} />
          <Route path="/reminders" element={<RemindersPanel />} /> {/* ✅ route */}
          <Route path="/assignments" element={<AssignmentCard/>} />
          <Route path="/blogs" element={<Blog />} />
          <Route path="/authmodal" element={<AuthModal />} />
          <Route path="/leaderboard" element={<Leaderboard/>} />
          <Route path="/analytics" element={<Analytics/>} />
          <Route path="/contact" element={<Contact/>} />
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
