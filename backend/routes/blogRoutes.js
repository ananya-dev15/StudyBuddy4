import express from "express";
import { getAllBlogs, getUserBlogCount, createBlog } from "../controllers/blogController.js";
import protect from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/all", getAllBlogs);
router.get("/user-count", protect, getUserBlogCount);
router.post("/create", protect, createBlog);

export default router;
