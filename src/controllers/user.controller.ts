import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

// Email configuration
export const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = async (email: string, otp: string) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You have requested to reset your password. Use the following OTP to proceed:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
          ${otp}
        </div>
        <p>This OTP will expire in 15 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({ message: "User fetched successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: "Email is required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.passwordReset.upsert({
      where: { userId: user.id },
      update: { otp, otpExpiry },
      create: { userId: user.id, otp, otpExpiry }
    });

    await sendOTPEmail(email, otp);

    res.status(200).json({ 
      message: "OTP sent to your email",
      userId: user.id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, otp, newPassword } = req.body;

    if (!userId || !otp || !newPassword) {
      res.status(400).json({ message: "All fields are required" });
      return;
    }

    const passwordReset = await prisma.passwordReset.findFirst({
      where: { 
        userId,
        otp,
        otpExpiry: { gt: new Date() }
      }
    });

    if (!passwordReset) {
      res.status(400).json({ message: "Invalid or expired OTP" });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    await prisma.passwordReset.delete({
      where: { userId }
    });

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
