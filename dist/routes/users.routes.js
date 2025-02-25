"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.route("/").get(user_controller_1.getUser);
// router.route("/new").post(createUser);
router.post("/login", user_controller_1.login);
router.post("/forgot-password", user_controller_1.forgotPassword);
router.post("/confirm-otp", user_controller_1.confirmOTP);
router.post("/reset-password", user_controller_1.resetPassword);
router.post("/change-password", auth_middleware_1.authMiddleware, user_controller_1.changePassword);
router.route("/search").get(user_controller_1.searchUser);
router.put('/update-profile', auth_middleware_1.authMiddleware, user_controller_1.updateUser);
exports.default = router;
