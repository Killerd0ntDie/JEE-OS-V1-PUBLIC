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
  static sortPdfTextItems(items: any[], pageWidth: number = 612): any[] {
    const validItems = items.filter(it => it && typeof it.str === 'string' && it.str.trim().length > 0);
    if (validItems.length <= 1) return items;

    const midX = pageWidth / 2;
    const gutterMargin = 15;

    const leftItems = validItems.filter(it => (it.transform?.[4] ?? 0) <= midX - gutterMargin);
    const rightItems = validItems.filter(it => (it.transform?.[4] ?? 0) >= midX + gutterMargin);

    const isTwoColumn = leftItems.length >= validItems.length * 0.25 && rightItems.length >= validItems.length * 0.25;

    const sortColumn = (colItems: any[]) => {
      return [...colItems].sort((a, b) => {
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
      // e.g. Competishun: { str: '1.', x: 50, y: 177 }, { str: '(2)', x: 86, y: 177 }
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

      const isInstitutionalFooterItem = (it: any) => {
        const y = it.transform?.[5] ?? 0;
        if (y > 100) return false;
        const str = (it.str || '').trim();
        return /(?:OFFICE\s+ADDRESS|Plot\s+Number|Near\s+Riddhi|Triveni\s+Nagar|Gopalpura|Jaipur|Rajasthan|\bMob\.\s*\d|www\.[a-z0-9\-]+|PAGE\s*#?\s*\d+|BATCH\s*[-–])/i.test(str);
      };

      let footerTopY = -Infinity;
      if (keyBannerItem) {
        // Any item at or below the answer key banner belongs to the full-width footer/key zone
        footerTopY = (keyBannerItem.transform?.[5] ?? 0) + 12;
      } else {
        // Check for institutional copyright/address footer at bottom (strictly y <= 100)
        const footerAddrItem = validItems.find(isInstitutionalFooterItem);
        if (footerAddrItem) {
          footerTopY = (footerAddrItem.transform?.[5] ?? 0) + 12;
        }
      }

      // Filter out institutional footer items completely
      const cleanItems = validItems.filter(it => !isInstitutionalFooterItem(it));

      // 2. Separate items into: Non-Footer (Header + 2 Columns) and Full-Width Footer
      const footerItems: any[] = [];
      const nonFooterItems: any[] = [];

      for (const it of cleanItems) {
        const y = it.transform?.[5] ?? 0;
        if (footerTopY > 0 && y <= footerTopY) {
          if (keyBannerItem) {
            footerItems.push(it);
          }
          // If no keyBannerItem, discard items at or below footerTopY!
        } else {
          nonFooterItems.push(it);
        }
      }

      const isHeaderItem = (it: any) => {
        const str = (it.str || '').trim();
        return /^(?:PART|SECTION|LEVEL|JEE|ALLEN|RESONANCE|FIITJEE|COMPETISHUN|PHYSICS|CHEMISTRY|MATHEMATICS|MATHS|SINGLE\s+CORRECT|DAILY\s+TASK|DTS\b)/i.test(str);
      };

      const headerItems = nonFooterItems.filter(isHeaderItem);
      const colLeft = nonFooterItems.filter(it => !isHeaderItem(it) && (it.transform?.[4] ?? 0) <= midX);
      const colRight = nonFooterItems.filter(it => !isHeaderItem(it) && (it.transform?.[4] ?? 0) > midX);

      return [
        ...sortColumn(headerItems),
        ...sortColumn(colLeft),
        ...sortColumn(colRight),
        ...sortColumn(footerItems)
      ];
    }

    const isInstitutionalFooterItem = (it: any) => {
      const y = it.transform?.[5] ?? 0;
      if (y > 100) return false;
      const str = (it.str || '').trim();
      return /(?:OFFICE\s+ADDRESS|Plot\s+Number|Near\s+Riddhi|Triveni\s+Nagar|Gopalpura|Jaipur|Rajasthan|\bMob\.\s*\d|www\.[a-z0-9\-]+|PAGE\s*#?\s*\d+|BATCH\s*[-–])/i.test(str);
    };

    return sortColumn(validItems.filter(it => !isInstitutionalFooterItem(it)));
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
      const sortedItems = this.sortPdfTextItems(content.items as any[], viewport.width);
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
