import { Request, Response } from "express";

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

export const createUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log('Request body:', req.body);
    console.log('Content-Type:', req.headers['content-type']);
    const { name, email, password, activationCode } = req.body;
    console.log('Extracted values:', {name, email, password, activationCode });

    if (!name || !email || !password || !activationCode) {
      console.log('Missing fields:', { 
        hasName: !!name,
        hasEmail: !!email, 
        hasPassword: !!password, 
        hasActivationCode: !!activationCode 
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

    res.status(201).json({
      message: "User created successfully",
      user: { id: newUser.id, email: newUser.email, name:newUser.name },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
