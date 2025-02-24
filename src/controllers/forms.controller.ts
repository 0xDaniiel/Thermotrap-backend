import { Request, Response } from "express";

import { prisma } from "../config/prisma";
import { form_assignment_email_template, sendUserEmail } from "../lib/email";

// ... existing code ...

export const createForm = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { title, subheading, privacy, blocks, userId } = req.body;

    // Improved input validation
    if (!title?.trim() || !userId?.trim() || !Array.isArray(blocks)) {
      res.status(400).json({
        error: "Invalid input",
        details: {
          title: !title?.trim() ? "Title is required" : null,
          userId: !userId?.trim() ? "User ID is required" : null,
          blocks: !Array.isArray(blocks) ? "Blocks must be an array" : null,
        },
      });
      return;
    }

    const newForm = await prisma.form.create({
      data: {
        title: title.trim(),
        subheading: subheading?.trim() || "",
        privacy,
        userId,
        blocks: JSON.stringify(blocks),
      },
    });

    res
      .status(201)
      .json({ message: "Form created successfully", form: newForm });
  } catch (error) {
    console.error("Error creating form:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
};

export const assignUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { userId, formId } = req.body;

  try {
    // Improved input validation
    if (!userId?.trim() || !formId?.trim()) {
      res.status(400).json({
        error: "Invalid input",
        details: {
          userId: !userId?.trim() ? "User ID is required" : null,
          formId: !formId?.trim() ? "Form ID is required" : null,
        },
      });
      return;
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      const [user, form] = await Promise.all([
        tx.user.findUnique({ where: { id: userId } }),
        tx.form.findUnique({ where: { id: formId } }),
      ]);

      if (!user || !form) {
        throw new Error(!user ? "User not found" : "Form not found");
      }

      const existingAssignment = await tx.assignedForm.findUnique({
        where: { userId_formId: { userId, formId } },
      });

      if (existingAssignment) {
        throw new Error("User already assigned to this form");
      }

      const assignedForm = await tx.assignedForm.create({
        data: { userId, formId },
      });

      await sendUserEmail(
        user.email,
        form_assignment_email_template({
          name: user.name || "",
          formName: form.title,
          formLink: `${process.env.FRONTEND_URL}/form/${form.id}`,
        }),
        "Form Assignment Notification"
      );

      return assignedForm;
    });

    res.status(201).json({
      message: "User assigned successfully",
      assignedForm: result,
    });
  } catch (error) {
    console.error("Error assigning user:", error);
    res
      .status(
        error instanceof Error && error.message.includes("already assigned")
          ? 400
          : 500
      )
      .json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
  }
};

export const getAssignedUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { formId } = req.query;

    if (!formId || typeof formId !== "string") {
      res.status(400).json({ error: "Invalid form ID" });
    }

    const assignedUsers = await prisma.assignedForm.findMany({
      where: { formId: formId as string },
      include: {
        user: true, // Fetch user details
      },
    });

    res.status(200).json(assignedUsers);
  } catch (error) {
    console.error("Error fetching assigned users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
