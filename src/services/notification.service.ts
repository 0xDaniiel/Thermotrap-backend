import { Server as SocketServer } from 'socket.io';

export class NotificationService {
  private io: SocketServer;

  constructor(io: SocketServer) {
    this.io = io;
  }

  sendNotification(notification: { title: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' }) {
    this.io.emit('notification', notification);
  }
} 