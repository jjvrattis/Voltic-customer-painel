import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';
import { logger } from '../lib/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    logger.warn({ err, path: req.path }, 'Application error');
    const body: ApiResponse = { success: false, error: err.message };
    res.status(err.statusCode).json(body);
    return;
  }

  logger.error({ err, path: req.path }, 'Unexpected error');
  const body: ApiResponse = { success: false, error: 'Internal server error' };
  res.status(500).json(body);
}
