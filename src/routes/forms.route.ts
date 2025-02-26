import express from "express";
import {
  assignUser,
  createForm,
  getAssignedUser,
  deleteForm,
  updateForm,
  getUserForms,
  getAllForms,
  getSingleForm,
  submitFormResponse,
} from "../controllers/forms.controller";
import { generateShareLink } from "../services/share.service";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

router.route("/create").post(createForm);

router.route("/assign").post(assignUser).get(getAssignedUser);

router.route("/share/:formId").get(generateShareLink);

router.delete("/:formId", authenticateToken, deleteForm);

router.put("/:formId", authenticateToken, updateForm);

// Get user's forms (requires auth)
router.get("/my-forms", authenticateToken, getUserForms);

// Get all forms (public)
router.get("/all", getAllForms);

// Get single form
router.get("/:formId", getSingleForm);

// Submit form responses
router.post("/:formId/submit", authenticateToken, submitFormResponse);

export default router;
