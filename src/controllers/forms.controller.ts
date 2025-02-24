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

export const deleteForm = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { formId } = req.params;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    // Check if form exists and belongs to user
    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        userId: userId
      }
    });

    if (!form) {
      res.status(404).json({
        success: false,
        message: "Form not found or you don't have permission to delete it"
      });
      return;
    }

    // Delete form and related data
    await prisma.$transaction([
      // Delete form responses
      prisma.formResponse.deleteMany({
        where: { formId }
      }),
      // Delete form assignments
      prisma.assignedForm.deleteMany({
        where: { formId }
      }),
      // Delete the form itself
      prisma.form.delete({
        where: { id: formId }
      })
    ]);

    res.status(200).json({
      success: true,
      message: "Form deleted successfully"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error deleting form",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const updateForm = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { formId } = req.params;
    const { title, subheading, privacy, blocks } = req.body;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    // Validate privacy enum if provided
    if (privacy && !['PRIVATE', 'PUBLIC', 'READ_ONLY'].includes(privacy)) {
      res.status(400).json({
        success: false,
        message: "Invalid privacy setting. Must be PRIVATE, PUBLIC, or READ_ONLY"
      });
      return;
    }

    // Check if form exists and belongs to user
    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        userId: userId
      }
    });

    if (!form) {
      res.status(404).json({
        success: false,
        message: "Form not found or you don't have permission to update it"
      });
      return;
    }

    // Update form with optional fields
    const updatedForm = await prisma.form.update({
      where: { id: formId },
      data: {
        ...(title && { title }),
        ...(subheading && { subheading }),
        ...(privacy && { privacy: privacy as 'PRIVATE' | 'PUBLIC' | 'READ_ONLY' }),
        ...(blocks && { blocks: JSON.stringify(blocks) }),
      }
    });

    res.status(200).json({
      success: true,
      message: "Form updated successfully",
      form: updatedForm
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error updating form",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Get all forms for authenticated user
export const getUserForms = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const forms = await prisma.form.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      count: forms.length,
      forms
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching user forms",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Get all forms (global)
export const getAllForms = async (req: Request, res: Response): Promise<void> => {
  try {
    const forms = await prisma.form.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      count: forms.length,
      forms
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching all forms",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
