import { PageLayoutModel, VisualLine, QuestionBlock, SectionBlock, TextItemCoord } from './types';

export class PageLayoutAnalyzer {
  private static readonly SECTION_REGEX = /\b(LEVEL\s*[-–]\s*0?[1-5]|MTOC|INTEGER\s+TYPE|NUMERICAL\s+(?:VALUE|TYPE)|PART\s*[-–]\s*[IVX\d]+(?:\s*:[^\n]+)?|SECTION\s*[-–]\s*[A-Z\d]+(?:\s*:[^\n]+)?|EXERCISE\s*[-–]\s*0?[1-5](?:\s*[\[\(]?[A-Z][\]\)]?)?(?:\s*:[^\n]+)?|BRAIN\s+TEASERS|CHECK\s+YOUR\s+GRASP|CONCEPTUAL\s+SUBJECTIVE|PREVIOUS\s+YEAR\s+QUESTIONS|MISCELLANEOUS\s+TYPE|ANSWER\s*KEYS?|HINTS?\s*(?:&|AND)?\s*SOLUTIONS?)\b/i;
  private static readonly QUESTION_MARKER_REGEX = /^(?:[\s\^\~\`"'\#\*•·\u00A0\u02B0-\u02FF\u2000-\u200B\u25A0-\u25FF\uF000-\uFFFF]*)(?:Q(?:uestion)?\.?\s*(\d+)|(?<![\d\.])(\d{1,3})\s*[\.\:\-](?!\d)|\[\s*(\d{1,3})\s*\]|(?<![\d\.])(\d{1,3})\s+(?=(?:A|An|The|If|Two|Three|Four|Five|What|Which|Find|Calculate|When|Consider|In|At|For)\s+[a-z]{2,}\b))/i;
  private static readonly OPTION_MARKER_REGEX = /^\s*(?:Option\s+)?(?:\(([A-D1-4a-d])\)|([A-Da-d])\s*[\.\:\)])/i;
  private static readonly HEADER_NOISE_REGEX = /^(?:PAGE\s*\d+|ALLEN|RESONANCE|FIITJEE|NARAYANA|SRI\s+CHAITANYA|DPP|DAILY\s+PRACTICE|WORKSHEET|TEST\s+SERIES|DATE|TIME|MARKS)\b/i;

  /**
   * Performs full two-pass layout analysis on a PDF page.
   */
  static async analyzePage(page: any, viewport: any, scale: number = 2.0): Promise<PageLayoutModel> {
    const textContent = await page.getTextContent();
    const items = textContent?.items || [];

    const itemsWithCoords: TextItemCoord[] = [];
    for (const item of items) {
      if (typeof item.str === 'string' && item.str.trim().length > 0) {
        const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
        itemsWithCoords.push({
          str: item.str.trim(),
          x,
          y,
          width: (item.width || 0) * scale,
          height: (item.height || 0) * scale
        });
      }
    }

    const columnCount = this.detectColumnCount(itemsWithCoords, viewport.width);
    let lines: VisualLine[];
    let sections: SectionBlock[];
    let questions: QuestionBlock[];
    let headerHeight: number;
    let footerHeight: number;

    const midX = columnCount === 2 ? this.findColumnGutter(itemsWithCoords, viewport.width) : viewport.width / 2;

    if (columnCount === 2) {
      // Separate items into left column, right column, and full-width header/footer
      const isNoiseHeader = (it: TextItemCoord) => it.y < viewport.height * 0.12 && this.HEADER_NOISE_REGEX.test(it.str);
      const isNoiseFooter = (it: TextItemCoord) => it.y > viewport.height * 0.88 && (this.HEADER_NOISE_REGEX.test(it.str) || /^\s*\d+\s*$/.test(it.str));

      const headerItems = itemsWithCoords.filter(isNoiseHeader);
      const footerItems = itemsWithCoords.filter(isNoiseFooter);
      const leftItems = itemsWithCoords.filter(it => !isNoiseHeader(it) && !isNoiseFooter(it) && it.x <= midX);
      const rightItems = itemsWithCoords.filter(it => !isNoiseHeader(it) && !isNoiseFooter(it) && it.x > midX);

      const headerLines = this.groupItemsIntoLines(headerItems);
      const leftLines = this.groupItemsIntoLines(leftItems);
      const rightLines = this.groupItemsIntoLines(rightItems);
      const footerLines = this.groupItemsIntoLines(footerItems);

      lines = [...headerLines, ...leftLines, ...rightLines, ...footerLines];

      const borders = this.detectHeaderFooterBorders(lines, viewport.height);
      headerHeight = borders.headerHeight;
      footerHeight = borders.footerHeight;
      sections = this.extractSections(lines);
      const answerKeyYstart = this.detectAnswerKeyYstart(lines);

      const leftQuestions = this.extractQuestionBlocks(leftLines, sections, viewport.height, 0, answerKeyYstart);
      const rightQuestions = this.extractQuestionBlocks(rightLines, sections, viewport.height, 1, answerKeyYstart);

      questions = [...leftQuestions, ...rightQuestions];
    } else {
      lines = this.groupItemsIntoLines(itemsWithCoords);
      const borders = this.detectHeaderFooterBorders(lines, viewport.height);
      headerHeight = borders.headerHeight;
      footerHeight = borders.footerHeight;
      sections = this.extractSections(lines);
      const answerKeyYstart = this.detectAnswerKeyYstart(lines);
      questions = this.extractQuestionBlocks(lines, sections, viewport.height, 0, answerKeyYstart);
    }

    const answerKeyYstart = this.detectAnswerKeyYstart(lines);

    return {
      pageNum: page.pageNumber || 1,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      scale,
      headerHeight,
      footerHeight,
      columnCount,
      columnGutterX: columnCount === 2 ? midX : undefined,
      lines,
      sections,
      questions,
      answerKeyYstart
    };
  }

  /**
   * Detects the vertical start position of an Answer Key or Solutions block on the page.
   */
  static detectAnswerKeyYstart(lines: VisualLine[]): number | undefined {
    let explicitBannerY: number | undefined;
    let gridEstimatedY: number | undefined;

    for (const line of lines) {
      const trimmed = line.text.trim();
      // Banner headers like "ANSWER KEY", "KEY SHEET", "HINTS & SOLUTIONS"
      if (/\b(?:ANSWER\s*KEYS?|KEY\s*SHEET|HINTS?\s*(?:&|AND)?\s*SOLUTIONS?)\b/i.test(trimmed)) {
        if (explicitBannerY === undefined || line.y < explicitBannerY) {
          explicitBannerY = line.y;
        }
      }
      // Answer key grid rows like "1. (1) 2. (2) 3. (1)..." or "36. 32 37. 30 38. 450..."
      const answerKeyPairs = trimmed.match(/\b\d{1,3}\.\s*(?:\([1-4]\)|\d+)(?!\w)/g);
      if (answerKeyPairs && answerKeyPairs.length >= 3) {
        // In coaching sheets, the graphical "ANSWER KEY" header banner sits 40-75px above the first grid row
        const estimatedBannerY = Math.max(0, line.y - 75);
        if (gridEstimatedY === undefined || estimatedBannerY < gridEstimatedY) {
          gridEstimatedY = estimatedBannerY;
        }
      }
    }
    if (explicitBannerY !== undefined) {
      return explicitBannerY;
    }
    return gridEstimatedY;
  }

  /**
   * Groups disparate text fragments into stable, reading-order visual lines.
   */
  static groupItemsIntoLines(items: TextItemCoord[]): VisualLine[] {
    if (items.length === 0) return [];

    const sortedItems = [...items].sort((a, b) => (Math.abs(a.y - b.y) <= 6.5 ? a.x - b.x : a.y - b.y));
    const lines: VisualLine[] = [];

    for (const it of sortedItems) {
      const existingLine = lines.find(l => Math.abs(l.anchorY - it.y) <= 7.0);
      if (existingLine) {
        existingLine.items.push(it);
        existingLine.minX = Math.min(existingLine.minX, it.x);
        existingLine.maxX = Math.max(existingLine.maxX, it.x + (it.width || 0));
        // Keep anchor steady but track average line y
        existingLine.y = (existingLine.y * (existingLine.items.length - 1) + it.y) / existingLine.items.length;
      } else {
        lines.push({
          text: it.str,
          y: it.y,
          anchorY: it.y,
          minX: it.x,
          maxX: it.x + (it.width || 0),
          items: [it]
        });
      }
    }

    for (const line of lines) {
      line.items.sort((a, b) => a.x - b.x);
      line.text = line.items.map(i => i.str).join(' ');
    }

    return lines.sort((a, b) => a.y - b.y);
  }

  /**
   * Detects whether page text is organized into two side-by-side columns.
   */
  static detectColumnCount(items: TextItemCoord[], width: number): 1 | 2 {
    if (items.length < 10) return 1;
    const midX = width / 2;
    const gutter = 25;

    const left = items.filter(it => it.x < midX - gutter);
    const right = items.filter(it => it.x > midX + gutter);

    return (left.length >= items.length * 0.18 && right.length >= items.length * 0.18 && left.length >= 8 && right.length >= 8) ? 2 : 1;
  }

  /**
   * Phase 3 (R9): Calculates adaptive column split point (gutter) based on horizontal text item density.
   * Finds the minimum density valley in the central 35% - 65% region of the page.
   */
  static findColumnGutter(items: TextItemCoord[], width: number): number {
    if (items.length < 15) return width / 2;

    const numBins = 120;
    const binWidth = width / numBins;
    const bins = new Int32Array(numBins);

    for (const it of items) {
      const b = Math.floor(it.x / binWidth);
      if (b >= 0 && b < numBins) bins[b]++;
    }

    // Look for minimum density valley in central 46% - 54% of the page (gutter zone)
    const minBin = Math.floor(numBins * 0.46);
    const maxBin = Math.ceil(numBins * 0.54);
    const centerBin = Math.floor(numBins / 2);
    let lowestCount = Infinity;
    let bestBin = centerBin;

    for (let b = minBin; b <= maxBin; b++) {
      // 3-bin smoothed count
      const smoothed = (bins[b - 1] || 0) + bins[b] + (bins[b + 1] || 0);
      if (
        smoothed < lowestCount ||
        (smoothed === lowestCount && Math.abs(b - centerBin) < Math.abs(bestBin - centerBin))
      ) {
        lowestCount = smoothed;
        bestBin = b;
      }
    }

    const adaptiveMidX = Math.round((bestBin + 0.5) * binWidth);
    const center = width / 2;
    // Safety clamp: never deviate by more than 4% from width / 2
    if (Math.abs(adaptiveMidX - center) > width * 0.04) {
      return center;
    }
    return adaptiveMidX;
  }

  /**
   * Detects running header and footer zones to prevent watermark/header confusion.
   */
  static detectHeaderFooterBorders(lines: VisualLine[], pageHeight: number): { headerHeight: number; footerHeight: number } {
    let headerHeight = 0;
    let footerHeight = pageHeight;

    for (const line of lines) {
      if (line.y < pageHeight * 0.12 && this.HEADER_NOISE_REGEX.test(line.text)) {
        headerHeight = Math.max(headerHeight, line.y + 15);
      }
      if (line.y > pageHeight * 0.90 && (this.HEADER_NOISE_REGEX.test(line.text) || /^\s*\d+\s*$/.test(line.text))) {
        footerHeight = Math.min(footerHeight, line.y - 10);
      }
    }

    return { headerHeight, footerHeight };
  }

  /**
   * Extracts section boundaries (e.g. PART - I, PART - III, LEVEL - 1).
   */
  static extractSections(lines: VisualLine[]): SectionBlock[] {
    const sections: SectionBlock[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (this.SECTION_REGEX.test(line.text)) {
        sections.push({
          name: line.text.trim(),
          yStart: line.y - 10,
          yEnd: line.y + 25,
          isHeaderOnly: true
        });
      }
    }
    return sections;
  }

  /**
   * Extracts structured QuestionBlocks by associating question statements,
   * diagram gaps, and option bounding blocks.
   */
  static extractQuestionBlocks(
    lines: VisualLine[],
    sections: SectionBlock[],
    pageHeight: number,
    columnIndex: number = 0,
    answerKeyYstart?: number
  ): QuestionBlock[] {
    const blocks: QuestionBlock[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.text.trim();

      // Stop immediately if past answer key start
      if (answerKeyYstart !== undefined && line.y >= answerKeyYstart) {
        break;
      }

      // Stop immediately if hit Answer Key or Solutions table
      if (/\b(?:ANSWER\s*KEYS?|HINTS?\s*(?:&|AND)?\s*SOLUTIONS?)\b/i.test(trimmedLine)) {
        break;
      }

      // Stop if hit Answer Key grid/table rows (e.g. "1. (1) 2. (2) 3. (1)..." or "36. 32 37. 30 38. 450...")
      const answerKeyPairs = trimmedLine.match(/\b\d{1,3}\.\s*(?:\([1-4]\)|\d+)\b/g);
      if (answerKeyPairs && answerKeyPairs.length >= 3) {
        break;
      }

      // Options like (1), (2), (A), (B), (1) 12 N/m, (A) 1:1 MUST NOT be treated as questions
      if (this.OPTION_MARKER_REGEX.test(trimmedLine)) continue;

      const qMatch = trimmedLine.match(this.QUESTION_MARKER_REGEX);
      if (!qMatch) continue;

      const qNum = parseInt(qMatch[1] || qMatch[2] || qMatch[3] || qMatch[4], 10);
      const statementYstart = line.y;
      let statementYend = line.y + 6;
      let statementText = line.text;

      // Expand multi-line statements until option or diagram gap
      let optionLines: VisualLine[] = [];
      let nextLineIdx = i + 1;

      // Trailing exam metadata tag like [JEE MAIN ...] or [JEE ADV ...]
      const METADATA_TAG_REGEX = /\[\s*(?:JEE\s*(?:MAIN|ADVANCED|ADV)?|AIEEE|IIT|NEET)[^\]]*\]\s*$/i;
      let hitMetadataEnd = METADATA_TAG_REGEX.test(trimmedLine);

      for (let j = i + 1; j < Math.min(i + 14, lines.length); j++) {
        if (hitMetadataEnd) break;

        const next = lines[j];
        if (next.y > statementYstart + 350) break;

        const nextTrimmed = next.text.trim();
        // Stop if hit Answer Key
        if (answerKeyYstart !== undefined && next.y >= answerKeyYstart) {
          break;
        }
        if (/\b(?:ANSWER\s*KEYS?|HINTS?\s*(?:&|AND)?\s*SOLUTIONS?)\b/i.test(nextTrimmed)) {
          break;
        }

        // Check if this line is an option marker
        if (this.OPTION_MARKER_REGEX.test(nextTrimmed)) {
          break;
        }

        // Break if hit another question or section header
        if (this.QUESTION_MARKER_REGEX.test(nextTrimmed) || this.SECTION_REGEX.test(nextTrimmed)) {
          break;
        }

        // Break if this line is a short isolated diagram label (e.g. "1kg", "22ms", "30cm", "-1", "F", "B", "Water")
        const isShortDiagramLabel = /^(?:\d+\s*(?:kg|g|m|cm|mm|s|ms|m\/s|km\/h|N|J|N\/m)|–?\s*\d+|[FfABvxyz]\b|\(Vertical\s+Circle\)|Water|Pool|\(in\s+m\)|\(4,1\)|45[º°]|\d+\s*[º°])$/i.test(nextTrimmed);
        if (isShortDiagramLabel && next.y - lines[j - 1].y > 20) {
          break;
        }

        // Break if there is a vertical whitespace gap indicating a diagram or separate block
        // Allow slightly larger gap (<= 75px) if line contains math / fraction notation
        const prevLine = lines[j - 1];
        const gapY = next.y - prevLine.y;
        const isMathTokenLine = /[=+\-–/\\\[\]\(\)\{\}\^]|(?:take|\bpi\b||\d+\s*\/\s*\d+|m\?|\bcm\b|\bm\b|\bkm\b|\bkg\b)/i.test(prevLine.text) ||
                                /[=+\-–/\\\[\]\(\)\{\}\^]|(?:take|\bpi\b||\d+\s*\/\s*\d+|m\?|\bcm\b|\bm\b|\bkm\b|\bkg\b)/i.test(next.text);
        const gapThreshold = isMathTokenLine ? 75 : 50;
        if (gapY > gapThreshold) {
          break;
        }

        statementYend = Math.max(statementYend, next.y + 6);
        statementText += ' ' + next.text;
        nextLineIdx = j + 1;

        if (METADATA_TAG_REGEX.test(nextTrimmed)) {
          hitMetadataEnd = true;
          break;
        }
      }

      // Collect options belonging to this question
      let optionsYstart: number | undefined;
      let optionsYend: number | undefined;
      let preOptionsTextY: number | undefined;

      for (let j = nextLineIdx; j < lines.length; j++) {
        const candidate = lines[j];
        const candTrimmed = candidate.text.trim();
        const isOpt = this.OPTION_MARKER_REGEX.test(candTrimmed);

        // Stop if hit Answer Key banner or multi-pair grid rows
        const isAnswerKey = (answerKeyYstart !== undefined && candidate.y >= answerKeyYstart) ||
          /\b(?:ANSWER\s*KEYS?|KEY\s*SHEET|HINTS?\s*(?:&|AND)?\s*SOLUTIONS?)\b/i.test(candTrimmed) ||
          ((candTrimmed.match(/\b\d{1,3}\.\s*(?:\([1-4]\)|\d+)(?!\w)/g)?.length || 0) >= 2);
        if (isAnswerKey) {
          break;
        }

        // Stop if hit next question or section (ensuring cand is NOT an option)
        if (!isOpt && (this.QUESTION_MARKER_REGEX.test(candTrimmed) || this.SECTION_REGEX.test(candTrimmed))) {
          break;
        }

        if (isOpt) {
          optionLines.push(candidate);
          if (optionsYstart === undefined) optionsYstart = candidate.y;
          optionsYend = Math.max(optionsYend || candidate.y, candidate.y + 12);
        } else if (optionsYstart === undefined) {
          // Substantive text line between statement and options (e.g. "(Given, R = 14m...)", "Take g = 10", "Where ...")
          // This line belongs to the question statement, sitting BELOW the diagram and ABOVE the options!
          // Exclude internal diagram labels like "1kg", "30cm", "–1", "(Vertical Circle)", etc.
          const isDiagramLabel = /^(?:\d+\s*(?:kg|g|m|cm|mm|s|ms|m\/s|km\/h|N|J|N\/m)|–?\s*\d+|[FfABvxyz]\b|\(Vertical\s+Circle\)|Water|Pool|\(?in\s+[a-z]+\)?\s*[xyz]|[xyz]\s*\(?in\s+[a-z]+\)?|\(in\s+m\)|\(4,1\)|45[º°]|\d+\s*[º°]|\d+\s+[A-Z]|[A-Z]\s+\d+|\b\d+(?:\s+\d+){2,}\b)$/i.test(candTrimmed);
          if (!isDiagramLabel) {
            const isFormulaPreamble = /^(?:\[\s*Take|Take\b|where\b|\(Given|Given\b)/i.test(candTrimmed) ||
              /[=+\-–/\\\[\]\(\)\{\}\^]|(?:take|\bpi\b||\d+\s*\/\s*\d+|m\?|\bcm\b|\bm\b|\bkm\b|\bkg\b)/i.test(candTrimmed);
            // Only set preOptionsTextY if there is a massive gap (> 110px) between statementYend and candidate
            if (candidate.y - statementYend <= 100 || isFormulaPreamble) {
              statementYend = Math.max(statementYend, candidate.y + 6);
              statementText += ' ' + candidate.text;
            } else {
              if (preOptionsTextY === undefined) {
                preOptionsTextY = candidate.y;
              }
              statementText += ' ' + candidate.text;
            }
          }
        }
      }

      // Diagram gap is between statement end and options start, or statement end and next question
      const diagramGapYstart = statementYend;
      let diagramGapYend = optionsYstart !== undefined ? optionsYstart : Math.min(pageHeight - 20, statementYend + 450);
      if (answerKeyYstart !== undefined && answerKeyYstart > diagramGapYstart) {
        diagramGapYend = Math.min(diagramGapYend, answerKeyYstart - 24);
      }
      if (preOptionsTextY !== undefined && preOptionsTextY > diagramGapYstart + 20) {
        diagramGapYend = Math.min(diagramGapYend, preOptionsTextY - 24);
      }

      // Associate with current section
      const activeSection = sections.filter(s => s.yStart <= statementYstart).pop()?.name;

      blocks.push({
        questionNum: qNum,
        localQNum: qNum,
        columnIndex,
        sectionName: activeSection,
        lineIndex: i,
        statementYstart,
        statementYend,
        diagramGapYstart,
        diagramGapYend,
        optionsYstart,
        optionsYend,
        optionLines,
        contentXmin: line.minX,
        contentXmax: line.maxX,
        statementText: statementText.trim()
      });
    }

    return blocks;
  }

  /**
   * Matches a target question from AI context to a physical QuestionBlock on the page.
   */
  static findQuestionBlock(
    model: PageLayoutModel,
    qNum?: number,
    localQNum?: number,
    qContent?: string,
    pageQIndex?: number
  ): QuestionBlock | null {
    if (model.questions.length === 0) return null;

    // If the page contains only 1 question block (very common on scanned coaching worksheets & diagram pages),
    // any diagram targeted on this page belongs to it!
    if (model.questions.length === 1) {
      return model.questions[0];
    }

    const effectiveLocalQNum = (localQNum !== undefined && localQNum !== null && Number(localQNum) > 0)
      ? Number(localQNum)
      : parseInt(String(qContent || '').match(/^(?:\[?\s*Q(?:uestion)?\.?\s*(\d+)|\b(\d{1,2})\s*[:.\-\]\)])/i)?.[1] || '', 10) || undefined;

    // 1. Direct match on local question number (most accurate when exact localQNum matches printed number)
    if (effectiveLocalQNum !== undefined) {
      const match = model.questions.find(q => q.localQNum === effectiveLocalQNum);
      if (match) return match;
    }

    // 2. Match by content similarity (gives priority to actual statement text match over blind guessing)
    if (qContent && qContent.trim().length > 6) {
      const cleanTarget = qContent.toLowerCase().replace(/[^a-z0-9]/g, '');
      let bestMatch: QuestionBlock | null = null;
      let bestScore = 0;

      for (const q of model.questions) {
        const cleanStmt = q.statementText.toLowerCase().replace(/[^a-z0-9]/g, '');
        let score = 0;
        if (cleanStmt.includes(cleanTarget.substring(0, 30)) || cleanTarget.includes(cleanStmt.substring(0, 30))) {
          score += 50;
        }
        if (score > bestScore) {
          bestScore = score;
          bestMatch = q;
        }
      }

      if (bestMatch && bestScore >= 40) return bestMatch;
    }

    // 3. Match on global question number
    if (qNum !== undefined && qNum !== null) {
      const match = model.questions.find(q => q.questionNum === qNum);
      if (match) return match;
    }

    // 4. Direct page question index match (fallback only if local/content/global match was unavailable)
    if (typeof pageQIndex === 'number' && pageQIndex >= 0 && pageQIndex < model.questions.length) {
      return model.questions[pageQIndex];
    }

    // Never fall back to questions[0] when multiple questions exist and none matched
    return null;
  }

  /**
   * Computes clean question fence without leaking previous or next question text.
   */
  static computeDiagramFence(
    current: QuestionBlock,
    next: QuestionBlock | null,
    viewportHeight: number,
    answerKeyYstart?: number
  ): { fenceYmin: number; fenceYmax: number } {
    // Top fence: starts 2px below question statement descenders (which are already line.y + 6)
    const fenceYmin = current.statementYend + 2;

    // If options start directly below statement (gap < 45px), there is physically NO space for a diagram
    if (current.optionsYstart !== undefined && current.optionsYstart - current.statementYend < 45) {
      return { fenceYmin, fenceYmax: fenceYmin };
    }

    // Bottom fence — compute primary boundary, then apply hard option ceiling
    let bottomLimit: number;

    if (next) {
      bottomLimit = next.statementYstart - 24;
    } else if (current.diagramGapYend && current.diagramGapYend > fenceYmin) {
      bottomLimit = current.diagramGapYend;
    } else {
      bottomLimit = Math.min(viewportHeight - 15, fenceYmin + 450);
    }

    // Hard ceiling: diagramGapYend (e.g. from pre-option text like "(Given...)") must be respected
    if (current.diagramGapYend && current.diagramGapYend > fenceYmin + 15) {
      bottomLimit = Math.min(bottomLimit, current.diagramGapYend);
    }

    // HARD CEILING: If answerKeyYstart exists and is below fenceYmin, diagram must STOP above answer key banner
    if (answerKeyYstart !== undefined && answerKeyYstart > fenceYmin) {
      bottomLimit = Math.min(bottomLimit, answerKeyYstart - 24);
    }

    // HARD CEILING: optionsYstart must ALWAYS be respected — options should never appear in diagrams
    if (current.optionsYstart) {
      bottomLimit = Math.min(bottomLimit, current.optionsYstart - 20);
    }

    // Cap fallback fence span while avoiding choking measured diagramGapYend or short images
    if (!current.diagramGapYend) {
      const maxFenceSpan = Math.max(450, Math.min(Math.floor(viewportHeight * 0.75), 850));
      bottomLimit = Math.min(bottomLimit, fenceYmin + maxFenceSpan);
    }

    // Re-apply answerKeyYstart after fallback fence span cap to guarantee safety
    if (answerKeyYstart !== undefined && answerKeyYstart > fenceYmin) {
      bottomLimit = Math.min(bottomLimit, answerKeyYstart - 24);
    }

    const fenceYmax = Math.max(fenceYmin, Math.min(viewportHeight - 10, bottomLimit));

    return { fenceYmin, fenceYmax };
  }
}
