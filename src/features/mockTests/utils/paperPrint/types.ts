export interface GeneratePaperHtmlOptions {
  printMode?: 'QUESTION_PAPER' | 'SOLUTIONS' | 'COMPLETE';
  fontSize?: 'sm' | 'base';
  showInstructions?: boolean;
  showRoughWorkMargin?: boolean;
  layoutStyle?: 'COACHING_SHEET' | 'NTA_CBT';
}
