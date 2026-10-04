import {
  PyqPaperSchema,
  handlePyqPaperParse,
  handlePageVisionParse,
  handleAnalyzeDppMetadata,
  handleReverifyQuestion
} from './parser';

export interface MockTestParserDeps {
  verifyAuth: any;
  apiLimiter: any;
  resolveGeminiApiKey: (req: any) => string;
  aiCache: any;
  repairTruncatedJson: (str: string) => any;
  safeGetText: (resp: any, fallback: string) => string;
  generateWithFallback: (ai: any, contents: any, config: any) => Promise<any>;
}

/**
 * Registers all Express routes for mock test digitizing, vision parsing,
 * DPP metadata extraction, and first-principles question re-verification.
 */
export function registerMockTestParserRoutes(app: any, deps: MockTestParserDeps) {
  const { verifyAuth, apiLimiter, resolveGeminiApiKey, repairTruncatedJson, safeGetText, generateWithFallback } = deps;

  const validatePyqPaper = (req: any, res: any, next: any) => {
    const parsedBody = PyqPaperSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: "Invalid request payload", details: parsedBody.error.format() });
    }
    req.validatedBody = parsedBody.data;
    next();
  };

  const handlerDeps = {
    resolveGeminiApiKey,
    repairTruncatedJson,
    safeGetText,
    generateWithFallback
  };

  // 1. Full PYQ and coaching DPP worksheet parsing
  app.post(
    "/api/mocktest/parse-pyq-paper",
    verifyAuth,
    apiLimiter,
    validatePyqPaper,
    (req: any, res: any) => handlePyqPaperParse(req, res, handlerDeps)
  );

  // 2. Multimodal high-res page image OCR & diagram boundary extraction
  app.post(
    "/api/mocktest/parse-page-vision",
    verifyAuth,
    apiLimiter,
    (req: any, res: any) => handlePageVisionParse(req, res, handlerDeps)
  );

  // 3. DPP coaching institute and metadata auto-detection
  app.post(
    "/api/mocktest/analyze-dpp-metadata",
    verifyAuth,
    apiLimiter,
    (req: any, res: any) => handleAnalyzeDppMetadata(req, res, handlerDeps)
  );

  // 4. First-principles answer re-verification & solution derivation
  app.post(
    "/api/mocktest/reverify-question",
    verifyAuth,
    apiLimiter,
    (req: any, res: any) => handleReverifyQuestion(req, res, handlerDeps)
  );
}

// Re-export all submodules for direct testing and utilities
export * from './parser';
