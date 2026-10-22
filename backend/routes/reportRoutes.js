import express from "express";
import protect from "../middlewares/authMiddleware.js";
import { uploadReportPDF } from "../utils/reportUpload.js";
import { uploadReport, getMyReports } from "../controllers/reportController.js";

import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// Allow authenticated requests or fallback for local monitoring dashboard
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
      // ignore token error for local fallback
    }
  }
  next();
};

router.post(
  "/upload",
  protectOrLocal,
  uploadReportPDF.single("pdf"),
  uploadReport
);

router.get("/my", protect, getMyReports);

export default router;
