import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, default: "Student", trim: true },
    milestone: { type: String, required: true, trim: true },
    review: { type: String, required: true, trim: true },
    stars: { type: Number, default: 5, min: 1, max: 5 },
    avatar: { type: String, default: "" },
    color: { type: String, default: "#6366f1" },
    badge: { type: String, default: "" },
    tag: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Feedback", feedbackSchema);
