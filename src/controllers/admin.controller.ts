import { Request, Response } from "express";
import nodemailer from "nodemailer";
import { prisma } from "../config/prisma";

import crypto from "crypto";

import bcrypt from "bcryptjs";

const generateRandomCode = (): string => {
  return crypto.randomBytes(6).toString("hex").toUpperCase();
};

export const generateActivationCode = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const code = generateRandomCode();

    const newCode = await prisma.activationCode.create({
      data: { code },
    });

    res
      .status(201)
      .json({ message: "Activation code generated", code: newCode.code });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send OTP email
const sendUserInforEmail = async (
  email: string,
  name: string,
  activationCode: string,
  password: string
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "User Information",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Please do not share this with any one</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
        <h1>Name : <span>${name}</span></h1>
          <h1>Email : <span>${email}</span></h1>
          <h1>Activation Code : <span>${activationCode}</span></h1>
          <h1>Password : <span>${password}</span></h1>
        </div>
        <p>This OTP will expire in 15 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const createUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("Request body:", req.body);
    console.log("Content-Type:", req.headers["content-type"]);
    const { name, email, password, activationCode } = req.body;
    console.log("Extracted values:", { name, email, password, activationCode });

    if (!name || !email || !password || !activationCode) {
      console.log("Missing fields:", {
        hasName: !!name,
        hasEmail: !!email,
        hasPassword: !!password,
        hasActivationCode: !!activationCode,
      });
      res.status(400).json({
        message: "Name, Email, password, and activation code are required.",
      });
      return;
    }

    // Check if the activation code is valid and not used
    const codeRecord = await prisma.activationCode.findUnique({
      where: { code: activationCode },
    });

    if (!codeRecord || codeRecord.isUsed) {
      res
        .status(400)
        .json({ message: "Invalid or already used activation code." });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ message: "User already exists." });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        isActivated: true, // Since admin creates the account, it's activated
      },
    });

    // Mark activation code as used
    await prisma.activationCode.update({
      where: { code: activationCode },
      data: { isUsed: true, userId: newUser.id },
    });

    await sendUserInforEmail(name, email, password, activationCode);

    res.status(201).json({
      message: "User created successfully",
      user: { id: newUser.id, email: newUser.email, name: newUser.name },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
