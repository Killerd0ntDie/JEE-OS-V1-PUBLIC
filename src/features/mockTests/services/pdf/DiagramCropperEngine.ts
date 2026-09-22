import { PageLayoutModel, QuestionBlock, DiagramCropResult, PageInkProfile } from './types';
import { PageLayoutAnalyzer } from './PageLayoutAnalyzer';
import { AdaptiveInkScanner } from './AdaptiveInkScanner';
import { OptionExtractor } from './OptionExtractor';

export interface CropContext {
  qContent?: string;
  qNum?: number;
  localQNum?: number;
  sectionName?: string;
  options?: any[];
  targetQuestion?: any;
  fence?: { fenceYmin: number; fenceYmax: number };
  pageQIndex?: number;
}

export interface CropRectResult {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  confidence: number;
  strategyUsed: DiagramCropResult['strategyUsed'];
}

export class DiagramCropperEngine {
  /**
   * Detects the exact crop rectangle for a diagram using layout model fencing,
   * column boundary isolation, and adaptive ink scanning.
   */
  static detectCropRect(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    layoutModel?: PageLayoutModel | null,
    bbox?: number[],
    context?: CropContext,
    inkProfile?: PageInkProfile
  ): CropRectResult | null {
    try {
      if (!ctx || width <= 0 || height <= 0) return null;

      // 1. Determine Fence Boundaries & Column Boundaries
      let fenceYmin = context?.fence ? Math.max(0, Math.floor(context.fence.fenceYmin)) : 0;
      let fenceYmax = context?.fence ? Math.min(height - 1, Math.ceil(context.fence.fenceYmax)) : height - 1;
      let scanXmin = 0;
      let scanXmax = width - 1;
      let targetBlock: QuestionBlock | null = null;
      let nextBlock: QuestionBlock | null = null;
      const hasExplicitFence = Boolean(context?.fence);

      if (layoutModel && layoutModel.questions.length > 0) {
        targetBlock = PageLayoutAnalyzer.findQuestionBlock(
          layoutModel,
          context?.qNum,
          context?.localQNum,
          context?.qContent,
          context?.pageQIndex
        );

        if (targetBlock) {
          // Find the spatially-nearest next question block by Y position
          // (not just idx+1 which may be in a different column on 2-column pages)
          const targetYEnd = targetBlock.statementYend;
          let closestNextY = Infinity;
          nextBlock = null;
          for (const qb of layoutModel.questions) {
            if (qb === targetBlock) continue;
            if (qb.statementYstart > targetYEnd && qb.statementYstart < closestNextY) {
              // On 2-column pages, only consider blocks in the same column
              if (layoutModel.columnCount === 2) {
                const midX = width / 2;
                const targetIsRight = targetBlock.columnIndex === 1 || targetBlock.contentXmin > midX - 30;
                const candidateIsRight = qb.columnIndex === 1 || qb.contentXmin > midX - 30;
                if (targetIsRight !== candidateIsRight) continue;
              }
              closestNextY = qb.statementYstart;
              nextBlock = qb;
            }
          }

          const fence = PageLayoutAnalyzer.computeDiagramFence(targetBlock, nextBlock, height);
          fenceYmin = Math.max(0, Math.floor(fence.fenceYmin));
          fenceYmax = Math.min(height - 1, Math.ceil(fence.fenceYmax));

          // Multi-column isolation: clamp horizontal scanning strictly to question column
          if (layoutModel.columnCount === 2) {
            const midX = width / 2;
            const targetIsRight = targetBlock.columnIndex === 1 || targetBlock.contentXmin > midX - 30;
            if (targetIsRight) {
              // Right Column
              scanXmin = Math.floor(midX - 10);
              scanXmax = width - 1;
            } else {
              // Left Column
              scanXmin = 0;
              scanXmax = Math.min(width - 1, Math.ceil(midX + 10));
            }
          }
        }
      }

      const hasBbox = Array.isArray(bbox) && bbox.length === 4;
      let aiYmin: number | undefined;
      let aiYmax: number | undefined;
      let aiXmin: number | undefined;
      let aiXmax: number | undefined;

      if (hasBbox) {
        let [ymin, xmin, ymax, xmax] = bbox!;
        if (ymin > 1 || ymax > 1) { ymin /= 1000; xmin /= 1000; ymax /= 1000; xmax /= 1000; }
        aiYmin = Math.floor(ymin * height);
        aiYmax = Math.ceil(ymax * height);
        aiXmin = Math.floor(xmin * width);
        aiXmax = Math.ceil(xmax * width);

        // Check if AI bbox is inside the fence. If completely outside, ignore it!
        const bboxOverlapsFence = !hasExplicitFence || (aiYmax >= fenceYmin && aiYmin <= fenceYmax);

        if (bboxOverlapsFence) {
          // 1. If Gemini Multimodal Vision AI provided the diagram bounding box,
          // use ink scanning inside and immediately around the AI bbox region to locate the exact visual boundaries!
          const stmtFence = Math.max(fenceYmin, targetBlock ? targetBlock.statementYend + 8 : 0);
          const nextQFence = Math.min(fenceYmax, nextBlock ? nextBlock.statementYstart - 8 : (targetBlock?.optionsYstart ? targetBlock.optionsYstart - 8 : height - 1));

          // Expand the initial search window around AI bbox, strictly bounded by fence:
          // In chemical diagrams, vertical bonds and bottom axial atoms (like -F, =O, -Cl) extend downwards
          const searchYmin = Math.max(stmtFence, aiYmin - 45);
          const searchYmax = Math.min(nextQFence, aiYmax + 140);
          const searchXmin = Math.max(0, aiXmin - 45);
          const searchXmax = Math.min(width - 1, aiXmax + 45);

        const profile = inkProfile || AdaptiveInkScanner.computeInkProfile(ctx, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        let minX = searchXmax, maxX = searchXmin, minY = searchYmax, maxY = searchYmin;
        let foundBboxInk = false;

        for (let y = searchYmin; y <= searchYmax; y++) {
          const rowOff = y * width * 4;
          for (let x = searchXmin; x <= searchXmax; x++) {
            const idx = rowOff + x * 4;
            if (data[idx + 3] > 50) {
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const lum = 0.299 * r + 0.587 * g + 0.114 * b;
              if (lum < profile.inkThreshold) {
                foundBboxInk = true;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              } else if (profile.hasColoredInk) {
                const maxC = Math.max(r, g, b);
                const minC = Math.min(r, g, b);
                const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
                if (sat > 0.35 && lum < 220) {
                  foundBboxInk = true;
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                  if (y < minY) minY = y;
                  if (y > maxY) maxY = y;
                }
              }
            }
          }
        }

        // Follow connected vertical bonds & bottom atoms downwards until a clean whitespace gap
        if (foundBboxInk) {
          while (maxY < nextQFence - 5) {
            const checkY = maxY + 1;
            const rowOff = checkY * width * 4;
            let rowHasInk = false;
            for (let x = Math.max(0, minX - 15); x <= Math.min(width - 1, maxX + 15); x++) {
              const idx = rowOff + x * 4;
              if (data[idx + 3] > 50) {
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                if (lum < profile.inkThreshold) {
                  rowHasInk = true;
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                  break;
                } else if (profile.hasColoredInk) {
                  const maxC = Math.max(r, g, b);
                  const minC = Math.min(r, g, b);
                  const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
                  if (sat > 0.35 && lum < 220) {
                    rowHasInk = true;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    break;
                  }
                }
              }
            }
            if (rowHasInk) {
              maxY = checkY;
            } else {
              // Check if there's a 1-8px gap across thin bonds before stopping
              let lookaheadHasInk = false;
              for (let look = 2; look <= 10 && checkY + look < nextQFence - 5; look++) {
                const laOff = (checkY + look) * width * 4;
                for (let x = Math.max(0, minX - 15); x <= Math.min(width - 1, maxX + 15); x++) {
                  const idx = laOff + x * 4;
                  if (data[idx + 3] > 50) {
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                    if (lum < profile.inkThreshold) {
                      lookaheadHasInk = true;
                      break;
                    } else if (profile.hasColoredInk) {
                      const maxC = Math.max(r, g, b);
                      const minC = Math.min(r, g, b);
                      const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
                      if (sat > 0.35 && lum < 220) {
                        lookaheadHasInk = true;
                        break;
                      }
                    }
                  }
                }
                if (lookaheadHasInk) {
                  maxY = checkY + look;
                  break;
                }
              }
              if (!lookaheadHasInk) break;
            }
          }

          // Follow connected ink upwards (lone pairs, top atoms) until whitespace gap
          while (minY > stmtFence + 5) {
            const checkY = minY - 1;
            const rowOff = checkY * width * 4;
            let rowHasInk = false;
            for (let x = Math.max(0, minX - 15); x <= Math.min(width - 1, maxX + 15); x++) {
              const idx = rowOff + x * 4;
              if (data[idx + 3] > 50) {
                const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                if (lum < profile.inkThreshold) {
                  rowHasInk = true;
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                  break;
                }
              }
            }
            if (rowHasInk) {
              minY = checkY;
            } else {
              break;
            }
          }
        }

          if (foundBboxInk && maxX > minX && maxY > minY) {
            const padX = 16;
            const padY = 26;
            const cropX = Math.max(0, minX - padX);
            const cropY = Math.max(stmtFence, minY - padY);
            const right = Math.min(width, maxX + padX);
            const bottom = Math.min(nextQFence, maxY + padY);
            const cropW = Math.max(20, right - cropX);
            const cropH = Math.max(20, bottom - cropY);
            return {
              cropX,
              cropY,
              cropW,
              cropH,
              confidence: 0.98,
              strategyUsed: 'ai-hint'
            };
          }
        }
      }

      // 2. Pure Layout & Ink Scanning Fallback (when AI bbox was not available or had 0 ink)
      const profile = inkProfile || AdaptiveInkScanner.computeInkProfile(ctx, width, height);

      const isStrictFence = Boolean(targetBlock || hasExplicitFence);
      const scanYmin = fenceYmin;
      const scanYmax = fenceYmax;
      if (targetBlock && layoutModel?.columnCount !== 2) {
        scanXmin = Math.max(0, targetBlock.contentXmin - 30);
        scanXmax = Math.min(width, targetBlock.contentXmax + 30);
      }

      const imgData = ctx.getImageData(0, 0, width, height);
      const rowInk = AdaptiveInkScanner.scanRowInk(imgData.data, width, scanYmin, scanYmax, profile, scanXmin, scanXmax);

      // 3. Find Ink Bands
      const minInk = Math.max(4, Math.floor(profile.minInkPixelsPerRow * 0.4));
      const bands = AdaptiveInkScanner.groupInkIntoBands(rowInk, scanYmin, scanYmax, minInk, 12);

      // Compute horizontal extent for each band
      for (const band of bands) {
        band.minX = scanXmax;
        band.maxX = scanXmin;
        for (let y = band.start; y <= band.end; y++) {
          const rowOff = y * width * 4;
          for (let x = scanXmin; x <= scanXmax; x++) {
            const idx = rowOff + x * 4;
            if (imgData.data[idx + 3] > 50) {
              const r = imgData.data[idx];
              const g = imgData.data[idx + 1];
              const blue = imgData.data[idx + 2];
              const lum = 0.299 * r + 0.587 * g + 0.114 * blue;
              if (lum < profile.inkThreshold) {
                if (x < band.minX) band.minX = x;
                if (x > band.maxX) band.maxX = x;
              } else if (profile.hasColoredInk) {
                const maxC = Math.max(r, g, blue);
                const minC = Math.min(r, g, blue);
                const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
                if (sat > 0.35 && lum < 220) {
                  if (x < band.minX) band.minX = x;
                  if (x > band.maxX) band.maxX = x;
                }
              }
            }
          }
        }
      }

      if (bands.length === 0) {
        if (isStrictFence && fenceYmax > fenceYmin + 30) {
          return {
            cropX: scanXmin,
            cropY: fenceYmin,
            cropW: Math.max(20, scanXmax - scanXmin),
            cropH: Math.max(10, fenceYmax - fenceYmin),
            confidence: 0.65,
            strategyUsed: 'fallback'
          };
        }
        return null;
      }

      let diagBands = bands;
      const opts = context?.options || context?.targetQuestion?.options;
      const optionsHaveText = Array.isArray(opts) && opts.length >= 2 &&
        !opts.every(o => {
          const txt = (typeof o === 'string' ? o : o?.text || '').trim();
          return /^\s*\(?[A-D]\)?\s*$/i.test(txt) || txt.length === 0;
        });

      // If options have substantive text (meaning options are NOT visual drawings),
      // cleanly strip any option text lines that appear at the bottom of the detected bands!
      if (optionsHaveText && diagBands.length >= 2) {
        let firstOptionBandIdx = -1;
        for (let k = diagBands.length - 1; k >= 1; k--) {
          const b = diagBands[k];
          const prevB = diagBands[k - 1];
          // Coaching paper options start at left margin (x < 25% width), whereas centered diagrams start > 25%
          const isLeft = b.minX < width * 0.25;
          const isText = (b.end - b.start) <= 65;
          const gapAbove = b.start - prevB.end;

          if (isLeft && isText) {
            firstOptionBandIdx = k;
            // If there is a whitespace gap (>= 18px) above this option band, that gap separates the diagram from the options!
            if (gapAbove >= 18 || prevB.minX > width * 0.28 || (prevB.end - prevB.start) > 65) {
              break;
            }
          } else {
            break;
          }
        }

        if (firstOptionBandIdx > 0) {
          diagBands = diagBands.slice(0, firstOptionBandIdx);
        }
      }

      // Blind whole-page fallback only: strip statement text at top if no layout model was available
      if (!targetBlock && !hasExplicitFence && diagBands.length >= 2) {
        let qTextEndIdx = -1;
        for (let i = 0; i < Math.min(3, diagBands.length - 1); i++) {
          const b = diagBands[i];
          const nextB = diagBands[i + 1];
          const isLeftMargin = b.minX < width * 0.25;
          const isTop = b.start < height * 0.40;
          const gapToNext = nextB ? nextB.start - b.end : 0;
          const isTextLike = b.height <= 110;

          if (isLeftMargin && isTop && isTextLike && (gapToNext >= 20 || nextB.height > 120)) {
            qTextEndIdx = i;
            break;
          } else if (isLeftMargin && isTop && b.height <= 55 && (i === 0 || b.start - diagBands[i - 1].end <= 28)) {
            qTextEndIdx = i;
          } else {
            break;
          }
        }

        if (qTextEndIdx >= 0) {
          diagBands = diagBands.slice(qTextEndIdx + 1);
        }
      }

      let cropX = scanXmin;
      let cropY = fenceYmin;
      let cropW = Math.max(20, scanXmax - scanXmin);
      let cropH = Math.max(10, fenceYmax - fenceYmin);
      let strategyUsed: DiagramCropResult['strategyUsed'] = 'fallback';

      if (diagBands.length > 0) {
        strategyUsed = targetBlock ? 'consensus' : (hasBbox ? 'ai-hint' : 'ink-density');
        const diagYmin = diagBands[0].start;
        const diagYmax = diagBands[diagBands.length - 1].end;

        let minX = scanXmax;
        let maxX = scanXmin;
        for (const band of diagBands) {
          if (band.minX < minX) minX = band.minX;
          if (band.maxX > maxX) maxX = band.maxX;
        }

        // 16px safety padding horizontally, 20px top and 26px bottom vertical padding
        // so chemical formulas, lone pairs, and bottom atoms are never clipped
        const padX = 16;
        const padYTop = 20;
        const padYBottom = 26;
        cropX = Math.max(scanXmin, minX - padX);
        cropY = Math.max(fenceYmin, diagYmin - padYTop);
        cropW = Math.min(scanXmax - cropX, Math.max(20, (maxX + padX) - cropX));
        cropH = Math.min(fenceYmax - cropY, Math.max(20, (diagYmax + padYBottom) - cropY));
      } else if (bbox && bbox.length === 4) {
        // AI Bounding Box fallback, clamped strictly to fence & column
        strategyUsed = 'ai-hint';
        let [ymin, xmin, ymax, xmax] = bbox;
        if (ymin > 1 || ymax > 1) { ymin /= 1000; xmin /= 1000; ymax /= 1000; xmax /= 1000; }
        const padX = 16;
        const padY = 16;
        cropX = Math.max(scanXmin, Math.floor(xmin * width) - padX);
        cropY = Math.max(fenceYmin, Math.floor(ymin * height) - padY);
        cropW = Math.min(scanXmax - cropX, Math.ceil((xmax - xmin) * width) + padX * 2);
        cropH = Math.min(fenceYmax - cropY, Math.ceil((ymax - ymin) * height) + padY * 2);
      } else if (targetBlock) {
        strategyUsed = 'text-gap';
        cropX = scanXmin;
        cropY = fenceYmin;
        cropW = Math.max(20, scanXmax - scanXmin);
        cropH = Math.min(height - cropY, Math.max(10, fenceYmax - fenceYmin));
      }

      if (cropW <= 0 || cropH <= 0) return null;

      // When targetBlock, explicit fence, or AI bbox is present, boundaries are strictly isolated
      const hasStrictFence = Boolean(targetBlock || hasExplicitFence || hasBbox);
      const maxCropH = hasStrictFence 
        ? Math.min(Math.floor(height * 0.65), 850) 
        : Math.min(420, Math.floor(height * 0.35));
      if (cropH > maxCropH) {
        cropH = maxCropH;
      }

      return {
        cropX,
        cropY,
        cropW,
        cropH,
        confidence: bands.length > 0 ? 0.95 : 0.70,
        strategyUsed
      };
    } catch (e) {
      console.warn('[DiagramCropperEngine] detectCropRect failed:', e);
      return null;
    }
  }

  /**
   * Intelligently detects and crops visual diagrams from a rendered canvas,
   * using spatial layout fencing, column isolation, and adaptive ink density scanning.
   */
  static cropDiagram(
    fullCanvas: HTMLCanvasElement,
    layoutModel?: PageLayoutModel | null,
    bbox?: number[],
    context?: CropContext,
    inkProfile?: PageInkProfile
  ): DiagramCropResult | null {
    try {
      const width = fullCanvas.width;
      const height = fullCanvas.height;
      const ctx = fullCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx || width <= 0 || height <= 0) return null;

      const rect = this.detectCropRect(ctx, width, height, layoutModel, bbox, context, inkProfile);
      if (!rect) return null;

      // Render final crop on clean white canvas
      let dataUrl = '';
      if (typeof document !== 'undefined') {
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = rect.cropW;
        cropCanvas.height = rect.cropH;
        const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
        if (cropCtx) {
          cropCtx.fillStyle = '#ffffff';
          cropCtx.fillRect(0, 0, rect.cropW, rect.cropH);
          cropCtx.drawImage(fullCanvas, rect.cropX, rect.cropY, rect.cropW, rect.cropH, 0, 0, rect.cropW, rect.cropH);
          dataUrl = cropCanvas.toDataURL('image/webp', 0.88);
        } else if (typeof (fullCanvas as any).toDataURL === 'function') {
          dataUrl = (fullCanvas as any).toDataURL('image/webp', 0.88);
        }
      }

      // Clean up option models: set to simple (A), (B), (C), (D) labels
      OptionExtractor.cleanOptions(context?.targetQuestion?.options);
      OptionExtractor.cleanOptions(context?.options);

      return {
        ...rect,
        dataUrl
      };
    } catch (e) {
      console.warn('[DiagramCropperEngine] cropDiagram failed:', e);
      return null;
    }
  }

  /**
   * Delegates to OptionExtractor.cleanOptions to preserve backward compatibility.
   */
  static cleanOptions(opts: any[] | undefined) {
    OptionExtractor.cleanOptions(opts);
  }
}
