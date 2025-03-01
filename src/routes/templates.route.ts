import express from "express";
import {
  createTemplate,
  deleteTemplate,
  getAllTemplates,
  getSingleTemplate,
  getUserTemplates,
  updateTemplate,
} from "../controllers/templates.controller";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

// Create new template (requires auth)
router.post("/create", authenticateToken, createTemplate);

// Update template (requires auth)
router.put("/:templateId", authenticateToken, updateTemplate);

// Delete template (requires auth)
router.delete("/:templateId", authenticateToken, deleteTemplate);

// Get all templates (public)
router.get("/all", getAllTemplates);

// Get user's templates (requires auth)
router.get("/my-templates", authenticateToken, getUserTemplates);

// Get single template
router.get("/:templateId", getSingleTemplate);

export default router; 