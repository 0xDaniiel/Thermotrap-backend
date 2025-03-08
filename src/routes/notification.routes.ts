import express from "express";
import { authenticateToken } from "../middleware/auth";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from "../services/notification.service";

const router = express.Router();

router.get("/", authenticateToken, getUserNotifications);
router.patch("/:notificationId/read", authenticateToken, markNotificationAsRead);
router.patch("/read-all", authenticateToken, markAllNotificationsAsRead);
router.delete("/:notificationId", authenticateToken, deleteNotification);

export default router;