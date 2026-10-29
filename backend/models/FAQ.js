import mongoose from "mongoose";

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "answered", "rejected"],
      default: "pending",
      index: true,
    },
    userName: {
      type: String,
      default: "Student",
      trim: true,
    },
    userEmail: {
      type: String,
      default: "",
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    answeredAt: {
      type: Date,
      default: null,
    },
    answeredBy: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("FAQ", faqSchema);
