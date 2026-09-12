// backend/server.js
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { fileURLToPath } from "url";
import path from "path";

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

import connectDB from "./config/db.js";

// Initialize environment variables
dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Start server
const PORT = process.env.PORT || 6000;
const startServer = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB Connected");
    httpServer.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
};

startServer();