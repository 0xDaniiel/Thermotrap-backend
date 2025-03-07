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
  getUserAssignedForms,
  getFormResponses,
  getIndividualResponse,
  changeFormStatus,
  updateResponse,
  getUserSubmissions,
} from "../controllers/forms.controller";
import { generateShareLink } from "../services/share.service";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

router.route("/create").post(createForm);

router.route("/assign").post(assignUser).get(getAssignedUser);

router.get("/assigned-forms", authenticateToken, getUserAssignedForms);


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

router.get("/:formId/responses", authenticateToken, getFormResponses);

// get individual response
router.get(
  "/responses/:responseId",
  authenticateToken,
  getIndividualResponse
);

// change form status
router.put("/:formId/status", authenticateToken, changeFormStatus);

// get submission url
router.route("/share/:responseID").get(generateShareLink);

// update response
router.route("/responses/:responseId").put(updateResponse)

// Get all submissions by authenticated user
router.get('/submissions', authenticateToken, getUserSubmissions);

export default router;
