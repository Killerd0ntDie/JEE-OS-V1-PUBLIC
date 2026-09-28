import { Router } from "express";
import { verifyAuth } from "../firebaseAdmin";
import { apiLimiter } from "../middleware/rateLimiter";
import { 
  handleMocktestGenerate, 
  validateMocktest,
  handleScorecardParse,
  validateScorecard,
  handleGenerateExplanation,
  validateExplanation,
  handleMentorChat,
  validateMentorChat
} from "../controllers/mockTestController";

const router = Router();

router.post("/generate", verifyAuth, apiLimiter, validateMocktest, handleMocktestGenerate);
router.post("/parse-scorecard", verifyAuth, apiLimiter, validateScorecard, handleScorecardParse);
router.post("/generate-explanation", verifyAuth, apiLimiter, validateExplanation, handleGenerateExplanation);
router.post("/mentor-chat", verifyAuth, apiLimiter, validateMentorChat, handleMentorChat);

export default router;
