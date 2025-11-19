// Service/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
}

/**
 * Middleware to verify JWT token and attach user info to request
 */
export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const payload = jwt.verify(token, JWT_SECRET) as {
      id: number | string;
      email: string
    };

    // Attach user info to request (ensure number type)
    req.userId = typeof payload.id === 'string' ? parseInt(payload.id, 10) : payload.id;
    req.userEmail = payload.email;

    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Generate JWT token for a user
 */
export const generateToken = (userId: number, email: string): string => {
  return jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });
};
