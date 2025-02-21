"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const admin_controller_1 = require("../controllers/admin.controller");
const router = express_1.default.Router();
router.route("/users").post(admin_controller_1.createUser);
router.route("/code").post(admin_controller_1.generateActivationCode);
router.get("/users", admin_controller_1.getAllUsers);
router.get("/users/:id", admin_controller_1.getUser);
router.delete("/users/:id", admin_controller_1.deleteUser);
router.patch("/users/:id", admin_controller_1.updateUser);
router.get("/debug/users", admin_controller_1.debugUsers);
exports.default = router;
