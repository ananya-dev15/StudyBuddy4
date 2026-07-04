import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

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

// ✅ SIGNUP — Give 50 coins only to new users
export const signup = async (req, res) => {
  try {
    const { name, email, password, phone, college, city, state, nation } = req.body;

    if (!name || !email || !password || !phone || !college || !city || !state || !nation) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ new user starts with 50 coins
    const user = await User.create({
      ...req.body,
      password: hashedPassword,
      coins: 500,
      videosWatched: 0,
      videosSwitched: 0,
    });

    const token = generateToken(user._id, res);

    res.status(201).json({
      message: "User registered successfully with 50 coins",
      token,
      user: { id: user._id, name: user.name, email: user.email, coins: user.coins },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ LOGIN — Just log the user in, don’t change coins
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // 🔒 No coin reset — preserve existing balance
    const token = generateToken(user._id, res);

    res.json({
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email, coins: user.coins },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
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
