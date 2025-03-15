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
  submitBulkFormResponses,
  getUserAssignedForms,
  getFormResponses,
  getIndividualResponse,
  changeFormStatus,
  updateResponse,
  getUserSubmissions,
  toggleFormFavorite,
  getFavoriteForms,
  deleteFormSubmission,
  deleteMultipleFormSubmissions,
  deleteMultipleForms,
} from "../controllers/forms.controller";
import {
  generateShareLink,
  generateShareLinks,
} from "../services/share.service";
import { authenticateToken } from "../middleware/auth";
import express from "express";

const router = express.Router();

router.route("/create").post(createForm);

router.route("/assign").post(assignUser).get(getAssignedUser);

router.get("/assigned-forms", authenticateToken, getUserAssignedForms);

// Get user's forms (requires auth)
router.get("/my-forms", authenticateToken, getUserForms);

// Get all forms (public)
router.get("/all", getAllForms);

// Get all submissions by authenticated user
router.get("/submissions", authenticateToken, getUserSubmissions);

// Get all favorite forms - Move this BEFORE the /:formId routes
router.get("/favorites", authenticateToken, getFavoriteForms);

router.delete("/forms", deleteMultipleForms);

// All routes with :formId parameter should come after specific routes
router.delete("/:formId", authenticateToken, deleteForm);
router.put("/:formId", authenticateToken, updateForm);
router.get("/:formId", getSingleForm);
router.post("/:formId/submit", authenticateToken, submitFormResponse);
router.post("/:formId/submit/bulk", authenticateToken, submitBulkFormResponses);
router.get("/:formId/responses", authenticateToken, getFormResponses);
router.put("/:formId/status", authenticateToken, changeFormStatus);
router.patch("/:formId/favorite", authenticateToken, toggleFormFavorite);

// Response related routes
router.get("/responses/:responseId", authenticateToken, getIndividualResponse);
router.route("/responses/:responseId").put(updateResponse);

// Delete a single submission
router.delete(
  "/responses/:responseId",
  authenticateToken,
  deleteFormSubmission
);

// Delete multiple submissions
router.delete("/responses", authenticateToken, deleteMultipleFormSubmissions);

// Share route
router.route("/share/:responseID").get(generateShareLink);
router.route("/share/multiple").post(generateShareLinks);

export default router;
