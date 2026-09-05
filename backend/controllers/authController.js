import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { sendVerificationEmail } from "../utils/sendEmail.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT token
const generateToken = (userId, res) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  // Store token in cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: true, // Secure in production (must be true for SameSite=None)
    sameSite: "none", // Allowed cross-site cookie
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return token;
};

// ✅ SIGNUP — Create user + send verification email
export const signup = async (req, res) => {
  try {
    const { name, email, password, phone, college, city, state, nation } = req.body;

    if (!name || !email || !password || !phone || !college || !city || !state || !nation) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      // If user exists but is NOT verified, resend the verification email
      if (!userExists.isEmailVerified) {
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        userExists.verificationToken = verificationToken;
        userExists.verificationTokenExpiry = verificationTokenExpiry;
        await userExists.save();

        try {
          await sendVerificationEmail({ email, name: userExists.name, token: verificationToken });
        } catch (emailErr) {
          console.error("❌ Failed to resend verification email:", emailErr);
          return res.status(500).json({ message: "Failed to send verification email. Please try again later." });
        }

        return res.status(400).json({
          message: "This email is already registered but not verified. We've sent a new verification link to your email.",
        });
      }
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // ✅ new user starts with 500 coins
    const user = await User.create({
      ...req.body,
      password: hashedPassword,
      coins: 500,
      videosWatched: 0,
      videosSwitched: 0,
      isEmailVerified: false,
      verificationToken,
      verificationTokenExpiry,
    });

    // Send verification email — MUST succeed
    try {
      await sendVerificationEmail({ email, name, token: verificationToken });
      console.log("✅ Verification email sent to:", email);
    } catch (emailErr) {
      console.error("❌ Failed to send verification email:", emailErr);
      return res.status(500).json({
        message: "Account created but failed to send verification email. Please try resending from the login page.",
      });
    }

    // ⛔ Do NOT generate JWT here — user must verify email first
    res.status(201).json({
      message: "Registration successful! A verification link has been sent to your email. Please verify to log in.",
      needsVerification: true,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ LOGIN — Block unverified users
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Google-only users won't have a password
    if (!user.password) {
      return res.status(400).json({
        message: "This account uses Google sign-in. Please use 'Continue with Google' to log in.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // ⛔ Block unverified users
    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in. Check your inbox for the verification link.",
        needsVerification: true,
        email: user.email,
      });
    }

    // 🔒 No coin reset — preserve existing balance
    const token = generateToken(user._id, res);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        coins: user.coins,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ VERIFY EMAIL
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, message: "No verification token provided." });
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token. Please request a new one.",
      });
    }

    user.isEmailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    res.json({
      success: true,
      message: "Your email address has been successfully verified! You can now log in.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// ✅ RESEND VERIFICATION EMAIL
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "No account found with this email address." });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "This email is already verified." });
    }

    // Generate a new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.verificationToken = verificationToken;
    user.verificationTokenExpiry = verificationTokenExpiry;
    await user.save();

    await sendVerificationEmail({ email, name: user.name, token: verificationToken });

    res.json({ message: "A new verification email has been sent! Please check your inbox." });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ GOOGLE LOGIN / SIGNUP
export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: "Google credential is required." });
    }

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Check if user already exists (by googleId or email)
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      // Existing user — link Google account if not already linked
      if (!user.googleId) {
        user.googleId = googleId;
        user.isEmailVerified = true; // Google emails are verified
        await user.save();
      }
    } else {
      // New user — create account
      user = await User.create({
        name,
        email,
        googleId,
        isEmailVerified: true, // Google emails are pre-verified
        coins: 500,
        videosWatched: 0,
        videosSwitched: 0,
      });
    }

    const token = generateToken(user._id, res);

    res.json({
      message: user.createdAt === user.updatedAt ? "Welcome to StudyBuddy!" : "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        coins: user.coins,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ message: "Google authentication failed.", error: err.message });
  }
};

// ✅ LOGOUT
export const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none"
  });
  res.json({ message: "Logged out successfully" });
};
