import express from "express";
import { getUser, login, forgotPassword, resetPassword } from "../controllers/user.controller";

const router = express.Router();

router.route("/").get(getUser);
// router.route("/new").post(createUser);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
