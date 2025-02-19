import { Request, Response } from "express";

import { prisma } from "../config/prisma";

export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({ message: "User fetched successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
