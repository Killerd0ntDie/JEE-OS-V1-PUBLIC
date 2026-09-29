import { PdfTextExtractor } from './PdfTextExtractor';
import { PageLayoutAnalyzer } from './PageLayoutAnalyzer';
import { DiagramCropperEngine } from './DiagramCropperEngine';
import { AdaptiveInkScanner } from './AdaptiveInkScanner';
import { OptionExtractor } from './OptionExtractor';
import { PageLayoutModel, PageInkProfile } from './types';

export class DiagramAttachmentService {
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
      pageQIndex?: number;
    },
    cachedLayout?: PageLayoutModel | Map<number, PageLayoutModel>,
    cachedInkProfile?: PageInkProfile | Map<number, PageInkProfile>,
    getPdfJsFn: () => Promise<any> = () => PdfTextExtractor.getPdfJs()
  ): Promise<string> {
    try {
      if (typeof document === 'undefined') return '';

      const pdfjsLib = await getPdfJsFn();
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

      let fullCanvas: any = typeof document !== 'undefined' ? document.createElement('canvas') : null;
      if (fullCanvas) {
        fullCanvas.width = Math.floor(viewport.width);
        fullCanvas.height = Math.floor(viewport.height);
      }
      let ctx: any = fullCanvas ? fullCanvas.getContext?.('2d', { willReadFrequently: true }) : null;
      if (!ctx) {
        try {
          const canvasPkg = '@napi-rs/canvas';
          const { createCanvas } = await import(/* @vite-ignore */ canvasPkg);
          fullCanvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
          ctx = fullCanvas.getContext('2d');
        } catch (_canvasErr) {
          // ignore
        }
      }
      if (!ctx || !fullCanvas) return '';

      await page.render({ canvasContext: ctx, viewport }).promise;

      // 1. Two-Pass Spatial Layout Model (cached or freshly analyzed)
      let layoutModel = cachedLayout instanceof Map ? cachedLayout.get(safePageNum) : cachedLayout;
      if (!layoutModel) {
        try {
          layoutModel = await PageLayoutAnalyzer.analyzePage(page, viewport, scale);
        } catch (layoutErr) {
          console.warn('[renderAndCropDiagram] PageLayoutAnalyzer error:', layoutErr);
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

        if (cachedLayout instanceof Map && layoutModel) {
          cachedLayout.set(safePageNum, layoutModel);
        }
      }

      // 2. Adaptive Ink Profiling (cached or freshly scanned)
      let inkProfile = cachedInkProfile instanceof Map ? cachedInkProfile.get(safePageNum) : cachedInkProfile;
      if (!inkProfile) {
        inkProfile = AdaptiveInkScanner.computeInkProfile(ctx, fullCanvas.width, fullCanvas.height);
        if (cachedInkProfile instanceof Map && inkProfile) {
          cachedInkProfile.set(safePageNum, inkProfile);
        }
      }

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
   * Automatically detects questions referencing diagrams, resolves slide or page numbers,
   * provides fallback bounding boxes if missing, and crops diagrams from the PDF.
   */
  static async extractAndAttachDiagrams(
    file: File,
    parsedQuestions: any[],
    onProgress?: (status: string) => void,
    renderAndCropFn: (
      fileOrPdf: File | any,
      pageNum: number,
      bbox?: number[],
      questionContext?: any,
      cachedLayout?: any,
      cachedInkProfile?: any
    ) => Promise<string> = (f, p, b, q, l, i) => DiagramAttachmentService.renderAndCropDiagram(f, p, b, q, l, i),
    getPdfJsFn: () => Promise<any> = () => PdfTextExtractor.getPdfJs()
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
        /\b(?:given\s+(?:figures?|diagrams?|graphs?|illustration|sketch)|shown\s+in\s+(?:the\s+)?(?:figures?|diagrams?|graphs?|illustration|sketch|above|below)|as\s+shown\b|see\s+(?:figures?|diagrams?|graphs?|illustration|fig\.?)|refer\s+to\s+(?:the\s+)?(?:figures?|diagrams?|graphs?)|in\s+(?:the\s+)?(?:figures?|diagrams?|graphs?|illustration)|following\s+(?:figures?|diagrams?|graphs?|illustration)|corresponding\s+to\s+figures?|figures?\s+[a-d]\b|four\s+graphs|graph\s+(?:shown|below|above|plotted)|force[\s-]displacement|potential\s+energy\s+curve|energy\s+curve|P-V\s+curve|P-V\s+diagram|indicator\s+diagram|circuit(?:\s+diagram)?|in\s+the\s+circuit|Wheatstone|potentiometer|galvanometer|pulley|inclined\s+plane|ramp|wedge|spring(?:\s+balance)?|block\s+hits\s+the\s+spring|curve\s+of\s+vertical\s+circle|vertical\s+circle|swimming\s+pool|circular\s+tube|curved\s+track|smooth\s+horizontal\s+plane|trajectory|projectile|ray\s+diagram|prism|mirror|lens|logic\s+gate|truth\s+table|force\s+field|along\s+the\s+line\s+segment|two\s+different\s+ways|from\s+point\s+['"]?[A-D]['"]?\s+to\s+['"]?[A-D]['"]?|dropped\s+from\s+(?:the\s+)?point|released\s+from\s+(?:the\s+)?point|along\s+the\s+shown\s+path|shown\s+path|path\s+shown|concentric|semicircles?|labyrinth|shown\s+in\s+(?:the\s+)?(?:graph|plane))\b/i.test(combinedText) ||
        /\\theta_[1-4]|\b\theta_1\b|\b\theta_2\b|\b\theta_3\b|\b\theta_4\b/i.test(combinedText) ||
        /\b(?:bond\s+angles?|bond\s+lengths?)\s+(?:of\s+)?(?:[$]?[a-zalpha-omega\theta][$]?\s*(?:and|,|vs)\s*[$]?[a-zalpha-omega\theta][$]?)/i.test(combinedText) ||
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
      const pdfjsLib = await getPdfJsFn();
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

      if (DiagramAttachmentService.isDiagramRedundant(q)) {
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
          const resolvedPage = await DiagramAttachmentService.locateQuestionPage(pdfDoc, q, qNum, parsedQuestions.length);
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
          const contentMatch = String(q.content || '').match(/^(?:\[?\s*Q(?:uestion)?\.?\s*(\d+)|\b(\d{1,2})\s*[:.\-\])])/i);
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
          const croppedUrl = await renderAndCropFn(
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
            layoutCache,
            inkProfileCache
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
    const content = q.content || '';
    const opts = q.options || [];

    // Hydrazoic acid & linear chemical resonance structures where LaTeX is completely inline
    if (/hydrazoic|resonating structure/i.test(content)) {
      const allSubstantive = opts.length === 4 && opts.every((o: any) => {
        const text = (typeof o === 'string' ? o : o?.text || '').trim();
        return text.length >= 1 && !/^\s*\(?[A-D]\)?\s*$/i.test(text);
      });
      if (allSubstantive) {
        return true;
      }
    }

    // Real physics diagrams (loops, ramps, swimming pool, blocks, springs, graphs)
    // and apparatus figures must NEVER be suppressed.
    return false;
  }

  /**
   * Helper to locate the exact page where a question statement is printed.
   */
  static async locateQuestionPage(
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
        'bond', 'order', 'not', 'most', 'least', 'between', 'two',
        // Physics & Chemistry domain stop words to prevent false page-scoring inflation across common JEE terms
        'mass', 'particle', 'energy', 'force', 'velocity', 'acceleration', 'displacement',
        'speed', 'ratio', 'total', 'reaction', 'product', 'compound', 'solution',
        'temperature', 'pressure', 'current', 'resistance', 'potential', 'figure',
        'figures', 'diagram', 'shown'
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

      let cleanSnippet = (strippedContent.length >= 4 ? strippedContent : rawClean)
        .split(/\s+/)
        .filter(w => w.length >= 3 && !stopWords.has(w));

      // Fallback: if all words were filtered by stopWords, retain 3+ char words so short questions can still locate
      if (cleanSnippet.length === 0) {
        cleanSnippet = rawClean.split(/\s+/).filter(w => w.length >= 3);
      }

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
}
