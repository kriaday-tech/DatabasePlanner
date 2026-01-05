import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'sequelize';

export interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  console.error('Error:', error);

  // Sequelize validation errors
  if (error instanceof ValidationError) {
    const errors = error.errors.map((err) => ({
      field: err.path,
      message: err.message,
    }));

    res.status(400).json({
      error: 'Validation error',
      message: 'Invalid input data',
      details: errors,
    });
    return;
  }

  // Default error response
  const statusCode = (error as { statusCode?: number }).statusCode || 500;
  res.status(statusCode).json({
    error: error.name || 'Server Error',
    message: error.message || 'An unexpected error occurred',
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
};

