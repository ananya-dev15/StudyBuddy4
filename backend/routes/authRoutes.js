import express from "express";
import { signup, login, logout, verifyEmail, resendVerification, googleLogin, getUserProfile, updateProfilePhoto, updateProfile } from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/google-login", googleLogin);
router.get("/profile", getUserProfile);
router.post("/update-profile-photo", updateProfilePhoto);
router.post("/update-profile", updateProfile);

export default router;
