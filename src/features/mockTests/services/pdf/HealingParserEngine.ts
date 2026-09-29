import { MockTest, MockQuestion } from '@/types/mockTest';
import { ConfidenceScorer, PaperConfidenceReport } from './ConfidenceScorer';
import { PageLayoutModel, PageInkProfile } from './types';
import { DiagramAttachmentService } from './DiagramAttachmentService';
import { PdfTextExtractor } from './PdfTextExtractor';
import { PdfOfflineParser } from './PdfOfflineParser';

export interface ParsePaperOptions {
  paperTitle?: string;
  targetSubject?: 'physics' | 'chemistry' | 'maths' | 'all';
  examMode?: 'main' | 'advanced';
  onProgress?: (status: string) => void;
}

export interface ParseDppOptions {
  dppTitle?: string;
  subject?: any;
  chapterId?: string;
  chapterName?: string;
  durationMinutes?: number;
  examMode?: 'main' | 'advanced';
  onProgress?: (status: string) => void;
}

export class HealingParserEngine {
  /**
   * Multi-stage self-healing parse loop:
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
    options: ParsePaperOptions | ParseDppOptions | undefined,
    isDpp: boolean = false,
    parsers: {
      parsePdf: (file: File, opts?: ParsePaperOptions) => Promise<MockTest>;
      parseDpp: (file: File, opts?: ParseDppOptions) => Promise<MockTest>;
    }
  ): Promise<{ mockTest: MockTest; confidence: PaperConfidenceReport }> {
    // Pass 1: Parse paper
    const mockTest = isDpp
      ? await parsers.parseDpp(file, options as ParseDppOptions)
      : await parsers.parsePdf(file, options as ParsePaperOptions);

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
        const rawText = await PdfTextExtractor.extractTextFromPDF(file);
        if (rawText && rawText.length >= 30) {
          const heuristic = PdfOfflineParser.parsePaperTextHeuristic(rawText);
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
      const healingLayoutCache = new Map<number, PageLayoutModel>();
      const healingInkCache = new Map<number, PageInkProfile>();
      for (const idx of report.brokenDiagramIndices) {
        const targetQ = allQuestions[idx];
        if (!targetQ) continue;
        if (targetQ.imageUrl && targetQ.imageUrl.length < 200) {
          targetQ.imageUrl = undefined;
        }
        try {
          const primaryPage = (targetQ as any).diagramPage || 1;
          const bbox = Array.isArray((targetQ as any).diagramBbox) && (targetQ as any).diagramBbox.length === 4
            ? (targetQ as any).diagramBbox
            : undefined;

          let cropped = await DiagramAttachmentService.renderAndCropDiagram(
            file,
            primaryPage,
            bbox,
            {
              qContent: targetQ.content,
              qNum: (targetQ as any).qNumber || idx + 1,
              localQNum: (targetQ as any).localQuestionNumber || idx + 1,
              options: targetQ.options,
              targetQuestion: targetQ
            },
            healingLayoutCache,
            healingInkCache
          );

          // Multi-page healing: If primary page crop failed, check adjacent pages (+1, -1)
          if (!cropped) {
            const adjacentPages = [primaryPage + 1, primaryPage - 1].filter(p => p >= 1);
            for (const adjPage of adjacentPages) {
              try {
                const adjCrop = await DiagramAttachmentService.renderAndCropDiagram(
                  file,
                  adjPage,
                  bbox,
                  {
                    qContent: targetQ.content,
                    qNum: (targetQ as any).qNumber || idx + 1,
                    localQNum: (targetQ as any).localQuestionNumber || idx + 1,
                    options: targetQ.options,
                    targetQuestion: targetQ
                  },
                  healingLayoutCache,
                  healingInkCache
                );
                if (adjCrop) {
                  cropped = adjCrop;
                  (targetQ as any).diagramPage = adjPage;
                  break;
                }
              } catch {
                // Ignore page out of bounds
              }
            }
          }

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
}
