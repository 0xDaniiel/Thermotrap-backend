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

export const assignUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { userId, formId } = req.body;

  try {
    // Check if the user and form exist
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    const formExists = await prisma.form.findUnique({ where: { id: formId } });

    if (!userExists || !formExists) {
      res.status(404).json({ error: "User or Form not found" });
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.assignedForm.findUnique({
      where: { userId_formId: { userId, formId } },
    });

    if (existingAssignment) {
      res.status(400).json({ error: "User already assigned to this form" });
    }

    // Assign user to form
    const assignedForm = await prisma.assignedForm.create({
      data: { userId, formId },
    });

    res
      .status(201)
      .json({ message: "User assigned successfully", assignedForm });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAssignedUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
  } catch (error) {}
};
