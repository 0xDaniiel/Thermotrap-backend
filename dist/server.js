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
const notification_service_1 = require("./services/notification.service");
const dotenv_1 = __importDefault(require("dotenv"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const forms_route_1 = __importDefault(require("./routes/forms.route"));
const templates_route_1 = __importDefault(require("./routes/templates.route"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const prisma_1 = require("./config/prisma");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
const httpServer = (0, http_1.createServer)(app);
const io = (0, socket_1.configureSocket)(httpServer);
const notificationService = new notification_service_1.NotificationService(io);
// Add this to make io available in your routes
app.set("io", io);
app.set("notificationService", notificationService);
// Middleware configuration
const configureMiddleware = (app) => {
    app.use((0, cors_1.default)({
        // origin: ["http://localhost:8081", "http://localhost:3000", "http://192.168.45.159:8080"],
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    }));
    app.use(express_1.default.json({ limit: "50mb" }));
    app.use(express_1.default.urlencoded({ extended: false, limit: "50mb" }));
};
// Route configuration
const configureRoutes = (app) => {
    app.use("/api/v1/users", users_routes_1.default);
    app.use("/api/v1/admin", admin_routes_1.default);
    app.use("/api/v1/form", forms_route_1.default);
    app.use("/api/v1/templates", templates_route_1.default);
    app.use("/api/v1/notification", notification_routes_1.default);
    // 404 handler
    app.all("*", (req, res) => {
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
