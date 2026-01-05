import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { config } from '../config';

export interface AuthRequest extends Request {
  user?: User;
  userId?: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };

    // Find user
    const user = await User.findByPk(decoded.userId);

    if (!user || !user.isActive) {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid or expired token',
      });
      return;
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid token',
      });
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Token expired',
      });
      return;
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Authentication failed',
    });
  }
};

