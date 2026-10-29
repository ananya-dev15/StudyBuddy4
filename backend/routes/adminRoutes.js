import express from "express";
import protectAdmin from "../middlewares/adminMiddleware.js";
import {
  adminLogin,
  adminLogout,
  getAdminMe,
  getDashboardStats,
  getAdminFeedbacks,
  approveFeedback,
  rejectFeedback,
  deleteFeedback,
  getAdminFAQs,
  answerAndPublishFAQ,
  editPublishedFAQ,
  rejectFAQ,
  deleteFAQ,
  getAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "../controllers/adminController.js";

const router = express.Router();

// Public Admin Auth Routes
router.post("/login", adminLogin);
router.post("/logout", adminLogout);

// Protected Admin Routes
router.use(protectAdmin);

router.get("/me", getAdminMe);
router.get("/stats", getDashboardStats);

// Feedback verification & management (supports both /feedback and /feedbacks, PUT & PATCH)
router.get("/feedbacks", getAdminFeedbacks);
router.get("/feedback", getAdminFeedbacks);

router.put("/feedbacks/:id/approve", approveFeedback);
router.patch("/feedbacks/:id/approve", approveFeedback);
router.put("/feedback/:id/approve", approveFeedback);
router.patch("/feedback/:id/approve", approveFeedback);

router.put("/feedbacks/:id/reject", rejectFeedback);
router.patch("/feedbacks/:id/reject", rejectFeedback);
router.put("/feedback/:id/reject", rejectFeedback);
router.patch("/feedback/:id/reject", rejectFeedback);

router.delete("/feedbacks/:id", deleteFeedback);
router.delete("/feedback/:id", deleteFeedback);

// FAQ question & answer management (supports PUT & PATCH, /faqs and /faq)
router.get("/faqs", getAdminFAQs);
router.get("/faq", getAdminFAQs);

router.put("/faqs/:id/answer", answerAndPublishFAQ);
router.patch("/faqs/:id/answer", answerAndPublishFAQ);
router.put("/faq/:id/answer", answerAndPublishFAQ);
router.patch("/faq/:id/answer", answerAndPublishFAQ);

router.put("/faqs/:id/edit", editPublishedFAQ);
router.patch("/faqs/:id/edit", editPublishedFAQ);
router.put("/faq/:id/edit", editPublishedFAQ);
router.patch("/faq/:id/edit", editPublishedFAQ);

router.put("/faqs/:id/reject", rejectFAQ);
router.patch("/faqs/:id/reject", rejectFAQ);
router.put("/faq/:id/reject", rejectFAQ);
router.patch("/faq/:id/reject", rejectFAQ);

router.delete("/faqs/:id", deleteFAQ);
router.delete("/faq/:id", deleteFAQ);

// Notification management (supports PUT & PATCH)
router.get("/notifications", getAdminNotifications);

router.put("/notifications/mark-all-read", markAllNotificationsRead);
router.patch("/notifications/mark-all-read", markAllNotificationsRead);
router.put("/notifications/read-all", markAllNotificationsRead);
router.patch("/notifications/read-all", markAllNotificationsRead);

router.put("/notifications/:id/read", markNotificationRead);
router.patch("/notifications/:id/read", markNotificationRead);

router.delete("/notifications/:id", deleteNotification);

export default router;
