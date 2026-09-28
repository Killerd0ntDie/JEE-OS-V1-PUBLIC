import { Router } from "express";
import { verifyAuth } from "../firebaseAdmin";
import { apiLimiter } from "../middleware/rateLimiter";
import { handleGenerateRevisionPlan, validateRevisionPlan } from "../controllers/plannerController";

const router = Router();

router.post("/generate-plan", verifyAuth, apiLimiter, validateRevisionPlan, handleGenerateRevisionPlan);

export default router;
