import { describe, it, expect } from 'vitest';
import { examReducer, ExamAction } from './examStateMachine';
import { MockTestAttempt } from '@/types/mockTest';

describe('examStateMachine (5.2 State Machine Formalization)', () => {
  const baseAttempt: MockTestAttempt = {
    testId: 'test-1',
    startTime: '2026-01-01T10:00:00.000Z',
    questions: {
      q1: {
        questionId: 'q1',
        subject: 'physics',
        status: 'Not Visited',
        timeSpentSeconds: 0
      },
      q2: {
        questionId: 'q2',
        subject: 'chemistry',
        status: 'Not Visited',
        timeSpentSeconds: 0
      }
    }
  };

  it('transitions Not Visited to Not Answered on VISIT_QUESTION', () => {
    const next = examReducer(baseAttempt, { type: 'VISIT_QUESTION', questionId: 'q1' });
    expect(next.questions.q1.status).toBe('Not Answered');
    expect(next.questions.q2.status).toBe('Not Visited');
  });

  it('does not overwrite Answered or Marked status on VISIT_QUESTION', () => {
    const answeredAttempt: MockTestAttempt = {
      ...baseAttempt,
      questions: {
        ...baseAttempt.questions,
        q1: {
          questionId: 'q1',
          subject: 'physics',
          status: 'Answered',
          selectedAnswer: '2',
          timeSpentSeconds: 45
        }
      }
    };
    const next = examReducer(answeredAttempt, { type: 'VISIT_QUESTION', questionId: 'q1' });
    expect(next.questions.q1.status).toBe('Answered');
    expect(next.questions.q1.selectedAnswer).toBe('2');
  });

  it('sets status to Answered with answer on SAVE_ANSWER', () => {
    const next = examReducer(baseAttempt, { type: 'SAVE_ANSWER', questionId: 'q1', answer: '3' });
    expect(next.questions.q1.status).toBe('Answered');
    expect(next.questions.q1.selectedAnswer).toBe('3');
  });

  it('reverts status to Not Answered if saving an empty answer', () => {
    const next = examReducer(baseAttempt, { type: 'SAVE_ANSWER', questionId: 'q1', answer: '   ' });
    expect(next.questions.q1.status).toBe('Not Answered');
    expect(next.questions.q1.selectedAnswer).toBe('');
  });

  it('marks for review as Answered & Marked for Review when answer is present', () => {
    const next = examReducer(baseAttempt, {
      type: 'MARK_FOR_REVIEW',
      questionId: 'q1',
      answer: 'B'
    });
    expect(next.questions.q1.status).toBe('Answered & Marked for Review');
    expect(next.questions.q1.selectedAnswer).toBe('B');
  });

  it('marks for review without answer as Marked for Review', () => {
    const next = examReducer(baseAttempt, {
      type: 'MARK_FOR_REVIEW',
      questionId: 'q1',
      answer: ''
    });
    expect(next.questions.q1.status).toBe('Marked for Review');
    expect(next.questions.q1.selectedAnswer).toBe('');
  });

  it('clears response to Not Answered while strictly preserving accumulated time', () => {
    const answeredAttempt: MockTestAttempt = {
      ...baseAttempt,
      questions: {
        ...baseAttempt.questions,
        q1: {
          questionId: 'q1',
          subject: 'physics',
          status: 'Answered',
          selectedAnswer: '1',
          timeSpentSeconds: 120
        }
      }
    };

    const next = examReducer(answeredAttempt, { type: 'CLEAR_RESPONSE', questionId: 'q1' });
    expect(next.questions.q1.status).toBe('Not Answered');
    expect(next.questions.q1.selectedAnswer).toBe('');
    expect(next.questions.q1.timeSpentSeconds).toBe(120); // strictly preserved
  });

  it('ticks solving time accurately with TICK_TIME', () => {
    const next = examReducer(baseAttempt, { type: 'TICK_TIME', questionId: 'q1', seconds: 15 });
    expect(next.questions.q1.timeSpentSeconds).toBe(15);

    const next2 = examReducer(next, { type: 'TICK_TIME', questionId: 'q1', seconds: 30 });
    expect(next2.questions.q1.timeSpentSeconds).toBe(45);
  });

  it('replaces state cleanly with RESTORE_ATTEMPT', () => {
    const restored: MockTestAttempt = {
      testId: 'test-1',
      startTime: '2026-01-01T09:00:00.000Z',
      questions: {
        q1: { questionId: 'q1', subject: 'physics', status: 'Answered', selectedAnswer: '0', timeSpentSeconds: 60 }
      }
    };
    const next = examReducer(baseAttempt, { type: 'RESTORE_ATTEMPT', attempt: restored });
    expect(next).toEqual(restored);
  });
});
