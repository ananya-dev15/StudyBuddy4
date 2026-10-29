import FAQ from "../models/FAQ.js";
import Notification from "../models/Notification.js";

// User submits a question for FAQ section
export const submitQuestion = async (req, res) => {
  try {
    const { question, name, email } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question text is required.",
      });
    }

    if (question.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "Question must be at least 5 characters long.",
      });
    }

    if (question.trim().length > 600) {
      return res.status(400).json({
        success: false,
        message: "Question is too long (maximum 600 characters).",
      });
    }

    const userName = (name && name.trim()) || req.user?.name || "Student";
    const userEmail = (email && email.trim()) || req.user?.email || "";

    const faq = await FAQ.create({
      question: question.trim(),
      userName,
      userEmail,
      userId: req.user?._id || null,
      status: "pending",
    });

    // Create an Admin Notification
    const preview = faq.question.length > 55 ? faq.question.slice(0, 52) + "..." : faq.question;
    await Notification.create({
      type: "faq",
      title: "New FAQ Question",
      message: `"${preview}" asked by ${userName}`,
      relatedRecordId: faq._id,
      isRead: false,
    });

    return res.status(201).json({
      success: true,
      message: "Your question has been submitted! It will appear here once answered by our team.",
      faq,
    });
  } catch (error) {
    console.error("Submit FAQ question error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit question. Please try again later.",
    });
  }
};

// Fetch only approved/answered FAQs for the public website
export const getPublishedFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.find({ status: "answered" })
      .sort({ answeredAt: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: faqs.length,
      faqs,
    });
  } catch (error) {
    console.error("Get published FAQs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch FAQs.",
    });
  }
};

