import { Response } from 'express';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { User } from '../models';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  // Register a new user
  static async register(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { username, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        where: { email },
      });

      if (existingUser) {
        res.status(409).json({
          error: 'User already exists',
          message: 'A user with this email already exists',
        });
        return;
      }

      // Create new user
      const user = await User.create({
        username,
        email,
        password,
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id },
        config.jwt.secret as Secret,
        { expiresIn: config.jwt.expiresIn } as SignOptions
      );

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: user.toJSON(),
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Registration failed',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }

  // Login user
  static async login(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ where: { email } });

      if (!user) {
        res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid email or password',
        });
        return;
      }

      // Check if user is active
      if (!user.isActive) {
        res.status(403).json({
          error: 'Account inactive',
          message: 'Your account has been deactivated',
        });
        return;
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid email or password',
        });
        return;
      }

      // Update last login
      await user.update({ lastLogin: new Date() });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id },
        config.jwt.secret as Secret,
        { expiresIn: config.jwt.expiresIn } as SignOptions
      );

      res.json({
        message: 'Login successful',
        token,
        user: user.toJSON(),
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }

  // Get current user
  static async getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No user found',
        });
        return;
      }

      res.json({
        user: req.user.toJSON(),
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        error: 'Failed to get user',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }

  // Update profile
  static async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No user found',
        });
        return;
      }

      const { username } = req.body;

      if (username) {
        await req.user.update({ username });
      }

      res.json({
        message: 'Profile updated successfully',
        user: req.user.toJSON(),
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        error: 'Failed to update profile',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }

  // Change password
  static async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No user found',
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      // Verify current password
      const isPasswordValid = await req.user.comparePassword(currentPassword);

      if (!isPasswordValid) {
        res.status(401).json({
          error: 'Invalid password',
          message: 'Current password is incorrect',
        });
        return;
      }

      // Update password
      await req.user.update({ password: newPassword });

      res.json({
        message: 'Password changed successfully',
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        error: 'Failed to change password',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }
}

export default AuthController;

