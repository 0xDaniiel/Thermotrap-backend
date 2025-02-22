import express from "express";
import {
  getUser,
  login,
  forgotPassword,
  confirmOTP,
  resetPassword,
  changePassword,
  searchUser,
} from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

router.route("/").get(getUser);

// router.route("/new").post(createUser);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/confirm-otp", confirmOTP);
router.post("/reset-password", resetPassword);
router.post("/change-password", authMiddleware, changePassword);
router.route("/search").get(searchUser);

export default router;
