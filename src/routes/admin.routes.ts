import express from "express";
import {
  createUser,
  generateActivationCode,
  getAllUsers,
  getUser,
  deleteUser,
  updateUser,
  debugUsers,
  updateSubmissionCount,
  updateActivationStatus,
  createAdmin,
  updateUserRole
} from "../controllers/admin.controller";
import { authenticateToken, isAdmin } from '../middleware/auth';

const router = express.Router();

router.route("/users").post(createUser);

router.route("/code").post(generateActivationCode);

router.get("/users", getAllUsers);
router.get("/users/:id", getUser);
router.delete("/users/:id", deleteUser);
router.patch("/users/:id", updateUser);

router.get("/debug/users", debugUsers);

// Protected admin routes
router.put('/update-submission-count', authenticateToken, isAdmin, updateSubmissionCount);
router.put('/update-activation-status', authenticateToken, isAdmin, updateActivationStatus);
router.post('/create-admin', authenticateToken, isAdmin, createAdmin);
router.put('/update-user-role', authenticateToken, isAdmin, updateUserRole);

export default router;
