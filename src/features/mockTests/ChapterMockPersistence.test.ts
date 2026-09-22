import { describe, it, expect } from 'vitest';
import { isTestForChapter, getMockTestCategory } from './MockTestsPage';
import { MockTest } from '@/types/mockTest';

describe('isTestForChapter & getMockTestCategory', () => {
  const dummyQuestion = {
    id: 'q1',
    subject: 'physics' as const,
    type: 'MCQ' as const,
    chapter: 'Rotational Motion',
    topic: 'Moment of Inertia',
    difficulty: 'Medium' as const,
    content: 'Calculate moment of inertia of a solid cylinder.',
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 }
  };

  it('matches test when chapterId matches directly', () => {
    const test: MockTest = {
      id: 'mock_1',
      name: 'Custom Drill Test',
      durationMinutes: 45,
      totalMarks: 40,
      sections: [{ subject: 'physics', questions: [dummyQuestion] }],
      chapterId: 'phy_rotational_motion',
      chapterName: 'Rotational Motion'
    };

    expect(isTestForChapter(test, 'Rotational Motion', 'physics', 'phy_rotational_motion')).toBe(true);
  });

  it('matches test when chapterName matches directly', () => {
    const test: MockTest = {
      id: 'mock_2',
      name: 'Rotational Motion [Coaching DPP]',
      durationMinutes: 60,
      totalMarks: 60,
      sections: [{ subject: 'physics', questions: [dummyQuestion] }],
      category: 'dpp',
      chapterName: 'Rotational Motion'
    };

    expect(isTestForChapter(test, 'Rotational Motion', 'physics')).toBe(true);
  });

  it('does NOT categorize chapter test with JEE Main in title as grand if category is dpp or chapter', () => {
    const test: MockTest = {
      id: 'dpp_1',
      name: 'Allen JEE Main DPP #1: Rotational Dynamics',
      durationMinutes: 60,
      totalMarks: 80,
      sections: [{ subject: 'physics', questions: [dummyQuestion] }],
      category: 'dpp',
      chapterName: 'Rotational Motion'
    };

    expect(getMockTestCategory(test)).toBe('dpp');
    expect(isTestForChapter(test, 'Rotational Motion', 'physics')).toBe(true);
  });

  it('allows multi-section single-subject chapter tests (MCQ + Numerical)', () => {
    const numericalQ = {
      ...dummyQuestion,
      id: 'q2',
      type: 'NUMERICAL' as const,
      content: 'Find radius of gyration.'
    };

    const test: MockTest = {
      id: 'dpp_multi_sec',
      name: 'Rotational Motion Chapter Test',
      durationMinutes: 60,
      totalMarks: 40,
      sections: [
        { subject: 'physics', questions: [dummyQuestion] },
        { subject: 'physics', questions: [numericalQ] }
      ],
      category: 'chapter',
      chapterName: 'Rotational Motion'
    };

    // Both sections are physics; it should NOT be rejected as a multi-subject grand test
    expect(isTestForChapter(test, 'Rotational Motion', 'physics')).toBe(true);
  });

  it('allows single-subject DPP tests with 35+ questions', () => {
    const questions = Array.from({ length: 40 }, (_, i) => ({
      ...dummyQuestion,
      id: `q_${i + 1}`
    }));

    const test: MockTest = {
      id: 'dpp_large',
      name: 'Rotational Motion Mega Drill',
      durationMinutes: 90,
      totalMarks: 160,
      sections: [{ subject: 'physics', questions }],
      category: 'dpp',
      chapterName: 'Rotational Motion'
    };

    expect(isTestForChapter(test, 'Rotational Motion', 'physics')).toBe(true);
  });

  it('matches chapter with fuzzy token overlap (e.g. System of Particles and Rotational Motion)', () => {
    const test: MockTest = {
      id: 'dpp_tok',
      name: 'Rotational Motion Practice Drill',
      durationMinutes: 45,
      totalMarks: 40,
      sections: [{ subject: 'physics', questions: [dummyQuestion] }],
      category: 'dpp'
    };

    expect(isTestForChapter(test, 'System of Particles and Rotational Motion', 'physics')).toBe(true);
  });

  it('strictly excludes true multi-subject Grand Full Tests spanning physics, chemistry, and maths', () => {
    const grandTest: MockTest = {
      id: 'grand_full_1',
      name: 'JEE Main Full Test #1 (75 Qs)',
      durationMinutes: 180,
      totalMarks: 300,
      sections: [
        { subject: 'physics', questions: [dummyQuestion] },
        { subject: 'chemistry', questions: [{ ...dummyQuestion, subject: 'chemistry', chapter: 'Chemical Bonding' }] },
        { subject: 'maths', questions: [{ ...dummyQuestion, subject: 'maths', chapter: 'Matrices' }] }
      ],
      category: 'grand'
    };

    expect(getMockTestCategory(grandTest)).toBe('grand');
    expect(isTestForChapter(grandTest, 'Rotational Motion', 'physics')).toBe(false);
  });

  it('sorts custom tests with newest created first so freshly created tests appear at the beginning', () => {
    const olderTest: MockTest = {
      id: 'dpp_1000',
      name: 'Older Test',
      durationMinutes: 45,
      totalMarks: 40,
      sections: [{ subject: 'physics', questions: [dummyQuestion] }],
      createdAt: 1000,
      isCustom: true
    };
    const middleTest: MockTest = {
      id: 'dpp_2000',
      name: 'Middle Test',
      durationMinutes: 45,
      totalMarks: 40,
      sections: [{ subject: 'physics', questions: [dummyQuestion] }],
      createdAt: 2000,
      isCustom: true
    };
    const newestTest: MockTest = {
      id: 'dpp_3000',
      name: 'Brand New Test',
      durationMinutes: 45,
      totalMarks: 40,
      sections: [{ subject: 'physics', questions: [dummyQuestion] }],
      createdAt: 3000,
      isCustom: true
    };

    const tests = [olderTest, middleTest, newestTest];
    const sorted = [...tests].sort((a, b) => {
      const timeA = a.createdAt || (a.id.includes('_') ? parseInt(a.id.split('_')[1], 10) || 0 : 0);
      const timeB = b.createdAt || (b.id.includes('_') ? parseInt(b.id.split('_')[1], 10) || 0 : 0);
      return timeB - timeA;
    });

    expect(sorted[0].id).toBe('dpp_3000');
    expect(sorted[1].id).toBe('dpp_2000');
    expect(sorted[2].id).toBe('dpp_1000');
  });

  it('correctly filters custom chapter tests for bulk chapter deletion', () => {
    const chapterTest1: MockTest = {
      id: 'custom_cb_1',
      name: 'Chemical Bonding DPP 1',
      durationMinutes: 45,
      totalMarks: 40,
      sections: [{ subject: 'chemistry', questions: [{ ...dummyQuestion, subject: 'chemistry', chapter: 'Chemical Bonding' }] }],
      chapterName: 'Chemical Bonding',
      chapterId: 'chem_bonding',
      isCustom: true
    };
    const chapterTest2: MockTest = {
      id: 'custom_cb_2',
      name: 'Chemical Bonding Drill 2',
      durationMinutes: 45,
      totalMarks: 40,
      sections: [{ subject: 'chemistry', questions: [{ ...dummyQuestion, subject: 'chemistry', chapter: 'Chemical Bonding' }] }],
      chapterName: 'Chemical Bonding',
      chapterId: 'chem_bonding',
      isCustom: true
    };
    const otherChapterTest: MockTest = {
      id: 'custom_thermo_1',
      name: 'Thermodynamics DPP',
      durationMinutes: 45,
      totalMarks: 40,
      sections: [{ subject: 'chemistry', questions: [{ ...dummyQuestion, subject: 'chemistry', chapter: 'Thermodynamics' }] }],
      chapterName: 'Thermodynamics',
      chapterId: 'chem_thermo',
      isCustom: true
    };

    const allCustom = [chapterTest1, chapterTest2, otherChapterTest];
    const toDelete = allCustom.filter(t => isTestForChapter(t, 'Chemical Bonding', 'chemistry', 'chem_bonding'));

    expect(toDelete.map(t => t.id)).toEqual(['custom_cb_1', 'custom_cb_2']);

    const remaining = allCustom.filter(t => !toDelete.some(td => td.id === t.id));
    expect(remaining.map(t => t.id)).toEqual(['custom_thermo_1']);
  });
});
