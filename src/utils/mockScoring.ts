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

  return Math.max(0, Math.round((input.totalScore / denominator) * 100));
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

export const isMockAnswerCorrect = (
  question: { type?: string; correctAnswer: string },
  selectedAnswer: string | undefined
): boolean => {
  if (selectedAnswer === undefined || selectedAnswer === null || selectedAnswer === '') return false;
  if (!question.correctAnswer) return false;

  const rawUser = selectedAnswer.trim();
  const rawKey = question.correctAnswer.trim();

  if (question.type === 'NUMERICAL') {
    const userNum = parseFloat(rawUser);
    const keyNum = parseFloat(rawKey);
    if (!Number.isFinite(userNum) || !Number.isFinite(keyNum)) return false;
    return Math.abs(userNum - keyNum) < 0.01;
  }

  // Direct exact match
  if (rawUser === rawKey) return true;

  // Normalized Letter match (e.g. '0' vs 'A' or 'Option A' vs '0')
  const userLetter = normalizeAnswerToOptionLetter(rawUser);
  const keyLetter = normalizeAnswerToOptionLetter(rawKey);
  return userLetter.length > 0 && userLetter === keyLetter;
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
  return answerVal;
};

export const calculateRank = (score: number, maxMarks: number): number => {
  const safeMax = maxMarks > 0 ? maxMarks : 300;
  // Do not floor at 0. JEE permits negative scores.
  const normalizedScore = (score / safeMax) * 300;
  
  // High scores
  if (normalizedScore >= 280) return Math.floor(Math.max(1, (300 - normalizedScore) * 5));
  if (normalizedScore >= 250) return Math.floor(100 + (280 - normalizedScore) * 30);
  if (normalizedScore >= 200) return Math.floor(1000 + (250 - normalizedScore) * 150);
  if (normalizedScore >= 150) return Math.floor(8500 + (200 - normalizedScore) * 400);
  if (normalizedScore >= 100) return Math.floor(28500 + (150 - normalizedScore) * 1000);
  if (normalizedScore >= 50) return Math.floor(78500 + (100 - normalizedScore) * 3000);
  
  // Scores between 0 and 49
  if (normalizedScore >= 0) return Math.floor(228500 + (50 - normalizedScore) * 10000);
  
  // Negative scores
  return Math.floor(728500 + Math.abs(normalizedScore) * 15000);
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

      if (isAnswered && a.selectedAnswer !== undefined && a.selectedAnswer !== null && a.selectedAnswer !== '') {
        isUnattempted = false;
        subjectStats[sec.subject].attempted++;

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
          // In What-If scenario, student skips penalty questions, so score = 0 penalty instead of deducting
          whatIfScore += 0;
          incorrect++;
          isIncorrect = true;
          statusLabel = 'Incorrect';
          subjectStats[sec.subject].incorrect++;
          subjectStats[sec.subject].score += penalty;

          // Resolve chapter id from syllabus
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
