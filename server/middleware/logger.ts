import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export interface StructuredLogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  timestamp: string;
  requestId: string;
  message: string;
  meta?: Record<string, any>;
}

export function log(level: StructuredLogEntry['level'], message: string, meta?: Record<string, any>) {
  const entry: StructuredLogEntry = {
    level,
    timestamp: new Date().toISOString(),
    requestId: meta?.requestId || 'system',
    message,
    ...(meta ? { meta } : {})
  };
  
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const correlationAndLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const incomingId = req.headers['x-request-id'];
  const requestId = (typeof incomingId === 'string' && incomingId.trim().length > 0)
    ? incomingId.trim()
    : crypto.randomUUID();

  req.id = requestId;
  res.setHeader('x-request-id', requestId);

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const isError = res.statusCode >= 400;

    log(isError ? 'warn' : 'info', `${req.method} ${req.originalUrl || req.url} ${res.statusCode}`, {
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent']
    });
  });

  next();
};
