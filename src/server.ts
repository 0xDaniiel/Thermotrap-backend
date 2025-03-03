import "./types/custom";
import express, { Express, Application, Request, Response } from "express";
import colors from "colors";
import cors from "cors";
import { createServer } from "http";
import { configureSocket } from "./config/socket";

import dotenv from "dotenv";

import UserRoute from "./routes/users.routes";

import AdminRoute from "./routes/admin.routes";

import FormRoute from "./routes/forms.route";

import templateRoutes from "./routes/templates.route";

import { prisma } from "./config/prisma";

dotenv.config();

const app: Application = express();
const port = process.env.PORT || 5000;
const httpServer = createServer(app);
const io = configureSocket(httpServer);

// Add this to make io available in your routes
app.set("io", io);

// const main = async () => {
//   app.use(cors({
//     origin: ['http://localhost:8081', 'http://localhost:3000'],
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//     credentials: true
//   }));

//   app.use(express.json());

//   app.use(express.urlencoded({ extended: false }));

//   app.use("/api/v1/users", UserRoute);
//   app.use("/api/v1/admin", AdminRoute);
//   app.use("/api/v1/form", FormRoute);
//   // app.use('/api/auth', authRoutes);

//   app.all("*", (req: Request, res: Response) => {
//     res.status(404).json({ error: `Route ${req.originalUrl} not found` });
//   });

//   httpServer.listen(port, () => {
//     console.log(`Server running on http://localhost:${port}`);
//   });
// };

// main()
//   .then(async () => {
//     await prisma.$connect();
//   })
//   .catch(async (e) => {
//     console.error(e);
//     await prisma.$disconnect();
//     process.exit(1);
//   });

// ... existing code ...

// Middleware configuration

const configureMiddleware = (app: Application) => {
  app.use(
    cors({
      // origin: ["http://localhost:8081", "http://localhost:3000", "http://192.168.45.159:8080"],
      origin:'*',
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
};

// Route configuration
const configureRoutes = (app: Application) => {
  app.use("/api/v1/users", UserRoute);
  app.use("/api/v1/admin", AdminRoute);
  app.use("/api/v1/form", FormRoute);
  app.use("/api/v1/templates", templateRoutes);

  // 404 handler
  app.all("*", (req: Request, res: Response) => {
    res.status(404).json({
      status: "error",
      message: `Route ${req.originalUrl} not found`,
    });
  });
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
