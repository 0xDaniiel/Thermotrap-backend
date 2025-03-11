import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { form_assignment_email_template, sendUserEmail } from "../lib/email";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { Prisma } from "@prisma/client";

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
    const result = await prisma.$transaction(
      async (
        tx: Omit<
          typeof prisma,
          | "$connect"
          | "$disconnect"
          | "$on"
          | "$transaction"
          | "$use"
          | "$extends"
        >
      ) => {
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
      }
    );

    // send notification to user
    const notificationService = req.app.get("notificationService");
    await notificationService.sendNotification(userId, {
      title: "New Form Assignment",
      message: "You have been assigned a new form",
      type: "FORM_ASSIGNED",
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

// Get all forms assigned to a user
export const getUserAssignedForms = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const assignedForms = await prisma.assignedForm.findMany({
      where: {
        userId: userId,
      },
      include: {
        form: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      count: assignedForms.length,
      forms: assignedForms,
    });
  } catch (error) {
    console.error("Error fetching assigned forms:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching assigned forms",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deleteForm = async (
  req: Request,
  res: Response
): Promise<void> => {
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
        userId: userId,
      },
    });

    if (!form) {
      res.status(404).json({
        success: false,
        message: "Form not found or you don't have permission to delete it",
      });
      return;
    }

    // Delete form and related data
    await prisma.$transaction([
      // Delete form responses
      prisma.formResponse.deleteMany({
        where: { formId },
      }),
      // Delete form assignments
      prisma.assignedForm.deleteMany({
        where: { formId },
      }),
      // Delete the form itself
      prisma.form.delete({
        where: { id: formId },
      }),
    ]);

    res.status(200).json({
      success: true,
      message: "Form deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error deleting form",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updateForm = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { formId } = req.params;
    const { title, subheading, privacy, blocks } = req.body;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    // Validate privacy enum if provided
    if (privacy && !["PRIVATE", "PUBLIC", "READ_ONLY"].includes(privacy)) {
      res.status(400).json({
        success: false,
        message:
          "Invalid privacy setting. Must be PRIVATE, PUBLIC, or READ_ONLY",
      });
      return;
    }

    // Check if form exists and belongs to user
    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        userId: userId,
      },
    });

    if (!form) {
      res.status(404).json({
        success: false,
        message: "Form not found or you don't have permission to update it",
      });
      return;
    }

    // Update form with optional fields
    const updatedForm = await prisma.form.update({
      where: { id: formId },
      data: {
        ...(title && { title }),
        ...(subheading && { subheading }),
        ...(privacy && {
          privacy: privacy as "PRIVATE" | "PUBLIC" | "READ_ONLY",
        }),
        ...(blocks && { blocks: JSON.stringify(blocks) }),
      },
    });

    res.status(200).json({
      success: true,
      message: "Form updated successfully",
      form: updatedForm,
    });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        res.status(404).json({
          success: false,
          message: "Form not found",
        });
        return;
      }
    }
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error updating form",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get all forms for authenticated user
export const getUserForms = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const forms = await prisma.form.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      count: forms.length,
      forms,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching user forms",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get all forms (global)
export const getAllForms = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const forms = await prisma.form.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            submission_count: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      count: forms.length,
      forms,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching all forms",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// get single form
export const getSingleForm = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const formId = req.params.formId;
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!form) {
      res.status(404).json({
        success: false,
        message: "Form not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      form,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching form",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Submit form responses
export const submitFormResponse = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { formId } = req.params;
    const { responses } = req.body;
    const userId = req.user?.userId; // Assuming user is attached to request

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    // Check if form exists and get creator info
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: {
        id: true,
        userId: true, // Get form creator's ID
      },
    });

    if (!form) {
      res.status(404).json({
        success: false,
        message: "Form not found",
      });
      return;
    }

    // Get form creator's current submission count
    const formCreator = await prisma.user.findUnique({
      where: { id: form.userId },
      select: { submission_count: true, response_count: true },
    });

    if (!formCreator || formCreator.submission_count <= 0) {
      res.status(403).json({
        success: false,
        message: "Form creator has no remaining submission quota",
      });
      return;
    }

    // Create form response with blocks
    const formResponse = await prisma.formResponse.create({
      data: {
        formId,
        userId,
        responses: JSON.stringify(responses), // Store the full blocks array directly since responses is Json type
      },
    });

    // Decrement submission count and increment response count for form creator
    await prisma.user.update({
      where: { id: form.userId },
      data: {
        submission_count: formCreator.submission_count - 1,
        response_count: (formCreator.response_count || 0) + 1,
      },
    });

    res.status(201).json({
      success: true,
      message: "Form response submitted successfully",
      data: formResponse,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error submitting form response",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getFormResponses = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { formId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const formResponses = await prisma.formResponse.findMany({
      where: { formId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      formResponses,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching form responses",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getIndividualResponse = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { responseId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const formResponse = await prisma.formResponse.findUnique({
      where: { id: responseId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        form: {
          select: {
            title: true,
            subheading: true,
          },
        },
      },
    });

    if (!formResponse) {
      res.status(404).json({
        success: false,
        message: "Form response not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      formResponse,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching individual form response",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// change form status
export const changeFormStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { formId } = req.params;
    const { status } = req.body;

    if (!formId || !status) {
      res.status(400).json({
        success: false,
        message: "Form ID and status are required",
      });
      return;
    }

    const updatedForm = await prisma.form.update({
      where: { id: formId },
      data: { isPublished: status === "published" },
    });

    res.status(200).json({
      success: true,
      message: "Form status updated successfully",
      form: updatedForm,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error updating form status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// update response
export const updateResponse = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { responseId } = req.params;
    const { responses } = req.body;

    if (!responseId || !responses) {
      res.status(400).json({
        success: false,
        message: "Response ID and responses are required",
      });
      return;
    }

    const updatedResponse = await prisma.formResponse.update({
      where: { id: responseId },
      data: { responses },
    });

    res.status(200).json({
      success: true,
      message: "Response updated successfully",
      response: { ...updatedResponse, hello: "hellosndvkndskvj" },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error updating response",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get all submissions by authenticated user
export const getUserSubmissions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const submissions = await prisma.formResponse.findMany({
      where: { userId },
      orderBy: { submittedAt: "desc" },
      include: {
        form: {
          select: {
            id: true,
            title: true,
            subheading: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    console.error("Error fetching user submissions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user submissions",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Toggle form favorite status
export const toggleFormFavorite = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { formId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    // Check if form exists and belongs to user
    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        userId: userId,
      },
    });

    if (!form) {
      res.status(404).json({
        success: false,
        message: "Form not found or you don't have permission to modify it",
      });
      return;
    }

    // Toggle the favourite status
    const updatedForm = await prisma.form.update({
      where: { id: formId },
      data: {
        favourite: !form.favourite,
      },
    });

    res.status(200).json({
      success: true,
      message: `Form ${
        updatedForm.favourite ? "marked as favorite" : "removed from favorites"
      }`,
      form: updatedForm,
    });
  } catch (error) {
    console.error("Error toggling form favorite status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating form favorite status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get all favorite forms for authenticated user
export const getFavoriteForms = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const favoriteForms = await prisma.form.findMany({
      where: {
        userId,
        favourite: true,
      },
      orderBy: { updatedAt: "desc" },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      count: favoriteForms.length,
      forms: favoriteForms,
    });
  } catch (error) {
    console.error("Error fetching favorite forms:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching favorite forms",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Submit multiple form responses
export const submitBulkFormResponses = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { formId } = req.params;
    const { submissions } = req.body; // Array of response objects
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    if (!Array.isArray(submissions) || submissions.length === 0) {
      res.status(400).json({
        success: false,
        message: "Submissions must be a non-empty array",
      });
      return;
    }

    // Validate that each submission has responses
    const invalidSubmissions = submissions.some(
      (submission) => !submission.responses
    );
    if (invalidSubmissions) {
      res.status(400).json({
        success: false,
        message: "Each submission must include responses",
      });
      return;
    }

    // Check if form exists and get creator info
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!form) {
      res.status(404).json({
        success: false,
        message: "Form not found",
      });
      return;
    }

    // Get form creator's current submission count
    const formCreator = await prisma.user.findUnique({
      where: { id: form.userId },
      select: { submission_count: true, response_count: true },
    });

    if (!formCreator || formCreator.submission_count < submissions.length) {
      res.status(403).json({
        success: false,
        message: "Form creator has insufficient submission quota",
      });
      return;
    }

    // Use transaction to ensure all operations succeed or none do
    const result = await prisma.$transaction(async (tx) => {
      // Create all form responses
      const createdResponses = await Promise.all(
        submissions.map((submission) =>
          tx.formResponse.create({
            data: {
              formId,
              userId,
              responses: submission.responses, // Prisma will handle JSON serialization
            },
          })
        )
      );

      // Update form creator's counts
      await tx.user.update({
        where: { id: form.userId },
        data: {
          submission_count: formCreator.submission_count - submissions.length,
          response_count: (formCreator.response_count || 0) + submissions.length,
        },
      });

      // Create notification for bulk submission
      await tx.notification.create({
        data: {
          userId: form.userId,
          type: "FORM_SUBMITTED",
          message: `${submissions.length} new responses submitted to your form`,
          formId: formId,
        },
      });

      return createdResponses;
    });

    res.status(201).json({
      success: true,
      message: "Bulk form responses submitted successfully",
      count: result.length,
      responses: result,
    });
  } catch (error) {
    console.error("Error submitting bulk form responses:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting bulk form responses",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

