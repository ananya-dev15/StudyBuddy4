import express from "express";
import { signup, login, logout, verifyEmail, resendVerification, googleLogin } from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/google-login", googleLogin);

export default router;
