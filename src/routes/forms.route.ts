import express from "express";
import { createForm } from "../controllers/forms.controller";

const router = express.Router();

router.route("/create").post(createForm);

// router.route("/code").post(() => {});

export default router;
