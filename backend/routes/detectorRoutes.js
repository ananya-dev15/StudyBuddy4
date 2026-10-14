import express from "express";
import protect from "../middlewares/authMiddleware.js";
import { saveDetection } from "../controllers/detectorController.js";

const router = express.Router();

// POST: /api/detections/save
router.post("/save", protect, saveDetection);

// POST: /api/detector/start
router.post("/start", async (req, res) => {
  try {
    const response = await fetch("http://localhost:5001/start", { method: "POST" });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST: /api/detector/stop
router.post("/stop", async (req, res) => {
  try {
    const response = await fetch("http://localhost:5001/stop", { method: "POST" });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET: /api/detector/status
router.get("/status", async (req, res) => {
  try {
    const response = await fetch("http://localhost:5001/status");
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.json({ active: false, error: err.message });
  }
});

export default router;
