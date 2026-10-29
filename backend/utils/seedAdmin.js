import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";
import Feedback from "../models/Feedback.js";
import FAQ from "../models/FAQ.js";

const DEFAULT_FAQS = [
  {
    question: "Is StudyBuddy free to use?",
    answer: "Yes! StudyBuddy offers a free plan with core features. You can upgrade for advanced analytics and AI tools.",
    status: "answered",
    userName: "System",
    answeredAt: new Date(),
  },
  {
    question: "Can I use it on mobile?",
    answer: "Absolutely. StudyBuddy is fully responsive and works smoothly on all mobile devices and tablets.",
    status: "answered",
    userName: "System",
    answeredAt: new Date(),
  },
  {
    question: "How does streak tracking work?",
    answer: "Each day you log study sessions, your streak grows. Miss a day, and it resets — motivating you to stay consistent.",
    status: "answered",
    userName: "System",
    answeredAt: new Date(),
  },
];

export const seedInitialAdminAndData = async () => {
  try {
    // 1. Seed Admin
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@studybuddy.com").toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@12345";

    const existingAdmin = await Admin.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await Admin.create({
        name: "Super Administrator",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
      });
      console.log(`👑 [Admin Seed] Created default admin account: ${adminEmail}`);
    } else {
      console.log(`👑 [Admin Seed] Admin account already exists: ${adminEmail}`);
    }

    // 2. Migrate existing feedbacks without status to "approved"
    const unversionedFeedbacks = await Feedback.updateMany(
      { status: { $exists: false } },
      { $set: { status: "approved" } }
    );
    if (unversionedFeedbacks.modifiedCount > 0) {
      console.log(`💬 [Feedback Seed] Migrated ${unversionedFeedbacks.modifiedCount} legacy feedback(s) to status='approved'`);
    }

    // 3. Seed initial answered FAQs if collection is empty
    const faqCount = await FAQ.countDocuments();
    if (faqCount === 0) {
      await FAQ.insertMany(DEFAULT_FAQS);
      console.log(`❓ [FAQ Seed] Seeded ${DEFAULT_FAQS.length} initial answered FAQs`);
    }
  } catch (error) {
    console.error("❌ Error in seedInitialAdminAndData:", error);
  }
};

export default seedInitialAdminAndData;

