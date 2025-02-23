import express from "express";
import {
  createUser,
  generateActivationCode,
  getAllUsers,
  getUser,
  deleteUser,
  updateUser,
  debugUsers,
  updateSubmissionCount,
  updateActivationStatus,
  createAdmin,
  updateUserRole
} from "../controllers/admin.controller";
import { authenticateToken, isAdmin } from '../middleware/auth';
import { NotificationService } from '../services/notification.service';
import { Request, Response } from 'express';

const router = express.Router();

router.route("/users").post(createUser);

router.route("/code").post(generateActivationCode);

router.get("/users", getAllUsers);
router.get("/users/:id", getUser);
router.delete("/users/:id", deleteUser);
router.put("/users/:id", updateUser);

router.get("/debug/users", debugUsers);

// Protected admin routes
router.put('/update-submission-count', authenticateToken, isAdmin, updateSubmissionCount);
router.put('/update-activation-status', authenticateToken, isAdmin, updateActivationStatus);
router.post('/create-admin', authenticateToken, isAdmin, createAdmin);
router.put('/update-user-role', authenticateToken, isAdmin, updateUserRole);

// Add this route with your other admin routes
router.post('/test-notification', authenticateToken, isAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const io = req.app.get('io');
    const notificationService = new NotificationService(io);
    
    notificationService.sendNotification({
      title: 'Test Notification',
      message: 'This is a test notification from the server!',
      type: 'info'
    });

    res.status(200).json({ 
      success: true,
      message: 'Test notification sent' 
    });
    return;
  } catch (error) {
    console.error('Notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending notification',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

export default router;
