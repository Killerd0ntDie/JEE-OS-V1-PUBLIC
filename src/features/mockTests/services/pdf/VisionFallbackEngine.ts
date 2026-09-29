import { auth } from '@/firebase';
import { decodeSecret } from '@/utils/crypto';
import { storageAdapter } from '@/services/StorageAdapter';
import { PdfTextExtractor } from './PdfTextExtractor';
import { ExtractedGlobalAnswerKey } from './AnswerKeyExtractor';

export class VisionFallbackEngine {
  /**
   * Reads stored Gemini API key from StorageAdapter, auto-decoding if obfuscated.
   */
  static getStoredGeminiKey(): string | undefined {
    try {
      const raw = storageAdapter.getGeminiApiKey();
      if (raw) {
        const decoded = decodeSecret(raw);
        if (decoded && decoded.trim().length > 10) {
          return decoded.trim();
        }
        if (raw.trim().length > 10) {
          return raw.trim();
        }
      }
    } catch {
      // Ignore storage access errors
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
      const pdfjsLib = await PdfTextExtractor.getPdfJs();
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
      if (token) headers.Authorization = `Bearer ${token}`;
      const storedKey = VisionFallbackEngine.getStoredGeminiKey();
      if (storedKey) headers['x-gemini-api-key'] = storedKey;

      const pageImages: { pageNumber: number; imageBase64: string }[] = [];

      for (const pageNum of failedPages) {
        onProgress?.(`Rendering page ${pageNum} for targeted visual recovery...`);
        const img = await VisionFallbackEngine.renderPageToDataUrl(file, pageNum);
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
    const extractNum = (q: any) => {
      const val = q?.localQuestionNumber || q?.qNumber || q?.questionNumber;
      if (typeof val === 'number' && !Number.isNaN(val) && val > 0) return val;
      if (typeof val === 'string' && /^\d+$/.test(val.trim())) return parseInt(val.trim(), 10);
      const match = String(q?.content || '').match(/^(?:\[?\s*Q(?:uestion)?\.?\s*(\d+)|\b(\d{1,3})\s*[.:\-\]])/i);
      if (match) return parseInt(match[1] || match[2], 10);
      return undefined;
    };

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

    // Deduplication gate: consume/remove from visionMap any vision questions that already exist in merged
    for (const [vNum, vq] of Array.from(visionMap.entries())) {
      const alreadyInMerged = merged.some(q => {
        const qN = extractNum(q);
        if (qN === vNum) return true;
        const cleanQ = (q.content || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 35);
        const cleanV = (vq.content || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 35);
        return cleanQ.length > 15 && cleanV.length > 15 && (cleanQ.includes(cleanV) || cleanV.includes(cleanQ));
      });
      if (alreadyInMerged) {
        visionMap.delete(vNum);
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
}
