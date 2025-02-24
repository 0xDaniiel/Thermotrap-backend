import express from "express";
import {
  assignUser,
  createForm,
  getAssignedUser,
} from "../controllers/forms.controller";
import { generateShareLink } from "../services/share.service";

const router = express.Router();

router.route("/create").post(createForm);

router.route("/assign").post(assignUser).get(getAssignedUser);

router.route("/share/:formId").get(generateShareLink);

export default router;
