import { MockTest } from '@/types/mockTest';
import { SubjectId } from '@/types';
import { auth } from '@/firebase';
import { PageLayoutModel, PageInkProfile, PaperIntegrityReport } from './pdf/types';
import { PdfTextExtractor } from './pdf/PdfTextExtractor';
import { OptionExtractor } from './pdf/OptionExtractor';
import { AnswerKeyExtractor, ExtractedGlobalAnswerKey, ExtractedAnswerKeyEntry } from './pdf/AnswerKeyExtractor';
import { DppMetadataAnalyzer, DppMetadataAnalysis } from './pdf/DppMetadataAnalyzer';
import { PdfOfflineParser } from './pdf/PdfOfflineParser';
import { MockTestBuilder } from './pdf/MockTestBuilder';
import { ConfidenceScorer, PaperConfidenceReport } from './pdf/ConfidenceScorer';
import { TrickyQuestionAuditor } from './pdf/TrickyQuestionAuditor';
import { StructuralIntegrityValidator } from './pdf/StructuralIntegrityValidator';
import { AdaptiveInkScanner } from './pdf/AdaptiveInkScanner';
import { DiagramOptionSlicer, DiagramOptionSlicerContext } from './pdf/DiagramOptionSlicer';
import { VisionFallbackEngine } from './pdf/VisionFallbackEngine';
import { DiagramAttachmentService } from './pdf/DiagramAttachmentService';
import { HealingParserEngine } from './pdf/HealingParserEngine';
import { sanitizeHtmlContent } from './pdf/sanitizeHtml';

export type { DppMetadataAnalysis, ExtractedGlobalAnswerKey, ExtractedAnswerKeyEntry, PaperConfidenceReport, PaperIntegrityReport };

export interface ParsePaperOptions {
  paperTitle?: string;
  targetSubject?: 'physics' | 'chemistry' | 'maths' | 'all';
  examMode?: 'main' | 'advanced';
  onProgress?: (status: string) => void;
}

export interface ParseDppOptions {
  dppTitle?: string;
  subject?: SubjectId;
  chapterId?: string;
  chapterName?: string;
  durationMinutes?: number;
  examMode?: 'main' | 'advanced';
  onProgress?: (status: string) => void;
}

/**
 * Validates that a file starts with authentic %PDF- magic bytes (0x25, 0x50, 0x44, 0x46, 0x2D).
 * Mathematically prevents extension-spoofing attacks (e.g. uploading .exe or .html renamed to .pdf).
 */
export async function validatePdfMagicBytes(file: File | Blob): Promise<boolean> {
  try {
    if (!file || file.size < 5) return false;
    const slice = file.slice(0, 5);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    return (
      bytes.length >= 5 &&
      bytes[0] === 0x25 && // %
      bytes[1] === 0x50 && // P
      bytes[2] === 0x44 && // D
      bytes[3] === 0x46 && // F
      bytes[4] === 0x2D    // -
    );
  } catch {
    return false;
  }
}

export { sanitizeHtmlContent };

export class PdfPaperParserService {
  static validatePdfMagicBytes = validatePdfMagicBytes;
  static sanitizeHtmlContent = sanitizeHtmlContent;

  /** Dynamic pdfjsLib loader */
  static async getPdfJs() {
    return PdfTextExtractor.getPdfJs();
  }

  // Diagram Cropping & Attachment delegates
  static detectDiagramCropRect = DiagramAttachmentService.detectDiagramCropRect;
  static async renderAndCropDiagram(
    fileOrPdf: File | any,
    pageNum: number,
    bbox?: number[],
    questionContext?: {
      qContent?: string;
      qNum?: number;
      localQNum?: number;
      sectionName?: string;
      options?: any[];
      targetQuestion?: any;
      pageQIndex?: number;
    },
    cachedLayout?: PageLayoutModel | Map<number, PageLayoutModel>,
    cachedInkProfile?: PageInkProfile | Map<number, PageInkProfile>
  ): Promise<string> {
    return DiagramAttachmentService.renderAndCropDiagram(
      fileOrPdf,
      pageNum,
      bbox,
      questionContext,
      cachedLayout,
      cachedInkProfile,
      () => PdfPaperParserService.getPdfJs()
    );
  }

  static async extractAndAttachDiagrams(
    file: File,
    parsedQuestions: any[],
    onProgress?: (status: string) => void
  ): Promise<void> {
    return DiagramAttachmentService.extractAndAttachDiagrams(
      file,
      parsedQuestions,
      onProgress,
      (f, p, b, q, l, i) => PdfPaperParserService.renderAndCropDiagram(f, p, b, q, l, i),
      () => PdfPaperParserService.getPdfJs()
    );
  }

  static isDiagramRedundant = DiagramAttachmentService.isDiagramRedundant;
  static locateQuestionPage = DiagramAttachmentService.locateQuestionPage;

  // Ink Scanning delegates
  static findVerticalInkValley = AdaptiveInkScanner.findVerticalInkValley;
  static findHorizontalInkValley = AdaptiveInkScanner.findHorizontalInkValley;
  static cropSubRectToDataUrl = AdaptiveInkScanner.cropSubRect;

  // Diagram option slicer
  static sliceDiagramOptions(
    fullCanvas: HTMLCanvasElement,
    cropRect: { cropX: number; cropY: number; cropW: number; cropH: number },
    itemsWithCoords: { str: string; x: number; y: number }[],
    questionContext?: DiagramOptionSlicerContext
  ): { [key: string]: string } | null {
    return DiagramOptionSlicer.sliceDiagramOptions(
      fullCanvas,
      cropRect,
      itemsWithCoords,
      questionContext,
      (canvas, rect) => PdfPaperParserService.cropSubRectToDataUrl(canvas, rect)
    );
  }

  // Text Extractor delegates
  static sortPdfTextItems = PdfTextExtractor.sortPdfTextItems;
  static async extractTextFromPDF(file: File, onProgress?: (status: string) => void): Promise<string> {
    return PdfTextExtractor.extractTextFromPDF(file, onProgress);
  }
  static detectScannedPdf = PdfTextExtractor.detectScannedPdf;
  static async fileToBase64(file: File): Promise<string | undefined> {
    return PdfTextExtractor.fileToBase64(file);
  }

  // Vision fallback delegates
  static getStoredGeminiKey(): string | undefined {
    return VisionFallbackEngine.getStoredGeminiKey();
  }
  static renderPageToDataUrl = VisionFallbackEngine.renderPageToDataUrl;
  static executeVisionPageFallback = VisionFallbackEngine.executeVisionPageFallback;
  static mergeVisionFallbackQuestions = VisionFallbackEngine.mergeVisionFallbackQuestions;

  /**
   * Main entry point: takes a PDF file, extracts text, converts questions to CBT MockTest.
   * Supports both digital text PDFs and scanned/raster image-only PDFs via Gemini Multimodal Vision.
   */
  static async parsePdfToMockTest(file: File, options?: ParsePaperOptions): Promise<MockTest> {
    if (file.size > 25 * 1024 * 1024) {
      throw new Error(`PDF file size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 25MB limit. Please compress or select a smaller PDF.`);
    }
    const rawText = await PdfPaperParserService.extractTextFromPDF(file, options?.onProgress);
    const hasText = Boolean(rawText && rawText.trim().length >= 30);
    const paperTitle = options?.paperTitle || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    let parsedQuestions: any[] = [];

    // Attempt AI server parsing if online
    if (typeof navigator === 'undefined' || navigator.onLine) {
      try {
        let token: string | undefined;
        try {
          token = await auth.currentUser?.getIdToken();
        } catch {
          // guest mode
        }

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const storedKey = PdfPaperParserService.getStoredGeminiKey();
        if (storedKey) {
          headers['x-gemini-api-key'] = storedKey;
        }

        options?.onProgress?.(hasText
          ? 'Preparing PDF for visual and text AI parsing...'
          : 'Scanned image-only PDF detected. Extracting questions via Gemini Multimodal Vision AI...');

        const pdfBase64 = await PdfPaperParserService.fileToBase64(file);

        if (pdfBase64 || hasText) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 75000);
          let response: Response | undefined;
          try {
            response = await fetch('/api/mocktest/parse-pyq-paper', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                rawText: hasText ? rawText : '',
                paperTitle,
                targetSubject: options?.targetSubject || 'all',
                pdfBase64,
                singleStage: true
              }),
              signal: controller.signal
            });
          } finally {
            clearTimeout(timeoutId);
          }

          if (response?.ok) {
            const data = await response.json();
            if (Array.isArray(data.questions) && data.questions.length > 0) {
              parsedQuestions = data.questions;
              if (hasText) {
                const heuristicQuestions = PdfPaperParserService.parsePaperTextHeuristic(rawText, options?.targetSubject);
                if (heuristicQuestions.length > 0) {
                  const keyData = rawText ? AnswerKeyExtractor.extractGlobalAnswerKey(rawText) : undefined;
                  const maxHNum = Math.max(0, ...heuristicQuestions.map(q => PdfOfflineParser.extractQuestionNumber(q) || 0));
                  const totalExpected = (keyData?.hasKeySection && keyData.entries.length > 0)
                    ? keyData.entries.length
                    : (maxHNum >= 10 ? maxHNum : undefined);
                  const merged = PdfPaperParserService.mergeParsedWithHeuristic(parsedQuestions, heuristicQuestions, totalExpected);
                  parsedQuestions = PdfOfflineParser.deduplicateQuestions(merged);
                  if (parsedQuestions.length > data.questions.length) {
                    console.log(`[Paper Parser] Backfilled missing questions: ${data.questions.length} -> ${parsedQuestions.length}`);
                  }
                }
              }
            }
          } else {
            console.warn(`Server PYQ parsing returned status ${response?.status ?? 'timeout'}. Falling back to heuristic parser.`);
          }
        }
      } catch (err) {
        console.warn("Server PYQ parse failed with error, using local fallback parser:", err);
      }
    }

    // Heuristic fallback if AI failed or was offline, ONLY IF selectable text was found in PDF
    if (parsedQuestions.length === 0 && hasText) {
      options?.onProgress?.('Using smart local parser to extract questions...');
      parsedQuestions = PdfPaperParserService.parsePaperTextHeuristic(rawText, options?.targetSubject);
    }

    // Answer-Key extraction: Authoritative, deterministic, and instant
    const keyData = rawText ? AnswerKeyExtractor.extractGlobalAnswerKey(rawText) : undefined;
    const hasExtractedAnswerKey = Boolean(keyData?.hasKeySection && keyData.entries.length > 0);

    // Apply extracted answer key to questions immediately so that integrity checks reflect actual answer coverage
    if (hasExtractedAnswerKey && keyData) {
      parsedQuestions.forEach((q, idx) => {
        if (!q.correctAnswer || q.correctAnswer === '0') {
          const qNum = Number(q.qNumber || q.questionNumber) || parseInt(String(q.content || '').match(/^(?:Q\.?\s*(\d+)|\b(\d{1,3})\b)/i)?.[1] || `${idx + 1}`, 10);
          const keyLookup = keyData.lookup(idx, qNum, q.sectionName || options?.targetSubject);
          if (keyLookup) {
            q.correctAnswer = keyLookup.normalizedAns;
            if (keyLookup.isNumerical) {
              q.type = 'NUMERICAL';
            }
            if (!q.solution) q.solution = {};
            if (!q.solution.text) {
              q.solution.text = `Official answer key: ${keyLookup.rawAns}. Verified from examination key sheet.`;
            }
          }
        }
      });
    }

    // TWO-BRAIN ARCHITECTURE: Structural Integrity Invariant Gate
    if (parsedQuestions.length > 0) {
      const integrity = StructuralIntegrityValidator.validatePaper(parsedQuestions, {
        rawText,
        expectedCount: keyData?.entries?.length
      });

      if (!integrity.isValid && integrity.failedPages.length > 0) {
        console.warn(`[parsePdfToMockTest] Structural integrity check flagged ${integrity.issues.length} issue(s) (score: ${integrity.integrityScore}). Triggering Targeted Vision AI fallback on page(s): ${integrity.failedPages.join(', ')}`);
        options?.onProgress?.(`Detected layout issues on page(s) ${integrity.failedPages.join(', ')}. Engaging Targeted Vision AI fallback...`);

        const visionQuestions = await PdfPaperParserService.executeVisionPageFallback(
          file,
          integrity.failedPages,
          paperTitle,
          options?.targetSubject || 'physics',
          options?.onProgress
        );

        if (visionQuestions.length > 0) {
          const merged = PdfPaperParserService.mergeVisionFallbackQuestions(
            parsedQuestions,
            visionQuestions,
            new Set(integrity.failedQuestionIndices),
            keyData
          );
          console.log(`[parsePdfToMockTest] Successfully healed paper using Targeted Vision AI: ${parsedQuestions.length} -> ${merged.length} questions`);
          parsedQuestions = merged;
        }
      }
    }

    // Emergency Vision Fallback if all preliminary parsers yielded 0 questions
    if (parsedQuestions.length === 0 && (typeof navigator === 'undefined' || navigator.onLine)) {
      options?.onProgress?.('Attempting emergency visual layout OCR...');
      const visionQuestions = await PdfPaperParserService.executeVisionPageFallback(
        file,
        [1, 2, 3],
        paperTitle,
        options?.targetSubject || 'physics',
        options?.onProgress
      );
      if (visionQuestions.length > 0) {
        parsedQuestions = visionQuestions;
      }
    }

    if (parsedQuestions.length === 0) {
      if (!hasText) {
        throw new Error("Could not extract questions from this scanned PDF. Multimodal AI processing was unreachable or returned no questions. Please ensure you are online with Gemini AI connected for image-based OCR, or provide a PDF with selectable text.");
      }
      throw new Error("Unable to identify questions in this document. Please ensure the PDF contains clear JEE questions with numbers and options.");
    }

    // Crop high-resolution diagrams from PDF if questions contain diagram metadata or visual references
    await PdfPaperParserService.extractAndAttachDiagrams(file, parsedQuestions, options?.onProgress);

    // Answer-Key Guard: If an official answer key was printed and extracted from the document,
    // skip auto-reverification completely to conserve Gemini API tokens.
    if (!hasExtractedAnswerKey) {
      // Automatically pre-verify tricky and diagram-heavy questions using multimodal AI reasoning
      try {
        await TrickyQuestionAuditor.autoReverifyQuestions(
          parsedQuestions,
          { targetSubject: options?.targetSubject },
          { onProgress: options?.onProgress }
        );
      } catch (err) {
        console.warn('[parsePdfToMockTest] Auto-reverification step encountered an issue:', err);
      }
    } else {
      console.log(`[parsePdfToMockTest] Answer key found in document (${keyData?.entries.length} entries). Skipping AI auto-reverification to conserve tokens.`);
      options?.onProgress?.(`Answer key found in document (${keyData?.entries.length} answers). Skipping AI auto-reverification to conserve tokens...`);
    }

    // Convert parsed items to typed MockQuestion[]
    return PdfPaperParserService.buildMockTestObject(paperTitle, parsedQuestions, rawText, options?.examMode);
  }

  /**
   * Specifically parses coaching DPP (Daily Practice Problem) worksheets and generates
   * a single-subject, chapter-focused timed drill test.
   * Supports scanned image-only worksheets via Gemini Multimodal Vision.
   */
  static async parseDppToMockTest(file: File, options?: ParseDppOptions): Promise<MockTest> {
    if (file.size > 25 * 1024 * 1024) {
      throw new Error(`PDF file size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 25MB limit. Please compress or select a smaller DPP worksheet.`);
    }
    const rawText = await PdfPaperParserService.extractTextFromPDF(file, options?.onProgress);
    const hasText = Boolean(rawText && rawText.trim().length >= 30);
    const dppTitle = options?.dppTitle || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const targetSubject = options?.subject || 'physics';

    let parsedQuestions: any[] = [];

    // Attempt AI server parsing if online
    if (typeof navigator === 'undefined' || navigator.onLine) {
      try {
        let token: string | undefined;
        try {
          token = await auth.currentUser?.getIdToken();
        } catch {
          // guest mode
        }

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const storedKey = PdfPaperParserService.getStoredGeminiKey();
        if (storedKey) {
          headers['x-gemini-api-key'] = storedKey;
        }

        options?.onProgress?.(hasText
          ? 'Preparing DPP for visual and text AI parsing...'
          : 'Scanned image-only DPP detected. Extracting questions via Gemini Multimodal Vision AI...');

        const pdfBase64 = await PdfPaperParserService.fileToBase64(file);

        if (pdfBase64 || hasText) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 75000);
          let response: Response | undefined;
          try {
            response = await fetch('/api/mocktest/parse-pyq-paper', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                rawText: hasText ? rawText : '',
                paperTitle: dppTitle,
                targetSubject,
                isDpp: true,
                chapterName: options?.chapterName,
                pdfBase64,
                singleStage: true
              }),
              signal: controller.signal
            });
          } finally {
            clearTimeout(timeoutId);
          }

          if (response?.ok) {
            const data = await response.json();
            if (Array.isArray(data.questions) && data.questions.length > 0) {
              parsedQuestions = data.questions;
              if (hasText) {
                const heuristicQuestions = PdfPaperParserService.parsePaperTextHeuristic(rawText, targetSubject);
                if (heuristicQuestions.length > 0) {
                  const keyData = rawText ? AnswerKeyExtractor.extractGlobalAnswerKey(rawText) : undefined;
                  const maxHNum = Math.max(0, ...heuristicQuestions.map(q => PdfOfflineParser.extractQuestionNumber(q) || 0));
                  const totalExpected = (keyData?.hasKeySection && keyData.entries.length > 0)
                    ? keyData.entries.length
                    : (maxHNum >= 10 ? maxHNum : undefined);
                  const merged = PdfPaperParserService.mergeParsedWithHeuristic(parsedQuestions, heuristicQuestions, totalExpected);
                  parsedQuestions = PdfOfflineParser.deduplicateQuestions(merged);
                  if (parsedQuestions.length > data.questions.length) {
                    console.log(`[DPP Parser] Backfilled missing questions: ${data.questions.length} -> ${parsedQuestions.length}`);
                  }
                }
              }
            }
          } else {
            console.warn(`Server DPP parsing returned status ${response?.status ?? 'timeout'}. Falling back to heuristic parser.`);
          }
        }
      } catch (err) {
        console.warn("Server DPP parse failed with error, using local fallback parser:", err);
      }
    }

    // Heuristic fallback if AI failed or was offline, ONLY IF selectable text was found in PDF
    if (parsedQuestions.length === 0 && hasText) {
      options?.onProgress?.('Using local parser to extract DPP questions...');
      parsedQuestions = PdfPaperParserService.parsePaperTextHeuristic(rawText, targetSubject);
    }

    // Answer-Key extraction: Authoritative, deterministic, and instant
    const keyData = rawText ? AnswerKeyExtractor.extractGlobalAnswerKey(rawText) : undefined;
    const hasExtractedAnswerKey = Boolean(keyData?.hasKeySection && keyData.entries.length > 0);

    // Apply extracted answer key to questions immediately so that integrity checks reflect actual answer coverage
    if (hasExtractedAnswerKey && keyData) {
      parsedQuestions.forEach((q, idx) => {
        if (!q.correctAnswer || q.correctAnswer === '0') {
          const qNum = Number(q.qNumber || q.questionNumber) || parseInt(String(q.content || '').match(/^(?:Q\.?\s*(\d+)|\b(\d{1,3})\b)/i)?.[1] || `${idx + 1}`, 10);
          const keyLookup = keyData.lookup(idx, qNum, q.sectionName || targetSubject);
          if (keyLookup) {
            q.correctAnswer = keyLookup.normalizedAns;
            if (keyLookup.isNumerical) {
              q.type = 'NUMERICAL';
            }
            if (!q.solution) q.solution = {};
            if (!q.solution.text) {
              q.solution.text = `Official answer key: ${keyLookup.rawAns}. Verified from examination key sheet.`;
            }
          }
        }
      });
    }

    // TWO-BRAIN ARCHITECTURE: Structural Integrity Invariant Gate
    if (parsedQuestions.length > 0) {
      const pageMatches = rawText ? rawText.match(/\[PAGE\s+(\d+)\]/g) : null;
      const totalPages = pageMatches ? pageMatches.length : undefined;

      const integrity = StructuralIntegrityValidator.validatePaper(parsedQuestions, {
        rawText,
        expectedCount: keyData?.entries?.length,
        totalPages
      });

      if (!integrity.isValid && integrity.failedPages.length > 0) {
        console.warn(`[parseDppToMockTest] Structural integrity check flagged ${integrity.issues.length} issue(s) (score: ${integrity.integrityScore}). Triggering Targeted Vision AI fallback on page(s): ${integrity.failedPages.join(', ')}`);
        options?.onProgress?.(`Detected layout issues on page(s) ${integrity.failedPages.join(', ')}. Engaging Targeted Vision AI fallback...`);

        const visionQuestions = await PdfPaperParserService.executeVisionPageFallback(
          file,
          integrity.failedPages,
          dppTitle,
          targetSubject,
          options?.onProgress
        );

        if (visionQuestions.length > 0) {
          const merged = PdfPaperParserService.mergeVisionFallbackQuestions(
            parsedQuestions,
            visionQuestions,
            new Set(integrity.failedQuestionIndices),
            keyData
          );
          console.log(`[parseDppToMockTest] Successfully healed DPP using Targeted Vision AI: ${parsedQuestions.length} -> ${merged.length} questions`);
          parsedQuestions = merged;
        }
      }
    }

    // Emergency Vision Fallback if all preliminary parsers yielded 0 questions
    if (parsedQuestions.length === 0 && (typeof navigator === 'undefined' || navigator.onLine)) {
      options?.onProgress?.('Attempting emergency visual layout OCR on DPP...');
      const visionQuestions = await PdfPaperParserService.executeVisionPageFallback(
        file,
        [1, 2, 3],
        dppTitle,
        targetSubject,
        options?.onProgress
      );
      if (visionQuestions.length > 0) {
        parsedQuestions = visionQuestions;
      }
    }

    if (parsedQuestions.length === 0) {
      if (!hasText) {
        throw new Error("Could not extract questions from this scanned DPP. Multimodal AI processing was unreachable or returned no questions. Please ensure you are online with Gemini AI connected for image-based OCR, or provide a PDF with selectable text.");
      }
      throw new Error("Unable to identify questions in this DPP. Please ensure the PDF contains clear problem statements with options.");
    }

    // Crop high-resolution diagrams from DPP PDF if questions contain diagram metadata or visual references
    await PdfPaperParserService.extractAndAttachDiagrams(file, parsedQuestions, options?.onProgress);

    // Answer-Key Guard: If an official answer key was printed and extracted from the document,
    // skip auto-reverification completely to conserve Gemini API tokens.
    if (!hasExtractedAnswerKey) {
      // Automatically pre-verify tricky and diagram-heavy questions using multimodal AI reasoning
      try {
        await TrickyQuestionAuditor.autoReverifyQuestions(
          parsedQuestions,
          { targetSubject, chapterName: options?.chapterName },
          { onProgress: options?.onProgress }
        );
      } catch (err) {
        console.warn('[parseDppToMockTest] Auto-reverification step encountered an issue:', err);
      }
    } else {
      console.log(`[parseDppToMockTest] Answer key found in document (${keyData?.entries.length} entries). Skipping AI auto-reverification to conserve tokens.`);
      options?.onProgress?.(`Answer key found in document (${keyData?.entries.length} answers). Skipping AI auto-reverification to conserve tokens...`);
    }

    return PdfPaperParserService.buildDppMockTestObject(dppTitle, parsedQuestions, options, rawText);
  }

  /**
   * Multi-stage self-healing parse loop: delegates to HealingParserEngine
   */
  static async parseWithHealing(
    file: File,
    options?: ParsePaperOptions | ParseDppOptions,
    isDpp: boolean = false
  ): Promise<{ mockTest: MockTest; confidence: PaperConfidenceReport }> {
    return HealingParserEngine.parseWithHealing(file, options, isDpp, {
      parsePdf: (f, o) => PdfPaperParserService.parsePdfToMockTest(f, o),
      parseDpp: (f, o) => PdfPaperParserService.parseDppToMockTest(f, o)
    });
  }

  // DPP Metadata Analyzer delegates
  static cleanDppFileName = DppMetadataAnalyzer.cleanDppFileName;
  static heuristicAnalyzeDppMetadata = DppMetadataAnalyzer.heuristicAnalyzeDppMetadata;
  static analyzeDppMetadata = DppMetadataAnalyzer.analyzeDppMetadata;

  // Option Extractor & Answer Key delegates
  static sanitizeOptionText = OptionExtractor.sanitizeOptionText;
  static normalizeAnswerValue = AnswerKeyExtractor.normalizeAnswerValue;
  static extractGlobalAnswerKey = AnswerKeyExtractor.extractGlobalAnswerKey;

  // Offline Parser delegates
  static sanitizeQuestionText = PdfOfflineParser.sanitizeQuestionText;
  static normalizeMathToLatex = PdfOfflineParser.normalizeMathToLatex;
  static foldStackedFractions = PdfOfflineParser.foldStackedFractions;
  static extractOptionsFromBlock = PdfOfflineParser.extractOptionsFromBlock;
  static parsePaperTextHeuristic = PdfOfflineParser.parsePaperTextHeuristic;
  static parseBlocksHeuristic = PdfOfflineParser.parseBlocksHeuristic;
  static parseLineByLineHeuristic = PdfOfflineParser.parseLineByLineHeuristic;
  static mergeParsedWithHeuristic = PdfOfflineParser.mergeParsedWithHeuristic;
  static deduplicateQuestions = PdfOfflineParser.deduplicateQuestions;

  // Confidence & Integrity delegates
  static scorePaperConfidence = ConfidenceScorer.scorePaper;
  static scoreQuestionConfidence = ConfidenceScorer.scoreQuestion;
  static healQuestion = ConfidenceScorer.healQuestion;
  static validatePaperIntegrity = StructuralIntegrityValidator.validatePaper;

  // Builder delegates
  static buildMockTestObject = MockTestBuilder.buildMockTestObject;
  static buildDppMockTestObject = MockTestBuilder.buildDppMockTestObject;
  static buildPyqMockTestObject = MockTestBuilder.buildPyqMockTestObject;
}
