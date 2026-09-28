import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // Limit each user/IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false, xForwardedForHeader: false },
  keyGenerator: (req: any) => {
    if (req.user?.uid) return String(req.user.uid);
    const forwarded = req.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    if (Array.isArray(forwarded) && forwarded.length > 0) return forwarded[0].trim();
    return req.ip || 'unknown';
  },
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json({
      error: "Too many requests. Please slow down and try again later.",
      retryAfterMinutes: 5
    });
  }
});

export const healthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute for health checks
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json({
      error: "Health check rate limit exceeded.",
      status: "rate_limited"
    });
  }
});
