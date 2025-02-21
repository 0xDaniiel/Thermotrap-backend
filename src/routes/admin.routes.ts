import express from "express";
import {
  createUser,
  generateActivationCode,
  getAllUsers,
  getUser,
  deleteUser,
  updateUser,
  debugUsers
} from "../controllers/admin.controller";

const router = express.Router();

router.route("/users").post(createUser);

router.route("/code").post(generateActivationCode);

router.get("/users", getAllUsers);
router.get("/users/:id", getUser);
router.delete("/users/:id", deleteUser);
router.patch("/users/:id", updateUser);

router.get("/debug/users", debugUsers);

export default router;
