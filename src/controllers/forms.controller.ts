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

export const deleteMultipleForms = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { formIds } = req.body;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (!Array.isArray(formIds) || formIds.length === 0) {
      res.status(400).json({
        success: false,
        message: "formIds must be a non-empty array",
      });
      return;
    }

    // Check if forms exist and belong to user
    const forms = await prisma.form.findMany({
      where: {
        id: { in: formIds },
        userId: userId,
      },
    });

    if (forms.length === 0) {
      res.status(404).json({
        success: false,
        message: "No forms found or you don't have permission to delete them",
      });
      return;
    }

    // Use transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Delete form responses
      await tx.formResponse.deleteMany({
        where: { formId: { in: formIds } },
      });

      // Delete form assignments
      await tx.assignedForm.deleteMany({
        where: { formId: { in: formIds } },
      });

      // Delete the forms themselves
      await tx.form.deleteMany({
        where: { id: { in: formIds } },
      });
    });

    res.status(200).json({
      success: true,
      message: "Forms deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error deleting forms",
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
    const { responses, responseTitle } = req.body;
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
        responseTitle,
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


export const submitBulkFormResponses = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { formId } = req.params;
    const { submissions } = req.body;

  
    const userId = req.user?.userId;
    const MAX_BATCH_SIZE = 10000; // Maximum allowed batch size

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

    // Check form existence
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { id: true, userId: true },
    });

    if (!form) {
      res.status(404).json({
        success: false,
        message: "Form not found",
      });
      return;
    }

    // Get form creator's quota
    const formCreator = await prisma.user.findUnique({
      where: { id: form.userId },
      select: { submission_count: true, response_count: true },
    });

    if (!formCreator) {
      res.status(404).json({
        success: false,
        message: "Form creator not found",
      });
      return;
    }

    if (formCreator.submission_count <= 0) {
      res.status(403).json({
        success: false,
        message: "Form creator has no remaining submission quota",
      });
      return;
    }

    // Calculate processable submissions considering both quota and batch limits
    const submissionsToProcess = Math.min(
      submissions.length,
      formCreator.submission_count,
      MAX_BATCH_SIZE
    );

    if (submissionsToProcess <= 0) {
      res.status(403).json({
        success: false,
        message: "No submissions can be processed",
      });
      return;
    }

    const submissionsToSave = submissions.slice(0, submissionsToProcess);

    // Execute transaction with increased timeout
    const result = await prisma.$transaction(
      async (tx) => {
        // Bulk create responses
        const createdBatch = await tx.formResponse.createMany({
          data: submissionsToSave.map((submission) => ({
            formId,
            userId,
            responses: submission.responses,
            responseTitle: submission.responseTitle,
          })),
        });

        // Update creator counts
        await tx.user.update({
          where: { id: form.userId },
          data: {
            submission_count:
              formCreator.submission_count - submissionsToProcess,
            response_count:
              (formCreator.response_count || 0) + submissionsToProcess,
          },
        });

        // Create batch notification
        await tx.notification.create({
          data: {
            userId: form.userId,
            type: "FORM_SUBMITTED",
            message: `${submissionsToProcess} new responses submitted to your form`,
            formId: formId,
          },
        });

        return createdBatch;
      },
      {
        timeout: 30000, // 30-second timeout
        maxWait: 5000, // 5-second max wait
      }
    );

    // Prepare response message
    let message = "Bulk form responses submitted successfully";
    const unprocessed = submissions.length - submissionsToProcess;

    if (unprocessed > 0) {
      const reasons = [];
      if (submissionsToProcess >= MAX_BATCH_SIZE)
        reasons.push(`batch size limit (${MAX_BATCH_SIZE})`);
      if (submissionsToProcess >= formCreator.submission_count)
        reasons.push("creator's submission quota");

      message = `Processed ${submissionsToProcess} submissions. ${unprocessed} unprocessed due to: ${reasons.join(
        " and "
      )}`;
    }

    res.status(201).json({
      success: true,
      message,
      data: {
        count: result.count,
        processed: submissionsToProcess,
        requested: submissions.length,
        remainingQuota: formCreator.submission_count - submissionsToProcess,
      },
    });
  } catch (error) {
    console.error("Bulk submission error:", error);
    const statusCode =
      error instanceof Prisma.PrismaClientKnownRequestError ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Bulk submission failed",
      errorDetails: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

// Delete a single form submission
export const deleteFormSubmission = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { responseId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    // Find the submission first to check permissions
    const submission = await prisma.formResponse.findUnique({
      where: { id: responseId },
      include: {
        form: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!submission) {
      res.status(404).json({
        success: false,
        message: "Submission not found",
      });
      return;
    }

    // Check if user is authorized to delete this submission
    // Allow if user is the form creator or the submission creator
    if (submission.userId !== userId && submission.form.userId !== userId) {
      res.status(403).json({
        success: false,
        message: "You don't have permission to delete this submission",
      });
      return;
    }

    // Use transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Delete the submission
      await tx.formResponse.delete({
        where: { id: responseId },
      });

      // If the user is the form creator, update their response count
      if (submission.form.userId === userId) {
        await tx.user.update({
          where: { id: userId },
          data: {
            response_count: {
              decrement: 1,
            },
          },
        });
      }
    });

    res.status(200).json({
      success: true,
      message: "Submission deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting submission:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting submission",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Delete multiple form submissions
export const deleteMultipleFormSubmissions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { responseIds } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!Array.isArray(responseIds) || responseIds.length === 0) {
      res.status(400).json({
        success: false,
        message: "responseIds must be a non-empty array",
      });
      return;
    }

    // Find all submissions to check permissions and count
    const submissions = await prisma.formResponse.findMany({
      where: {
        id: { in: responseIds },
      },
      include: {
        form: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (submissions.length === 0) {
      res.status(404).json({
        success: false,
        message: "No submissions found with the provided IDs",
      });
      return;
    }

    // Check permissions for each submission
    const unauthorizedSubmissions = submissions.filter(
      (submission) =>
        submission.userId !== userId && submission.form.userId !== userId
    );

    if (unauthorizedSubmissions.length > 0) {
      res.status(403).json({
        success: false,
        message: "You don't have permission to delete some of the submissions",
        unauthorizedCount: unauthorizedSubmissions.length,
      });
      return;
    }

    // Count submissions by form creator for response count updates
    const formCreatorSubmissions = submissions.filter(
      (submission) => submission.form.userId === userId
    );

    // Use transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Delete all submissions
      await tx.formResponse.deleteMany({
        where: {
          id: { in: responseIds },
        },
      });

      // If the user is a form creator, update their response count
      if (formCreatorSubmissions.length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: {
            response_count: {
              decrement: formCreatorSubmissions.length,
            },
          },
        });
      }
    });

    res.status(200).json({
      success: true,
      message: "Submissions deleted successfully",
      count: submissions.length,
    });
  } catch (error) {
    console.error("Error deleting multiple submissions:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting submissions",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const searchResponseByTitle = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { responseTitle } = req.query;

    if (!responseTitle || typeof responseTitle !== "string") {
      res.status(400).json({ error: "Invalid response title" });
      return;
    }

    const responses = await prisma.formResponse.findMany({
      where: {
        responseTitle: {
          contains: responseTitle,
          mode: "insensitive", // Case-insensitive search
        },
      },
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
            id: true,
            title: true,
            subheading: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      count: responses.length,
      responses,
    });
  } catch (error) {
    console.error("Error searching responses by title:", error);
    res.status(500).json({
      success: false,
      message: "Error searching responses by title",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
