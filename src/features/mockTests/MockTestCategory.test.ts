import { describe, it, expect } from 'vitest';
import { getMockTestCategory } from './MockTestsPage';
import { MockTest } from '../../types/mockTest';

describe('getMockTestCategory categorization logic', () => {
  it('respects explicit category property before applying heuristics', () => {
    const explicitSprint: MockTest = {
      id: 'test-1',
      name: 'Quick 10 Qs Check',
      category: 'sprint',
      durationMinutes: 30,
      totalMarks: 40,
      sections: [{ subject: 'physics', questions: new Array(10).fill({ id: 'q' }) }]
    };
    // Even though <= 15 questions would normally heuristic to 'dpp', explicit 'sprint' is respected
    expect(getMockTestCategory(explicitSprint)).toBe('sprint');

    const explicitDpp: MockTest = {
      id: 'test-2',
      name: 'Custom Chapter Practice',
      category: 'chapter',
      durationMinutes: 45,
      totalMarks: 60,
      sections: [{ subject: 'chemistry', questions: new Array(15).fill({ id: 'q' }) }]
    };
    expect(getMockTestCategory(explicitDpp)).toBe('dpp');

    const explicitPyq: MockTest = {
      id: 'test-3',
      name: 'PYQ Archive Paper',
      category: 'pyq',
      durationMinutes: 180,
      totalMarks: 300,
      sections: [{ subject: 'maths', questions: new Array(25).fill({ id: 'q' }) }]
    };
    expect(getMockTestCategory(explicitPyq)).toBe('grand');
  });

  it('correctly classifies full 3-subject and high question/duration tests as grand', () => {
    const multiSectionTest: MockTest = {
      id: 'grand-1',
      name: 'Mock Test 2025',
      durationMinutes: 180,
      totalMarks: 300,
      sections: [
        { subject: 'physics', questions: new Array(25).fill({ id: 'q' }) },
        { subject: 'chemistry', questions: new Array(25).fill({ id: 'q' }) },
        { subject: 'maths', questions: new Array(25).fill({ id: 'q' }) },
      ]
    };
    expect(getMockTestCategory(multiSectionTest)).toBe('grand');

    const keywordGrandTest: MockTest = {
      id: 'grand-2',
      name: 'All-India Grand Test Series',
      durationMinutes: 60,
      totalMarks: 80,
      sections: [{ subject: 'physics', questions: new Array(20).fill({ id: 'q' }) }]
    };
    expect(getMockTestCategory(keywordGrandTest)).toBe('grand');
  });

  it('classifies <= 15 questions or DPP keywords as dpp', () => {
    const shortTest: MockTest = {
      id: 'dpp-1',
      name: 'Rotational Motion Practice',
      durationMinutes: 30,
      totalMarks: 40,
      sections: [{ subject: 'physics', questions: new Array(10).fill({ id: 'q' }) }]
    };
    expect(getMockTestCategory(shortTest)).toBe('dpp');

    const dppKeywordTest: MockTest = {
      id: 'dpp-2',
      name: 'Daily Practice Problem 05',
      durationMinutes: 45,
      totalMarks: 80,
      sections: [{ subject: 'chemistry', questions: new Array(20).fill({ id: 'q' }) }]
    };
    expect(getMockTestCategory(dppKeywordTest)).toBe('dpp');
  });

  it('classifies single-subject intermediate tests as sprint', () => {
    const sprintTest: MockTest = {
      id: 'sprint-1',
      name: 'Thermodynamics Subject Sprint',
      durationMinutes: 60,
      totalMarks: 100,
      sections: [{ subject: 'physics', questions: new Array(25).fill({ id: 'q' }) }]
    };
    expect(getMockTestCategory(sprintTest)).toBe('sprint');
  });
});
