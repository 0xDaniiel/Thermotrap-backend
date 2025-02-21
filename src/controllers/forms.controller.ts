import { Request, Response } from "express";

import { prisma } from "../config/prisma";

export const createForm = (req: Request, res: Response) => {
  try {
    res.status(201).json({ message: "testing ci/cd" });
  } catch (error) {
    res.status(500).json("");
  }
};
