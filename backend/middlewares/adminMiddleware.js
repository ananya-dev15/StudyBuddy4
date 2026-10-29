import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

const protectAdmin = async (req, res, next) => {
  try {
    let token = req.cookies?.adminToken || req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Admin authorization token missing.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id || decoded?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Admin credentials required.",
      });
    }

    const admin = await Admin.findById(decoded.id).select("-password");
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Admin account not found or deactivated.",
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error("Admin auth middleware error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Session expired or invalid admin token. Please log in again.",
    });
  }
};

export default protectAdmin;

