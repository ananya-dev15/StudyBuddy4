import express from "express";
import { addAssignment, getAssignments, toggleAssignmentStatus, updateAssignment, deleteAssignment } from "../controllers/taskControllers.js";
import protect from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/add", protect, addAssignment);
router.get("/list", protect, getAssignments);
router.put("/:id", protect, updateAssignment);
router.patch("/:id", protect, updateAssignment);
router.patch("/:id/status", protect, toggleAssignmentStatus);
router.delete("/:id", protect, deleteAssignment);

export default router;
