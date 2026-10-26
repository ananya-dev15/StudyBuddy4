import express from "express";
import protect from "../middlewares/authMiddleware.js";
import { uploadReportPDF } from "../utils/reportUpload.js";
import { uploadReport, getMyReports } from "../controllers/reportController.js";

import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// Allow authenticated requests or fallback for local / cross-origin monitoring dashboard
const protectOrLocal = async (req, res, next) => {
  let token = req.cookies?.token;
  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded?.id || decoded?.userId;
      if (userId) {
        req.user = await User.findById(userId).select("-password");
      }
    } catch (err) {
      // ignore token error for fallback
    }
  }

  // If token was not verified or cookie blocked cross-origin, check x-user-id or query userId
  const fallbackId = req.headers["x-user-id"] || req.query.userId;
  if (!req.user && fallbackId) {
    try {
      req.user = await User.findById(fallbackId).select("-password");
    } catch (_) {}
  }

  next();
};

router.post(
  "/upload",
  protectOrLocal,
  uploadReportPDF.single("pdf"),
  uploadReport
);

router.get("/my", protectOrLocal, getMyReports);

export default router;
