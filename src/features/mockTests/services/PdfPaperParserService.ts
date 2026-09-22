import { MockTest, MockQuestion, MockTestSection } from '@/types/mockTest';
import { SubjectId } from '@/types';
import { auth } from '@/firebase';
import { decodeSecret } from '@/utils/crypto';
import { normalizeChemistryAndOrbitals } from '@/components/MathRenderer';
import { PdfLexicalParser } from './PdfLexicalParser';
import { PageLayoutAnalyzer } from './pdf/PageLayoutAnalyzer';
import { DiagramCropperEngine } from './pdf/DiagramCropperEngine';
import { AdaptiveInkScanner } from './pdf/AdaptiveInkScanner';
import { PageLayoutModel, PageInkProfile } from './pdf/types';
import { PdfTextExtractor } from './pdf/PdfTextExtractor';
import { OptionExtractor } from './pdf/OptionExtractor';
import { AnswerKeyExtractor, ExtractedGlobalAnswerKey, ExtractedAnswerKeyEntry } from './pdf/AnswerKeyExtractor';
import { DppMetadataAnalyzer, DppMetadataAnalysis } from './pdf/DppMetadataAnalyzer';
import { PdfOfflineParser } from './pdf/PdfOfflineParser';
import { MockTestBuilder } from './pdf/MockTestBuilder';
import { ConfidenceScorer, PaperConfidenceReport } from './pdf/ConfidenceScorer';
import { TrickyQuestionAuditor } from './pdf/TrickyQuestionAuditor';
import { StructuralIntegrityValidator } from './pdf/StructuralIntegrityValidator';
import { PaperIntegrityReport } from './pdf/types';

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

import { sanitizeHtmlContent } from './pdf/sanitizeHtml';
export { sanitizeHtmlContent };


export class PdfPaperParserService {
  static validatePdfMagicBytes = validatePdfMagicBytes;
  static sanitizeHtmlContent = sanitizeHtmlContent;

  /**
   * Dynamically loads pdfjsLib and initializes worker on demand.
   */
  private static async getPdfJs() {
    return PdfTextExtractor.getPdfJs();
  }

  /**
   * Renders a specific bounding box from a PDF page onto an off-screen canvas,
   * returning a crisp base64 WebP image data URL.
   */
  /**
   * Intelligently detects visual diagram boundaries on a rendered PDF canvas,
   * snaps to the true ink boundaries, and trims excess whitespace with a clean padding.
   * Backwards-compatible delegate that routes through DiagramCropperEngine.
   */
  static detectDiagramCropRect(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    bbox?: number[],
    fence?: { fenceYmin: number; fenceYmax: number }
  ): { cropX: number; cropY: number; cropW: number; cropH: number } {
    try {
      const rect = DiagramCropperEngine.detectCropRect(
        ctx,
        width,
        height,
        null,
        bbox,
        fence ? { fence } : undefined
      );
      if (rect) {
        return { cropX: rect.cropX, cropY: rect.cropY, cropW: rect.cropW, cropH: rect.cropH };
      }
      return {
        cropX: 0,
        cropY: fence?.fenceYmin ?? 0,
        cropW: width,
        cropH: fence ? Math.max(10, fence.fenceYmax - fence.fenceYmin) : height
      };
    } catch (e) {
      console.warn('Error in detectDiagramCropRect delegate:', e);
      return { cropX: 0, cropY: 0, cropW: width, cropH: height };
    }
  }

  /**
   * Renders a specific bounding box or question-fenced diagram from a PDF page onto an off-screen canvas,
   * returning a crisp base64 WebP image data URL.
   * Routes all diagram cropping directly through DiagramCropperEngine with PageLayoutAnalyzer fencing
   * and AdaptiveInkScanner color-aware ink detection.
   */
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
    },
    cachedLayout?: PageLayoutModel,
    cachedInkProfile?: PageInkProfile
  ): Promise<string> {
    try {
      if (typeof document === 'undefined') return '';

      const pdfjsLib = await this.getPdfJs();
      let pdf = fileOrPdf;
      if (fileOrPdf instanceof File || (typeof Blob !== 'undefined' && fileOrPdf instanceof Blob)) {
        const buffer = await fileOrPdf.arrayBuffer();
        pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      }
      if (!pdf || typeof pdf.getPage !== 'function') return '';

      const safePageNum = Math.min(Math.max(1, pageNum || 1), pdf.numPages);
      const page = await pdf.getPage(safePageNum);

      // Render at scale 2.0 for high DPI visual crispness (math symbols, bonds, indices)
      const scale = 2.0;
      const viewport = page.getViewport({ scale });

      const fullCanvas = document.createElement('canvas');
      fullCanvas.width = Math.floor(viewport.width);
      fullCanvas.height = Math.floor(viewport.height);
      const ctx = fullCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return '';

      await page.render({ canvasContext: ctx, viewport }).promise;

      // 1. Two-Pass Spatial Layout Model (cached or freshly analyzed)
      let layoutModel = cachedLayout;
      if (!layoutModel) {
        try {
          layoutModel = await PageLayoutAnalyzer.analyzePage(page, viewport, scale);
        } catch (layoutErr) {
          console.warn('[renderAndCropDiagram] PageLayoutAnalyzer error:', layoutErr);
        }
      }

      // If text layout model has no questions (scanned / image-only PDF), use AdaptiveInkScanner visual block detection!
      if (!layoutModel || layoutModel.questions.length === 0) {
        const visualQuestions = AdaptiveInkScanner.detectVisualQuestionBlocks(fullCanvas);
        if (visualQuestions.length > 0) {
          layoutModel = {
            pageNum: safePageNum,
            viewportWidth: fullCanvas.width,
            viewportHeight: fullCanvas.height,
            scale,
            headerHeight: 0,
            footerHeight: fullCanvas.height,
            columnCount: 1,
            lines: [],
            sections: [],
            questions: visualQuestions
          };
        }
      }

      // 2. Adaptive Ink Profiling (cached or freshly scanned)
      const inkProfile = cachedInkProfile || AdaptiveInkScanner.computeInkProfile(ctx, fullCanvas.width, fullCanvas.height);

      // 3. Diagram Cropper Engine (Primary Execution)
      const engineCrop = DiagramCropperEngine.cropDiagram(
        fullCanvas,
        layoutModel,
        bbox,
        questionContext,
        inkProfile
      );

      if (engineCrop?.dataUrl) {
        // Clean and heal diagram options
        OptionExtractor.cleanOptions(questionContext?.targetQuestion?.options);
        OptionExtractor.cleanOptions(questionContext?.options);
        return engineCrop.dataUrl;
      }

      return '';
    } catch (err) {
      console.warn('Failed to crop diagram from PDF:', err);
      return '';
    }
  }

  /**
   * Scans a vertical column strip around targetX to find the column index with minimal ink (an ink valley).
   * Prevents cutting through chemical bonds, lone pairs, or atoms during diagram column slicing.
   */
  static findVerticalInkValley(
    fullCanvas: HTMLCanvasElement,
    targetX: number,
    startY: number,
    height: number,
    searchRadius: number = 40
  ): number {
    return AdaptiveInkScanner.findVerticalInkValley(fullCanvas, targetX, startY, height, searchRadius);
  }

  /**
   * Scans a horizontal row strip around targetY to find the row index with minimal ink (an ink valley).
   * Prevents cutting through chemical structures during 2x2 quadrant grid slicing.
   */
  static findHorizontalInkValley(
    fullCanvas: HTMLCanvasElement,
    targetY: number,
    startX: number,
    width: number,
    searchRadius: number = 30
  ): number {
    return AdaptiveInkScanner.findHorizontalInkValley(fullCanvas, targetY, startX, width, searchRadius);
  }

  /**
   * Crops a rectangular sub-region from fullCanvas, trims extra whitespace with 14px padding,
   * fills background with pure white (#ffffff), and returns a crisp base64 WebP image.
   */
  static cropSubRectToDataUrl(
    fullCanvas: HTMLCanvasElement,
    rect: { x: number; y: number; w: number; h: number }
  ): string {
    return AdaptiveInkScanner.cropSubRect(fullCanvas, rect);
  }

  /**
   * Intelligently detects whether a cropped diagram contains option drawings (e.g. 1x4 horizontal row or 2x2 grid)
   * and slices each option into a dedicated crisp WebP data URL, populating questionContext.options.
   */
  static sliceDiagramOptions(
    fullCanvas: HTMLCanvasElement,
    cropRect: { cropX: number; cropY: number; cropW: number; cropH: number },
    itemsWithCoords: { str: string; x: number; y: number }[],
    questionContext?: {
      qContent?: string;
      qNum?: number;
      localQNum?: number;
      sectionName?: string;
      options?: any[];
      targetQuestion?: any;
    }
  ): { [key: string]: string } | null {
    try {
      if (typeof document === 'undefined' || !fullCanvas || cropRect.cropW < 40 || cropRect.cropH < 30) {
        return null;
      }

      // 1. Locate option markers (A)-(D) or (1)-(4) inside diagram bounds (with a generous margin)
      const markerRegex = /^\s*\(?([A-D1-4])\)?[.:)]?\s*$/i;
      const candidates = itemsWithCoords.filter(it =>
        it.y >= cropRect.cropY - 25 &&
        it.y <= cropRect.cropY + cropRect.cropH + 25 &&
        it.x >= cropRect.cropX - 15 &&
        it.x <= cropRect.cropX + cropRect.cropW + 15 &&
        markerRegex.test(it.str)
      );

      const markerMap = new Map<string, { id: string; x: number; y: number }>();
      for (const c of candidates) {
        const m = c.str.match(markerRegex);
        if (m) {
          let id = m[1].toUpperCase();
          if (id === '1') id = 'A';
          else if (id === '2') id = 'B';
          else if (id === '3') id = 'C';
          else if (id === '4') id = 'D';
          if (!markerMap.has(id)) {
            markerMap.set(id, { id, x: c.x, y: c.y });
          }
        }
      }

      const hasAllFourMarkers = ['A', 'B', 'C', 'D'].every(id => markerMap.has(id));

      // 2. Check if question options are diagram placeholders
      const rawOptions = questionContext?.options || questionContext?.targetQuestion?.options || [];
      const optionsAreDiagramPlaceholders = Array.isArray(rawOptions) && rawOptions.length === 4 &&
        rawOptions.every((o: any) => {
          const t = typeof o === 'string' ? o : (o?.text || '');
          return !t.trim() || /^\s*\(?[A-D1-4]\)?\s*$/i.test(t) || /^\s*Option\s+[A-D1-4]\s*$/i.test(t) || /structure\s*\([A-D]\)/i.test(t);
        });

      if (!hasAllFourMarkers && !optionsAreDiagramPlaceholders) {
        return null;
      }

      const optSlices: { [key: string]: string } = {};

      if (hasAllFourMarkers) {
        const mA = markerMap.get('A')!;
        const mB = markerMap.get('B')!;
        const mC = markerMap.get('C')!;
        const mD = markerMap.get('D')!;
        const allM = [mA, mB, mC, mD];

        const minY = Math.min(...allM.map(m => m.y));
        const maxY = Math.max(...allM.map(m => m.y));
        const ySpan = maxY - minY;

        if (ySpan < cropRect.cropH * 0.35) {
          // Layout A: 1x4 Horizontal Row (e.g. SO3 structures)
          const sorted = [...allM].sort((a, b) => a.x - b.x);
          const mid01 = (sorted[0].x + sorted[1].x) / 2;
          const mid12 = (sorted[1].x + sorted[2].x) / 2;
          const mid23 = (sorted[2].x + sorted[3].x) / 2;

          const cut01 = this.findVerticalInkValley(fullCanvas, mid01, cropRect.cropY, cropRect.cropH);
          const cut12 = this.findVerticalInkValley(fullCanvas, mid12, cropRect.cropY, cropRect.cropH);
          const cut23 = this.findVerticalInkValley(fullCanvas, mid23, cropRect.cropY, cropRect.cropH);

          const colBounds = [
            { id: sorted[0].id, x: cropRect.cropX, w: cut01 - cropRect.cropX },
            { id: sorted[1].id, x: cut01, w: cut12 - cut01 },
            { id: sorted[2].id, x: cut12, w: cut23 - cut12 },
            { id: sorted[3].id, x: cut23, w: (cropRect.cropX + cropRect.cropW) - cut23 }
          ];

          for (const col of colBounds) {
            const url = this.cropSubRectToDataUrl(fullCanvas, {
              x: col.x,
              y: cropRect.cropY,
              w: col.w,
              h: cropRect.cropH
            });
            if (url) optSlices[col.id] = url;
          }
        } else {
          // Layout B: 2x2 Grid (e.g. Lewis structures)
          const sortedByY = [...allM].sort((a, b) => a.y - b.y);
          const topTwo = sortedByY.slice(0, 2).sort((a, b) => a.x - b.x);
          const botTwo = sortedByY.slice(2).sort((a, b) => a.x - b.x);

          const midX = ((topTwo[0].x + topTwo[1].x) / 2 + (botTwo[0].x + botTwo[1].x) / 2) / 2;
          const midY = ((topTwo[0].y + botTwo[0].y) / 2 + (topTwo[1].y + botTwo[1].y) / 2) / 2;

          const cutX = this.findVerticalInkValley(fullCanvas, midX, cropRect.cropY, cropRect.cropH);
          const cutY = this.findHorizontalInkValley(fullCanvas, midY, cropRect.cropX, cropRect.cropW);

          const quadBounds = [
            { id: topTwo[0].id, x: cropRect.cropX, y: cropRect.cropY, w: cutX - cropRect.cropX, h: cutY - cropRect.cropY },
            { id: topTwo[1].id, x: cutX, y: cropRect.cropY, w: (cropRect.cropX + cropRect.cropW) - cutX, h: cutY - cropRect.cropY },
            { id: botTwo[0].id, x: cropRect.cropX, y: cutY, w: cutX - cropRect.cropX, h: (cropRect.cropY + cropRect.cropH) - cutY },
            { id: botTwo[1].id, x: cutX, y: cutY, w: (cropRect.cropX + cropRect.cropW) - cutX, h: (cropRect.cropY + cropRect.cropH) - cutY }
          ];

          for (const q of quadBounds) {
            const url = this.cropSubRectToDataUrl(fullCanvas, {
              x: q.x,
              y: q.y,
              w: q.w,
              h: q.h
            });
            if (url) optSlices[q.id] = url;
          }
        }
      } else if (optionsAreDiagramPlaceholders) {
        // Fallback: Grid detection by aspect ratio when option markers are embedded purely as graphics
        const aspectRatio = cropRect.cropW / Math.max(1, cropRect.cropH);
        if (aspectRatio >= 2.0) {
          const colW = cropRect.cropW / 4;
          const cut01 = this.findVerticalInkValley(fullCanvas, cropRect.cropX + colW, cropRect.cropY, cropRect.cropH);
          const cut12 = this.findVerticalInkValley(fullCanvas, cropRect.cropX + colW * 2, cropRect.cropY, cropRect.cropH);
          const cut23 = this.findVerticalInkValley(fullCanvas, cropRect.cropX + colW * 3, cropRect.cropY, cropRect.cropH);

          const cols = [
            { id: 'A', x: cropRect.cropX, w: cut01 - cropRect.cropX },
            { id: 'B', x: cut01, w: cut12 - cut01 },
            { id: 'C', x: cut12, w: cut23 - cut12 },
            { id: 'D', x: cut23, w: (cropRect.cropX + cropRect.cropW) - cut23 }
          ];
          for (const col of cols) {
            const url = this.cropSubRectToDataUrl(fullCanvas, { x: col.x, y: cropRect.cropY, w: col.w, h: cropRect.cropH });
            if (url) optSlices[col.id] = url;
          }
        } else if (aspectRatio <= 1.8 && cropRect.cropH >= 150) {
          const midX = cropRect.cropX + cropRect.cropW / 2;
          const midY = cropRect.cropY + cropRect.cropH / 2;
          const cutX = this.findVerticalInkValley(fullCanvas, midX, cropRect.cropY, cropRect.cropH);
          const cutY = this.findHorizontalInkValley(fullCanvas, midY, cropRect.cropX, cropRect.cropW);

          const quads = [
            { id: 'A', x: cropRect.cropX, y: cropRect.cropY, w: cutX - cropRect.cropX, h: cutY - cropRect.cropY },
            { id: 'B', x: cutX, y: cropRect.cropY, w: (cropRect.cropX + cropRect.cropW) - cutX, h: cutY - cropRect.cropY },
            { id: 'C', x: cropRect.cropX, y: cutY, w: cutX - cropRect.cropX, h: (cropRect.cropY + cropRect.cropH) - cutY },
            { id: 'D', x: cutX, y: cutY, w: (cropRect.cropX + cropRect.cropW) - cutX, h: (cropRect.cropY + cropRect.cropH) - cutY }
          ];
          for (const q of quads) {
            const url = this.cropSubRectToDataUrl(fullCanvas, { x: q.x, y: q.y, w: q.w, h: q.h });
            if (url) optSlices[q.id] = url;
          }
        }
      }

      // If we got slices for options A, B, C, D: update option models
      if (optSlices.A && optSlices.B && optSlices.C && optSlices.D) {
        const updateOptionList = (opts: any[]) => {
          if (!Array.isArray(opts) || opts.length === 0) return;
          for (let i = 0; i < opts.length; i++) {
            const char = String.fromCharCode(65 + i);
            const sliceUrl = optSlices[char];
            if (sliceUrl) {
              if (typeof opts[i] === 'string') {
                opts[i] = `![Option ${char}](${sliceUrl})`;
              } else if (opts[i] && typeof opts[i] === 'object') {
                const existingText = opts[i].text || '';
                const isShort = !existingText.trim() || /^\s*\(?[A-D1-4]\)?\s*$/i.test(existingText) || /^\s*Option\s+[A-D1-4]\s*$/i.test(existingText) || /structure\s*\([A-D]\)/i.test(existingText);
                opts[i].text = isShort ? `![Option ${char}](${sliceUrl})` : `![Option ${char}](${sliceUrl})\n${existingText}`;
              }
            }
          }
        };

        if (questionContext?.targetQuestion?.options) {
          updateOptionList(questionContext.targetQuestion.options);
        }
        if (questionContext?.options) {
          updateOptionList(questionContext.options);
        }
        return optSlices;
      }

      return null;
    } catch (e) {
      console.warn('Error slicing diagram options:', e);
      return null;
    }
  }

  static sortPdfTextItems = PdfTextExtractor.sortPdfTextItems;
  static async extractTextFromPDF(file: File, onProgress?: (status: string) => void): Promise<string> {
    return PdfTextExtractor.extractTextFromPDF(file, onProgress);
  }
  static detectScannedPdf = PdfTextExtractor.detectScannedPdf;
  private static async fileToBase64(file: File): Promise<string | undefined> {
    return PdfTextExtractor.fileToBase64(file);
  }

  /**
   * Reads stored Gemini API key from browser localStorage, auto-decoding if obfuscated.
   */
  private static getStoredGeminiKey(): string | undefined {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('gemini_api_key') || localStorage.getItem('jeeos_gemini_api_key');
        if (raw) {
          const decoded = decodeSecret(raw);
          if (decoded && decoded.trim().length > 10) {
            return decoded.trim();
          }
          if (raw.trim().length > 10) {
            return raw.trim();
          }
        }
      }
    } catch {
      // Ignore localStorage access errors
    }
    return undefined;
  }

  /**
   * Renders a specific PDF page to a high-DPI canvas and returns a base64 WebP data URL.
   * Cleans up canvas context and dimensions to avoid browser tab memory pressure.
   */
  static async renderPageToDataUrl(fileOrPdf: File | any, pageNum: number): Promise<string> {
    try {
      if (typeof document === 'undefined') return '';
      const pdfjsLib = await this.getPdfJs();
      let pdf = fileOrPdf;
      if (fileOrPdf instanceof File || (typeof Blob !== 'undefined' && fileOrPdf instanceof Blob)) {
        const buffer = await fileOrPdf.arrayBuffer();
        pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      }
      if (!pdf || typeof pdf.getPage !== 'function') return '';

      const safePage = Math.min(Math.max(1, pageNum), pdf.numPages || 1);
      const page = await pdf.getPage(safePage);
      const scale = 1.75; // Optimal trade-off between OCR crispness and payload size
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/webp', 0.88);

      // Free canvas memory
      canvas.width = 0;
      canvas.height = 0;

      return dataUrl;
    } catch (err) {
      console.warn(`[renderPageToDataUrl] Failed to render page ${pageNum}:`, err);
      return '';
    }
  }

  /**
   * Brain 2: Targeted Vision AI fallback.
   * Renders only the failing pages to image and requests high-fidelity visual layout parsing.
   */
  static async executeVisionPageFallback(
    file: File,
    failedPages: number[],
    paperTitle: string,
    targetSubject: string,
    onProgress?: (msg: string) => void
  ): Promise<any[]> {
    if (!failedPages || failedPages.length === 0) return [];
    if (typeof navigator !== 'undefined' && !navigator.onLine) return [];

    try {
      let token: string | undefined;
      try {
        token = await auth.currentUser?.getIdToken();
      } catch {
        // guest mode
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const storedKey = this.getStoredGeminiKey();
      if (storedKey) headers['x-gemini-api-key'] = storedKey;

      const pageImages: { pageNumber: number; imageBase64: string }[] = [];

      for (const pageNum of failedPages) {
        onProgress?.(`Rendering page ${pageNum} for targeted visual recovery...`);
        const img = await this.renderPageToDataUrl(file, pageNum);
        if (img) {
          pageImages.push({ pageNumber: pageNum, imageBase64: img });
        }
      }

      if (pageImages.length === 0) return [];

      onProgress?.(`Extracting questions from ${pageImages.length} page(s) via Gemini Vision OCR...`);

      const resp = await fetch('/api/mocktest/parse-page-vision', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          pageImages,
          paperTitle,
          targetSubject
        })
      });

      if (!resp.ok) {
        console.warn(`[executeVisionPageFallback] Server returned status ${resp.status}`);
        return [];
      }

      const data = await resp.json();
      return Array.isArray(data.questions) ? data.questions : [];
    } catch (err) {
      console.warn('[executeVisionPageFallback] Failed with error:', err);
      return [];
    }
  }

  /**
   * Intelligently merges deterministic questions with vision fallback questions.
   * Replaces broken or missing questions while strictly preserving printed answer keys.
   */
  static mergeVisionFallbackQuestions(
    baseQuestions: any[],
    visionQuestions: any[],
    failedIndices: Set<number>,
    keyData?: ExtractedGlobalAnswerKey
  ): any[] {
    if (!visionQuestions || visionQuestions.length === 0) return baseQuestions;

    const merged = [...baseQuestions];
    const extractNum = (q: any) => q?.localQuestionNumber || q?.qNumber || q?.questionNumber;

    // Map vision questions by local number
    const visionMap = new Map<number, any>();
    for (const vq of visionQuestions) {
      const num = extractNum(vq);
      if (typeof num === 'number' && num > 0) {
        visionMap.set(num, vq);
      }
    }

    // 1. Substitute failed questions
    for (const idx of failedIndices) {
      const baseQ = merged[idx];
      if (!baseQ) continue;
      const num = extractNum(baseQ) || (idx + 1);
      const visionQ = visionMap.get(num);

      if (visionQ) {
        // Replace corrupted content and options with visual extraction
        const healedQ = {
          ...baseQ,
          content: visionQ.content || baseQ.content,
          options: (Array.isArray(visionQ.options) && visionQ.options.length === 4) ? visionQ.options : baseQ.options,
          type: visionQ.type || baseQ.type,
          hasDiagram: visionQ.hasDiagram ?? baseQ.hasDiagram,
          diagramDescription: visionQ.diagramDescription || baseQ.diagramDescription,
          imageUrl: baseQ.imageUrl || visionQ.imageUrl
        };

        // Enforce printed answer key (authoritative)
        if (keyData?.hasKeySection) {
          const matchedKey = keyData.lookup(idx, num, baseQ.sectionName);
          if (matchedKey) {
            healedQ.correctAnswer = matchedKey.normalizedAns;
          }
        } else if (visionQ.correctAnswer && (!baseQ.correctAnswer || baseQ.correctAnswer === '0')) {
          healedQ.correctAnswer = visionQ.correctAnswer;
        }

        merged[idx] = healedQ;
        visionMap.delete(num); // Consumed
      }
    }

    // 2. Insert any questions that deterministic parsing completely missed (sequence gaps)
    for (const [missingNum, vq] of visionMap.entries()) {
      let insertIdx = merged.findIndex(q => (extractNum(q) || 0) > missingNum);
      if (insertIdx === -1) insertIdx = merged.length;

      const newQ = { ...vq };
      if (keyData?.hasKeySection) {
        const matchedKey = keyData.lookup(insertIdx, missingNum, newQ.sectionName);
        if (matchedKey) {
          newQ.correctAnswer = matchedKey.normalizedAns;
        }
      }
      merged.splice(insertIdx, 0, newQ);
    }

    return merged;
  }

  /**
   * Main entry point: takes a PDF file, extracts text, converts questions to CBT MockTest.
   * Supports both digital text PDFs and scanned/raster image-only PDFs via Gemini Multimodal Vision.
   */
  static async parsePdfToMockTest(file: File, options?: ParsePaperOptions): Promise<MockTest> {
    if (file.size > 25 * 1024 * 1024) {
      throw new Error(`PDF file size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 25MB limit. Please compress or select a smaller PDF.`);
    }
    const rawText = await this.extractTextFromPDF(file, options?.onProgress);
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
          headers['Authorization'] = `Bearer ${token}`;
        }
        const storedKey = this.getStoredGeminiKey();
        if (storedKey) {
          headers['x-gemini-api-key'] = storedKey;
        }

        options?.onProgress?.(hasText
          ? 'Preparing PDF for visual and text AI parsing...'
          : 'Scanned image-only PDF detected. Extracting questions via Gemini Multimodal Vision AI...');

        const pdfBase64 = await this.fileToBase64(file);

        if (pdfBase64 || hasText) {
          const response = await fetch('/api/mocktest/parse-pyq-paper', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              rawText: hasText ? rawText : '',
              paperTitle,
              targetSubject: options?.targetSubject || 'all',
              pdfBase64,
              singleStage: true
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data.questions) && data.questions.length > 0) {
              parsedQuestions = data.questions;
              if (hasText) {
                const heuristicQuestions = this.parsePaperTextHeuristic(rawText, options?.targetSubject);
                if (heuristicQuestions.length > 0) {
                  const merged = this.mergeParsedWithHeuristic(parsedQuestions, heuristicQuestions);
                  if (merged.length > parsedQuestions.length || heuristicQuestions.length > parsedQuestions.length) {
                    console.warn(`[Paper Parser] Merged missing questions from document: ${parsedQuestions.length} -> ${merged.length}`);
                    parsedQuestions = merged;
                  }
                }
              }
            }
          } else {
            console.warn(`Server PYQ parsing returned status ${response.status}. Falling back to heuristic parser.`);
          }
        }
      } catch (err) {
        console.warn("Server PYQ parse failed with error, using local fallback parser:", err);
      }
    }

    // Heuristic fallback if AI failed or was offline, ONLY IF selectable text was found in PDF
    if (parsedQuestions.length === 0 && hasText) {
      options?.onProgress?.('Using smart local parser to extract questions...');
      parsedQuestions = this.parsePaperTextHeuristic(rawText, options?.targetSubject);
    }

    // Answer-Key extraction: Authoritative, deterministic, and instant
    const keyData = rawText ? AnswerKeyExtractor.extractGlobalAnswerKey(rawText) : undefined;
    const hasExtractedAnswerKey = Boolean(keyData && keyData.hasKeySection && keyData.entries.length > 0);

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

        const visionQuestions = await this.executeVisionPageFallback(
          file,
          integrity.failedPages,
          paperTitle,
          options?.targetSubject || 'physics',
          options?.onProgress
        );

        if (visionQuestions.length > 0) {
          const merged = this.mergeVisionFallbackQuestions(
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
      const visionQuestions = await this.executeVisionPageFallback(
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
    await this.extractAndAttachDiagrams(file, parsedQuestions, options?.onProgress);

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
    return this.buildMockTestObject(paperTitle, parsedQuestions, rawText, options?.examMode);
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
    const rawText = await this.extractTextFromPDF(file, options?.onProgress);
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
          headers['Authorization'] = `Bearer ${token}`;
        }
        const storedKey = this.getStoredGeminiKey();
        if (storedKey) {
          headers['x-gemini-api-key'] = storedKey;
        }

        options?.onProgress?.(hasText
          ? 'Preparing DPP for visual and text AI parsing...'
          : 'Scanned image-only DPP detected. Extracting questions via Gemini Multimodal Vision AI...');

        const pdfBase64 = await this.fileToBase64(file);

        if (pdfBase64 || hasText) {
          const response = await fetch('/api/mocktest/parse-pyq-paper', {
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
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data.questions) && data.questions.length > 0) {
              parsedQuestions = data.questions;
              if (hasText) {
                const heuristicQuestions = this.parsePaperTextHeuristic(rawText, targetSubject);
                if (heuristicQuestions.length > 0) {
                  const merged = this.mergeParsedWithHeuristic(parsedQuestions, heuristicQuestions);
                  if (merged.length > parsedQuestions.length || heuristicQuestions.length > parsedQuestions.length) {
                    console.warn(`[DPP Parser] Merged missing questions from document: ${parsedQuestions.length} -> ${merged.length}`);
                    parsedQuestions = merged;
                  }
                }
              }
            }
          } else {
            console.warn(`Server DPP parsing returned status ${response.status}. Falling back to heuristic parser.`);
          }
        }
      } catch (err) {
        console.warn("Server DPP parse failed with error, using local fallback parser:", err);
      }
    }

    // Heuristic fallback if AI failed or was offline, ONLY IF selectable text was found in PDF
    if (parsedQuestions.length === 0 && hasText) {
      options?.onProgress?.('Using local parser to extract DPP questions...');
      parsedQuestions = this.parsePaperTextHeuristic(rawText, targetSubject);
    }

    // Answer-Key extraction: Authoritative, deterministic, and instant
    const keyData = rawText ? AnswerKeyExtractor.extractGlobalAnswerKey(rawText) : undefined;
    const hasExtractedAnswerKey = Boolean(keyData && keyData.hasKeySection && keyData.entries.length > 0);

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

        const visionQuestions = await this.executeVisionPageFallback(
          file,
          integrity.failedPages,
          dppTitle,
          targetSubject,
          options?.onProgress
        );

        if (visionQuestions.length > 0) {
          const merged = this.mergeVisionFallbackQuestions(
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
      const visionQuestions = await this.executeVisionPageFallback(
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
    await this.extractAndAttachDiagrams(file, parsedQuestions, options?.onProgress);

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

    return this.buildDppMockTestObject(dppTitle, parsedQuestions, options, rawText);
  }



  /**
   * Automatically detects questions referencing diagrams, resolves slide or page numbers,
   * provides fallback bounding boxes if missing, and crops diagrams from the PDF.
   */
  private static async extractAndAttachDiagrams(
    file: File,
    parsedQuestions: any[],
    onProgress?: (status: string) => void
  ): Promise<void> {
    if (!parsedQuestions || parsedQuestions.length === 0) return;

    // 1. Audit and tag questions referencing diagrams
    for (let idx = 0; idx < parsedQuestions.length; idx++) {
      const q = parsedQuestions[idx];
      if (typeof q.content === 'string') {
        q.content = q.content.replace(/\s*\(\s*[$]?[A-Z][a-zA-Z0-9_]*[$]?\s+vs\s+[$]?[A-Z][a-zA-Z0-9_]*[$]?\s*\)/gi, '').trim();
      }
      const optTexts = (q.options || []).map((o: any) => (typeof o === 'string' ? o : o?.text || '')).join(' ');
      const combinedText = `${q.content || ''} ${optTexts}`;

      const referencesDiagram = Boolean(
        q.hasDiagram ||
        q.imageUrl ||
        (Array.isArray(q.diagramBbox) && q.diagramBbox.length === 4) ||
        /\b(?:given\s+(?:figure|diagram)|shown\s+in\s+(?:the\s+)?figure|refer\s+to\s+(?:the\s+)?diagram|circuit\s+diagram|graph\s+shown)\b/i.test(combinedText) ||
        /\\theta_[1-4]|\b\theta_1\b|\b\theta_2\b|\b\theta_3\b|\b\theta_4\b/i.test(combinedText) ||
        /\b(?:bond\s+angles?|bond\s+lengths?)\s+(?:of\s+)?(?:[$]?[a-z\alpha-\omega\theta][$]?\s*(?:and|,|vs)\s*[$]?[a-z\alpha-\omega\theta][$]?)/i.test(combinedText) ||
        (/\b(?:bond\s+angle|bond\s+length|in\s+the\s+following\s+molecules?)\b/i.test(q.content || '') &&
         /[$]?\s*[xyzab]\s*[$]?\s*(?:[><=]|\\ge|\\le)\s*[$]?\s*[xyzab]\s*[$]?/i.test(optTexts))
      );

      if (referencesDiagram) {
        q.hasDiagram = true;
      }
    }

    if (typeof document === 'undefined' || !file) return;

    let pdfDoc: any = null;
    try {
      const pdfjsLib = await this.getPdfJs();
      const arrayBuffer = await file.arrayBuffer();
      pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    } catch (err) {
      console.warn('Could not load PDF document for diagram inspection:', err);
    }

    const numPages = pdfDoc?.numPages || parsedQuestions.length;
    const isSlidePerQuestion = numPages === parsedQuestions.length;

    // Align diagramPage with known PDF numPages only if missing or out of bounds
    for (let idx = 0; idx < parsedQuestions.length; idx++) {
      const q = parsedQuestions[idx];
      if (q.hasDiagram) {
        if (!q.diagramPage || q.diagramPage < 1 || q.diagramPage > numPages) {
          q.diagramPage = isSlidePerQuestion
            ? (idx + 1)
            : Math.min(numPages, Math.floor((idx / parsedQuestions.length) * numPages) + 1);
        }
      }
    }

    // 2. Crop diagram image for all questions with hasDiagram
    // Smart suppression: skip cropping when AI has already fully extracted content as text/LaTeX
    // AND options are substantive (e.g. Hydrazoic acid Q6: (A) I, (B) II, (C) III, (D) Both)
    const questionsWithDiagrams = parsedQuestions.filter(q => {
      if (!q.hasDiagram || q.imageUrl) return false;

      if (PdfPaperParserService.isDiagramRedundant(q)) {
        console.log(`[Diagram Suppression] Q${q.localQuestionNumber || '?'}: Complete text & options extracted, skipping redundant diagram crop.`);
        q.hasDiagram = false;
        return false;
      }

      return true;
    });
    if (questionsWithDiagrams.length > 0) {
      onProgress?.(`Extracting ${questionsWithDiagrams.length} high-resolution diagram(s) from document...`);
      const layoutCache = new Map<number, PageLayoutModel>();
      const inkProfileCache = new Map<number, PageInkProfile>();

      for (let i = 0; i < questionsWithDiagrams.length; i++) {
        const q = questionsWithDiagrams[i];
        const qIdx = parsedQuestions.indexOf(q);
        const qNum = qIdx >= 0 ? qIdx + 1 : i + 1;

        if (pdfDoc && numPages > 1) {
          const resolvedPage = await this.locateQuestionPage(pdfDoc, q, qNum, parsedQuestions.length);
          if (resolvedPage) {
            q.diagramPage = resolvedPage;
          }
        }

        const pageNum = q.diagramPage || 1;
        const questionsOnThisPage = parsedQuestions.filter(p => (p.diagramPage || 1) === pageNum);
        const pageQIndex = questionsOnThisPage.indexOf(q);

        // Resolve local question number: explicit -> content prefix -> section index
        let resolvedLocalQNum = (q.localQuestionNumber && Number(q.localQuestionNumber) > 0)
          ? Number(q.localQuestionNumber)
          : undefined;
        if (!resolvedLocalQNum) {
          const contentMatch = String(q.content || '').match(/^(?:\[?\s*Q(?:uestion)?\.?\s*(\d+)|\b(\d{1,2})\s*[:.\-\]\)])/i);
          if (contentMatch) {
            resolvedLocalQNum = parseInt(contentMatch[1] || contentMatch[2], 10);
          }
        }
        if (!resolvedLocalQNum && q.sectionName) {
          const sectionQuestions = parsedQuestions.filter(p => p.sectionName === q.sectionName);
          const sIdx = sectionQuestions.indexOf(q);
          if (sIdx >= 0) {
            resolvedLocalQNum = sIdx + 1;
          }
        }

        const bbox = Array.isArray(q.diagramBbox) && q.diagramBbox.length === 4
          ? q.diagramBbox
          : undefined;
        try {
          const croppedUrl = await this.renderAndCropDiagram(
            pdfDoc || file,
            pageNum,
            bbox,
            {
              qContent: q.content,
              qNum,
              localQNum: resolvedLocalQNum,
              sectionName: q.sectionName,
              options: q.options,
              targetQuestion: q,
              pageQIndex: pageQIndex >= 0 ? pageQIndex : undefined
            },
            layoutCache.get(pageNum),
            inkProfileCache.get(pageNum)
          );
          if (croppedUrl) {
            q.imageUrl = croppedUrl;
          }
        } catch (cropErr) {
          console.warn(`Failed to crop diagram for question on page ${pageNum}:`, cropErr);
        }
      }
    }
  }

  /**
   * Determines if a diagram crop is redundant because question content & options
   * are already fully and accurately transcribed as text/LaTeX.
   */
  static isDiagramRedundant(q: any): boolean {
    if (!q) return false;
    const opts = q.options || [];
    if (!Array.isArray(opts) || opts.length === 0) return false;

    // 1. If options are bare letter labels (A), (B), (C), (D) where the images themselves ARE the options
    // (such as Q5 with 4 SO3 Lewis structures), the diagram is absolutely REQUIRED!
    const bareLabels = opts.filter((o: any) => {
      const text = (typeof o === 'string' ? o : o?.text || '').trim();
      return /^\s*\(?[A-D]\)?\s*$/i.test(text) || text.length === 0;
    });
    if (bareLabels.length >= 3) {
      return false; // Options are bare letters -> diagram required!
    }

    // 2. If question or options refer to an external apparatus diagram, circuit, graph, theta angles, or bond angle variable comparisons:
    const content = q.content || '';
    const optTexts = (opts || []).map((o: any) => (typeof o === 'string' ? o : o?.text || '')).join(' ');
    const combinedText = `${content} ${optTexts}`;

    // Hydrazoic acid & linear chemical resonance structures: complete LaTeX formulas in content + text options
    if (/hydrazoic|resonating structure/i.test(content)) {
      const allSubstantive = opts.length === 4 && opts.every((o: any) => {
        const text = (typeof o === 'string' ? o : o?.text || '').trim();
        return text.length >= 1 && !/^\s*\(?[A-D]\)?\s*$/i.test(text);
      });
      if (allSubstantive) {
        return true;
      }
    }

    const hasExternalVisualMedia = /\b(?:given\s+(?:figure|diagram)|shown\s+in\s+(?:the\s+)?figure|refer\s+to\s+(?:the\s+)?diagram|circuit\s+diagram|graph\s+shown)\b/i.test(combinedText);
    const hasAngleVariables = /\\theta_[1-4]|\btheta_[1-4]\b/i.test(combinedText);
    const hasBondAngleComparison = (
      /\b(?:bond\s+angles?|bond\s+lengths?)\s+(?:of\s+)?(?:[$]?[a-z\alpha-\omega\theta][$]?\s*(?:and|,|vs)\s*[$]?[a-z\alpha-\omega\theta][$]?)/i.test(combinedText) ||
      (/\b(?:bond\s+angle|bond\s+length|in\s+the\s+following\s+molecules?)\b/i.test(content) &&
       /[$]?\s*[xyzab\theta]\s*[$]?\s*(?:[><=]|\\ge|\\le)\s*[$]?\s*[xyzab\theta]\s*[$]?/i.test(optTexts))
    );

    if (hasExternalVisualMedia || hasAngleVariables || hasBondAngleComparison) {
      return false; // Real visual apparatus diagram or graph required
    }

    // 3. Check if all options are substantive text (Roman numerals I, II, III, IV, formulas, words):
    const allOptionsSubstantive = opts.length === 4 && opts.every((o: any) => {
      const text = (typeof o === 'string' ? o : o?.text || '').trim();
      const isBareOption = /^\s*\(?[A-D]\)?\s*$/i.test(text);
      return !isBareOption && text.length >= 1;
    });

    // 4. If options are substantive, and the question statement has complete text (> 25 chars):
    // e.g. Hydrazoic acid (H-N=N=N) resonating structures or reactions already in text/LaTeX:
    if (content.length > 25 && allOptionsSubstantive) {
      return true; // Diagram is redundant!
    }

    return false;
  }

  /**
   * Helper to locate the exact page where a question statement is printed.
   */
  private static async locateQuestionPage(
    pdfDoc: any,
    q: any,
    qNum: number,
    totalQuestionsCount?: number
  ): Promise<number | null> {
    try {
      if (!pdfDoc || typeof pdfDoc.getPage !== 'function' || pdfDoc.numPages <= 1) return null;

      const totalPages = pdfDoc.numPages;

      // Fast check: Scanned / Image-only PDF detection (no selectable text layer)
      // When text layer is absent, lexical keyword search is impossible.
      // Trust the Vision AI's detected diagramPage directly!
      const testPage = await pdfDoc.getPage(1);
      const testContent = await testPage.getTextContent();
      const hasTextLayer = testContent.items.some((i: any) => typeof i.str === 'string' && i.str.trim().length > 0);
      if (!hasTextLayer) {
        return (q.diagramPage && Number(q.diagramPage) >= 1 && Number(q.diagramPage) <= totalPages)
          ? Number(q.diagramPage)
          : null;
      }

      // Positional prior: estimate expected page based on question number
      // For a 25-question DPP with 4 pages, Q2 should be ~page 1, Q20 should be ~page 3-4
      const totalQuestions = (totalQuestionsCount && totalQuestionsCount > 0)
        ? totalQuestionsCount
        : Math.max(qNum, 25);
      const expectedPage = Math.min(totalPages, Math.max(1,
        Math.ceil((qNum / totalQuestions) * totalPages)
      ));

      // Prioritize suggested diagramPage, then expected page, then sequential scan
      const candidatePages: number[] = [];
      if (q.diagramPage && Number(q.diagramPage) >= 1 && Number(q.diagramPage) <= totalPages) {
        candidatePages.push(Number(q.diagramPage));
      }
      if (!candidatePages.includes(expectedPage)) {
        candidatePages.push(expectedPage);
      }
      for (let p = 1; p <= Math.min(totalPages, 25); p++) {
        if (!candidatePages.includes(p)) candidatePages.push(p);
      }

      const stopWords = new Set([
        'the', 'and', 'for', 'which', 'following', 'with', 'from', 'that', 'this',
        'are', 'was', 'were', 'will', 'select', 'correct', 'incorrect', 'given',
        'statement', 'statements', 'value', 'calculate', 'find', 'among',
        'bond', 'order', 'not', 'most', 'least', 'between', 'two'
      ]);

      const rawClean = (q.content || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\[\/?(?:img|latex|math)\]/gi, ' ')
        .replace(/\\[a-zA-Z]+/g, ' ')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const strippedContent = rawClean
        .replace(/^(?:which\s+of\s+the\s+following|what\s+is\s+the|find\s+the|calculate\s+the|consider\s+the|in\s+the\s+given|select\s+the|choose\s+the|identify\s+the|for\s+the\s+given|among\s+the\s+following)\s+/i, '')
        .trim();

      const cleanSnippet = (strippedContent.length >= 4 ? strippedContent : rawClean)
        .split(/\s+/)
        .filter(w => w.length >= 3 && !stopWords.has(w));

      // Must have SOME content words to match — otherwise we can't reliably locate the question
      if (cleanSnippet.length < 1) return null;

      // Score each candidate page and pick the best
      let bestPage: number | null = null;
      let bestScore = -Infinity;

      for (const p of candidatePages) {
        const page = await pdfDoc.getPage(p);
        const textContent = await page.getTextContent();
        const pageStr = textContent.items.map((i: any) => ('str' in i ? i.str : '')).join(' ').toLowerCase();

        let score = 0;

        // Strict question marker: must have a question-style prefix or be at a word boundary
        // with the exact question number followed by a delimiter (., ), :, or whitespace)
        const localQ = q.localQuestionNumber || qNum;
        const strictMarkerRegex = new RegExp(
          `(?:^|\\s|q\\.?\\s*)0*${localQ}\\s*[.):;]`, 'i'
        );
        const hasStrictMarker = strictMarkerRegex.test(pageStr);

        if (hasStrictMarker) {
          score += 40;
        }

        // Content word matching
        const matchingWords = cleanSnippet.filter((w: string) => pageStr.includes(w));
        const contentRatio = cleanSnippet.length > 0 ? matchingWords.length / cleanSnippet.length : 0;
        score += Math.floor(contentRatio * 50); // Up to +50 for perfect content match

        // Positional scoring: penalize pages far from expected position
        const pageDist = Math.abs(p - expectedPage);
        score -= pageDist * 8; // -8 per page of distance

        // Bonus for AI-suggested page
        if (q.diagramPage && p === Number(q.diagramPage)) {
          score += 15;
        }

        // Must have BOTH marker AND some content match to be valid
        // (this prevents the number "19" in a page footer from matching)
        if (hasStrictMarker && matchingWords.length >= Math.min(2, cleanSnippet.length) && score > bestScore) {
          bestScore = score;
          bestPage = p;
        }
      }

      // Fallback: if strict matching found nothing, try content-only matching
      // but require a higher threshold and still apply positional scoring
      if (bestPage === null && cleanSnippet.length >= 3) {
        for (const p of candidatePages) {
          const page = await pdfDoc.getPage(p);
          const textContent = await page.getTextContent();
          const pageStr = textContent.items.map((i: any) => ('str' in i ? i.str : '')).join(' ').toLowerCase();
          const matchingWords = cleanSnippet.filter((w: string) => pageStr.includes(w));
          const contentRatio = cleanSnippet.length > 0 ? matchingWords.length / cleanSnippet.length : 0;

          // Require at least 60% word match for content-only fallback
          if (contentRatio >= 0.6 && matchingWords.length >= 3) {
            let score = Math.floor(contentRatio * 50);
            const pageDist = Math.abs(p - expectedPage);
            score -= pageDist * 8;
            if (score > bestScore) {
              bestScore = score;
              bestPage = p;
            }
          }
        }
      }

      return bestPage;
    } catch {
      // ignore
    }
    return null;
  }

  static cleanDppFileName = DppMetadataAnalyzer.cleanDppFileName;
  static heuristicAnalyzeDppMetadata = DppMetadataAnalyzer.heuristicAnalyzeDppMetadata;
  static analyzeDppMetadata = DppMetadataAnalyzer.analyzeDppMetadata;
  static sanitizeOptionText = OptionExtractor.sanitizeOptionText;
  static normalizeAnswerValue = AnswerKeyExtractor.normalizeAnswerValue;
  static extractGlobalAnswerKey = AnswerKeyExtractor.extractGlobalAnswerKey;

  static sanitizeQuestionText = PdfOfflineParser.sanitizeQuestionText;
  static normalizeMathToLatex = PdfOfflineParser.normalizeMathToLatex;
  static foldStackedFractions = PdfOfflineParser.foldStackedFractions;
  static extractOptionsFromBlock = PdfOfflineParser.extractOptionsFromBlock;
  static parsePaperTextHeuristic = PdfOfflineParser.parsePaperTextHeuristic;
  static parseBlocksHeuristic = PdfOfflineParser.parseBlocksHeuristic;
  static parseLineByLineHeuristic = PdfOfflineParser.parseLineByLineHeuristic;
  static mergeParsedWithHeuristic = PdfOfflineParser.mergeParsedWithHeuristic;
  /**
   * Multi-stage self-healing parse loop (Phase 6):
   * Pass 1: Primary Two-Stage AI + Layout Analysis parser
   * Quality Gate: Scores all extracted questions with ConfidenceScorer
   * Pass 2 (Heuristic Healing): For questions with overallScore < 0.8, heals missing options,
   *        surrogate combinations, or missing answers from heuristic parsing.
   * Pass 3 (Diagram Healing): For questions with broken diagrams (diagramQuality < 0.5),
   *        retries diagram cropping with adaptive ink scanning and expanded fences.
   * Pass 4: Final verification and returns MockTest with attached confidence report.
   */
  static async parseWithHealing(
    file: File,
    options?: ParsePaperOptions | ParseDppOptions,
    isDpp: boolean = false
  ): Promise<{ mockTest: MockTest; confidence: PaperConfidenceReport }> {
    // Pass 1: Parse paper
    const mockTest = isDpp
      ? await this.parseDppToMockTest(file, options as ParseDppOptions)
      : await this.parsePdfToMockTest(file, options as ParsePaperOptions);

    const allQuestions: MockQuestion[] = [];
    for (const sec of mockTest.sections) {
      allQuestions.push(...sec.questions);
    }

    // Quality Gate: Evaluate confidence
    let report = ConfidenceScorer.scorePaper(allQuestions);
    options?.onProgress?.(`Parsed ${allQuestions.length} questions. Quality score: ${Math.round(report.overallScore * 100)}%`);

    if (report.overallScore >= 0.85 && report.lowConfidenceIndices.length === 0 && report.brokenDiagramIndices.length === 0) {
      return { mockTest, confidence: report };
    }

    // Pass 2: Question Statement & Option Healing using Heuristic Layer
    if (report.lowConfidenceIndices.length > 0) {
      options?.onProgress?.(`Healing ${report.lowConfidenceIndices.length} low-confidence questions...`);
      try {
        const rawText = await this.extractTextFromPDF(file);
        if (rawText && rawText.length >= 30) {
          const heuristic = this.parsePaperTextHeuristic(rawText);
          for (const idx of report.lowConfidenceIndices) {
            const targetQ = allQuestions[idx];
            if (!targetQ) continue;
            const targetNum = (targetQ as any).qNumber || (targetQ as any).localQuestionNumber || (idx + 1);
            const match = heuristic.find((h: any) => {
              const hNum = h.qNumber || h.localQuestionNumber;
              return hNum === targetNum;
            });
            if (match) {
              ConfidenceScorer.healQuestion(targetQ, match);
            }
          }
        }
      } catch (e) {
        console.warn('[parseWithHealing] Heuristic healing pass failed:', e);
      }
    }

    // Pass 3: Diagram Crop Refinement for broken diagrams
    if (report.brokenDiagramIndices.length > 0) {
      options?.onProgress?.(`Refining crops for ${report.brokenDiagramIndices.length} diagram(s)...`);
      for (const idx of report.brokenDiagramIndices) {
        const targetQ = allQuestions[idx];
        if (!targetQ || targetQ.imageUrl) continue;
        try {
          const cropped = await this.renderAndCropDiagram(file, (targetQ as any).diagramPage || 1, undefined, {
            qContent: targetQ.content,
            qNum: (targetQ as any).qNumber || idx + 1,
            localQNum: (targetQ as any).localQuestionNumber || idx + 1,
            options: targetQ.options,
            targetQuestion: targetQ
          });
          if (cropped) {
            targetQ.imageUrl = cropped;
            targetQ.hasDiagram = true;
          }
        } catch (e) {
          console.warn('[parseWithHealing] Diagram crop retry failed:', e);
        }
      }
    }

    // Re-score healed paper
    report = ConfidenceScorer.scorePaper(allQuestions);
    return { mockTest, confidence: report };
  }

  static scorePaperConfidence = ConfidenceScorer.scorePaper;
  static scoreQuestionConfidence = ConfidenceScorer.scoreQuestion;
  static healQuestion = ConfidenceScorer.healQuestion;
  static validatePaperIntegrity = StructuralIntegrityValidator.validatePaper;

  static buildMockTestObject = MockTestBuilder.buildMockTestObject;
  static buildDppMockTestObject = MockTestBuilder.buildDppMockTestObject;
  static buildPyqMockTestObject = MockTestBuilder.buildPyqMockTestObject;
}

