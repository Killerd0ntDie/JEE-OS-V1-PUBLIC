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
   * Phase 2 (R5): Validates and normalizes AI-provided diagram bounding box coordinates [ymin, xmin, ymax, xmax].
   * Rejects non-finite numbers, inverted or degenerate boxes with < 15 units span.
   */
  static validateBbox(bbox: any): [number, number, number, number] | undefined {
    if (!Array.isArray(bbox) || bbox.length !== 4) return undefined;
    const nums = bbox.map((v: any) => typeof v === 'number' ? v : Number(v));
    if (nums.some((v: any) => isNaN(v) || !isFinite(v))) return undefined;

    let [ymin, xmin, ymax, xmax] = nums;
    if (ymin > ymax) { const t = ymin; ymin = ymax; ymax = t; }
    if (xmin > xmax) { const t = xmin; xmin = xmax; xmax = t; }

    const is01 = ymax <= 1.0 && xmax <= 1.0 && ymin >= 0 && xmin >= 0;
    const minSpan = is01 ? 0.015 : 15;
    if ((ymax - ymin) < minSpan || (xmax - xmin) < minSpan) return undefined;

    return [ymin, xmin, ymax, xmax];
  }

  /**
   * Phase 2 (R1): Validates that a cropped region contains real diagram ink pixels,
   * preventing blank white rectangles or single-color background slices from being accepted.
   */
  static hasSubstantiveInk(
    ctx: CanvasRenderingContext2D,
    cropX: number,
    cropY: number,
    cropW: number,
    cropH: number,
    profile?: PageInkProfile
  ): boolean {
    try {
      if (cropW <= 0 || cropH <= 0) return false;
      const imgData = ctx.getImageData(cropX, cropY, cropW, cropH);
      if (!imgData || !imgData.data || imgData.data.length === 0) return false;
      const data = imgData.data;
      const totalPixels = cropW * cropH;
      const threshold = Math.max(205, (profile?.inkThreshold || 185) + 15);
      const hasColoredInk = profile?.hasColoredInk ?? true;

      let inkPixels = 0;
      const step = totalPixels > 100000 ? 2 : 1;
      const pixelCount = data.length / 4;

      for (let i = 0; i < pixelCount; i += step) {
        const idx = i * 4;
        const a = data[idx + 3];
        if (a > 50) {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lum < threshold) {
            inkPixels++;
          } else if (hasColoredInk) {
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
            if (sat > 0.35 && lum < 220) {
              inkPixels++;
            }
          }
        }
      }

      const sampledCount = Math.ceil(pixelCount / step);
      // Require at least 0.15% ink coverage or at least 15 ink pixels
      const minRequired = Math.max(15, Math.floor(sampledCount * 0.0015));
      return inkPixels >= minRequired;
    } catch {
      return true;
    }
  }

  /**
   * Scans vertical columns of ink within [minY, maxY] between minX and maxX.
   * Strips stray vertical column dividing rules or cut-off text from the opposite column
   * that are separated from the main diagram by an empty whitespace gap.
   */
  static trimHorizontalBleed(
    data: Uint8ClampedArray,
    width: number,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    profile: PageInkProfile,
    isMultiColumn: boolean = false
  ): { minX: number; maxX: number } {
    if (maxX - minX < 40) return { minX, maxX };

    const maxClusterWidth = isMultiColumn ? 120 : 4;
    const minGapWidth = isMultiColumn ? 10 : 15;

    // 1. Compute per-column ink count across [minY, maxY]
    const spanW = maxX - minX + 1;
    const colInk = new Int32Array(spanW);

    for (let y = minY; y <= maxY; y++) {
      const rowOff = y * width * 4;
      for (let x = minX; x <= maxX; x++) {
        const idx = rowOff + x * 4;
        if (data[idx + 3] > 50) {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lum < profile.inkThreshold) {
            colInk[x - minX]++;
          } else if (profile.hasColoredInk) {
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
            if (sat > 0.35 && lum < 220) {
              colInk[x - minX]++;
            }
          }
        }
      }
    }

    let newMinX = minX;
    let newMaxX = maxX;

    // 2. Left trim: detect isolated vertical band (stray text, column dividers) followed by whitespace gap
    // where ink in the gap is 0 (or at most 1 noise pixel)
    // We allow checking up to 3 isolated bands (e.g. leftover text fragment + divider rule)
    for (let pass = 0; pass < 3; pass++) {
      const currentSpanW = newMaxX - newMinX + 1;
      if (currentSpanW < 50) break;

      // Find first column with ink
      let firstInkOffset = 0;
      while (firstInkOffset < currentSpanW && colInk[newMinX - minX + firstInkOffset] <= 1) {
        firstInkOffset++;
      }
      if (firstInkOffset >= currentSpanW) break;

      // Measure width of this initial ink cluster
      let clusterEndOffset = firstInkOffset;
      while (clusterEndOffset < currentSpanW && colInk[newMinX - minX + clusterEndOffset] > 1) {
        clusterEndOffset++;
      }
      const clusterWidth = clusterEndOffset - firstInkOffset;

      // Measure gap after this cluster
      let gapEndOffset = clusterEndOffset;
      while (gapEndOffset < currentSpanW && colInk[newMinX - minX + gapEndOffset] <= 1) {
        gapEndOffset++;
      }
      const gapWidth = gapEndOffset - clusterEndOffset;

      const remainingDiagramWidth = currentSpanW - gapEndOffset;

      // If cluster is followed by clear whitespace gap,
      // and there is substantive diagram ink remaining (>= 35px wide), trim the cluster!
      if (clusterWidth <= maxClusterWidth && gapWidth >= minGapWidth && remainingDiagramWidth >= 35) {
        newMinX = newMinX + gapEndOffset;
      } else {
        break;
      }
    }

    // 3. Right trim: similarly detect isolated vertical band on the right edge followed by whitespace
    for (let pass = 0; pass < 3; pass++) {
      const currentSpanW = newMaxX - newMinX + 1;
      if (currentSpanW < 50) break;

      // Find last column with ink
      let lastInkOffset = currentSpanW - 1;
      while (lastInkOffset >= 0 && colInk[newMinX - minX + lastInkOffset] <= 1) {
        lastInkOffset--;
      }
      if (lastInkOffset <= 0) break;

      let clusterStartOffset = lastInkOffset;
      while (clusterStartOffset >= 0 && colInk[newMinX - minX + clusterStartOffset] > 1) {
        clusterStartOffset--;
      }
      const clusterWidth = lastInkOffset - clusterStartOffset;

      let gapStartOffset = clusterStartOffset;
      while (gapStartOffset >= 0 && colInk[newMinX - minX + gapStartOffset] <= 1) {
        gapStartOffset--;
      }
      const gapWidth = clusterStartOffset - gapStartOffset;
      const remainingDiagramWidth = gapStartOffset + 1;

      if (clusterWidth <= maxClusterWidth && gapWidth >= minGapWidth && remainingDiagramWidth >= 35) {
        newMaxX = newMinX + gapStartOffset;
      } else {
        break;
      }
    }

    return { minX: newMinX, maxX: newMaxX };
  }

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
                const midX = layoutModel.columnGutterX || (width / 2);
                const targetIsRight = targetBlock.columnIndex === 1 || targetBlock.contentXmin > midX - 30;
                const candidateIsRight = qb.columnIndex === 1 || qb.contentXmin > midX - 30;
                if (targetIsRight !== candidateIsRight) continue;
              }
              closestNextY = qb.statementYstart;
              nextBlock = qb;
            }
          }

          const fence = PageLayoutAnalyzer.computeDiagramFence(targetBlock, nextBlock, height, layoutModel.answerKeyYstart);
          fenceYmin = Math.max(0, Math.floor(fence.fenceYmin));
          fenceYmax = Math.min(height - 1, Math.ceil(fence.fenceYmax));

          // Multi-column isolation: clamp horizontal scanning strictly to question column
          if (layoutModel.columnCount === 2) {
            const midX = layoutModel.columnGutterX || (width / 2);
            const targetIsRight = targetBlock.columnIndex === 1 || targetBlock.contentXmin > midX - 30;
            if (targetIsRight) {
              // Right Column: start safely to the right of the gutter/divider with generous clearance
              scanXmin = Math.ceil(midX + 15);
              scanXmax = width - 10;
            } else {
              // Left Column: stop safely to the left of the gutter/divider with generous clearance
              scanXmin = 10;
              scanXmax = Math.floor(midX - 15);
            }
          }
          // If the question block fence has less than 20px of space between statement and options, no diagram can exist!
          if (fenceYmax - fenceYmin < 20) {
            return null;
          }
        }
      }

      const validBbox = Array.isArray(bbox) && bbox.length === 4
        ? DiagramCropperEngine.validateBbox(bbox)
        : undefined;
      const hasBbox = Boolean(validBbox);
      let aiYmin: number | undefined;
      let aiYmax: number | undefined;
      let aiXmin: number | undefined;
      let aiXmax: number | undefined;
      let bboxOverlapsFence = false;

      if (hasBbox && validBbox) {
        let [ymin, xmin, ymax, xmax] = validBbox;
        if (ymin > 1 || ymax > 1) { ymin /= 1000; xmin /= 1000; ymax /= 1000; xmax /= 1000; }
        aiYmin = Math.floor(ymin * height);
        aiYmax = Math.ceil(ymax * height);
        aiXmin = Math.floor(xmin * width);
        aiXmax = Math.ceil(xmax * width);

        // Check if AI bbox is inside the fence. If completely outside, ignore it!
        bboxOverlapsFence = !hasExplicitFence || (aiYmax >= fenceYmin && aiYmin <= fenceYmax);

        if (bboxOverlapsFence) {
          // 1. If Gemini Multimodal Vision AI provided the diagram bounding box,
          // use ink scanning inside and immediately around the AI bbox region to locate the exact visual boundaries!
          // Statement fence: strictly starts below the question statement text
          let stmtFence = Math.max(fenceYmin, targetBlock ? targetBlock.statementYend + 4 : 0);
          if (targetBlock && aiYmin !== undefined && aiYmin > targetBlock.statementYstart + 20) {
            stmtFence = Math.min(stmtFence, aiYmin);
          }

          let nextQFence = Math.min(fenceYmax, nextBlock ? nextBlock.statementYstart - 8 : height - 1);
          // Hard ceiling: optionsYstart and diagramGapYend must always be respected
          if (targetBlock?.optionsYstart && targetBlock.optionsYstart > stmtFence + 20) {
            nextQFence = Math.min(nextQFence, targetBlock.optionsYstart - 10);
          }
          if (targetBlock?.diagramGapYend && targetBlock.diagramGapYend > stmtFence + 20) {
            nextQFence = Math.min(nextQFence, targetBlock.diagramGapYend - 6);
          }
          if (layoutModel?.answerKeyYstart && layoutModel.answerKeyYstart > stmtFence + 20) {
            nextQFence = Math.min(nextQFence, layoutModel.answerKeyYstart - 16);
          }

          // Initial search window around AI bbox:
          // Never start above stmtFence to prevent capturing statement text
          const searchYmin = Math.max(stmtFence, aiYmin !== undefined ? Math.max(stmtFence, aiYmin - 10) : stmtFence);
          const searchYmax = Math.min(nextQFence, aiYmax !== undefined ? Math.min(nextQFence, aiYmax + 20) : nextQFence);
          const searchXmin = Math.max(scanXmin, aiXmin !== undefined ? Math.max(scanXmin, aiXmin - 20) : scanXmin);
          const searchXmax = Math.min(scanXmax, aiXmax !== undefined ? Math.max(scanXmax, aiXmax + 20) : scanXmax);

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
            for (let x = Math.max(scanXmin, minX - 15); x <= Math.min(scanXmax, maxX + 15); x++) {
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
              // Check if there's a 1-3px gap across thin bonds/dashed lines before stopping
              // Kept <= 4 so it NEVER jumps across whitespace margins into option text!
              let lookaheadHasInk = false;
              for (let look = 2; look <= 4 && checkY + look < nextQFence - 5; look++) {
                const laOff = (checkY + look) * width * 4;
                for (let x = Math.max(scanXmin, minX - 15); x <= Math.min(scanXmax, maxX + 15); x++) {
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
            for (let x = Math.max(scanXmin, minX - 15); x <= Math.min(scanXmax, maxX + 15); x++) {
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
            // Verify and clean ink boundaries: strip any option text at the bottom or leaked text at the top!
            const cropRowInk = AdaptiveInkScanner.scanRowInk(data, width, minY, maxY, profile, minX, maxX);
            const minInkRow = Math.max(3, Math.floor(profile.minInkPixelsPerRow * 0.3));
            let inkBands = AdaptiveInkScanner.groupInkIntoBands(cropRowInk, minY, maxY, minInkRow, 8);

            let strippedBottomFenceY: number | undefined;
            let strippedTopFenceY: number | undefined;

            if (inkBands.length >= 2) {
              // 1. Strip bottom option text lines: scan upward
              while (inkBands.length >= 2) {
                const lastBand = inkBands[inkBands.length - 1];
                const prevBand = inkBands[inkBands.length - 2];
                const gapAboveLast = lastBand.start - prevBand.end;
                const isLastThinText = (lastBand.end - lastBand.start) <= 45;
                if (gapAboveLast >= 10 && isLastThinText) {
                  strippedBottomFenceY = lastBand.start - 2;
                  maxY = prevBand.end;
                  inkBands = inkBands.slice(0, -1);
                } else {
                  break;
                }
              }

              // 2. Strip top leaked metadata/statement lines: thin band (<= 25px) separated by whitespace gap (>= 22px) before substantial diagram (>= 45px)
              if (inkBands.length >= 2) {
                const firstBand = inkBands[0];
                const secondBand = inkBands[1];
                const gapToSecond = secondBand.start - firstBand.end;
                const isFirstThinText = (firstBand.end - firstBand.start) <= 25;
                const isNextSubstantialDiagram = (secondBand.end - secondBand.start) >= 45;
                if (gapToSecond >= 22 && isFirstThinText && isNextSubstantialDiagram) {
                  strippedTopFenceY = firstBand.end + 2;
                  minY = secondBand.start;
                  inkBands = inkBands.slice(1);
                }
              }
            }

            // If top ink accidentally touches a known statement text line in layoutModel, clamp strictly below it
            if (layoutModel?.lines) {
              for (const line of layoutModel.lines) {
                if (minY <= line.y + 20 && minY >= line.y - 14 && maxX >= line.minX && minX <= line.maxX) {
                  minY = Math.max(minY, Math.round(line.y + 6));
                }
              }
            }

            // Prune stray vertical divider rules and adjacent column text bleed
            const trimmed = DiagramCropperEngine.trimHorizontalBleed(data, width, minX, maxX, minY, maxY, profile, layoutModel?.columnCount === 2);
            minX = trimmed.minX;
            maxX = trimmed.maxX;

            const qText = `${context?.qContent || ''} ${context?.targetQuestion?.content || ''}`.toLowerCase();
            const isCurvedApparatus = /\b(?:circular\s+tube|tube|vertical\s+circle|loop|ring|curved\s+track|curved|semicircle|hemisphere)\b/i.test(qText);
            const isGraphOrMultiPanel = /\b(?:graph|figure\s*[-–]?\s*[a-d]|figure\s*\(?[a-d]\)?|curves?|plot|f[\s\-]*x|force\s*versus|force\s*against)\b/i.test(qText);
            const isExpandedTopDiagram = isCurvedApparatus || isGraphOrMultiPanel;
            const diagHRaw = maxY - minY;
            const pad18 = Math.round(diagHRaw * 0.18);
            const padX = isExpandedTopDiagram ? 32 : 24;
            const padYTop = Math.max(isExpandedTopDiagram ? 48 : 32, Math.min(65, pad18 + 14));
            const padYBottom = Math.min(
              Math.max(isExpandedTopDiagram ? 34 : 26, Math.min(45, pad18)),
              Math.max(0, nextQFence - maxY - 6)
            );
            const cropX = Math.max(scanXmin, minX - padX);
            const effectiveStmtFence = Math.max(0, stmtFence - (isExpandedTopDiagram ? 16 : 0));
            let cropY = Math.max(effectiveStmtFence, minY - padYTop);
            if (strippedTopFenceY !== undefined) {
              cropY = Math.max(cropY, strippedTopFenceY);
            }
            const right = Math.min(scanXmax, maxX + padX);
            let bottom = Math.min(nextQFence, maxY + padYBottom);
            if (strippedBottomFenceY !== undefined) {
              bottom = Math.min(bottom, strippedBottomFenceY);
            }
            if (layoutModel?.answerKeyYstart && bottom > layoutModel.answerKeyYstart - 24) {
              bottom = Math.min(bottom, layoutModel.answerKeyYstart - 24);
            }
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
        // If Gemini provided an explicit diagram bounding box, use it even if ink scanning found 0 bands (e.g. fine vector/dashed curves)
        if (hasBbox && bboxOverlapsFence && aiYmin !== undefined && aiYmax !== undefined && aiXmin !== undefined && aiXmax !== undefined) {
          const padX = 10;
          const padY = 18;
          const cropX = Math.max(scanXmin, aiXmin - padX);
          const cropY = Math.max(fenceYmin, aiYmin - padY);
          const cropW = Math.min(scanXmax - cropX, Math.max(20, (aiXmax + padX) - cropX));
          let bottom = Math.min(fenceYmax, aiYmax + padY);
          if (layoutModel?.answerKeyYstart && bottom > layoutModel.answerKeyYstart - 12) {
            bottom = Math.max(cropY + 20, layoutModel.answerKeyYstart - 12);
          }
          const cropH = Math.max(20, bottom - cropY);
          if (cropW >= 20 && cropH >= 20) {
            return {
              cropX,
              cropY,
              cropW,
              cropH,
              confidence: 0.75,
              strategyUsed: 'ai-hint'
            };
          }
        }
        // Zero ink detected in fence and no valid AI bounding box:
        // NEVER crop an empty white fence — return null to prevent blank white rectangle images!
        return null;
      }

      let diagBands = bands;
      const opts = context?.options || context?.targetQuestion?.options;
      const optionsHaveText = !opts || (Array.isArray(opts) && opts.length >= 2 &&
        !opts.every(o => {
          const txt = (typeof o === 'string' ? o : o?.text || '').trim();
          return /^\s*\(?[A-D1-4]\)?\s*$/i.test(txt) || txt.length === 0;
        }));

      // If options have substantive text (meaning options are NOT visual drawings),
      // cleanly strip any option text lines that appear at the bottom of the detected bands!
      const colWidth = Math.max(10, scanXmax - scanXmin);

      // Hard-stop: use optionsYstart from layout model as authoritative boundary
      if (targetBlock?.optionsYstart && targetBlock.optionsYstart > fenceYmin + 20) {
        const optionHardStop = targetBlock.optionsYstart - 10;
        diagBands = diagBands.filter(b => b.start < optionHardStop);
        // Trim the last band if it partially overlaps into the options zone
        if (diagBands.length > 0) {
          const lastBand = diagBands[diagBands.length - 1];
          if (lastBand.end > optionHardStop) {
            lastBand.end = optionHardStop;
          }
        }
      }

      // Hard-stop: answerKeyYstart from layout model must never be included in diagram bands
      if (layoutModel?.answerKeyYstart && layoutModel.answerKeyYstart > fenceYmin + 20) {
        const akHardStop = layoutModel.answerKeyYstart - 14;
        diagBands = diagBands.filter(b => b.start < akHardStop);
        if (diagBands.length > 0) {
          const lastBand = diagBands[diagBands.length - 1];
          if (lastBand.end > akHardStop) {
            lastBand.end = akHardStop;
          }
        }
      }

      let strippedOptionFenceY: number | undefined;
      if (optionsHaveText && diagBands.length >= 2) {
        let firstOptionBandIdx = -1;
        for (let k = diagBands.length - 1; k >= 1; k--) {
          const b = diagBands[k];
          const prevB = diagBands[k - 1];
          // Coaching paper options start at left column margin, whereas centered diagrams are indented
          const isLeft = (b.minX - scanXmin) < colWidth * 0.28;
          const isText = (b.end - b.start) <= 65;
          // Also detect full-width option rows (2×2 grid: "(1) 45 m    (2) 90 m")
          const isFullWidthText = isText && (b.maxX - b.minX) > colWidth * 0.6;

          if ((isLeft || isFullWidthText) && isText) {
            firstOptionBandIdx = k;
            const prevIsOption = ((prevB.minX - scanXmin) < colWidth * 0.28 || (prevB.maxX - prevB.minX) > colWidth * 0.6) && (prevB.end - prevB.start) <= 65;
            // Stop scanning upward when prevB is NOT an option (i.e. prevB is the diagram!)
            if (!prevIsOption) {
              break;
            }
          } else {
            break;
          }
        }

        if (firstOptionBandIdx > 0) {
          strippedOptionFenceY = diagBands[firstOptionBandIdx].start - 2;
          diagBands = diagBands.slice(0, firstOptionBandIdx);
        }
      }

      // Top text line clearance: strip top band if it directly overlaps a known statement text line or is an isolated thin text line
      let strippedTopFenceY: number | undefined;
      if (diagBands.length >= 2) {
        const firstBand = diagBands[0];
        const secondBand = diagBands[1];
        const gapToNext = secondBand ? secondBand.start - firstBand.end : 0;
        const isKnownTextLine = layoutModel?.lines ? layoutModel.lines.some(l => 
          (Math.abs(l.y - firstBand.start) <= 12 || (firstBand.start <= l.y + 12 && firstBand.end >= l.y - 2)) &&
          firstBand.maxX >= l.minX && firstBand.minX <= l.maxX
        ) : false;
        const isThinTextBeforeDiagram = firstBand.height <= 25 && gapToNext >= 20 && secondBand.height >= 45;

        if (isKnownTextLine || isThinTextBeforeDiagram) {
          strippedTopFenceY = firstBand.end + 2;
          diagBands = diagBands.slice(1);
        }
      }

      // Blind whole-page fallback only: strip statement text at top if no layout model was available
      if (!targetBlock && !hasExplicitFence && diagBands.length >= 2) {
        let qTextEndIdx = -1;
        for (let i = 0; i < Math.min(3, diagBands.length - 1); i++) {
          const b = diagBands[i];
          const nextB = diagBands[i + 1];
          const isLeftMargin = (b.minX - scanXmin) < colWidth * 0.28;
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

        // Prune stray vertical divider rules and adjacent column text bleed
        const trimmed = DiagramCropperEngine.trimHorizontalBleed(imgData.data, width, minX, maxX, diagYmin, diagYmax, profile, layoutModel?.columnCount === 2);
        minX = trimmed.minX;
        maxX = trimmed.maxX;

        // Generous vertical breathing room padding (15-20% extra padding to prevent cut off lines/labels)
        const qTextConsensus = `${context?.qContent || ''} ${context?.targetQuestion?.content || ''}`.toLowerCase();
        const isCurvedApparatusConsensus = /\b(?:circular\s+tube|tube|vertical\s+circle|loop|ring|curved\s+track|curved|semicircle|hemisphere)\b/i.test(qTextConsensus);
        const isGraphOrMultiPanelConsensus = /\b(?:graph|figure\s*[-–]?\s*[a-d]|figure\s*\(?[a-d]\)?|curves?|plot|f[\s\-]*x|force\s*versus|force\s*against)\b/i.test(qTextConsensus);
        const isExpandedTopConsensus = isCurvedApparatusConsensus || isGraphOrMultiPanelConsensus;
        const diagHRaw = diagYmax - diagYmin;
        const pad18 = Math.round(diagHRaw * 0.18);
        const padX = isExpandedTopConsensus ? 32 : 24;
        const padYTop = Math.max(isExpandedTopConsensus ? 48 : 32, Math.min(65, pad18 + 14));
        const padYBottom = Math.min(
          Math.max(isExpandedTopConsensus ? 34 : 26, Math.min(45, pad18)),
          Math.max(0, fenceYmax - diagYmax - 6)
        );
        cropX = Math.max(scanXmin, minX - padX);
        const effectiveFenceYmin = Math.max(0, fenceYmin - (isExpandedTopConsensus ? 16 : 0));
        cropY = Math.max(effectiveFenceYmin, diagYmin - padYTop);
        if (strippedTopFenceY !== undefined) {
          cropY = Math.max(cropY, strippedTopFenceY);
        }
        cropW = Math.min(scanXmax - cropX, Math.max(20, (maxX + padX) - cropX));
        let bottom = Math.min(fenceYmax, diagYmax + padYBottom);
        if (strippedOptionFenceY !== undefined) {
          bottom = Math.min(bottom, strippedOptionFenceY);
        }
        if (layoutModel?.answerKeyYstart && bottom > layoutModel.answerKeyYstart - 24) {
          bottom = Math.min(bottom, layoutModel.answerKeyYstart - 24);
        }
        cropH = Math.max(20, bottom - cropY);
      }

      if (cropW <= 0 || cropH <= 0) return null;

      // When targetBlock, explicit fence, or AI bbox is present, boundaries are strictly isolated by fenceYmax.
      // Do not artificially chop tall diagrams (optics rays, circuit ladders, pulley systems) to 420px.
      const hasStrictFence = Boolean(targetBlock || hasExplicitFence || hasBbox);
      const maxSafeH = hasStrictFence 
        ? Math.max(40, fenceYmax - cropY) 
        : Math.min(Math.max(40, fenceYmax - cropY), Math.floor(height * 0.85));
      if (cropH > maxSafeH) {
        cropH = maxSafeH;
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

      // Phase 2 (R1): Verify the crop contains real diagram ink, not blank white
      const effectiveProfile = inkProfile || AdaptiveInkScanner.computeInkProfile(ctx, width, height);
      if (!this.hasSubstantiveInk(ctx, rect.cropX, rect.cropY, rect.cropW, rect.cropH, effectiveProfile)) {
        console.warn(`[DiagramCropperEngine] Crop rejected: insufficient ink detected in [${rect.cropX}, ${rect.cropY}, ${rect.cropW}x${rect.cropH}] for Q${context?.localQNum || context?.qNum || '?'}`);
        return null;
      }

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
        }
      }
      if (!dataUrl) {
        try {
          const canvasPkg = '@napi-rs/canvas';
          const req = typeof (globalThis as any).__non_webpack_require__ !== 'undefined'
            ? (globalThis as any).__non_webpack_require__
            : (typeof require !== 'undefined' ? require : eval('require'));
          const { createCanvas } = req(canvasPkg);
          const nodeCrop = createCanvas(rect.cropW, rect.cropH);
          const nodeCtx = nodeCrop.getContext('2d');
          if (nodeCtx) {
            nodeCtx.fillStyle = '#ffffff';
            nodeCtx.fillRect(0, 0, rect.cropW, rect.cropH);
            nodeCtx.drawImage(fullCanvas, rect.cropX, rect.cropY, rect.cropW, rect.cropH, 0, 0, rect.cropW, rect.cropH);
            dataUrl = nodeCrop.toDataURL('image/webp', 0.88);
          }
        } catch {
          // ignore if @napi-rs/canvas is not loaded
        }
      }
      if (!dataUrl && typeof (fullCanvas as any).toDataURL === 'function') {
        dataUrl = (fullCanvas as any).toDataURL('image/webp', 0.88);
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
