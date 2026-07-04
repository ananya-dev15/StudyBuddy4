import express from "express";
import protect from "../middlewares/authMiddleware.js";
import { uploadReportPDF } from "../utils/reportUpload.js";
import { uploadReport, getMyReports } from "../controllers/reportController.js";

const router = express.Router();

router.post(
  "/upload",
  protect,
  uploadReportPDF.single("pdf"),
  uploadReport
);

router.get("/my", protect, getMyReports);

export default router;
