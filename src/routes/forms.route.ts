import express from "express";
import { assignUser, createForm } from "../controllers/forms.controller";

const router = express.Router();

router.route("/create").post(createForm);

router.route("/assign-user").post(assignUser);

export default router;
