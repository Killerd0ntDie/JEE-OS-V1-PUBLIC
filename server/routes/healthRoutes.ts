import { Router } from "express";
import { healthLimiter } from "../middleware/rateLimiter";

const router = Router();

router.get("/health", healthLimiter, (_req, res) => {
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
  });
});

export default router;
