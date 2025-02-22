import { User } from '@prisma/client';

declare global {
  namespace Express {
    export interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
      }
    }
  }
}

export {}; 