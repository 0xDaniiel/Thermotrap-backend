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
require("./types/custom");
const express_1 = __importDefault(require("express"));
const colors_1 = __importDefault(require("colors"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_1 = require("./config/socket");
const dotenv_1 = __importDefault(require("dotenv"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const forms_route_1 = __importDefault(require("./routes/forms.route"));
const templates_route_1 = __importDefault(require("./routes/templates.route"));
const prisma_1 = require("./config/prisma");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
const httpServer = (0, http_1.createServer)(app);
const io = (0, socket_1.configureSocket)(httpServer);
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
const configureMiddleware = (app) => {
    app.use((0, cors_1.default)({
        // origin: ["http://localhost:8081", "http://localhost:3000", "http://192.168.45.159:8080"],
        origin: '*',
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    }));
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: false }));
};
// Route configuration
const configureRoutes = (app) => {
    app.use("/api/v1/users", users_routes_1.default);
    app.use("/api/v1/admin", admin_routes_1.default);
    app.use("/api/v1/form", forms_route_1.default);
    app.use("/api/v1/templates", templates_route_1.default);
    // 404 handler
    app.all("*", (req, res) => {
        res.status(404).json({
            status: "error",
            message: `Route ${req.originalUrl} not found`,
        });
    });
};
// Error handling middleware
const errorHandler = (app) => {
    app.use((err, req, res, next) => {
        console.error(colors_1.default.red(err.stack || err.message));
        res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    });
};
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.prisma.$connect();
        console.log(colors_1.default.green("✓ Database connected successfully"));
        configureMiddleware(app);
        configureRoutes(app);
        errorHandler(app);
        httpServer.listen(port, () => {
            console.log(colors_1.default.cyan(`✓ Server running on http://localhost:${port}`));
        });
    }
    catch (error) {
        console.error(colors_1.default.red("✗ Server startup failed:"), error);
        yield prisma_1.prisma.$disconnect();
        process.exit(1);
    }
});
// Graceful shutdown handling
process.on("SIGTERM", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(colors_1.default.yellow("SIGTERM received. Shutting down gracefully..."));
    yield prisma_1.prisma.$disconnect();
    httpServer.close(() => {
        console.log(colors_1.default.yellow("Server closed"));
        process.exit(0);
    });
}));
startServer();
