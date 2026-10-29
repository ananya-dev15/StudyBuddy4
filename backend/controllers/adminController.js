import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import Feedback from "../models/Feedback.js";
import FAQ from "../models/FAQ.js";
import Notification from "../models/Notification.js";

// Helper: Sign Admin JWT
const signAdminToken = (admin, res) => {
  const token = jwt.sign(
    { id: admin._id, role: admin.role, email: admin.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie("adminToken", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return token;
};

// ==========================================
// 1. ADMIN AUTHENTICATION
// ==========================================

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials.",
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials.",
      });
    }

    const token = signAdminToken(admin, res);

    return res.status(200).json({
      success: true,
      message: "Admin login successful.",
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during admin login.",
    });
  }
};

export const adminLogout = async (req, res) => {
  try {
    res.clearCookie("adminToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    return res.status(200).json({
      success: true,
      message: "Admin logged out successfully.",
    });
  } catch (error) {
    console.error("Admin logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during admin logout.",
    });
  }
};

export const getAdminMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      admin: {
        id: req.admin._id,
        email: req.admin.email,
        name: req.admin.name,
        role: req.admin.role,
      },
    });
  } catch (error) {
    console.error("Admin me error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve admin details.",
    });
  }
};

// ==========================================
// 2. DASHBOARD STATISTICS
// ==========================================

export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalFeedbacks,
      pendingFeedbacks,
      approvedFeedbacks,
      rejectedFeedbacks,
      totalFAQs,
      pendingFAQs,
      publishedFAQs,
      rejectedFAQs,
      unreadNotifications,
      totalNotifications,
    ] = await Promise.all([
      Feedback.countDocuments(),
      Feedback.countDocuments({ status: "pending" }),
      Feedback.countDocuments({ status: "approved" }),
      Feedback.countDocuments({ status: "rejected" }),
      FAQ.countDocuments(),
      FAQ.countDocuments({ status: "pending" }),
      FAQ.countDocuments({ status: "answered" }),
      FAQ.countDocuments({ status: "rejected" }),
      Notification.countDocuments({ isRead: false }),
      Notification.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalFeedbacks,
        pendingFeedbacks,
        approvedFeedbacks,
        rejectedFeedbacks,
        totalFAQs,
        pendingFAQs,
        publishedFAQs,
        rejectedFAQs,
        unreadNotifications,
        totalNotifications,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to compute dashboard statistics.",
    });
  }
};

// ==========================================
// 3. FEEDBACK MANAGEMENT
// ==========================================

export const getAdminFeedbacks = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      query.status = status;
    }

    const feedbacks = await Feedback.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: feedbacks.length,
      feedbacks,
    });
  } catch (error) {
    console.error("Admin get feedbacks error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch feedbacks.",
    });
  }
};

export const approveFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const feedback = await Feedback.findById(id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback record not found.",
      });
    }

    feedback.status = "approved";
    await feedback.save();

    // Mark related notification as read
    await Notification.updateMany({ relatedRecordId: feedback._id }, { isRead: true });

    return res.status(200).json({
      success: true,
      message: "Feedback approved and published to roadmap!",
      feedback,
    });
  } catch (error) {
    console.error("Approve feedback error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to approve feedback.",
    });
  }
};

export const rejectFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const feedback = await Feedback.findById(id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback record not found.",
      });
    }

    feedback.status = "rejected";
    await feedback.save();

    // Mark related notification as read
    await Notification.updateMany({ relatedRecordId: feedback._id }, { isRead: true });

    return res.status(200).json({
      success: true,
      message: "Feedback has been rejected.",
      feedback,
    });
  } catch (error) {
    console.error("Reject feedback error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject feedback.",
    });
  }
};

export const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Feedback.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Feedback record not found.",
      });
    }

    // Permanently remove related notifications
    await Notification.deleteMany({ relatedRecordId: id });

    return res.status(200).json({
      success: true,
      message: "Feedback permanently deleted from database and roadmap.",
    });
  } catch (error) {
    console.error("Delete feedback error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to permanently delete feedback.",
    });
  }
};

// ==========================================
// 4. FAQ MANAGEMENT
// ==========================================

export const getAdminFAQs = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status && ["pending", "answered", "rejected"].includes(status)) {
      query.status = status;
    }

    const faqs = await FAQ.find(query).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      count: faqs.length,
      faqs,
    });
  } catch (error) {
    console.error("Admin get FAQs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch FAQ questions.",
    });
  }
};

export const answerAndPublishFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const { answer } = req.body;

    if (!answer || !answer.trim()) {
      return res.status(400).json({
        success: false,
        message: "Answer content cannot be empty.",
      });
    }

    const faq = await FAQ.findById(id);
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ question not found.",
      });
    }

    faq.answer = answer.trim();
    faq.status = "answered";
    faq.answeredAt = new Date();
    faq.answeredBy = req.admin._id;
    await faq.save();

    // Mark related notification as read
    await Notification.updateMany({ relatedRecordId: faq._id }, { isRead: true });

    return res.status(200).json({
      success: true,
      message: "Answer published to public FAQ section successfully!",
      faq,
    });
  } catch (error) {
    console.error("Answer FAQ error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to answer FAQ.",
    });
  }
};

export const editPublishedFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer } = req.body;

    const faq = await FAQ.findById(id);
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found.",
      });
    }

    if (question && question.trim()) faq.question = question.trim();
    if (answer && answer.trim()) faq.answer = answer.trim();
    await faq.save();

    return res.status(200).json({
      success: true,
      message: "Published FAQ updated successfully!",
      faq,
    });
  } catch (error) {
    console.error("Edit FAQ error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to edit FAQ.",
    });
  }
};

export const rejectFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const faq = await FAQ.findById(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found.",
      });
    }

    faq.status = "rejected";
    await faq.save();

    await Notification.updateMany({ relatedRecordId: faq._id }, { isRead: true });

    return res.status(200).json({
      success: true,
      message: "Question rejected.",
      faq,
    });
  } catch (error) {
    console.error("Reject FAQ error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject FAQ.",
    });
  }
};

export const deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await FAQ.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found.",
      });
    }

    // Permanently remove related notifications
    await Notification.deleteMany({ relatedRecordId: id });

    return res.status(200).json({
      success: true,
      message: "FAQ permanently deleted from database and website.",
    });
  } catch (error) {
    console.error("Delete FAQ error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to permanently delete FAQ.",
    });
  }
};

// ==========================================
// 5. NOTIFICATION MANAGEMENT
// ==========================================

export const getAdminNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();

    const unreadCount = await Notification.countDocuments({ isRead: false });

    return res.status(200).json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications.",
    });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update notification.",
    });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read.",
    });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: "Notification deleted.",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete notification.",
    });
  }
};

