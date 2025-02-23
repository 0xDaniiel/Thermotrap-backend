import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';

export const configureSocket = (server: HttpServer) => {
  const io = new SocketServer(server, {
    cors: {
      origin: "http://localhost:8081",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}; 