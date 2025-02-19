import express from "express";
import { getUser } from "../controllers/user.controller";

const router = express.Router();

router.route("/").get(getUser);
// router.route("/new").post(createUser);

export default router;
