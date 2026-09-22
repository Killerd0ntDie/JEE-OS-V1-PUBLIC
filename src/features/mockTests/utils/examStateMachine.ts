import { MockTestAttempt, MockTestAttemptQuestion, QuestionStatus } from '@/types/mockTest';

export type ExamAction =
  | { type: 'VISIT_QUESTION'; questionId: string }
  | { type: 'SAVE_ANSWER'; questionId: string; answer: string }
  | { type: 'MARK_FOR_REVIEW'; questionId: string; answer?: string }
  | { type: 'CLEAR_RESPONSE'; questionId: string }
  | { type: 'TICK_TIME'; questionId: string; seconds: number }
  | { type: 'RESTORE_ATTEMPT'; attempt: MockTestAttempt };

/**
 * Pure, testable finite state machine reducer governing the 5 official NTA CBT question statuses:
 * - 'Not Visited'
 * - 'Not Answered'
 * - 'Answered'
 * - 'Marked for Review'
 * - 'Answered & Marked for Review'
 */
export function examReducer(state: MockTestAttempt, action: ExamAction): MockTestAttempt {
  switch (action.type) {
    case 'RESTORE_ATTEMPT': {
      if (!action.attempt || !action.attempt.questions) return state;
      return action.attempt;
    }

    case 'VISIT_QUESTION': {
      const q = state.questions[action.questionId];
      // Only transition if currently 'Not Visited'.
      // If already visited ('Not Answered', 'Answered', etc.), never downgrade or overwrite status!
      if (!q || q.status !== 'Not Visited') return state;

      return {
        ...state,
        questions: {
          ...state.questions,
          [action.questionId]: {
            ...q,
            status: 'Not Answered'
          }
        }
      };
    }

    case 'SAVE_ANSWER': {
      const q = state.questions[action.questionId];
      if (!q) return state;

      const trimmed = (action.answer || '').trim();
      const isAnswered = trimmed.length > 0;

      return {
        ...state,
        questions: {
          ...state.questions,
          [action.questionId]: {
            ...q,
            selectedAnswer: isAnswered ? action.answer : '',
            status: isAnswered ? 'Answered' : 'Not Answered'
          }
        }
      };
    }

    case 'MARK_FOR_REVIEW': {
      const q = state.questions[action.questionId];
      if (!q) return state;

      const trimmed = (action.answer !== undefined ? action.answer : q.selectedAnswer || '').trim();
      const hasAnswer = trimmed.length > 0;
      const finalAnswer = action.answer !== undefined ? action.answer : q.selectedAnswer || '';

      return {
        ...state,
        questions: {
          ...state.questions,
          [action.questionId]: {
            ...q,
            selectedAnswer: hasAnswer ? finalAnswer : '',
            status: hasAnswer ? 'Answered & Marked for Review' : 'Marked for Review'
          }
        }
      };
    }

    case 'CLEAR_RESPONSE': {
      const q = state.questions[action.questionId];
      if (!q) return state;

      // NTA CBT Rule: Clearing response reverts status to 'Not Answered', resets selectedAnswer,
      // but PRESERVES all accumulated solving time.
      return {
        ...state,
        questions: {
          ...state.questions,
          [action.questionId]: {
            ...q,
            selectedAnswer: '',
            status: 'Not Answered'
          }
        }
      };
    }

    case 'TICK_TIME': {
      const q = state.questions[action.questionId];
      if (!q || action.seconds <= 0) return state;

      return {
        ...state,
        questions: {
          ...state.questions,
          [action.questionId]: {
            ...q,
            timeSpentSeconds: (q.timeSpentSeconds || 0) + action.seconds
          }
        }
      };
    }

    default:
      return state;
  }
}
