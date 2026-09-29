import { AdaptiveInkScanner } from './AdaptiveInkScanner';

export interface DiagramOptionSlicerContext {
  qContent?: string;
  qNum?: number;
  localQNum?: number;
  sectionName?: string;
  options?: any[];
  targetQuestion?: any;
}

export class DiagramOptionSlicer {
  /**
   * Intelligently detects whether a cropped diagram contains option drawings (e.g. 1x4 horizontal row or 2x2 grid)
   * and slices each option into a dedicated crisp WebP data URL, populating questionContext.options.
   */
  static sliceDiagramOptions(
    fullCanvas: HTMLCanvasElement,
    cropRect: { cropX: number; cropY: number; cropW: number; cropH: number },
    itemsWithCoords: { str: string; x: number; y: number }[],
    questionContext?: DiagramOptionSlicerContext,
    cropFn: (fullCanvas: HTMLCanvasElement, rect: { x: number; y: number; w: number; h: number }) => string = (c, r) => AdaptiveInkScanner.cropSubRect(c, r)
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

          const cut01 = AdaptiveInkScanner.findVerticalInkValley(fullCanvas, mid01, cropRect.cropY, cropRect.cropH);
          const cut12 = AdaptiveInkScanner.findVerticalInkValley(fullCanvas, mid12, cropRect.cropY, cropRect.cropH);
          const cut23 = AdaptiveInkScanner.findVerticalInkValley(fullCanvas, mid23, cropRect.cropY, cropRect.cropH);

          const colBounds = [
            { id: sorted[0].id, x: cropRect.cropX, w: cut01 - cropRect.cropX },
            { id: sorted[1].id, x: cut01, w: cut12 - cut01 },
            { id: sorted[2].id, x: cut12, w: cut23 - cut12 },
            { id: sorted[3].id, x: cut23, w: (cropRect.cropX + cropRect.cropW) - cut23 }
          ];

          for (const col of colBounds) {
            const url = cropFn(fullCanvas, {
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

          const cutX = AdaptiveInkScanner.findVerticalInkValley(fullCanvas, midX, cropRect.cropY, cropRect.cropH);
          const cutY = AdaptiveInkScanner.findHorizontalInkValley(fullCanvas, midY, cropRect.cropX, cropRect.cropW);

          const quadBounds = [
            { id: topTwo[0].id, x: cropRect.cropX, y: cropRect.cropY, w: cutX - cropRect.cropX, h: cutY - cropRect.cropY },
            { id: topTwo[1].id, x: cutX, y: cropRect.cropY, w: (cropRect.cropX + cropRect.cropW) - cutX, h: cutY - cropRect.cropY },
            { id: botTwo[0].id, x: cropRect.cropX, y: cutY, w: cutX - cropRect.cropX, h: (cropRect.cropY + cropRect.cropH) - cutY },
            { id: botTwo[1].id, x: cutX, y: cutY, w: (cropRect.cropX + cropRect.cropW) - cutX, h: (cropRect.cropY + cropRect.cropH) - cutY }
          ];

          for (const q of quadBounds) {
            const url = cropFn(fullCanvas, {
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
          const cut01 = AdaptiveInkScanner.findVerticalInkValley(fullCanvas, cropRect.cropX + colW, cropRect.cropY, cropRect.cropH);
          const cut12 = AdaptiveInkScanner.findVerticalInkValley(fullCanvas, cropRect.cropX + colW * 2, cropRect.cropY, cropRect.cropH);
          const cut23 = AdaptiveInkScanner.findVerticalInkValley(fullCanvas, cropRect.cropX + colW * 3, cropRect.cropY, cropRect.cropH);

          const cols = [
            { id: 'A', x: cropRect.cropX, w: cut01 - cropRect.cropX },
            { id: 'B', x: cut01, w: cut12 - cut01 },
            { id: 'C', x: cut12, w: cut23 - cut12 },
            { id: 'D', x: cut23, w: (cropRect.cropX + cropRect.cropW) - cut23 }
          ];
          for (const col of cols) {
            const url = cropFn(fullCanvas, { x: col.x, y: cropRect.cropY, w: col.w, h: cropRect.cropH });
            if (url) optSlices[col.id] = url;
          }
        } else if (aspectRatio <= 1.8 && cropRect.cropH >= 150) {
          const midX = cropRect.cropX + cropRect.cropW / 2;
          const midY = cropRect.cropY + cropRect.cropH / 2;
          const cutX = AdaptiveInkScanner.findVerticalInkValley(fullCanvas, midX, cropRect.cropY, cropRect.cropH);
          const cutY = AdaptiveInkScanner.findHorizontalInkValley(fullCanvas, midY, cropRect.cropX, cropRect.cropW);

          const quads = [
            { id: 'A', x: cropRect.cropX, y: cropRect.cropY, w: cutX - cropRect.cropX, h: cutY - cropRect.cropY },
            { id: 'B', x: cutX, y: cropRect.cropY, w: (cropRect.cropX + cropRect.cropW) - cutX, h: cutY - cropRect.cropY },
            { id: 'C', x: cropRect.cropX, y: cutY, w: cutX - cropRect.cropX, h: (cropRect.cropY + cropRect.cropH) - cutY },
            { id: 'D', x: cutX, y: cutY, w: (cropRect.cropX + cropRect.cropW) - cutX, h: (cropRect.cropY + cropRect.cropH) - cutY }
          ];
          for (const q of quads) {
            const url = cropFn(fullCanvas, { x: q.x, y: q.y, w: q.w, h: q.h });
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
}
