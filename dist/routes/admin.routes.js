"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const admin_controller_1 = require("../controllers/admin.controller");
const auth_1 = require("../middleware/auth");
const notification_service_1 = require("../services/notification.service");
const router = express_1.default.Router();
router.route("/users").post(admin_controller_1.createUser);
router.route("/code").post(admin_controller_1.generateActivationCode);
router.get("/users", admin_controller_1.getAllUsers);
router.get("/users/:id", admin_controller_1.getUser);
router.delete("/users/:id", admin_controller_1.deleteUser);
router.put("/users/:id", admin_controller_1.updateUser);
router.get("/debug/users", admin_controller_1.debugUsers);
// Protected admin routes
router.put("/update-submission-count", auth_1.authenticateToken, auth_1.isAdmin, admin_controller_1.updateSubmissionCount);
router.put("/update-activation-status", auth_1.authenticateToken, auth_1.isAdmin, admin_controller_1.updateActivationStatus);
router.post("/create-admin", auth_1.authenticateToken, auth_1.isAdmin, admin_controller_1.createAdmin);
router.put("/update-user-role", auth_1.authenticateToken, auth_1.isAdmin, admin_controller_1.updateUserRole);
// Add this route with your other admin routes
router.post("/test-notification", auth_1.authenticateToken, auth_1.isAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const io = req.app.get("io");
        const notificationService = new notification_service_1.NotificationService(io);
        io.setMaxListeners(20);
        // Get the user ID from the request
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(400).json({
                success: false,
                message: "User ID not found",
            });
            return;
        }
        yield notificationService.sendNotification(userId, {
            title: "Test Notification",
            message: "This is a test notification from the server!",
            type: "FORM_ASSIGNED",
        });
        res.status(200).json({
            success: true,
            message: "Test notification sent",
        });
        return;
    }
    catch (error) {
        console.error("Notification error:", error);
        res.status(500).json({
            success: false,
            message: "Error sending notification",
            error: error instanceof Error ? error.message : "Unknown error",
        });
        return;
    }
}));
exports.default = router;
