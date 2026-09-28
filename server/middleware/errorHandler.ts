import { Request, Response, NextFunction } from "express";
import { log } from "./logger";

export interface AppError extends Error {
  statusCode?: number;
  details?: any;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const requestId = req.id || req.headers?.['x-request-id'] || 'unknown';

  log('error', `Unhandled Exception: ${err.message || 'Unknown error'}`, {
    requestId,
    method: req.method,
    path: req.originalUrl || req.url,
    statusCode,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    details: err.details
  });

  // Optional Sentry integration hook
  if (process.env.SENTRY_DSN) {
    try {
      // Lazy load Sentry if package is available
      const Sentry = require("@sentry/node");
      Sentry.captureException(err, { extra: { requestId, path: req.url } });
    } catch {}
  }

  const isPayloadTooLarge = statusCode === 413 || (err as any).type === 'entity.too.large';
  const clientMessage = isPayloadTooLarge 
    ? "Request payload too large. Maximum allowed size is 25MB."
    : (statusCode >= 500 && process.env.NODE_ENV === 'production'
        ? "An unexpected internal server error occurred."
        : err.message);

  // Safe client response: never leak internal stack traces in production
  res.status(statusCode).json({
    error: clientMessage,
    requestId,
    timestamp: new Date().toISOString()
  });
}
