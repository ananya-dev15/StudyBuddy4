import Blog from "../models/Blog.js";

// Fetch all community/user blogs
export const getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, blogs });
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch blogs." });
  }
};

// Get current user's blog count (to check against 5-blog limit)
export const getUserBlogCount = async (req, res) => {
  try {
    const count = await Blog.countDocuments({ userId: req.user._id });
    const remaining = Math.max(0, 5 - count);
    const limitReached = count >= 5;
    return res.status(200).json({
      success: true,
      count,
      remaining,
      limitReached,
      maxAllowed: 5,
    });
  } catch (error) {
    console.error("Error checking user blog count:", error);
    return res.status(500).json({ success: false, message: "Failed to check blog count." });
  }
};

// Create a new blog post
export const createBlog = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "User not authenticated." });
    }

    // Check 5-blog free limit
    const count = await Blog.countDocuments({ userId: user._id });
    if (count >= 5) {
      return res.status(403).json({
        success: false,
        limitReached: true,
        count,
        message: "You have reached your limit of 5 free blogs. Please upgrade to premium to post more.",
      });
    }

    const { title, excerpt, fullContent } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Blog title is required." });
    }
    if (!fullContent || !fullContent.trim()) {
      return res.status(400).json({ success: false, message: "Blog content is required." });
    }

    const author = user.name || "Student";
    const authorImage = user.profileImage || "";
    const finalExcerpt =
      excerpt && excerpt.trim()
        ? excerpt.trim()
        : fullContent.trim().length > 150
        ? fullContent.trim().slice(0, 150) + "..."
        : fullContent.trim();

    const blog = await Blog.create({
      userId: user._id,
      title: title.trim(),
      author,
      authorImage,
      excerpt: finalExcerpt,
      fullContent: fullContent.trim(),
    });

    const newCount = count + 1;
    return res.status(201).json({
      success: true,
      message: "Blog published successfully!",
      blog,
      count: newCount,
      remaining: Math.max(0, 5 - newCount),
      limitReached: newCount >= 5,
    });
  } catch (error) {
    console.error("Error creating blog:", error);
    return res.status(500).json({ success: false, message: "Failed to publish blog." });
  }
};
