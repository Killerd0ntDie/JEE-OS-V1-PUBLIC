import { MockTest } from '@/types/mockTest';

export type TestDifficulty = 'Easy' | 'Medium' | 'Hard';

/**
 * Heuristically infers difficulty for questions lacking historical performance metrics
 * based on question type, formula density, multi-concept indicators, and text length.
 */
export function inferQuestionDifficulty(q: {
  difficulty?: string;
  type?: string;
  content?: string;
  hasDiagram?: boolean;
}): TestDifficulty {
  if (q.difficulty === 'Hard' || q.difficulty === 'Easy' || q.difficulty === 'Medium') {
    return q.difficulty;
  }

  // Multi-correct / Matrix-match questions are inherently cognitively demanding in JEE
  if (q.type === 'MULTI' || q.type === 'MATCHING') {
    return 'Hard';
  }

  const content = q.content || '';
  const hasDenseMath = /\\begin\{(?:matrix|pmatrix|bmatrix|cases)\}|\\int|\\oint|\\frac\{[^}]{8,}\}/i.test(content);
  const isMultiStep = /(?:Statement\s*[-–]\s*1|List\s*[-–]\s*I|Column\s*[-–]\s*I|Assertion)/i.test(content);

  if (hasDenseMath || isMultiStep || (content.length > 280 && /\\frac|\\sqrt/i.test(content))) {
    return 'Hard';
  }

  // Short direct-recall questions with no complex formulas or diagrams
  if (content.length < 80 && !q.hasDiagram && !/\\frac|\\sqrt|\\int/i.test(content)) {
    return 'Easy';
  }

  return 'Medium';
}

/**
 * Computes overall difficulty rating for a test based on question distribution.
 */
export function calculateTestDifficulty(test: MockTest): TestDifficulty {
  if (!test?.sections || test.sections.length === 0) return 'Medium';
  const allQuestions = test.sections.flatMap(s => s.questions || []);
  if (allQuestions.length === 0) return 'Medium';

  let hard = 0;
  let medium = 0;
  let easy = 0;

  for (const q of allQuestions) {
    const diff = inferQuestionDifficulty(q);
    if (diff === 'Hard') hard++;
    else if (diff === 'Easy') easy++;
    else medium++;
  }

  const score = (easy * 1 + medium * 2 + hard * 3) / allQuestions.length;
  if (score >= 2.25) return 'Hard';
  if (score <= 1.75) return 'Easy';
  return 'Medium';
}

export function getDifficultyLabel(difficulty: TestDifficulty): string {
  switch (difficulty) {
    case 'Easy':
      return 'Easy';
    case 'Hard':
      return 'Challenging';
    case 'Medium':
    default:
      return 'Moderate';
  }
}

export function getDifficultyColors(difficulty: TestDifficulty): {
  bg: string;
  border: string;
  text: string;
} {
  switch (difficulty) {
    case 'Easy':
      return {
        bg: 'bg-emerald-950/40',
        border: 'border-emerald-800/40',
        text: 'text-emerald-400'
      };
    case 'Hard':
      return {
        bg: 'bg-rose-950/40',
        border: 'border-rose-800/40',
        text: 'text-rose-400'
      };
    case 'Medium':
    default:
      return {
        bg: 'bg-amber-950/40',
        border: 'border-amber-800/40',
        text: 'text-amber-400'
      };
  }
}
