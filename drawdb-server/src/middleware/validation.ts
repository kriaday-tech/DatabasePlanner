import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

// Validation rules for registration
export const validateRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .isAlphanumeric()
    .withMessage('Username must contain only letters and numbers'),

  body('email').trim().isEmail().withMessage('Invalid email address').normalizeEmail(),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

// Validation rules for login
export const validateLogin = [
  body('email').trim().isEmail().withMessage('Invalid email address').normalizeEmail(),

  body('password').notEmpty().withMessage('Password is required'),
];

// Validation rules for diagram creation/update
export const validateDiagram = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Diagram name must be between 1 and 255 characters'),

  body('database')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Database type must be specified'),

  body('tables').optional().isArray().withMessage('Tables must be an array'),

  body('references').optional().isArray().withMessage('References must be an array'),

  body('notes').optional().isArray().withMessage('Notes must be an array'),

  body('areas').optional().isArray().withMessage('Areas must be an array'),

  body('todos').optional().isArray().withMessage('Todos must be an array'),
];

// Validation rules for sharing
export const validateShare = [
  body('userId').isUUID().withMessage('Valid user ID is required'),

  body('permissionLevel')
    .optional()
    .isIn(['viewer', 'editor', 'owner'])
    .withMessage('Permission level must be viewer, editor, or owner'),
];

// Middleware to check validation results
export const checkValidation = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation error',
      message: 'Invalid input data',
      details: errors.array(),
    });
    return;
  }

  next();
};

// Alias for checkValidation (used in some routes)
export const validate = checkValidation;

