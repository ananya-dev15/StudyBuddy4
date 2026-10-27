// backend/server.js
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { fileURLToPath } from "url";
import path from "path";
import { spawn } from "child_process";

// Route imports
import authRoutes from "./routes/authRoutes.js";
import trackingRoutes from "./routes/trackingRoutes.js";
import detectorRoutes from "./routes/detectorRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import userTaskRoutes from "./routes/userTaskRoutes.js";
import assignmentRoutes from "./routes/assignmentRoutes.js";
import youtubeRoutes from "./routes/youtubeRoutes.js";
import hackathonRoutes from "./routes/hackathonRoutes.js";
import reminderRoutes from "./routes/reminderRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";

import connectDB from "./config/db.js";

// Initialize environment variables
dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================================================
// Auto-launch Python processes (OpenCV + Streamlit Dashboard)
// ========================================================
const detectorDir = path.join(__dirname, "detector");
const venvPython = path.join(detectorDir, "venv", "bin", "python");
const systemStreamlit = "/Users/ananya/Library/Python/3.9/bin/streamlit";

const childProcesses = [];

function launchPythonProcesses() {
  // 1) Launch stream_server.py (Flask — OpenCV face monitor on port 5001)
  const streamServer = spawn(venvPython, ["stream_server.py"], {
    cwd: detectorDir,
    stdio: ["ignore", "pipe", "pipe"],
  });

  streamServer.stdout.on("data", (data) => {
    console.log(`📹 [StreamServer] ${data.toString().trim()}`);
  });
  streamServer.stderr.on("data", (data) => {
    const msg = data.toString().trim();
    // Flask prints info to stderr, so only show non-empty lines
    if (msg) console.log(`📹 [StreamServer] ${msg}`);
  });
  streamServer.on("close", (code) => {
    console.log(`📹 [StreamServer] exited with code ${code}`);
  });
  streamServer.on("error", (err) => {
    console.error(`📹 [StreamServer] Failed to start: ${err.message}`);
  });

  childProcesses.push(streamServer);
  console.log("📹 Stream Server (OpenCV + Flask) launching on http://localhost:5001");

  // 2) Launch Streamlit dashboard (port 8501)
  const dashboard = spawn(
    systemStreamlit,
    [
      "run",
      "dashboard.py",
      "--server.headless",
      "true",
      "--server.port",
      "8501",
      "--server.enableCORS",
      "false",
      "--server.enableXsrfProtection",
      "false",
    ],
    {
      cwd: detectorDir,
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  dashboard.stdout.on("data", (data) => {
    console.log(`📊 [Dashboard] ${data.toString().trim()}`);
  });
  dashboard.stderr.on("data", (data) => {
    const msg = data.toString().trim();
    if (msg) console.log(`📊 [Dashboard] ${msg}`);
  });
  dashboard.on("close", (code) => {
    console.log(`📊 [Dashboard] exited with code ${code}`);
  });
  dashboard.on("error", (err) => {
    console.error(`📊 [Dashboard] Failed to start: ${err.message}`);
  });

  childProcesses.push(dashboard);
  console.log("📊 Streamlit Dashboard launching on http://localhost:8501");
}

// Cleanup: kill child processes when Node exits
function cleanupChildren() {
  childProcesses.forEach((child) => {
    if (child && !child.killed) {
      child.kill("SIGTERM");
    }
  });
}

process.on("exit", cleanupChildren);
process.on("SIGINT", () => { cleanupChildren(); process.exit(0); });
process.on("SIGTERM", () => { cleanupChildren(); process.exit(0); });

// CORS configuration
const allowedOrigins = ["http://localhost:5173", "http://localhost:5174", process.env.FRONTEND_URL].filter(Boolean);

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Static uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// API routes
app.use("/api/tracking", trackingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/detector", detectorRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/user-tasks", userTaskRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/youtube", youtubeRoutes);
app.use("/api/hackathons", hackathonRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/blogs", blogRoutes);

// Start server
const PORT = process.env.PORT || 6000;
const startServer = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB Connected");
    httpServer.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      // Auto-launch Python processes after server is ready
      launchPythonProcesses();
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
};

startServer();