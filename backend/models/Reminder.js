import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User",
    },
    title: {
        type: String,
        required: true,
    },
    time: {
        type: String,
        default: "",
    },
    date: {
        type: String,
        default: "",
    },
    category: {
        type: String,
        default: "Study",
    },
    repeat: {
        type: String,
        default: "One Time",
    },
    status: {
        type: String,
        enum: ["Pending", "Completed"],
        default: "Pending",
    },
}, {
    timestamps: true,
});

const Reminder = mongoose.model("Reminder", reminderSchema);

export default Reminder;
