import "./types/custom";
import express, {
  Express,
  Application,
  Request,
  Response,
  NextFunction,
} from "express";
import colors from "colors";
import cors from "cors";
import { createServer } from "http";
import { configureSocket } from "./config/socket";
import { NotificationService } from "./services/notification.service";

import dotenv from "dotenv";

import UserRoute from "./routes/users.routes";

import AdminRoute from "./routes/admin.routes";

import FormRoute from "./routes/forms.route";

import templateRoutes from "./routes/templates.route";

import notificationRoutes from "./routes/notification.routes";

import { prisma } from "./config/prisma";

dotenv.config();

const app: Application = express();
const port = process.env.PORT || 5000;
const httpServer = createServer(app);
const io = configureSocket(httpServer);
const notificationService = new NotificationService(io);

// Add this to make io available in your routes
app.set("io", io);
app.set("notificationService", notificationService);

// Middleware configuration

const configureMiddleware = (app: Application) => {
  app.use(
    cors({
      // origin: ["http://localhost:8081", "http://localhost:3000", "http://192.168.45.159:8080"],
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  );
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: false, limit: "50mb" }));
};

// Route configuration
const configureRoutes = (app: Application) => {
  app.use("/api/v1/users", UserRoute);
  app.use("/api/v1/admin", AdminRoute);
  app.use("/api/v1/form", FormRoute);
  app.use("/api/v1/templates", templateRoutes);
  app.use("/api/v1/notification", notificationRoutes);

  // 404 handler
  app.all("*", (req: Request, res: Response) => {
    res.status(404).json({
      status: "error",
      message: `Route ${req.originalUrl} not found`,
    });
  });

  // app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  //   if (err.type === 'entity.too.large') {
  //     return res.status(413).json({
  //       success: false,
  //       message: "Payload size exceeds 50MB limit"
  //     });
  //   }
  //   next(err);
  // });
};

// Error handling middleware
const errorHandler = (app: Application) => {
  app.use((err: Error, req: Request, res: Response, next: any) => {
    console.error(colors.red(err.stack || err.message));
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  });
};

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log(colors.green("✓ Database connected successfully"));

    configureMiddleware(app);
    configureRoutes(app);
    errorHandler(app);

    httpServer.listen(port, () => {
      console.log(colors.cyan(`✓ Server running on http://localhost:${port}`));
    });
  } catch (error) {
    console.error(colors.red("✗ Server startup failed:"), error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

// Graceful shutdown handling
process.on("SIGTERM", async () => {
  console.log(colors.yellow("SIGTERM received. Shutting down gracefully..."));
  await prisma.$disconnect();
  httpServer.close(() => {
    console.log(colors.yellow("Server closed"));
    process.exit(0);
  });
});

startServer();
