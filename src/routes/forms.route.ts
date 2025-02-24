import express from "express";
import {
  assignUser,
  createForm,
  getAssignedUser,
} from "../controllers/forms.controller";

const router = express.Router();

router.route("/create").post(createForm);

router.route("/assign").post(assignUser).get(getAssignedUser);

export default router;
