import mongoose from "mongoose";

const quizAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    videoId: {
      type: String,
      required: true,
    },
    videoTitle: {
      type: String,
      default: "",
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    questionCount: {
      type: Number,
      required: true,
    },
    score: {
      type: Number,
      required: true,
    },
    accuracy: {
      type: Number,
      required: true,
    },
    attemptedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("QuizAttempt", quizAttemptSchema);
