import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    authorImage: { type: String, default: "" },
    excerpt: { type: String, required: true, trim: true },
    fullContent: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("Blog", blogSchema);
