import { Request, Response } from "express";

import { prisma } from "../config/prisma";

export const createForm = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { title, subheading, privacy, blocks, userId } = req.body;

    if (!title || !userId || !blocks || !Array.isArray(blocks)) {
      res.status(400).json({ error: "Missing required fields" });
    }

    // Save form to the database
    const newForm = await prisma.form.create({
      data: {
        title,
        subheading,
        privacy,
        userId, // The creator of the form
        blocks: JSON.stringify(blocks), // Store blocks as JSON
      },
    });

    res
      .status(201)
      .json({ message: "Form created successfully", form: newForm });
  } catch (error) {
    console.error("Error creating form:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
