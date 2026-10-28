import express from "express";
import { addReminder, getReminders, updateReminder, toggleReminderStatus, deleteReminder } from "../controllers/taskControllers.js";
import protect from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/add", protect, addReminder);
router.get("/list", protect, getReminders);
router.put("/:id", protect, updateReminder);
router.patch("/:id", protect, updateReminder);
router.patch("/:id/status", protect, toggleReminderStatus);
router.delete("/:id", protect, deleteReminder);

export default router;
