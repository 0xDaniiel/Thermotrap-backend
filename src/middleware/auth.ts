import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string; role: string };
        req.user = decoded;
        next();
        return;
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
        return;
    }
};

export const isAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user?.userId },
        });

        if (user?.role !== 'ADMIN') {
            res.status(403).json({ message: 'Admin access required' });
            return;
        }

        next();
        return;
    } catch (error) {
        res.status(500).json({ message: 'Error verifying admin status' });
        return;
    }
}; 