/**
 * Handles text layer extraction, PDF reading order sorting,
 * scanned document pre-flight detection, and base64 serialization.
 */
export class PdfTextExtractor {
  /**
   * Dynamically loads pdfjsLib and initializes worker on demand.
   */
  static async getPdfJs() {
    let pdfjsLib: any;
    if (typeof window === 'undefined' || typeof DOMMatrix === 'undefined') {
      try {
        pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      } catch {
        pdfjsLib = await import('pdfjs-dist');
      }
    } else {
      pdfjsLib = await import('pdfjs-dist');
    }

    if (pdfjsLib?.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
      } catch {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      }
    }
    return pdfjsLib;
  }

  /**
   * Sorts PDF.js text items into true visual reading order.
   * Handles both single-column and multi-column coaching paper layouts.
   */
  /**
   * Intelligently merges vertically stacked fraction numerators & denominators
   * (e.g. '1' stacked above '2' -> '1/2') and superscript exponents.
   */
  static healColumnMathTokens(colItems: any[]): any[] {
    if (!colItems || colItems.length <= 1) return colItems || [];

    // Sort items by Y descending (top to bottom in PDF coordinate space)
    const sorted = [...colItems].sort((a, b) => (b.transform?.[5] ?? 0) - (a.transform?.[5] ?? 0));
    const consumed = new Set<any>();
    const result: any[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i];
      if (consumed.has(a)) continue;

      const xA = a.transform?.[4] ?? 0;
      const yA = a.transform?.[5] ?? 0;
      const strA = (a.str || '').trim();

      // Check if this item is a potential fraction numerator: strictly numerical digits, single variable, Greek symbol, or math atom
      // CRITICAL: NEVER match English words (e.g. 'a', 'the', 'force', 'friction', 'from', 'shown', 'different', 'ratio')!
      const isMathFractionToken = (s: string) => {
        const t = s.trim();
        if (!t || t.length > 12) return false;
        // Explicitly forbid words with 2+ English letters unless it's a known math atom (gh, dx, dy, dt)
        if (/^[a-zA-Z]{2,}$/.test(t) && !/^(?:gh|dx|dy|dt)$/i.test(t)) {
          return false;
        }
        return /^(?:[0-9]+(?:\.[0-9]+)?|[a-zA-Z]|[0-9]+[a-zA-Z]|\\[a-zA-Z]+|\\sqrt\{?[a-zA-Z0-9]+\}?|[a-zA-Z]_[0-9a-zA-Z]|\d+gh|gh)$/.test(t);
      };

      const isNumCandidate = isMathFractionToken(strA);

      // Check if item has an item immediately to its left on the same horizontal line
      const hasLeftPrecedingItem = (item: any) => {
        const x = item.transform?.[4] ?? 0;
        const y = item.transform?.[5] ?? 0;
        return sorted.some(other => {
          if (other === item) return false;
          const oX = other.transform?.[4] ?? 0;
          const oY = other.transform?.[5] ?? 0;
          const oRight = oX + (other.width || 12);
          return Math.abs(oY - y) <= 4.0 && x > oX && (x - oRight) >= -2 && (x - oRight) <= 22;
        });
      };
      const aHasLeft = hasLeftPrecedingItem(a);

      let matchedDen: any = null;
      if (isNumCandidate) {
        // Look for denominator candidate B directly beneath A: yA - yB in [4, 18], |xA - xB| <= 8
        for (let j = i + 1; j < sorted.length; j++) {
          const b = sorted[j];
          if (consumed.has(b)) continue;
          const xB = b.transform?.[4] ?? 0;
          const yB = b.transform?.[5] ?? 0;
          const dy = yA - yB;
          if (dy > 20) break; // passed vertical denominator threshold
          if (dy >= 4.0 && dy <= 18.0 && Math.abs(xA - xB) <= 8.0) {
            const strB = (b.str || '').trim();
            if (isMathFractionToken(strB)) {
              const bHasLeft = hasLeftPrecedingItem(b);
              // If BOTH A and B are preceded by text on their own lines (e.g. superscripts on stacked option rows),
              // they are parallel text lines, NOT a vertical fraction!
              if (aHasLeft && bHasLeft) {
                continue;
              }
              matchedDen = b;
              break;
            }
          }
        }
      }

      if (matchedDen) {
        consumed.add(matchedDen);
        const mergedStr = `${strA}/${(matchedDen.str || '').trim()}`;
        result.push({
          ...a,
          str: mergedStr,
          transform: a.transform
        });
      } else {
        result.push(a);
      }
    }

    return result;
  }

  /**
   * Sorts PDF.js text items into true visual reading order.
   * Handles both single-column and multi-column coaching paper layouts.
   */
  static sortPdfTextItems(items: any[], pageWidth: number = 612, pageHeight: number = 792): any[] {
    const validItems = items.filter(it => it && typeof it.str === 'string' && it.str.trim().length > 0);
    if (validItems.length <= 1) return items;

    const midX = pageWidth / 2;
    const gutterMargin = 12;

    const leftItems = validItems.filter(it => (it.transform?.[4] ?? 0) <= midX - gutterMargin);
    const rightItems = validItems.filter(it => (it.transform?.[4] ?? 0) >= midX + gutterMargin);

    // Two-column layout detection:
    // A page is two-column if items exist on both sides of midX,
    // and EITHER both columns have >= 20% of items OR right column contains question markers (e.g. "19.", "(20)")
    const hasQuestionMarkersRight = rightItems.some(it => /^\s*(?:Q\.?\s*\d+|\(?\d{1,3}\)?[\.:\)])/i.test((it.str || '').trim()));
    const isTwoColumn = (leftItems.length >= 2 && rightItems.length >= 2) &&
      ((leftItems.length >= validItems.length * 0.20 && rightItems.length >= validItems.length * 0.20) || hasQuestionMarkersRight);

    const sortColumn = (colItems: any[]) => {
      const healedItems = PdfTextExtractor.healColumnMathTokens(colItems);
      return [...healedItems].sort((a, b) => {
        const yA = a.transform?.[5] ?? 0;
        const yB = b.transform?.[5] ?? 0;
        if (Math.abs(yA - yB) > 6.5) {
          return yB - yA; // In PDF space, higher Y is higher on page
        }
        const xA = a.transform?.[4] ?? 0;
        const xB = b.transform?.[4] ?? 0;
        return xA - xB;
      });
    };

    if (isTwoColumn) {
      // 1. Detect Bottom Full-Width / Answer Key Zone
      // Prevent full-width answer key tables or footers from being sliced down the middle at midX
      let keyBannerItem = validItems.find(it => {
        const str = (it.str || '').trim();
        return /(?:ANSWER\s*KEYS?|KEY\s*SHEET|SOLUTIONS?\s+KEY|HINTS\s+(?:&|AND)\s+ANSWERS?|ANSWERS\s*[:.\-]?)/i.test(str);
      });

      // If no explicit banner found, look for a headerless answer key row at the bottom of the page (y <= 300)
      if (!keyBannerItem) {
        keyBannerItem = validItems.find(it => {
          const y = it.transform?.[5] ?? 0;
          const str = (it.str || '').trim();
          if (y <= 300 && /^(?:Q\.?\s*)?1\.$/.test(str)) {
            const hasSameYAnswer = validItems.some(other => {
              const otherY = other.transform?.[5] ?? 0;
              const otherStr = (other.str || '').trim();
              return other !== it && Math.abs(otherY - y) <= 5.0 && (/^\([1-4A-D]\)$/i.test(otherStr) || /^(?:Q\.?\s*)?2\./i.test(otherStr));
            });
            return hasSameYAnswer;
          }
          return false;
        });
      }

      const isInstitutionalNoiseItem = (it: any) => {
        const y = it.transform?.[5] ?? 0;
        const str = (it.str || '').trim();
        if (/^(?:BATCH\s*[-–]|PRAGYAAN|PAGE\s*NO\.?\s*#?\d*|P\s*#\s*\d+)$/i.test(str)) return true;
        if (/(?:BATCH\s*[-–]\s*PRAGYAAN|PHYSICS\s*\|\s*P\b|\bPHYSICS\s+P-\d+\b|\bP\s*#\s*\d+\b)/i.test(str)) return true;
        if (y > 90) return false; // Strictly bottom zone in PDF coordinate space
        return /(?:OFFICE\s+ADDRESS|Plot\s+Number|Near\s+Riddhi|Triveni\s+Nagar|Gopalpura|Jaipur|Rajasthan|\bMob\.\s*\d|www\.[a-z0-9\-]+|PAGE\s*#?\s*\d+|BATCH\s*[-–])/i.test(str);
      };

      const isBottomFooterItem = (it: any) => {
        const y = it.transform?.[5] ?? 0;
        if (y > 90) return false;
        return isInstitutionalNoiseItem(it);
      };

      let footerTopY = -Infinity;
      if (keyBannerItem) {
        footerTopY = (keyBannerItem.transform?.[5] ?? 0) + 12;
      } else {
        const footerAddrItem = validItems.find(isBottomFooterItem);
        if (footerAddrItem) {
          footerTopY = (footerAddrItem.transform?.[5] ?? 0) + 12;
        }
      }

      const cleanItems = validItems.filter(it => !isInstitutionalNoiseItem(it));

      // Separate items into: Non-Footer (Header + 2 Columns) and Full-Width Footer
      const footerItems: any[] = [];
      const nonFooterItems: any[] = [];

      for (const it of cleanItems) {
        const y = it.transform?.[5] ?? 0;
        if (footerTopY > 0 && y <= footerTopY) {
          if (keyBannerItem) {
            footerItems.push(it);
          }
        } else {
          nonFooterItems.push(it);
        }
      }

      // CRITICAL: Only consider running header items in the top zone of the page (y >= pageHeight * 0.86)
      // Never strip "[JEE MAIN...]" or section headers located within question statements!
      const topHeaderCutoffY = (pageHeight || 792) * 0.86;
      const isHeaderItem = (it: any) => {
        const y = it.transform?.[5] ?? 0;
        if (y < topHeaderCutoffY) return false;
        const str = (it.str || '').trim();
        return /^(?:PART|SECTION|LEVEL|ALLEN|RESONANCE|FIITJEE|COMPETISHUN|PHYSICS|CHEMISTRY|MATHEMATICS|MATHS|SINGLE\s+CORRECT|DAILY\s+TASK|DTS\b)/i.test(str);
      };

      const headerItems = nonFooterItems.filter(isHeaderItem);
      const colLeft = nonFooterItems.filter(it => !isHeaderItem(it) && (it.transform?.[4] ?? 0) <= midX);
      const colRight = nonFooterItems.filter(it => !isHeaderItem(it) && (it.transform?.[4] ?? 0) > midX);

      const sortedFooter = sortColumn(footerItems);
      const hasExplicitBanner = validItems.some(it => /(?:ANSWER\s*KEYS?|KEY\s*SHEET|SOLUTIONS?\s+KEY)/i.test((it.str || '').trim()));
      const hasGridItems = footerItems.some(it => /^\(?\d{1,2}\.?\)?$/.test((it.str || '').trim()) || /^\([1-4A-D]\)$/i.test((it.str || '').trim()));
      if (!hasExplicitBanner && (keyBannerItem || (footerItems.length >= 8 && hasGridItems))) {
        const topFooterY = footerTopY > 0 ? footerTopY + 15 : 200;
        sortedFooter.unshift({
          str: 'ANSWER KEY',
          transform: [1, 0, 0, 1, 50, topFooterY],
          width: 80,
          height: 12
        });
      }

      return [
        ...sortColumn(headerItems),
        ...sortColumn(colLeft),
        ...sortColumn(colRight),
        ...sortedFooter
      ];
    }

    const isInstitutionalNoiseItem = (it: any) => {
      const y = it.transform?.[5] ?? 0;
      const str = (it.str || '').trim();
      if (/^(?:BATCH\s*[-–]|PRAGYAAN|PAGE\s*NO\.?\s*#?\d*|P\s*#\s*\d+)$/i.test(str)) return true;
      if (/(?:BATCH\s*[-–]\s*PRAGYAAN|PHYSICS\s*\|\s*P\b|\bPHYSICS\s+P-\d+\b|\bP\s*#\s*\d+\b)/i.test(str)) return true;
      if (y > 90) return false;
      return /(?:OFFICE\s+ADDRESS|Plot\s+Number|Near\s+Riddhi|Triveni\s+Nagar|Gopalpura|Jaipur|Rajasthan|\bMob\.\s*\d|www\.[a-z0-9\-]+|PAGE\s*#?\s*\d+|BATCH\s*[-–])/i.test(str);
    };

    return sortColumn(validItems.filter(it => !isInstitutionalNoiseItem(it)));
  }

  /**
   * Extracts raw text from a PDF file page by page using pdfjs-dist, preserving visual reading order.
   */
  static async extractTextFromPDF(file: File, onProgress?: (status: string) => void): Promise<string> {
    onProgress?.('Reading PDF file...');
    const pdfjsLib = await this.getPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress?.(`Extracting text from page ${i} of ${pdf.numPages}...`);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 });
      const content = await page.getTextContent();
      const sortedItems = this.sortPdfTextItems(content.items as any[], viewport.width, viewport.height);
      fullText += `\n[PAGE ${i}]\n`;

      let lastY: number | null = null;
      let curLine = '';
      for (const item of sortedItems) {
        const itemY = item.transform?.[5] ?? null;
        if (lastY !== null && itemY !== null && Math.abs(itemY - lastY) > 6.5) {
          if (curLine.trim()) {
            fullText += curLine.trim() + '\n';
          }
          curLine = '';
        }
        curLine += (curLine ? ' ' : '') + (item.str || '');
        if (itemY !== null) {
          lastY = itemY;
        }
      }
      if (curLine.trim()) {
        fullText += curLine.trim() + '\n';
      }
    }

    return fullText;
  }

  /**
   * Fast pre-flight check to determine if a PDF has an embedded digital text layer
   * or is a scanned / image-only document.
   */
  static async detectScannedPdf(file: File): Promise<{ isScanned: boolean; pageCount: number; charCount: number }> {
    try {
      const pdfjsLib = await this.getPdfJs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages || 1;

      const pagesToCheck = Math.min(numPages, 3);
      let totalChars = 0;

      for (let i = 1; i <= pagesToCheck; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const chars = (content.items || []).reduce((sum: number, it: any) => sum + (it.str?.length || 0), 0);
        totalChars += chars;
      }

      const avgCharsPerPage = totalChars / pagesToCheck;
      const isScanned = avgCharsPerPage < 35;

      return {
        isScanned,
        pageCount: numPages,
        charCount: totalChars
      };
    } catch (err) {
      console.warn('[detectScannedPdf] Pre-flight text layer check failed:', err);
      return { isScanned: false, pageCount: 1, charCount: 0 };
    }
  }

  /**
   * Encodes a PDF File to base64 for Gemini Multimodal Vision API parsing.
   */
  static async fileToBase64(file: File): Promise<string | undefined> {
    try {
      if (file.size > 25 * 1024 * 1024) {
        return undefined;
      }
      if (typeof FileReader !== 'undefined') {
        return new Promise<string | undefined>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result as string;
            if (res && res.includes(',')) {
              resolve(res.split(',')[1]);
            } else {
              resolve(undefined);
            }
          };
          reader.onerror = () => resolve(undefined);
          reader.readAsDataURL(file);
        });
      } else if (typeof Buffer !== 'undefined') {
        const arrayBuffer = await file.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
      }
      return undefined;
    } catch (err) {
      console.warn("Failed to convert file to base64 for multimodal vision:", err);
      return undefined;
    }
  }
}
