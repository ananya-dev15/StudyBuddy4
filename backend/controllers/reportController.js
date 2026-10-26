import Report from "../models/Report.js";
import User from "../models/User.js";

export const uploadReport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "PDF not received" });
    }

    let userId = req.user?._id || req.user?.id || req.body.userId || req.headers["x-user-id"];
    if (!userId) {
      // Find the most recently active user for local monitoring service fallback
      const latestUser = await User.findOne().sort({ updatedAt: -1 });
      if (latestUser) {
        userId = latestUser._id;
      }
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const fileUrl = `/uploads/reports/${req.file.filename}`;
    const report = await Report.create({
      userId,
      title: req.body.title || "StudyBuddy Monitoring Report",
      fileUrl,
    });

    const reportObj = report.toObject();
    reportObj.pdfUrl = fileUrl;

    res.json({ success: true, report: reportObj });
  } catch (err) {
    console.error("❌ DB ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyReports = async (req, res) => {
  try {
    let userId = req.user?._id || req.user?.id || req.query.userId || req.headers["x-user-id"];
    if (!userId) {
      const latestUser = await User.findOne().sort({ updatedAt: -1 });
      if (latestUser) {
        userId = latestUser._id;
      }
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const rawReports = await Report.find({
      $or: [{ userId }, { userId: String(userId) }],
    }).sort({ createdAt: -1 });

    const reports = rawReports.map((r) => {
      const obj = r.toObject();
      obj.pdfUrl = obj.fileUrl;
      return obj;
    });

    res.json({ success: true, reports });
  } catch (err) {
    console.error("❌ Error fetching reports:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
