import Feedback from "../models/Feedback.js";

// Vibrant milestone colors palette for auto-assignment if none provided
const MILESTONE_COLORS = [
  "#6366f1", // Indigo
  "#0ea5e9", // Sky
  "#8b5cf6", // Purple
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#f43f5e", // Rose
  "#06b6d4", // Cyan
  "#ea580c", // Orange
  "#ec4899", // Pink
  "#14b8a6", // Teal
];

// Fetch all community feedbacks
export const getAllFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: 1 });
    return res.status(200).json({ success: true, feedbacks });
  } catch (error) {
    console.error("Error fetching feedbacks:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch feedbacks." });
  }
};

// Create a new feedback
export const createFeedback = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Authentication required to add feedback." });
    }

    const { milestone, review, stars = 5, role, color } = req.body;

    if (!milestone || !milestone.trim()) {
      return res.status(400).json({ success: false, message: "Milestone title is required." });
    }
    if (!review || !review.trim()) {
      return res.status(400).json({ success: false, message: "Review or feedback text is required." });
    }

    const totalCount = await Feedback.countDocuments();
    const milestoneNumber = 9 + totalCount; // Defaults are 1 to 8, newly added starts at 9
    const formattedBadge = String(milestoneNumber).padStart(2, "0");
    const formattedTag = `Milestone ${milestoneNumber}`;

    const chosenColor =
      color && color.trim()
        ? color.trim()
        : MILESTONE_COLORS[totalCount % MILESTONE_COLORS.length];

    const studentRole =
      (role && role.trim()) ||
      user.course ||
      user.domain ||
      user.className ||
      "Student";

    const feedback = await Feedback.create({
      userId: user._id,
      name: user.name || "Student",
      role: studentRole,
      milestone: milestone.trim(),
      review: review.trim(),
      stars: Math.max(1, Math.min(5, Number(stars) || 5)),
      avatar: user.profileImage || "",
      color: chosenColor,
      badge: formattedBadge,
      tag: formattedTag,
    });

    return res.status(201).json({
      success: true,
      message: "Milestone feedback added successfully!",
      feedback,
    });
  } catch (error) {
    console.error("Error creating feedback:", error);
    return res.status(500).json({ success: false, message: "Failed to create feedback." });
  }
};
