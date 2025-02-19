import express from "express";
import {
  createUser,
  generateActivationCode,
} from "../controllers/admin.controller";

const router = express.Router();

router.route("/users").post(createUser);

router.route("/code").post(generateActivationCode);

export default router;
