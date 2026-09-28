import { Router } from "express";
import { verifyAuth } from "../firebaseAdmin";
import { apiLimiter } from "../middleware/rateLimiter";
import { handlePracticeGenerate, validatePractice } from "../controllers/practiceController";

const router = Router();

router.post("/generate", verifyAuth, apiLimiter, validatePractice, handlePracticeGenerate);

export default router;
