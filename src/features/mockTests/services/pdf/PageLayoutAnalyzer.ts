import { PageLayoutModel, VisualLine, QuestionBlock, SectionBlock, TextItemCoord } from './types';

export class PageLayoutAnalyzer {
  private static readonly SECTION_REGEX = /\b(LEVEL\s*[-–]\s*0?[1-5]|MTOC|INTEGER\s+TYPE|NUMERICAL\s+(?:VALUE|TYPE)|PART\s*[-–]\s*[IVX\d]+(?:\s*:[^\n]+)?|SECTION\s*[-–]\s*[A-Z\d]+(?:\s*:[^\n]+)?|EXERCISE\s*[-–]\s*0?[1-5](?:\s*[\[\(]?[A-Z][\]\)]?)?(?:\s*:[^\n]+)?|BRAIN\s+TEASERS|CHECK\s+YOUR\s+GRASP|CONCEPTUAL\s+SUBJECTIVE|PREVIOUS\s+YEAR\s+QUESTIONS|MISCELLANEOUS\s+TYPE)\b/i;
  private static readonly QUESTION_MARKER_REGEX = /^\s*(?:Q\.?\s*(\d+)|\(?(\d{1,3})\)?\s*[\.\:\)]|\[\s*(\d{1,3})\s*\])/i;
  private static readonly OPTION_MARKER_REGEX = /^\s*\(?([A-D1-4])\)?[\s\.\)\]:]|^\s*\(([A-D1-4])\)/i;
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

    const midX = viewport.width / 2;

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

      const leftQuestions = this.extractQuestionBlocks(leftLines, sections, viewport.height, 0);
      const rightQuestions = this.extractQuestionBlocks(rightLines, sections, viewport.height, 1);

      questions = [...leftQuestions, ...rightQuestions];
    } else {
      lines = this.groupItemsIntoLines(itemsWithCoords);
      const borders = this.detectHeaderFooterBorders(lines, viewport.height);
      headerHeight = borders.headerHeight;
      footerHeight = borders.footerHeight;
      sections = this.extractSections(lines);
      questions = this.extractQuestionBlocks(lines, sections, viewport.height, 0);
    }

    return {
      pageNum: page.pageNumber || 1,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      scale,
      headerHeight,
      footerHeight,
      columnCount,
      lines,
      sections,
      questions
    };
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

    return left.length >= items.length * 0.28 && right.length >= items.length * 0.28 ? 2 : 1;
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
    columnIndex: number = 0
  ): QuestionBlock[] {
    const blocks: QuestionBlock[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const qMatch = line.text.match(this.QUESTION_MARKER_REGEX);
      if (!qMatch) continue;

      // Don't treat standalone options like (1) or (2) as question starts if option context
      if (/^\s*\([A-D1-4]\)\s*$/i.test(line.text)) continue;

      const qNum = parseInt(qMatch[1] || qMatch[2] || qMatch[3], 10);
      const statementYstart = line.y;
      let statementYend = line.y + 26;
      let statementText = line.text;

      // Expand multi-line statements until option or diagram gap
      let optionLines: VisualLine[] = [];
      let nextLineIdx = i + 1;

      for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
        const next = lines[j];
        if (next.y > statementYstart + 160) break;

        // Break if hit another question or section header
        if (this.QUESTION_MARKER_REGEX.test(next.text) || this.SECTION_REGEX.test(next.text)) {
          break;
        }

        // Check if this line is an option marker
        if (this.OPTION_MARKER_REGEX.test(next.text)) {
          break;
        }

        statementYend = Math.max(statementYend, next.y + 24);
        statementText += ' ' + next.text;
        nextLineIdx = j + 1;
      }

      // Collect options belonging to this question
      let optionsYstart: number | undefined;
      let optionsYend: number | undefined;

      for (let j = nextLineIdx; j < lines.length; j++) {
        const candidate = lines[j];
        // Stop if hit next question or section
        if (this.QUESTION_MARKER_REGEX.test(candidate.text) || this.SECTION_REGEX.test(candidate.text)) {
          break;
        }

        if (this.OPTION_MARKER_REGEX.test(candidate.text)) {
          optionLines.push(candidate);
          if (optionsYstart === undefined) optionsYstart = candidate.y;
          optionsYend = Math.max(optionsYend || candidate.y, candidate.y + 24);
        }
      }

      // Diagram gap is between statement end and options start, or statement end and next question
      const diagramGapYstart = statementYend;
      const diagramGapYend = optionsYstart !== undefined ? optionsYstart : Math.min(pageHeight - 20, statementYend + 450);

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

    // 1. Direct match on local question number (most accurate for coaching papers with restarted numbering)
    if (effectiveLocalQNum !== undefined) {
      const match = model.questions.find(q => q.localQNum === effectiveLocalQNum);
      if (match) return match;
      if (effectiveLocalQNum >= 1 && effectiveLocalQNum <= model.questions.length) {
        return model.questions[effectiveLocalQNum - 1];
      }
    }

    // 2. Match by content similarity
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
    viewportHeight: number
  ): { fenceYmin: number; fenceYmax: number } {
    // Top fence: starts 8px below the question statement, leaving vertical clearance for letter descenders (g, y, p, q)
    const fenceYmin = current.statementYend + 8;

    // Bottom fence — uses the tightest available boundary:
    // 1. If next question block exists: stop 10px above its start
    // 2. If current question has detected options start: stop 10px above the first option line!
    // 3. If current question has visual diagramGapYend from ink scanning, respect it!
    // 4. Fallback: cap at 450px below fence start
    let bottomLimit: number;

    if (next) {
      bottomLimit = next.statementYstart - 10;
    } else if (current.optionsYstart && current.optionsYstart > fenceYmin + 20) {
      bottomLimit = current.optionsYstart - 10;
    } else if (current.diagramGapYend && current.diagramGapYend > fenceYmin) {
      bottomLimit = current.diagramGapYend;
    } else if (current.optionsYend && current.optionsYend > fenceYmin) {
      bottomLimit = current.optionsYend + 25;
    } else {
      bottomLimit = Math.min(viewportHeight - 15, fenceYmin + 450);
    }

    // Cap fallback fence span while avoiding choking measured diagramGapYend or short images
    if (!current.diagramGapYend) {
      const maxFenceSpan = Math.max(450, Math.min(Math.floor(viewportHeight * 0.75), 850));
      bottomLimit = Math.min(bottomLimit, fenceYmin + maxFenceSpan);
    }

    const fenceYmax = Math.max(fenceYmin + 20, Math.min(viewportHeight - 10, bottomLimit));

    return { fenceYmin, fenceYmax };
  }
}
