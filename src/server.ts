import './types/custom';
import express, { Express, Application, Request, Response } from "express";
import colors from "colors";
import cors from "cors";

import dotenv from "dotenv";

import UserRoute from "./routes/users.routes";

import AdminRoute from "./routes/admin.routes";

import FormRoute from "./routes/forms.route";


import { prisma } from "./config/prisma";

dotenv.config();

const app: Application = express();
const port = process.env.PORT || 5000;

const main = async () => {
  app.use(cors({
    origin: ['http://localhost:8081', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }));

  app.use(express.json());

  app.use(express.urlencoded({ extended: false }));

  app.use("/api/v1/users", UserRoute);
  app.use("/api/v1/admin", AdminRoute);
  app.use("/api/v1/form", FormRoute);
  // app.use('/api/auth', authRoutes);

  app.all("*", (req: Request, res: Response) => {
    res.status(404).json({ error: `Route ${req.originalUrl} not found` });
  });

  app.listen(port, () => {
    console.log(`Server running on  http://localhost:${port}`);
  });
};

main()
  .then(async () => {
    await prisma.$connect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
