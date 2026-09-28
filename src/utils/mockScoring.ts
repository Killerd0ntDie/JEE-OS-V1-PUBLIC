import { MockTest, MockTestAttempt, MockQuestion, MockTestAttemptQuestion } from '@/types/mockTest';
import { SubjectId, Mistake, Chapter } from '@/types/index';

export function calculateMockScorePercent(input: {
  totalScore: number;
  totalQuestions?: number;
  totalMarks?: number;
  testSnapshot?: { totalMarks?: number };
}): number {
  const totalMarks = input.totalMarks ?? input.testSnapshot?.totalMarks ?? 0;
  const denominator = totalMarks > 0 ? totalMarks : (input.totalQuestions && input.totalQuestions > 0 ? input.totalQuestions * 4 : 0);

  if (!denominator || !Number.isFinite(input.totalScore)) {
    return 0;
  }

  return Math.round((input.totalScore / denominator) * 100);
}

export const normalizeAnswerToOptionLetter = (val: string | undefined): string => {
  if (!val) return '';
  const trimmed = val.trim().toUpperCase();
  if (['0', '1', '2', '3'].includes(trimmed)) {
    return String.fromCharCode(65 + parseInt(trimmed, 10));
  }
  if (trimmed.startsWith('OPTION ')) {
    const letter = trimmed.replace('OPTION ', '').trim();
    if (['A', 'B', 'C', 'D'].includes(letter)) return letter;
  }
  return trimmed;
};

/**
 * Normalizes chemical / mathematical expressions for semantic comparison:
 * strips KaTeX math delimiters, formatting commands, curly braces, and spaces.
 * e.g. "$\\text{ClO}_4^-$" -> "clo4-"
 */
export const normalizeSemanticFormula = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/\$/g, '')
    .replace(/\\text\{([^}]*)\}/gi, '$1')
    .replace(/\\mathrm\{([^}]*)\}/gi, '$1')
    .replace(/\\mathbf\{([^}]*)\}/gi, '$1')
    .replace(/\\left|\\right/g, '')
    .replace(/[{}\s_^\\]+/g, '')
    .toLowerCase();
};

/**
 * Checks if two option expressions are semantically / mathematically equivalent.
 * Supports:
 * - Direct match after stripping KaTeX math delimiters and whitespace.
 * - Reversed inequality chains:
 *   e.g. "ClO4- > ClO3- > ClO2- > ClO-" is IDENTICAL to "ClO- < ClO2- < ClO3- < ClO4-".
 */
export const areOptionsSemanticallyEquivalent = (opt1: string, opt2: string): boolean => {
  if (!opt1 || !opt2) return false;
  if (opt1.trim() === opt2.trim()) return true;

  // Direct normalized match after stripping KaTeX markup & spaces
  const norm1 = normalizeSemanticFormula(opt1);
  const norm2 = normalizeSemanticFormula(opt2);
  if (norm1 === norm2 && norm1.length > 0) return true;

  // Check inequality chains
  const hasGt1 = />|\\gt|\\ge|≥/.test(opt1);
  const hasLt1 = /<|\\lt|\\le|≤/.test(opt1);
  const hasGt2 = />|\\gt|\\ge|≥/.test(opt2);
  const hasLt2 = /<|\\lt|\\le|≤/.test(opt2);

  const splitRegex = />|<|\\gt|\\lt|\\ge|\\le|≥|≤/;

  // If one chain is descending (>) and the other is ascending (<)
  if ((hasGt1 && !hasLt1 && hasLt2 && !hasGt2) || (hasLt1 && !hasGt1 && hasGt2 && !hasLt2)) {
    const items1 = opt1.split(splitRegex).map(s => normalizeSemanticFormula(s)).filter(Boolean);
    const items2 = opt2.split(splitRegex).map(s => normalizeSemanticFormula(s)).filter(Boolean);

    if (items1.length >= 2 && items1.length === items2.length) {
      const reversed2 = [...items2].reverse();
      const isReversedMatch = items1.every((item, idx) => item === reversed2[idx]);
      if (isReversedMatch) return true;
    }
  }

  // Same direction inequality chains
  if ((hasGt1 && hasGt2 && !hasLt1 && !hasLt2) || (hasLt1 && hasLt2 && !hasGt1 && !hasGt2)) {
    const items1 = opt1.split(splitRegex).map(s => normalizeSemanticFormula(s)).filter(Boolean);
    const items2 = opt2.split(splitRegex).map(s => normalizeSemanticFormula(s)).filter(Boolean);

    if (items1.length >= 2 && items1.length === items2.length) {
      const isForwardMatch = items1.every((item, idx) => item === items2[idx]);
      if (isForwardMatch) return true;
    }
  }

  return false;
};

/**
 * Identifies if a question is a multiple-choice question where one or more options can be correct.
 */
export const isMultiChoiceQuestion = (question: {
  type?: string;
  correctAnswer?: string;
  content?: string;
  sectionName?: string;
  solution?: { text?: string; correctOptionIds?: string[] | string };
}): boolean => {
  if (!question) return false;
  if (question.type?.toUpperCase() === 'MULTI') return true;

  if (question.sectionName && /(?:part\s*[-–\s]*iii|one\s+or\s+more|multiple)/i.test(question.sectionName)) {
    return true;
  }

  if (Array.isArray(question.solution?.correctOptionIds) && question.solution.correctOptionIds.length >= 2) {
    return true;
  }

  const key = (question.correctAnswer || '').trim().toUpperCase();
  const letters = key.replace(/[^A-D]/g, '');
  if (letters.length >= 2) return true;

  const digits = (key.match(/[0-3]/g) || []);
  if (digits.length >= 2 && key.includes(',')) return true;

  const content = question.content || '';
  if (/(?:one\s+or\s+more|more\s+than\s+one|multiple\s+(?:correct|options?)|part\s*[-–]\s*iii)/i.test(content)) {
    return true;
  }

  return false;
};

/**
 * Checks if a specific 0-based option index is selected in an answer string.
 * Supports:
 * - Single index ("0", "1", "2", "3")
 * - Single letter ("A", "B", "C", "D" or "Option A")
 * - Multi-letter combinations ("ACD", "A, C, D", "DAC")
 * - Comma-separated indices ("0, 2, 3")
 */
export const isOptionSelectedInAnswer = (
  selectedAnswer: string | undefined,
  optionIndex: number
): boolean => {
  if (selectedAnswer === undefined || selectedAnswer === null || selectedAnswer === '') return false;
  const raw = selectedAnswer.trim();
  const optLetter = String.fromCharCode(65 + optionIndex);
  const optDigit = String(optionIndex);

  if (raw === optDigit || raw.toUpperCase() === optLetter) return true;

  // Check multi-letter: e.g. "ACD" contains "A"
  const letters = raw.replace(/[^A-D]/gi, '').toUpperCase();
  if (letters.includes(optLetter)) return true;

  // Check comma-separated numbers: e.g. "0, 2, 3"
  const digits: string[] = raw.match(/[0-3]/g) || [];
  if (digits.includes(optDigit)) return true;

  if (raw.toUpperCase() === `OPTION ${optLetter}`) return true;

  return false;
};

/**
 * Returns declared 0-based option indices specified directly in the question answer key
 * (without expanding semantically equivalent options).
 */
export const getDeclaredCorrectOptionIndices = (question: {
  correctAnswer: string;
  options?: string[];
  type?: string;
  content?: string;
}): number[] => {
  if (!question || !question.correctAnswer) return [];
  const rawKey = question.correctAnswer.trim();
  const correctIndices = new Set<number>();

  if (['0', '1', '2', '3'].includes(rawKey)) {
    correctIndices.add(parseInt(rawKey, 10));
  } else {
    const letters = rawKey.replace(/[^A-D]/gi, '').toUpperCase().split('');
    letters.forEach(letter => {
      const idx = letter.charCodeAt(0) - 65;
      if (idx >= 0 && idx <= 3) {
        correctIndices.add(idx);
      }
    });

    const digits: string[] = rawKey.match(/[0-3]/g) || [];
    if (correctIndices.size === 0 && digits.length > 0) {
      digits.forEach(d => correctIndices.add(parseInt(d, 10)));
    }
  }

  return Array.from(correctIndices).sort((a, b) => a - b);
};

/**
 * Returns all 0-based option indices that are correct for a question.
 * Intelligently recognizes semantically equivalent options:
 * If Option A is specified in correctAnswer and Option B expresses the exact same
 * physical/mathematical ordering in reversed form, Option B is also returned as correct!
 */
export const getAllCorrectOptionIndices = (question: {
  correctAnswer: string;
  options?: string[];
  type?: string;
  content?: string;
}): number[] => {
  const baseCorrect = getDeclaredCorrectOptionIndices(question);
  const correctIndices = new Set<number>(baseCorrect);

  // Scan options for semantically / mathematically equivalent counterparts
  if (Array.isArray(question.options) && question.options.length > 0 && correctIndices.size > 0) {
    const knownCorrect = Array.from(correctIndices);
    question.options.forEach((optText, optIdx) => {
      if (!correctIndices.has(optIdx)) {
        for (const cIdx of knownCorrect) {
          const knownOptText = question.options![cIdx];
          if (knownOptText && areOptionsSemanticallyEquivalent(knownOptText, optText)) {
            correctIndices.add(optIdx);
            break;
          }
        }
      }
    });
  }

  return Array.from(correctIndices).sort((a, b) => a - b);
};

export const isMockAnswerCorrect = (
  question: { type?: string; correctAnswer: string; options?: string[]; content?: string },
  selectedAnswer: string | undefined
): boolean => {
  if (selectedAnswer === undefined || selectedAnswer === null || selectedAnswer === '') return false;
  if (!question.correctAnswer) return false;

  const rawUser = selectedAnswer.trim();
  const rawKey = question.correctAnswer.trim();

  const isNumerical = question.type?.toUpperCase() === 'NUMERICAL';
  if (isNumerical) {
    const userClean = rawUser.replace(/,/g, '');
    const keyClean = rawKey.replace(/,/g, '');
    const userNum = parseFloat(userClean);
    const keyNum = parseFloat(keyClean);
    if (Number.isFinite(userNum) && Number.isFinite(keyNum)) {
      // Use both absolute tolerance (±0.01) and relative tolerance (±0.01%) for large numbers
      const absTol = 0.01;
      const relTol = Math.abs(keyNum) * 0.0001; // 0.01% of answer magnitude
      return Math.abs(userNum - keyNum) < Math.max(absTol, relTol);
    }
    return false;
  }

  const correctIndices = getAllCorrectOptionIndices(question);
  const isMulti = isMultiChoiceQuestion(question);

  if (!isMulti) {
    // Single choice question: check if user selected ANY valid/equivalent correct option
    for (let idx = 0; idx < (question.options?.length || 4); idx++) {
      if (isOptionSelectedInAnswer(rawUser, idx)) {
        if (correctIndices.includes(idx)) {
          return true;
        }
      }
    }
  } else {
    // Multi choice question: check that user selected correct option(s) and NO incorrect options
    const chosenIndices = [0, 1, 2, 3].filter(idx => isOptionSelectedInAnswer(rawUser, idx));
    if (chosenIndices.length === 0) return false;

    const hasIncorrect = chosenIndices.some(idx => !correctIndices.includes(idx));
    if (hasIncorrect) return false;

    const declaredIndices = getDeclaredCorrectOptionIndices(question);
    const allDeclaredCovered = declaredIndices.length > 0 && declaredIndices.every(decIdx =>
      chosenIndices.includes(decIdx) ||
      chosenIndices.some(cIdx => {
        const optA = question.options?.[cIdx];
        const optB = question.options?.[decIdx];
        return Boolean(optA && optB && areOptionsSemanticallyEquivalent(optA, optB));
      })
    );

    const allRequiredChosen = correctIndices.every(cIdx => chosenIndices.includes(cIdx));
    if (allRequiredChosen || allDeclaredCovered) return true;

    // For questions with equivalent options (e.g. A and B are equivalent), selecting either A or B is sufficient
    if (chosenIndices.length > 0 && !hasIncorrect && allDeclaredCovered) {
      return true;
    }
  }

  // Direct exact match fallback
  if (rawUser === rawKey) return true;

  // Normalized Letter match (e.g. '0' vs 'A' or 'Option A' vs '0')
  const userLetter = normalizeAnswerToOptionLetter(rawUser);
  const keyLetter = normalizeAnswerToOptionLetter(rawKey);
  if (userLetter.length > 0 && userLetter === keyLetter) return true;

  // Multi-option sorted letter match (e.g. 'ACD' vs 'A, C, D' or 'DAC')
  const cleanUserLetters = userLetter.replace(/[^A-D]/gi, '').toUpperCase().split('').sort().join('');
  const cleanKeyLetters = keyLetter.replace(/[^A-D]/gi, '').toUpperCase().split('').sort().join('');
  if (cleanUserLetters.length > 0 && cleanUserLetters === cleanKeyLetters) return true;

  return false;
};

export const formatCorrectAnswerKey = (rawKey: string): string => {
  if (!rawKey) return '';
  const trimmed = rawKey.trim();
  if (['0', '1', '2', '3'].includes(trimmed)) {
    return `Option ${String.fromCharCode(65 + parseInt(trimmed, 10))}`;
  }
  if (trimmed.length === 1 && trimmed.toUpperCase() >= 'A' && trimmed.toUpperCase() <= 'D') {
    return `Option ${trimmed.toUpperCase()}`;
  }
  if (/^[A-D]+$/i.test(trimmed)) {
    return `Option ${trimmed.toUpperCase().split('').join(', ')}`;
  }
  return trimmed;
};

export const formatReadableOptionText = (
  answerVal: string | undefined,
  options?: string[]
): string => {
  if (!answerVal) return 'No answer submitted';
  const letter = normalizeAnswerToOptionLetter(answerVal);
  if (options && ['A', 'B', 'C', 'D'].includes(letter)) {
    const idx = letter.charCodeAt(0) - 65;
    if (options[idx]) {
      return `Option ${letter}: ${options[idx]}`;
    }
  }
  if (['A', 'B', 'C', 'D'].includes(letter)) {
    return `Option ${letter}`;
  }

  const multiLetters = answerVal.replace(/[^A-D]/gi, '').toUpperCase();
  if (multiLetters.length >= 2) {
    if (options) {
      const parts = multiLetters.split('').map(l => {
        const idx = l.charCodeAt(0) - 65;
        return options[idx] ? `(${l}) ${options[idx]}` : `(${l})`;
      });
      return parts.join('; ');
    }
    return `Option ${multiLetters.split('').join(', ')}`;
  }

  return answerVal;
};

export const calculateRank = (score: number, maxMarks: number): number => {
  const safeMax = maxMarks > 0 ? maxMarks : 300;
  const normalizedScore = Math.max(0, (score / safeMax) * 300);
  if (normalizedScore >= 280) return Math.floor(Math.max(1, (300 - normalizedScore) * 5));
  if (normalizedScore >= 250) return Math.floor(100 + (280 - normalizedScore) * 30);
  if (normalizedScore >= 200) return Math.floor(1000 + (250 - normalizedScore) * 150);
  if (normalizedScore >= 150) return Math.floor(8500 + (200 - normalizedScore) * 400);
  if (normalizedScore >= 100) return Math.floor(28500 + (150 - normalizedScore) * 1000);
  if (normalizedScore >= 50) return Math.floor(78500 + (100 - normalizedScore) * 3000);
  return Math.floor(228500 + (50 - normalizedScore) * 10000);
};

export interface EvaluatedMockQuestion {
  sectionSubject: SubjectId;
  question: MockQuestion;
  attempt: MockTestAttemptQuestion;
  isCorrect: boolean;
  isIncorrect: boolean;
  isUnattempted: boolean;
  statusLabel: 'Correct' | 'Incorrect' | 'Unattempted';
  globalIndex: number;
}

export interface MockAttemptEvaluation {
  totalScore: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  attempted: number;
  totalQuestions: number;
  totalTimeSpent: number;
  subjectStats: Record<string, {
    correct: number;
    incorrect: number;
    attempted: number;
    unattempted: number;
    score: number;
    total: number;
  }>;
  detailedQuestions: EvaluatedMockQuestion[];
  mistakesToLog: Array<Omit<Mistake, 'id'>>;
  whatIfScore: number;
  actualRank: number;
  whatIfRank: number;
}

export function evaluateMockAttempt(
  test: MockTest,
  attempt: MockTestAttempt,
  chapters: Chapter[] = []
): MockAttemptEvaluation {
  let totalScore = 0;
  let correct = 0;
  let incorrect = 0;
  let unattempted = 0;
  let totalTimeSpent = 0;
  let whatIfScore = 0;

  const subjectStats: Record<string, {
    correct: number;
    incorrect: number;
    attempted: number;
    unattempted: number;
    score: number;
    total: number;
  }> = {};

  test.sections.forEach(sec => {
    subjectStats[sec.subject] = {
      correct: 0,
      incorrect: 0,
      attempted: 0,
      unattempted: 0,
      score: 0,
      total: sec.questions.length
    };
  });

  const detailedQuestions: EvaluatedMockQuestion[] = [];
  const mistakesToLog: Array<Omit<Mistake, 'id'>> = [];
  let qIdx = 1;

  test.sections.forEach(sec => {
    sec.questions.forEach(q => {
      const a: MockTestAttemptQuestion = attempt.questions?.[q.id] || {
        questionId: q.id,
        subject: sec.subject,
        status: 'Not Visited',
        timeSpentSeconds: 0
      };

      const qTime = a.timeSpentSeconds || 0;
      totalTimeSpent += qTime;

      const isAnswered = a.status === 'Answered' || a.status === 'Answered & Marked for Review';
      let isCorrect = false;
      let isIncorrect = false;
      let isUnattempted = true;
      let statusLabel: 'Correct' | 'Incorrect' | 'Unattempted' = 'Unattempted';

      if (isAnswered && a.selectedAnswer !== undefined && a.selectedAnswer !== null && a.selectedAnswer.trim() !== '') {
        isUnattempted = false;
        subjectStats[sec.subject].attempted++;

        const isNumerical = q.type?.toUpperCase() === 'NUMERICAL';
        const isMulti = isMultiChoiceQuestion(q);
        const correctIndices = getAllCorrectOptionIndices(q);

        if (isNumerical) {
          const isAnswerCorrect = isMockAnswerCorrect(q, a.selectedAnswer);
          if (isAnswerCorrect) {
            const marksEarned = q.marks?.correct ?? 4;
            totalScore += marksEarned;
            whatIfScore += marksEarned;
            correct++;
            isCorrect = true;
            statusLabel = 'Correct';
            subjectStats[sec.subject].correct++;
            subjectStats[sec.subject].score += marksEarned;
          } else {
            const penalty = q.marks?.incorrect ?? 0;
            totalScore += penalty;
            whatIfScore += 0;
            incorrect++;
            isIncorrect = true;
            statusLabel = 'Incorrect';
            subjectStats[sec.subject].incorrect++;
            subjectStats[sec.subject].score += penalty;

            const targetChapterName = (q.chapter || '').trim().toLowerCase();
            const matchedChapter = chapters.find(
              c => c.subject === sec.subject && c.name.trim().toLowerCase() === targetChapterName
            );
            const studentMethodReadable = formatReadableOptionText(a.selectedAnswer, q.options);
            const correctSolutionReadable = formatReadableOptionText(q.correctAnswer, q.options);

            mistakesToLog.push({
              questionText: q.content || 'Question content not found',
              correctSolution: correctSolutionReadable,
              chapter: q.chapter || 'General',
              chapterId: matchedChapter?.id || undefined,
              topic: q.topic || q.chapter || 'General Topic',
              subtopic: '',
              subject: sec.subject,
              mistakeTypes: ['Test Error', 'Calculation Error'],
              difficulty: q.difficulty || 'Medium',
              source: test.name,
              timeTaken: Math.max(1, Math.round(qTime / 60)),
              correctMethod: q.explanation || `Correct Answer: ${correctSolutionReadable}`,
              studentMethod: studentMethodReadable,
              confidence: 20,
              revisionSchedule: 'Next Day',
              masteryImpact: 'High',
              attemptNumber: 1,
              revisionStatus: 'New',
              recoveryScore: 0,
              teacherNotes: `Auto-logged from mock test: ${test.name}`,
              personalNotes: `Submitted: ${studentMethodReadable} | Official Key: ${correctSolutionReadable}`,
              aiAdvice: 'Re-calculate numerical derivation and verify units and significant figures.',
              priority: 'High',
              dateLogged: new Date().toISOString(),
            });
          }
        } else if (isMulti) {
          // JEE Advanced Multi-Choice (One or more than one correct) scoring:
          // Full marks (+4): All correct options chosen, none incorrect.
          // Partial marks (+1 per correct option): Subset of correct options chosen, none incorrect.
          // Negative marks (-2 or q.marks.incorrect): If ANY incorrect option is chosen.
          const chosenIndices = [0, 1, 2, 3].filter(idx => isOptionSelectedInAnswer(a.selectedAnswer, idx));
          const hasIncorrect = chosenIndices.some(idx => !correctIndices.includes(idx));

          if (chosenIndices.length === 0) {
            // No valid option indices found in the answer — treat as effectively unattempted
            isUnattempted = true;
            unattempted++;
            subjectStats[sec.subject].unattempted++;
            statusLabel = 'Unattempted';
          } else if (hasIncorrect) {
            const penalty = q.marks?.incorrect ?? -2;
            totalScore += penalty;
            whatIfScore += 0;
            incorrect++;
            isIncorrect = true;
            statusLabel = 'Incorrect';
            subjectStats[sec.subject].incorrect++;
            subjectStats[sec.subject].score += penalty;

            const targetChapterName = (q.chapter || '').trim().toLowerCase();
            const matchedChapter = chapters.find(
              c => c.subject === sec.subject && c.name.trim().toLowerCase() === targetChapterName
            );
            const studentMethodReadable = formatReadableOptionText(a.selectedAnswer, q.options);
            const correctSolutionReadable = formatReadableOptionText(q.correctAnswer, q.options);

            mistakesToLog.push({
              questionText: q.content || 'Question content not found',
              correctSolution: correctSolutionReadable,
              chapter: q.chapter || 'General',
              chapterId: matchedChapter?.id || undefined,
              topic: q.topic || q.chapter || 'General Topic',
              subtopic: '',
              subject: sec.subject,
              mistakeTypes: ['Test Error', 'Conceptual Error'],
              difficulty: q.difficulty || 'Medium',
              source: test.name,
              timeTaken: Math.max(1, Math.round(qTime / 60)),
              correctMethod: q.explanation || `Correct Answer: ${correctSolutionReadable}`,
              studentMethod: studentMethodReadable,
              confidence: 20,
              revisionSchedule: 'Next Day',
              masteryImpact: 'High',
              attemptNumber: 1,
              revisionStatus: 'New',
              recoveryScore: 0,
              teacherNotes: `Auto-logged from mock test: ${test.name}`,
              personalNotes: `Submitted: ${studentMethodReadable} | Official Key: ${correctSolutionReadable}`,
              aiAdvice: 'In multiple-choice questions, verify each individual statement independently before selecting.',
              priority: 'High',
              dateLogged: new Date().toISOString(),
            });
          } else {
            // Student selected ONLY correct options! (Partial or Full match)
            // Check whether every declared original correct option is satisfied:
            // either directly chosen OR represented by a semantically equivalent chosen option.
            const declaredIndices = getDeclaredCorrectOptionIndices(q);
            const allDeclaredCovered = declaredIndices.length > 0 && declaredIndices.every(decIdx =>
              chosenIndices.includes(decIdx) ||
              chosenIndices.some(cIdx => {
                const optA = q.options?.[cIdx];
                const optB = q.options?.[decIdx];
                return Boolean(optA && optB && areOptionsSemanticallyEquivalent(optA, optB));
              })
            );

            const isFullMatch = chosenIndices.length >= correctIndices.length || allDeclaredCovered;
            const marksEarned = isFullMatch
              ? (q.marks?.correct ?? 4)
              : Math.max(1, Math.min(q.marks?.correct ?? 4, chosenIndices.length));

            totalScore += marksEarned;
            whatIfScore += marksEarned;
            correct++;
            isCorrect = true;
            statusLabel = 'Correct';
            subjectStats[sec.subject].correct++;
            subjectStats[sec.subject].score += marksEarned;
          }
        } else {
          // Single-choice MCQ:
          const isAnswerCorrect = isMockAnswerCorrect(q, a.selectedAnswer);

          if (isAnswerCorrect) {
            const marksEarned = q.marks?.correct ?? 4;
            totalScore += marksEarned;
            whatIfScore += marksEarned;
            correct++;
            isCorrect = true;
            statusLabel = 'Correct';
            subjectStats[sec.subject].correct++;
            subjectStats[sec.subject].score += marksEarned;
          } else {
            const penalty = q.marks?.incorrect ?? -1;
            totalScore += penalty;
            whatIfScore += 0;
            incorrect++;
            isIncorrect = true;
            statusLabel = 'Incorrect';
            subjectStats[sec.subject].incorrect++;
            subjectStats[sec.subject].score += penalty;

            const targetChapterName = (q.chapter || '').trim().toLowerCase();
            const matchedChapter = chapters.find(
              c => c.subject === sec.subject && c.name.trim().toLowerCase() === targetChapterName
            );

            const studentMethodReadable = formatReadableOptionText(a.selectedAnswer, q.options);
            const correctSolutionReadable = formatReadableOptionText(q.correctAnswer, q.options);

            mistakesToLog.push({
              questionText: q.content || 'Question content not found',
              correctSolution: correctSolutionReadable,
              chapter: q.chapter || 'General',
              chapterId: matchedChapter?.id || undefined,
              topic: q.topic || q.chapter || 'General Topic',
              subtopic: '',
              subject: sec.subject,
              mistakeTypes: ['Test Error', 'Conceptual Error'],
              difficulty: q.difficulty || 'Medium',
              source: test.name,
              timeTaken: Math.max(1, Math.round(qTime / 60)),
              correctMethod: q.explanation || `Correct Answer: ${correctSolutionReadable}`,
              studentMethod: studentMethodReadable,
              confidence: 20,
              revisionSchedule: 'Next Day',
              masteryImpact: 'High',
              attemptNumber: 1,
              revisionStatus: 'New',
              recoveryScore: 0,
              teacherNotes: `Auto-logged from mock test: ${test.name}`,
              personalNotes: `Submitted: ${studentMethodReadable} | Official Key: ${correctSolutionReadable}`,
              aiAdvice: 'Analyze where conceptual reasoning diverged from the analytical solution.',
              priority: 'High',
              dateLogged: new Date().toISOString(),
            });
          }
        }
      } else {
        unattempted++;
        subjectStats[sec.subject].unattempted++;
      }

      detailedQuestions.push({
        sectionSubject: sec.subject,
        question: q,
        attempt: a,
        isCorrect,
        isIncorrect,
        isUnattempted,
        statusLabel,
        globalIndex: qIdx++
      });
    });
  });

  const totalQuestions = detailedQuestions.length;
  const attempted = correct + incorrect;
  const actualRank = calculateRank(totalScore, test.totalMarks);
  const whatIfRank = calculateRank(whatIfScore, test.totalMarks);

  return {
    totalScore,
    correct,
    incorrect,
    unattempted,
    attempted,
    totalQuestions,
    totalTimeSpent,
    subjectStats,
    detailedQuestions,
    mistakesToLog,
    whatIfScore,
    actualRank,
    whatIfRank
  };
}
