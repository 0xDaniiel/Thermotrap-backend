import { Server as SocketServer } from "socket.io";

import { Request, Response } from "express";
import { prisma } from "../config/prisma";

import { NotificationType } from "@prisma/client";

export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        form: {
          select: {
            title: true,
          },
        },
      },
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications" });
  }
};

export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.userId;

    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId, // Ensure user owns the notification
      },
      data: {
        isRead: true,
      },
    });

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Error updating notification" });
  }
};

export const markAllNotificationsAsRead = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user?.userId;

    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Error updating notifications" });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.userId;

    await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId, // Ensure user owns the notification
      },
    });

    res.json({ message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting notification" });
  }
};

// export class NotificationService {
//   private io: SocketServer;

//   constructor(io: SocketServer) {
//     this.io = io;
//   }

//   sendNotification(notification: { title: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' }) {
//     this.io.emit('notification', notification);
//   }
// }

export class NotificationService {
  private io: SocketServer;
  private userSockets: Map<string, string[]> = new Map();

  constructor(io: SocketServer) {
    this.io = io;
    this.setupSocketConnections();
  }

  private setupSocketConnections() {
    this.io.on("connection", (socket) => {
      socket.on("register", (userId: string) => {
        // Store socket ID for this user
        const userSockets = this.userSockets.get(userId) || [];
        userSockets.push(socket.id);
        this.userSockets.set(userId, userSockets);

        socket.on("disconnect", () => {
          const sockets = this.userSockets.get(userId) || [];
          const updatedSockets = sockets.filter((id) => id !== socket.id);
          if (updatedSockets.length === 0) {
            this.userSockets.delete(userId);
          } else {
            this.userSockets.set(userId, updatedSockets);
          }
        });
      });
    });
  }

  async sendNotification(
    userId: string,
    notification: {
      title: string;
      message: string;
      type?: NotificationType;
      formId?: string;
    }
  ) {
    // Save notification to database
    await prisma.notification.create({
      data: {
        userId,
        message: notification.message,
        type: notification.type || NotificationType.FORM_ASSIGNED,
        formId: notification.formId,
        isRead: false,
      },
    });

    // Send to all connected sockets for this user
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.forEach((socketId) => {
        this.io.to(socketId).emit("notification", notification);
      });
    }
  }
}
