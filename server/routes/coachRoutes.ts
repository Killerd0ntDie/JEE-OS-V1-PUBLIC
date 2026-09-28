import { Router } from "express";
import { verifyAuth } from "../firebaseAdmin";
import { apiLimiter } from "../middleware/rateLimiter";
import { handleCoachAnalyze, validateCoach } from "../controllers/coachController";

const router = Router();

router.post("/analyze", verifyAuth, apiLimiter, validateCoach, handleCoachAnalyze);

export default router;
