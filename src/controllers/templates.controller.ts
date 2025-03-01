import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export const createTemplate = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { title, description, blocks, category, userId } = req.body;

    // Input validation
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

    const newTemplate = await prisma.template.create({
      data: {
        title: title.trim(),
        description: description?.trim() || "",
        category: category?.trim() || "GENERAL",
        userId,
        blocks: JSON.stringify(blocks),
      },
    });

    res.status(201).json({
      message: "Template created successfully",
      template: newTemplate,
    });
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
};

export const updateTemplate = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { templateId } = req.params;
    const { title, description, blocks, category } = req.body;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    // Check if template exists and belongs to user
    const template = await prisma.template.findFirst({
      where: {
        id: templateId,
        userId: userId,
      },
    });

    if (!template) {
      res.status(404).json({
        success: false,
        message: "Template not found or you don't have permission to update it",
      });
      return;
    }

    // Update template with optional fields
    const updatedTemplate = await prisma.template.update({
      where: { id: templateId },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(category && { category }),
        ...(blocks && { blocks: JSON.stringify(blocks) }),
      },
    });

    res.status(200).json({
      success: true,
      message: "Template updated successfully",
      template: updatedTemplate,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error updating template",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deleteTemplate = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { templateId } = req.params;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    // Check if template exists and belongs to user
    const template = await prisma.template.findFirst({
      where: {
        id: templateId,
        userId: userId,
      },
    });

    if (!template) {
      res.status(404).json({
        success: false,
        message: "Template not found or you don't have permission to delete it",
      });
      return;
    }

    await prisma.template.delete({
      where: { id: templateId },
    });

    res.status(200).json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error deleting template",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getAllTemplates = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const templates = await prisma.template.findMany({
      orderBy: { createdAt: "desc" },
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

    res.status(200).json({
      success: true,
      count: templates.length,
      templates,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching templates",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getUserTemplates = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const templates = await prisma.template.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      count: templates.length,
      templates,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching user templates",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getSingleTemplate = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { templateId } = req.params;

    const template = await prisma.template.findUnique({
      where: { id: templateId },
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

    if (!template) {
      res.status(404).json({
        success: false,
        message: "Template not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      template,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching template",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}; 