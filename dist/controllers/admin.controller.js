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
exports.updateUserRole = exports.createAdmin = exports.updateActivationStatus = exports.updateSubmissionCount = exports.debugUsers = exports.getUser = exports.updateUser = exports.deleteUser = exports.getAllUsers = exports.createUser = exports.generateActivationCode = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const prisma_1 = require("../config/prisma");
const library_1 = require("@prisma/client/runtime/library");
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const generateRandomCode = () => {
    return crypto_1.default.randomBytes(6).toString("hex").toUpperCase();
};
const generateActivationCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const code = generateRandomCode();
        const newCode = yield prisma_1.prisma.activationCode.create({
            data: { code },
        });
        res
            .status(201)
            .json({ message: "Activation code generated", code: newCode.code });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.generateActivationCode = generateActivationCode;
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
const transporter = nodemailer_1.default.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false,
    },
});
// Send OTP email
const sendUserInforEmail = (email, name, activationCode, password) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mailOptions = {
            from: `"Admin Portal" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Welcome to Our Platform - Your Account Details",
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            .container {
              font-family: 'Arial', sans-serif;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f8f9fa;
              border-radius: 10px;
            }
            .header {
              background-color: #4a90e2;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background-color: white;
              padding: 20px;
              border-radius: 0 0 10px 10px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .credentials {
              background-color: #f8f9fa;
              padding: 15px;
              margin: 15px 0;
              border-left: 4px solid #4a90e2;
              border-radius: 4px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #666;
              font-size: 12px;
            }
            .warning {
              color: #dc3545;
              font-size: 14px;
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Our Platform!</h1>
            </div>
            <div class="content">
              <h2>Hello ${name},</h2>
              <p>Your account has been successfully created. Below are your account credentials:</p>
              
              <div class="credentials">
                <p><strong>👤 Name:</strong> ${name}</p>
                <p><strong>📧 Email:</strong> ${email}</p>
                <p><strong>🔑 Activation Code:</strong> ${activationCode}</p>
                <p><strong>🔒 Password:</strong> ${password}</p>
              </div>

              <p>For security reasons, we recommend:</p>
              <ul>
                <li>Change your password after first login</li>
                <li>Keep your activation code safe</li>
                <li>Never share these credentials with anyone</li>
              </ul>

              <p class="warning">
                ⚠️ Please keep this information secure and delete this email after saving your credentials.
              </p>
            </div>
            <div class="footer">
              <p>This is an automated message, please do not reply.</p>
              <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
        };
        yield transporter.sendMail(mailOptions);
        console.log("Welcome email sent successfully to:", email);
    }
    catch (error) {
        console.error("Email sending error:", error);
        throw error;
    }
});
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Request body:", req.body);
        console.log("Content-Type:", req.headers["content-type"]);
        const { name, email, password, activationCode } = req.body;
        console.log("Extracted values:", { name, email, password, activationCode });
        if (!name || !email || !password || !activationCode) {
            console.log("Missing fields:", {
                hasName: !!name,
                hasEmail: !!email,
                hasPassword: !!password,
                hasActivationCode: !!activationCode,
            });
            res.status(400).json({
                message: "Name, Email, password, and activation code are required.",
            });
            return;
        }
        // Check if the activation code is valid and not used
        const codeRecord = yield prisma_1.prisma.activationCode.findUnique({
            where: { code: activationCode },
        });
        if (!codeRecord || codeRecord.isUsed) {
            res
                .status(400)
                .json({ message: "Invalid or already used activation code." });
            return;
        }
        // Check if user already exists
        const existingUser = yield prisma_1.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            res.status(400).json({ message: "User already exists." });
            return;
        }
        // Hash password
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        // Create user
        const newUser = yield prisma_1.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                isActivated: true,
                role: "USER",
                activationCode: activationCode,
            },
        });
        // Mark activation code as used
        yield prisma_1.prisma.activationCode.update({
            where: { code: activationCode },
            data: { isUsed: true },
        });
        yield sendUserInforEmail(email, name, activationCode, password);
        res.status(201).json({
            message: "User created successfully",
            user: { id: newUser.id, email: newUser.email, name: newUser.name },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.createUser = createUser;
// Get all users
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield prisma_1.prisma.user.findMany({
            where: {
                role: "USER",
            },
            select: {
                id: true,
                name: true,
                email: true,
                isActivated: true,
                createdAt: true,
                activationCode: true,
                role: true,
                submission_count: true,
            },
        });
        res.status(200).json({
            message: "Users fetched successfully",
            count: users.length,
            users: users,
        });
    }
    catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({
            message: "Internal Server Error",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.getAllUsers = getAllUsers;
// Delete user
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Check if user exists
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id },
        });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        // Delete associated password reset records if any
        yield prisma_1.prisma.passwordReset.deleteMany({
            where: { userId: id },
        });
        // Delete the user
        yield prisma_1.prisma.user.delete({
            where: { id },
        });
        res.status(200).json({
            message: "User deleted successfully",
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.deleteUser = deleteUser;
// Update user
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name } = req.body;
        // Check if user exists
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id },
        });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        // Update user
        const updatedUser = yield prisma_1.prisma.user.update({
            where: { id },
            data: {
                name: name || undefined,
            },
            select: {
                id: true,
                name: true,
                email: true,
                isActivated: true,
                role: true,
                createdAt: true,
            },
        });
        res.status(200).json({
            message: "User updated successfully",
            user: updatedUser,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.updateUser = updateUser;
// Get single user
const getUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                isActivated: true,
                createdAt: true,
                activationCode: true,
                role: true,
            },
        });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.status(200).json({
            message: "User fetched successfully",
            user,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.getUser = getUser;
// Add this export function
const debugUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allUsers = yield prisma_1.prisma.user.findMany();
        console.log("All users in DB:", allUsers);
        res.status(200).json({
            total: allUsers.length,
            users: allUsers,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.debugUsers = debugUsers;
// Update submission count
const updateSubmissionCount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, submission_count } = req.body;
        // Add debug logging
        console.log("Request body:", req.body);
        console.log("Parsed values:", { userId, submission_count });
        // Check if values exist
        if (!userId || submission_count === undefined) {
            res.status(400).json({
                success: false,
                message: "userId and submission_count are required"
            });
            return;
        }
        // Convert to number if string
        const count = Number(submission_count);
        if (isNaN(count) || count < 0) {
            res.status(400).json({
                success: false,
                message: "Invalid submission count value"
            });
            return;
        }
        // Get current user and add to their submission count
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { submission_count: true }
        });
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }
        const updatedUser = yield prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                submission_count: user.submission_count + count // Add to existing count
            },
            select: {
                id: true,
                name: true,
                email: true,
                submission_count: true,
                isActivated: true,
                role: true
            }
        });
        res.status(200).json({
            success: true,
            message: "Submission count updated successfully",
            data: updatedUser
        });
    }
    catch (error) {
        if (error instanceof library_1.PrismaClientKnownRequestError) {
            if (error.code === "P2025") {
                res.status(404).json({
                    success: false,
                    message: "User not found"
                });
                return;
            }
        }
        res.status(500).json({
            success: false,
            message: "Error updating submission count",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
});
exports.updateSubmissionCount = updateSubmissionCount;
// Update activation status
const updateActivationStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, isActivated } = req.body;
        if (typeof isActivated !== "boolean") {
            res.status(400).json({
                success: false,
                message: "isActivated must be a boolean value",
            });
            return;
        }
        const updatedUser = yield prisma_1.prisma.user.update({
            where: { id: userId },
            data: { isActivated },
            select: {
                id: true,
                name: true,
                email: true,
                isActivated: true,
                role: true,
            },
        });
        res.status(200).json({
            success: true,
            message: "Activation status updated successfully",
            data: updatedUser,
        });
    }
    catch (error) {
        if (error instanceof library_1.PrismaClientKnownRequestError) {
            if (error.code === "P2025") {
                res.status(404).json({
                    success: false,
                    message: "User not found",
                });
                return;
            }
        }
        res.status(500).json({
            success: false,
            message: "Error updating activation status",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.updateActivationStatus = updateActivationStatus;
// Create admin
// export const createAdmin = async (req: Request, res: Response): Promise<void> => {
//     try {
//         const { email, password, name } = req.body;
//         // Validate input
//         if (!email || !password || !name) {
//             res.status(400).json({
//                 success: false,
//                 message: 'Email, password, and name are required'
//             });
//             return;
//         }
//         // Check if user already exists
//         const existingUser = await prisma.user.findUnique({
//             where: { email }
//         });
//         if (existingUser) {
//             res.status(400).json({
//                 success: false,
//                 message: 'User already exists with this email'
//             });
//             return;
//         }
//         // Hash password
//         const hashedPassword = await bcrypt.hash(password, 10);
//         console.log('Password hashed:', !!hashedPassword);
//         // Create user with ADMIN role
//         const newAdmin = await prisma.user.create({
//             data: {
//                 email,
//                 password: hashedPassword,
//                 name,
//                 role: 'ADMIN',
//                 isActivated: true,
//                 submitionCount: 500 // default value
//             },
//             select: {
//                 id: true,
//                 name: true,
//                 email: true,
//                 role: true,
//                 createdAt: true
//             }
//         });
//         res.status(201).json({
//             success: true,
//             message: 'Admin created successfully',
//             data: newAdmin
//         });
//     } catch (error) {
//         console.error('Admin creation error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error creating admin',
//             error: error instanceof Error ? error.message : 'Unknown error'
//         });
//     }
// };
const createAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Request body:", req.body);
        console.log("Content-Type:", req.headers["content-type"]);
        const { name, email, password, activationCode } = req.body;
        console.log("Extracted values:", { name, email, password, activationCode });
        if (!name || !email || !password || !activationCode) {
            console.log("Missing fields:", {
                hasName: !!name,
                hasEmail: !!email,
                hasPassword: !!password,
                hasActivationCode: !!activationCode,
            });
            res.status(400).json({
                message: "Name, Email, password, and activation code are required.",
            });
            return;
        }
        // Check if the activation code is valid and not used
        const codeRecord = yield prisma_1.prisma.activationCode.findUnique({
            where: { code: activationCode },
        });
        if (!codeRecord || codeRecord.isUsed) {
            res
                .status(400)
                .json({ message: "Invalid or already used activation code." });
            return;
        }
        // Check if user already exists
        const existingUser = yield prisma_1.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            res.status(400).json({ message: "User already exists." });
            return;
        }
        // Hash password
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        // Create user
        const newUser = yield prisma_1.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                isActivated: true,
                role: "ADMIN",
                activationCode: activationCode,
            },
        });
        // Mark activation code as used
        yield prisma_1.prisma.activationCode.update({
            where: { code: activationCode },
            data: { isUsed: true },
        });
        yield sendUserInforEmail(email, name, activationCode, password);
        res.status(201).json({
            message: "User created successfully",
            user: { id: newUser.id, email: newUser.email, name: newUser.name },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.createAdmin = createAdmin;
// Update user role
const updateUserRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, role } = req.body;
        if (!["USER", "ADMIN"].includes(role)) {
            res.status(400).json({
                success: false,
                message: "Invalid role. Role must be either USER or ADMIN",
            });
            return;
        }
        const updatedUser = yield prisma_1.prisma.user.update({
            where: { id: userId },
            data: { role },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActivated: true,
            },
        });
        res.status(200).json({
            success: true,
            message: "User role updated successfully",
            data: updatedUser,
        });
    }
    catch (error) {
        if (error instanceof library_1.PrismaClientKnownRequestError) {
            if (error.code === "P2025") {
                res.status(404).json({
                    success: false,
                    message: "User not found",
                });
                return;
            }
        }
        res.status(500).json({
            success: false,
            message: "Error updating user role",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.updateUserRole = updateUserRole;
