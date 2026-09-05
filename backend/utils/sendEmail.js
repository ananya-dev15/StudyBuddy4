import nodemailer from "nodemailer";

const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    return null;
  }
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

export const sendVerificationEmail = async ({ email, name, token }) => {
  const transporter = createTransporter();
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const verifyLink = `${frontendUrl}/verify-email?token=${token}`;

  if (!transporter) {
    console.warn("⚠️ EMAIL_USER or EMAIL_PASSWORD missing in env. Verification email not sent.");
    return false;
  }

  const mailOptions = {
    from: `"StudyBuddy" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify your email address - StudyBuddy",
    text: `Hello ${name || "User"},\n\nPlease verify your email address by clicking the link below:\n${verifyLink}\n\nThis link will expire in 24 hours.\n\nIf you did not create a StudyBuddy account, please ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #4f46e5; margin: 0; font-size: 28px; font-weight: bold;">StudyBuddy</h1>
        </div>
        <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 16px;">Verify Your Email Address</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">Hi ${name || "there"},</p>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">Thank you for registering with StudyBuddy! Please click the button below to verify your email address and activate your account.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verifyLink}" style="background: linear-gradient(135deg, #4f46e5 0%, #db2777 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Verify Email Address</a>
        </div>
        <p style="color: #64748b; font-size: 14px; margin-bottom: 8px;">Or copy and paste this link into your browser:</p>
        <p style="color: #4f46e5; font-size: 14px; word-break: break-all; margin-top: 0;"><a href="${verifyLink}" style="color: #4f46e5;">${verifyLink}</a></p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">This verification link will expire in 24 hours.<br />If you did not sign up for StudyBuddy, you can safely ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  return true;
};
