/**
 * PDF Parsing & Diagram Engine Type Definitions
 */

export interface TextItemCoord {
  str: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface VisualLine {
  text: string;
  y: number;
  anchorY: number;
  minX: number;
  maxX: number;
  items: TextItemCoord[];
}

export interface SectionBlock {
  name: string;
  yStart: number;
  yEnd: number;
  isHeaderOnly?: boolean;
}

export interface QuestionBlock {
  questionNum: number | null;
  localQNum: number | null;
  pageNumber?: number;
  columnIndex?: number;
  sectionName?: string;
  lineIndex: number;
  
  // Visual positions in scaled viewport coordinates
  statementYstart: number;
  statementYend: number;
  
  // Diagram gap boundary (between question statement end and options/next question)
  diagramGapYstart: number;
  diagramGapYend: number;

  // Options bounding region
  optionsYstart?: number;
  optionsYend?: number;
  optionLines?: VisualLine[];

  // Horizontal bounds
  contentXmin: number;
  contentXmax: number;
  
  statementText: string;
}

export interface PageLayoutModel {
  pageNum: number;
  viewportWidth: number;
  viewportHeight: number;
  scale: number;
  
  // Page zones
  headerHeight: number;
  footerHeight: number;
  columnCount: 1 | 2;
  columnGutterX?: number;
  answerKeyYstart?: number;
  
  // Structural content
  lines: VisualLine[];
  sections: SectionBlock[];
  questions: QuestionBlock[];
}

export interface PageInkProfile {
  backgroundLum: number;
  inkThreshold: number;
  watermarkLum: number | null;
  hasColoredInk: boolean;
  minInkPixelsPerRow: number;
}

export interface DiagramCropResult {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  dataUrl: string;
  confidence: number;
  strategyUsed: 'text-gap' | 'ink-density' | 'ai-hint' | 'consensus' | 'fallback';
}

export interface QuestionConfidence {
  overallScore: number; // 0.0 - 1.0
  statementQuality: number;
  optionQuality: number;
  diagramQuality: number;
  answerQuality: number;
  latexQuality: number;
  issues: string[];
}

export type OptionLayout = 'stacked' | 'horizontal' | 'two-column' | 'diagram' | 'numbered' | 'unknown';

export interface ParsedOption {
  id: string; // 'A' | 'B' | 'C' | 'D'
  text: string;
  rawText?: string;
}

export interface OptionValidationResult {
  isValid: boolean;
  issues: string[];
  layout: OptionLayout;
}

export interface ExtractedBlockOptions {
  hasOptions: boolean;
  questionBody: string;
  options?: ParsedOption[];
  layout?: OptionLayout;
  validation?: OptionValidationResult;
}

export interface IntegrityInvariants {
  countPassed: boolean;
  sequencePassed: boolean;
  optionsPassed: boolean;
  columnBleedPassed: boolean;
  answerKeyPassed: boolean;
  diagramsPassed: boolean;
}

export interface PaperIntegrityReport {
  isValid: boolean;
  integrityScore: number; // 0.0 - 1.0
  issues: string[];
  failedQuestionIndices: number[];
  failedPages: number[];
  invariants: IntegrityInvariants;
  details: {
    totalQuestions: number;
    expectedQuestions?: number;
    sequenceGaps: { from: number; to: number }[];
    columnBleedQuestions: number[];
    malformedOptionQuestions: number[];
    missingAnswerQuestions: number[];
    suspiciousDiagramQuestions: number[];
  };
}

