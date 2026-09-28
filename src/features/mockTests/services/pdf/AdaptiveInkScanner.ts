import { PageInkProfile, QuestionBlock } from './types';

export class AdaptiveInkScanner {
  /**
   * Computes an adaptive ink profile for a rendered canvas page.
   * Dynamically differentiates dark content ink, grey coaching watermarks (~210-235),
   * and white background, while preserving colored bonds/drawings.
   */
  static computeInkProfile(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): PageInkProfile {
    try {
      // Sample 50 evenly spaced rows across the page to construct robust luminance histogram (Phase 2 - R6)
      const sampleStep = Math.max(1, Math.floor(height / 50));
      const histogram = new Int32Array(256);
      let coloredPixelCount = 0;
      let totalSampled = 0;

      for (let y = 5; y < height - 5; y += sampleStep) {
        const rowData = ctx.getImageData(0, y, width, 1).data;
        for (let x = 0; x < width; x++) {
          const idx = x * 4;
          const a = rowData[idx + 3];
          if (a > 50) {
            const r = rowData[idx];
            const g = rowData[idx + 1];
            const b = rowData[idx + 2];
            const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            histogram[lum]++;
            totalSampled++;

            // Detect colored ink (e.g. red/blue chemical bonds or diagrams)
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
            if (sat > 0.35 && lum < 220) {
              coloredPixelCount++;
            }
          }
        }
      }

      // Find background peak (typically lum 245 - 255)
      let backgroundLum = 255;
      let maxBgCount = 0;
      for (let lum = 220; lum < 256; lum++) {
        if (histogram[lum] > maxBgCount) {
          maxBgCount = histogram[lum];
          backgroundLum = lum;
        }
      }

      // Check for watermark peak (cluster in 190 - 235 range)
      let watermarkLum: number | null = null;
      let maxWmCount = 0;
      for (let lum = 190; lum <= 235; lum++) {
        if (histogram[lum] > maxWmCount && histogram[lum] > totalSampled * 0.01) {
          maxWmCount = histogram[lum];
          watermarkLum = lum;
        }
      }

      // Threshold: if a watermark peak exists, set cutoff safely below it with a safe floor of 178
      let inkThreshold = 185;
      if (watermarkLum !== null && watermarkLum >= 195) {
        inkThreshold = Math.max(178, Math.min(185, watermarkLum - 12));
      } else {
        inkThreshold = Math.min(195, Math.max(182, Math.floor(backgroundLum * 0.78)));
      }

      const hasColoredInk = coloredPixelCount >= totalSampled * 0.002;
      const minInkPixelsPerRow = Math.max(14, Math.floor(width * 0.012));

      return {
        backgroundLum,
        inkThreshold,
        watermarkLum,
        hasColoredInk,
        minInkPixelsPerRow
      };
    } catch {
      // Reliable fallback profile
      return {
        backgroundLum: 255,
        inkThreshold: 185,
        watermarkLum: null,
        hasColoredInk: false,
        minInkPixelsPerRow: Math.max(14, Math.floor(width * 0.012))
      };
    }
  }

  /**
   * Scans pixel rows inside the vertical boundary [scanYmin, scanYmax] and returns ink pixel counts.
   */
  static scanRowInk(
    data: Uint8ClampedArray,
    width: number,
    scanYmin: number,
    scanYmax: number,
    profile: PageInkProfile,
    scanXmin: number = 0,
    scanXmax?: number
  ): Int32Array {
    const height = Math.floor(data.length / (width * 4));
    const rowInk = new Int32Array(height);
    const threshold = profile.inkThreshold;
    const checkColor = profile.hasColoredInk;
    const xStart = Math.max(0, Math.floor(scanXmin));
    const xEnd = scanXmax !== undefined ? Math.min(width - 1, Math.ceil(scanXmax)) : width - 1;

    for (let y = scanYmin; y <= scanYmax; y++) {
      let ink = 0;
      const rowOff = y * width * 4;
      for (let x = xStart; x <= xEnd; x++) {
        const idx = rowOff + x * 4;
        if (data[idx + 3] > 50) {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          if (lum < threshold) {
            ink++;
          } else if (checkColor) {
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
            if (sat > 0.35 && lum < 220) {
              ink++;
            }
          }
        }
      }
      rowInk[y] = ink;
    }

    return rowInk;
  }

  /**
   * Groups rows with ink into contiguous visual bands.
   */
  static groupInkIntoBands(
    rowInk: Int32Array | number[],
    scanYmin: number,
    scanYmax: number,
    minInkPixels: number,
    maxGap: number = 5
  ): { start: number; end: number; height: number; minX: number; maxX: number }[] {
    const bands: { start: number; end: number; height: number; minX: number; maxX: number }[] = [];
    let inBand = false;
    let bandStart = 0;

    for (let y = scanYmin; y <= scanYmax; y++) {
      if (rowInk[y] >= minInkPixels) {
        if (!inBand) {
          inBand = true;
          bandStart = y;
        }
      } else {
        if (inBand) {
          let gap = 0;
          while (y + gap <= scanYmax && rowInk[y + gap] < minInkPixels) gap++;
          if (gap >= maxGap || y + gap > scanYmax) {
            bands.push({
              start: bandStart,
              end: y - 1,
              height: y - bandStart,
              minX: 0,
              maxX: 0
            });
            inBand = false;
            y += gap - 1;
          }
        }
      }
    }
    if (inBand) {
      bands.push({
        start: bandStart,
        end: scanYmax,
        height: scanYmax - bandStart + 1,
        minX: 0,
        maxX: 0
      });
    }

    return bands;
  }

  /**
   * Scans a vertical column strip around targetX to find the column with minimal ink (clean divider).
   */
  static findVerticalInkValley(
    canvas: HTMLCanvasElement,
    targetX: number,
    startY: number,
    height: number,
    radius: number = 35,
    threshold: number = 185
  ): number {
    try {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return Math.round(targetX);

      const minX = Math.max(0, Math.round(targetX - radius));
      const maxX = Math.min(canvas.width - 1, Math.round(targetX + radius));
      const scanW = maxX - minX + 1;
      const scanH = Math.max(1, Math.round(height));
      const clampedStartY = Math.max(0, Math.min(canvas.height - 1, Math.round(startY)));

      const imgData = ctx.getImageData(minX, clampedStartY, scanW, scanH);
      const data = imgData.data;

      let bestX = Math.round(targetX);
      let minScore = Infinity;

      for (let xOff = 0; xOff < scanW; xOff++) {
        let colInk = 0;
        for (let y = 0; y < scanH; y++) {
          const idx = (y * scanW + xOff) * 4;
          if (data[idx + 3] > 50) {
            const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            if (lum < threshold) colInk++;
          }
        }
        const dist = Math.abs((minX + xOff) - targetX);
        const score = colInk * 1000 + dist;
        if (score < minScore) {
          minScore = score;
          bestX = minX + xOff;
        }
      }
      return bestX;
    } catch {
      return Math.round(targetX);
    }
  }

  /**
   * Scans a horizontal row strip around targetY to find the row with minimal ink (clean divider).
   */
  static findHorizontalInkValley(
    canvas: HTMLCanvasElement,
    targetY: number,
    startX: number,
    width: number,
    radius: number = 30,
    threshold: number = 185
  ): number {
    try {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return Math.round(targetY);

      const minY = Math.max(0, Math.round(targetY - radius));
      const maxY = Math.min(canvas.height - 1, Math.round(targetY + radius));
      const scanH = maxY - minY + 1;
      const scanW = Math.max(1, Math.round(width));
      const clampedStartX = Math.max(0, Math.min(canvas.width - 1, Math.round(startX)));

      const imgData = ctx.getImageData(clampedStartX, minY, scanW, scanH);
      const data = imgData.data;

      let bestY = Math.round(targetY);
      let minScore = Infinity;

      for (let yOff = 0; yOff < scanH; yOff++) {
        let rowInk = 0;
        const rowStart = yOff * scanW * 4;
        for (let x = 0; x < scanW; x++) {
          const idx = rowStart + x * 4;
          if (data[idx + 3] > 50) {
            const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            if (lum < threshold) rowInk++;
          }
        }
        const dist = Math.abs((minY + yOff) - targetY);
        const score = rowInk * 1000 + dist;
        if (score < minScore) {
          minScore = score;
          bestY = minY + yOff;
        }
      }
      return bestY;
    } catch {
      return Math.round(targetY);
    }
  }

  /**
   * Crops a sub-rectangle from a canvas, trims surplus whitespace, fills white background,
   * and returns a high quality WebP base64 string.
   */
  static cropSubRect(
    canvas: HTMLCanvasElement,
    rect: { x: number; y: number; w: number; h: number },
    padding: number = 14,
    threshold: number = 185
  ): string {
    try {
      if (rect.w <= 0 || rect.h <= 0) return '';
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return '';

      const clampedX = Math.max(0, Math.min(canvas.width - 1, Math.round(rect.x)));
      const clampedY = Math.max(0, Math.min(canvas.height - 1, Math.round(rect.y)));
      const clampedW = Math.min(canvas.width - clampedX, Math.round(rect.w));
      const clampedH = Math.min(canvas.height - clampedY, Math.round(rect.h));
      if (clampedW <= 0 || clampedH <= 0) return '';

      const imgData = ctx.getImageData(clampedX, clampedY, clampedW, clampedH);
      const data = imgData.data;
      let minX = clampedW, maxX = 0, minY = clampedH, maxY = 0;
      let hasInk = false;

      for (let y = 0; y < clampedH; y++) {
        const rowOff = y * clampedW * 4;
        for (let x = 0; x < clampedW; x++) {
          const idx = rowOff + x * 4;
          if (data[idx + 3] > 50) {
            const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            if (lum < threshold) {
              hasInk = true;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
      }

      let finalX = clampedX;
      let finalY = clampedY;
      let finalW = clampedW;
      let finalH = clampedH;

      if (hasInk) {
        finalX = Math.max(0, clampedX + minX - padding);
        finalY = Math.max(0, clampedY + minY - padding);
        const finalRight = Math.min(canvas.width, clampedX + maxX + padding);
        const finalBottom = Math.min(canvas.height, clampedY + maxY + padding);
        finalW = Math.max(10, finalRight - finalX);
        finalH = Math.max(10, finalBottom - finalY);
      }

      const outCanvas = document.createElement('canvas');
      outCanvas.width = finalW;
      outCanvas.height = finalH;
      const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });
      if (!outCtx) return '';

      outCtx.fillStyle = '#ffffff';
      outCtx.fillRect(0, 0, finalW, finalH);
      outCtx.drawImage(canvas, finalX, finalY, finalW, finalH, 0, 0, finalW, finalH);

      return outCanvas.toDataURL('image/webp', 0.88);
    } catch {
      return '';
    }
  }

  /**
   * Discovers question blocks and diagram fences directly from image canvas pixels
   * when a PDF is scanned / image-only (has 0 selectable text items).
   * Identifies question start statements via left-margin ink alignment,
   * isolating diagrams and options between consecutive question statements.
   */
  static detectVisualQuestionBlocks(canvas: HTMLCanvasElement): QuestionBlock[] {
    try {
      if (!canvas || canvas.width <= 0 || canvas.height <= 0) return [];
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return [];

      const width = canvas.width;
      const height = canvas.height;
      const profile = this.computeInkProfile(ctx, width, height);
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      // Scan rows for ink pixels and min/max X extent
      const rows: { y: number; ink: number; firstX: number; lastX: number }[] = [];
      for (let y = 0; y < height; y++) {
        let firstX = -1;
        let lastX = -1;
        let ink = 0;
        const off = y * width * 4;
        for (let x = 0; x < width; x++) {
          const idx = off + x * 4;
          if (data[idx + 3] > 50) {
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            if (lum < profile.inkThreshold) {
              if (firstX === -1) firstX = x;
              lastX = x;
              ink++;
            } else if (profile.hasColoredInk) {
              const maxC = Math.max(r, g, b);
              const minC = Math.min(r, g, b);
              const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
              if (sat > 0.35 && lum < 220) {
                if (firstX === -1) firstX = x;
                lastX = x;
                ink++;
              }
            }
          }
        }
        rows.push({ y, ink, firstX, lastX });
      }

      // Group contiguous ink rows into horizontal ink bands using gap tolerance
      const minInk = Math.max(4, Math.floor(profile.minInkPixelsPerRow * 0.35));
      const rowInkArr = rows.map(r => r.ink);
      const rawBands = this.groupInkIntoBands(rowInkArr, 0, height - 1, minInk, 5);

      const bands: { startY: number; endY: number; minX: number; maxX: number; maxInk: number; rowCount: number }[] = [];
      for (const b of rawBands) {
        let minX = width;
        let maxX = 0;
        let maxInk = 0;
        for (let y = b.start; y <= b.end; y++) {
          const r = rows[y];
          if (r.firstX !== -1 && r.firstX < minX) minX = r.firstX;
          if (r.lastX > maxX) maxX = r.lastX;
          if (r.ink > maxInk) maxInk = r.ink;
        }
        if (b.height >= 3 && maxX > minX) {
          bands.push({
            startY: b.start,
            endY: b.end,
            minX,
            maxX,
            maxInk,
            rowCount: b.height
          });
        }
      }

      if (bands.length === 0) return [];

      // Indian coaching DPPs align question numbers at the extreme left margin (x < 5.5% width)
      const marginThreshold = Math.max(60, Math.floor(width * 0.055));
      const minTextInk = profile.minInkPixelsPerRow * 3;

      const qStartBands: { index: number; band: typeof bands[0] }[] = [];
      for (let i = 0; i < bands.length; i++) {
        const b = bands[i];
        // Skip centered running headers (e.g. PART - III at page top)
        if (b.startY < height * 0.08 && b.minX > marginThreshold) continue;
        if (b.minX <= marginThreshold && b.maxInk > minTextInk) {
          qStartBands.push({ index: i, band: b });
        }
      }

      const blocks: QuestionBlock[] = [];
      for (let qIdx = 0; qIdx < qStartBands.length; qIdx++) {
        const cur = qStartBands[qIdx];
        const next = qStartBands[qIdx + 1];
        const stmtStart = cur.band.startY;
        let stmtEnd = cur.band.endY;

        // 1. Expand multi-line question statements!
        // Check if subsequent bands are continuation lines of the question statement before the diagram
        const endBandIdx = next ? next.index : bands.length;
        let lastStmtBandIdx = cur.index;
        for (let bIdx = cur.index + 1; bIdx < endBandIdx; bIdx++) {
          const b = bands[bIdx];
          const bHeight = b.endY - b.startY;
          const gap = b.startY - stmtEnd;
          // Continuation text line: must be left-aligned (minX <= 18% width), normal line height (<= 55px),
          // tight line gap (<= 32px), and reasonably near question start
          const isLeftAligned = b.minX <= Math.max(80, Math.floor(width * 0.18));
          if (isLeftAligned && bHeight <= 55 && gap <= 32 && b.startY < stmtStart + 180) {
            stmtEnd = b.endY;
            lastStmtBandIdx = bIdx;
          } else {
            // Hit a centered diagram, large whitespace gap, or options
            break;
          }
        }

        // 2. Detect text options at the bottom of the question block
        // Scan backwards from the end of the block towards the statement end
        let optionsYstart: number | undefined;
        let optionsYend: number | undefined;

        const optBands: typeof bands = [];
        for (let bIdx = endBandIdx - 1; bIdx > lastStmtBandIdx; bIdx--) {
          const b = bands[bIdx];
          const bHeight = b.endY - b.startY;
          
          // Skip noise / footer artifacts at extreme page bottom
          if (b.startY > height * 0.88 && (bHeight < 10 || b.maxInk < minTextInk * 0.5)) {
            continue;
          }

          // Coaching paper options start at left margin (x < 25% width), whereas centered diagrams start > 25%
          const isLeftAligned = b.minX < width * 0.25;
          const isTextLine = bHeight <= 75;
          const prevOpt = optBands[optBands.length - 1];
          const gapBelow = prevOpt ? prevOpt.startY - b.endY : 0;

          if (isLeftAligned && isTextLine && (optBands.length === 0 || gapBelow <= 36)) {
            optBands.push(b);
            optionsYstart = b.startY;
            if (optionsYend === undefined) optionsYend = b.endY;
          } else {
            // Hit a centered diagram or large whitespace gap separating diagram from options
            break;
          }
        }

        const fenceYmin = stmtEnd + 8;
        let fenceYmax: number;

        if (optBands.length >= 1 && optionsYstart && optionsYstart > fenceYmin + 30) {
          // Diagram fence ends strictly 10px ABOVE the first detected option line!
          fenceYmax = optionsYstart - 10;
        } else if (next) {
          fenceYmax = Math.max(fenceYmin + 20, next.band.startY - 10);
        } else {
          // Single or last question on page without options: fence extends safely towards bottom
          fenceYmax = height - 10;
        }

        blocks.push({
          questionNum: qIdx + 1,
          localQNum: qIdx + 1,
          lineIndex: cur.index,
          statementYstart: stmtStart,
          statementYend: stmtEnd,
          diagramGapYstart: fenceYmin,
          diagramGapYend: fenceYmax,
          optionsYstart,
          optionsYend,
          contentXmin: cur.band.minX,
          contentXmax: cur.band.maxX,
          statementText: `Visual Question ${qIdx + 1}`
        });
      }

      return blocks;
    } catch {
      return [];
    }
  }
}
