import { Express } from "express";
import coachRoutes from "./coachRoutes";
import practiceRoutes from "./practiceRoutes";
import mockTestRoutes from "./mockTestRoutes";
import plannerRoutes from "./plannerRoutes";
import healthRoutes from "./healthRoutes";
import { errorHandler } from "../middleware/errorHandler";
import { registerMockTestParserRoutes } from "../mockTestParser";
import { 
  verifyAuth 
} from "../firebaseAdmin";
import { 
  apiLimiter 
} from "../middleware/rateLimiter";
import { 
  resolveGeminiApiKey, 
  aiCache, 
  repairTruncatedJson, 
  safeGetText, 
  generateWithFallback 
} from "../services/aiService";
import { handleMocktestGenerate, validateMocktest } from "../controllers/mockTestController";

export function registerRoutes(app: Express) {
  // Health route
  app.use("/api", healthRoutes);

  // Domain feature routes
  app.use("/api/coach", coachRoutes);
  app.use("/api/practice", practiceRoutes);
  app.use("/api/mocktest", mockTestRoutes);
  app.use("/api/planner", plannerRoutes);

  // Backward compatibility alias for chapter mock generation
  app.post("/api/generate-chapter-mock", verifyAuth, apiLimiter, validateMocktest, handleMocktestGenerate);

  // PDF Parser routes
  registerMockTestParserRoutes(app, {
    verifyAuth,
    apiLimiter,
    resolveGeminiApiKey,
    aiCache,
    repairTruncatedJson,
    safeGetText,
    generateWithFallback
  });

  // Centralized Error Handling Middleware
  app.use(errorHandler);
}
