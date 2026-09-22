import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MockTestGeneratorService, GenerationProgress, reconcileAiAnswerKey } from './MockTestGeneratorService';
import { OfflineMockBank } from './OfflineMockBank';

// Mock Firebase Auth
vi.mock('@/firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('test_token_xyz')
    }
  }
}));

describe('OfflineMockBank', () => {
  it('returns valid seed questions for all 3 subjects and question types', () => {
    const physMcq = OfflineMockBank.getQuestionsForSubject('physics', 'MCQ');
    const physNum = OfflineMockBank.getQuestionsForSubject('physics', 'NUMERICAL');
    const chemMcq = OfflineMockBank.getQuestionsForSubject('chemistry', 'MCQ');
    const chemNum = OfflineMockBank.getQuestionsForSubject('chemistry', 'NUMERICAL');
    const mathMcq = OfflineMockBank.getQuestionsForSubject('maths', 'MCQ');
    const mathNum = OfflineMockBank.getQuestionsForSubject('maths', 'NUMERICAL');

    expect(physMcq.length).toBeGreaterThan(0);
    expect(physNum.length).toBeGreaterThan(0);
    expect(chemMcq.length).toBeGreaterThan(0);
    expect(chemNum.length).toBeGreaterThan(0);
    expect(mathMcq.length).toBeGreaterThan(0);
    expect(mathNum.length).toBeGreaterThan(0);
  });

  it('synthesizes an offline chapter mock with requested question count', () => {
    const mock = OfflineMockBank.synthesizeChapterMock('physics', 'Kinematics', 15);
    expect(mock.sections.length).toBe(1);
    expect(mock.sections[0].questions.length).toBe(15);
    expect(mock.durationMinutes).toBe(45);
    expect(mock.name).toContain('Kinematics');
  });

  it('synthesizes an offline subject mock (25 Qs = 20 MCQs + 5 Numericals)', () => {
    const mock = OfflineMockBank.synthesizeSubjectMock('maths', 25);
    expect(mock.sections.length).toBe(1);
    const questions = mock.sections[0].questions;
    // Bank has only 10 MCQs + 5 NUMs per subject; should cap at pool size, not duplicate
    expect(questions.length).toBeLessThanOrEqual(15);
    const mcqs = questions.filter(q => q.type === 'MCQ');
    const nums = questions.filter(q => q.type === 'NUMERICAL');
    expect(mcqs.length).toBeLessThanOrEqual(10);
    expect(nums.length).toBeLessThanOrEqual(5);
    expect(mock.durationMinutes).toBe(60);
  });

  it('synthesizes an offline full 75-question JEE Main test', () => {
    const mock = OfflineMockBank.synthesizeFullJeeMock(false);
    expect(mock.sections.length).toBe(3);
    expect(mock.sections.map(s => s.subject)).toEqual(['physics', 'chemistry', 'maths']);
    mock.sections.forEach(sec => {
      // Bank caps at pool size: max 10 MCQ + 5 NUM = 15 per subject
      expect(sec.questions.length).toBeLessThanOrEqual(15);
      expect(sec.questions.length).toBeGreaterThan(0);
    });
    expect(mock.durationMinutes).toBe(180);
  });

  it('synthesizes an offline express mini mock (30 Qs)', () => {
    const mock = OfflineMockBank.synthesizeFullJeeMock(true);
    expect(mock.sections.length).toBe(3);
    mock.sections.forEach(sec => {
      expect(sec.questions.length).toBe(10);
    });
    expect(mock.durationMinutes).toBe(60);
    expect(mock.totalMarks).toBe(120);
  });

  it('[CRIT-04] synthesizeSubjectMock produces zero duplicate questions when pool is smaller than requestedCount', () => {
    const mock = OfflineMockBank.synthesizeSubjectMock('physics', 25);
    const questions = mock.sections[0].questions;
    const contents = questions.map(q => q.content);
    const uniqueContents = new Set(contents);
    // Every question content must be unique (zero duplicate questions generated via modulo wrapping)
    expect(uniqueContents.size).toBe(questions.length);
  });

  it('[HIGH-05] all NUMERICAL questions in offline bank have 0 incorrect penalty', () => {
    const allQuestions = [
      ...OfflineMockBank.getQuestionsForSubject('physics', 'NUMERICAL'),
      ...OfflineMockBank.getQuestionsForSubject('chemistry', 'NUMERICAL'),
      ...OfflineMockBank.getQuestionsForSubject('maths', 'NUMERICAL')
    ];

    expect(allQuestions.length).toBeGreaterThan(0);
    allQuestions.forEach(q => {
      expect(q.type).toBe('NUMERICAL');
      expect(q.marks.incorrect).toBe(0);
      expect(q.marks.correct).toBe(4);
    });
  });
});

describe('MockTestGeneratorService (Multi-Batch Orchestrator)', () => {
  let globalFetchBackup: any;

  beforeEach(() => {
    globalFetchBackup = global.fetch;
  });

  afterEach(() => {
    global.fetch = globalFetchBackup;
    vi.restoreAllMocks();
  });

  it('generates a 10-question chapter mock with telemetry progress', async () => {
    const progressLog: GenerationProgress[] = [];

    // Mock API returning 10 questions
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        questions: Array.from({ length: 10 }, (_, i) => ({
          id: `test_q_${i}`,
          content: `Question ${i} regarding Rotational Motion`,
          options: ['Opt A', 'Opt B', 'Opt C', 'Opt D'],
          type: 'MCQ',
          correctAnswer: '0',
          difficulty: 'Medium',
          topic: 'Rotational Motion'
        }))
      })
    });

    const mock = await MockTestGeneratorService.generateChapterMock(
      {
        subject: 'physics',
        chapterId: 'chap_rot',
        chapterName: 'Rotational Motion',
        questionCount: 10
      },
      (p) => progressLog.push({ ...p })
    );

    expect(mock.sections.length).toBe(1);
    expect(mock.sections[0].questions.length).toBe(10);
    expect(mock.durationMinutes).toBe(30);
    expect(mock.name).toContain('Rotational Motion (10 Qs)');
    expect(progressLog.length).toBeGreaterThan(0);
    expect(progressLog[progressLog.length - 1].percent).toBe(100);
  });

  it('generates a 25-question chapter mock across 3 batches (10 + 10 + 5)', async () => {
    const fetchCalls: any[] = [];
    global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
      if (String(url).includes('reverify-question')) {
        return {
          ok: true,
          json: async () => ({
            correctAnswer: '2',
            correctOptionLetters: ['C'],
            explanation: 'Verified',
            confidence: 'high'
          })
        };
      }
      const body = JSON.parse(opts.body);
      fetchCalls.push(body);
      return {
        ok: true,
        json: async () => ({
          success: true,
          questions: Array.from({ length: body.count }, (_, i) => ({
            id: `batch_q_${body.questionType}_${i}`,
            content: `Batch question ${i}`,
            options: body.questionType === 'MCQ' ? ['A', 'B', 'C', 'D'] : [],
            type: body.questionType,
            correctAnswer: '42'
          }))
        })
      };
    });

    const mock = await MockTestGeneratorService.generateChapterMock({
      subject: 'chemistry',
      chapterId: 'chap_thermo',
      chapterName: 'Thermodynamics',
      questionCount: 25
    });

    expect(fetchCalls.length).toBe(3);
    expect(fetchCalls[0].count).toBe(10);
    expect(fetchCalls[0].questionType).toBe('MCQ');
    expect(fetchCalls[1].count).toBe(10);
    expect(fetchCalls[1].questionType).toBe('MCQ');
    expect(fetchCalls[2].count).toBe(5);
    expect(fetchCalls[2].questionType).toBe('NUMERICAL');

    expect(mock.sections[0].questions.length).toBe(25);
    expect(mock.durationMinutes).toBe(60);
  });

  it('generates a Subject Sprint mock (25 Qs: 20 MCQs + 5 Numericals) in 3 batches', async () => {
    const fetchCalls: any[] = [];
    global.fetch = vi.fn().mockImplementation(async (_url: string, opts: any) => {
      const body = JSON.parse(opts.body);
      fetchCalls.push(body);
      return {
        ok: true,
        json: async () => ({
          success: true,
          questions: Array.from({ length: body.count }, (_, i) => ({
            id: `subj_q_${i}`,
            content: `Subject question ${i}`,
            options: body.questionType === 'MCQ' ? ['A', 'B', 'C', 'D'] : [],
            type: body.questionType,
            correctAnswer: '1'
          }))
        })
      };
    });

    const mock = await MockTestGeneratorService.generateSubjectMock({
      subject: 'maths'
    });

    expect(fetchCalls.length).toBe(3);
    expect(mock.sections.length).toBe(1);
    expect(mock.sections[0].subject).toBe('maths');
    expect(mock.sections[0].questions.length).toBe(25);
    expect(mock.name).toContain('Maths Sprint Mock');
  });

  it('generates a Full JEE 75-question mock across 9 batches (3 subjects * 3 batches)', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
      if (String(url).includes('reverify-question')) {
        return {
          ok: true,
          json: async () => ({
            correctAnswer: '2',
            correctOptionLetters: ['C'],
            explanation: 'Verified',
            confidence: 'high'
          })
        };
      }
      callCount++;
      const body = JSON.parse(opts.body);
      return {
        ok: true,
        json: async () => ({
          success: true,
          questions: Array.from({ length: body.count }, (_, i) => ({
            id: `jee_q_${body.subject}_${i}`,
            content: `JEE question ${i}`,
            options: body.questionType === 'MCQ' ? ['A', 'B', 'C', 'D'] : [],
            type: body.questionType,
            correctAnswer: '0'
          }))
        })
      };
    });

    const progressUpdates: GenerationProgress[] = [];
    const mock = await MockTestGeneratorService.generateFullJeeMock(
      { difficulty: 'JEE_MAIN' },
      p => progressUpdates.push({ ...p })
    );

    expect(callCount).toBe(9); // 3 subjects * 3 batches
    expect(mock.sections.length).toBe(3);
    expect(mock.sections.map(s => s.subject)).toEqual(['physics', 'chemistry', 'maths']);
    expect(mock.sections.reduce((sum, s) => sum + s.questions.length, 0)).toBe(75);
    expect(mock.durationMinutes).toBe(180);
    expect(mock.totalMarks).toBe(300);
    expect(progressUpdates[progressUpdates.length - 1].percent).toBe(100);
  });

  it('generates an Express Mini Mock (30 Qs: 10 per subject) in 3 batches', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async (_url: string, opts: any) => {
      callCount++;
      const body = JSON.parse(opts.body);
      return {
        ok: true,
        json: async () => ({
          success: true,
          questions: Array.from({ length: body.count }, (_, i) => ({
            id: `mini_q_${body.subject}_${i}`,
            content: `Mini question ${i}`,
            options: ['A', 'B', 'C', 'D'],
            type: 'MCQ',
            correctAnswer: '0'
          }))
        })
      };
    });

    const mock = await MockTestGeneratorService.generateExpressMiniMock();
    expect(callCount).toBe(3);
    expect(mock.sections.length).toBe(3);
    expect(mock.sections.reduce((sum, s) => sum + s.questions.length, 0)).toBe(30);
    expect(mock.durationMinutes).toBe(60);
  });

  it('gracefully falls back to OfflineMockBank if API returns an error or is offline', async () => {
    // Simulate non-retryable error (400 Bad Request skips retry logic)
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Bad Request' })
    });

    const mock = await MockTestGeneratorService.generateSubjectMock({
      subject: 'physics'
    });

    expect(mock.sections.length).toBe(1);
    // generateSubjectMock assembles 3 batches totaling 25 questions
    expect(mock.sections[0].questions.length).toBe(25);
    expect(mock.sections[0].questions.length).toBeGreaterThan(0);
    expect(mock.sections[0].questions[0].content).toBeDefined();
    // Verify fallback delivered valid questions
    expect(mock.sections[0].questions.some(q => q.type === 'MCQ')).toBe(true);
    expect(mock.sections[0].questions.some(q => q.type === 'NUMERICAL')).toBe(true);
  });

  it('aborts cleanly when AbortSignal is triggered', async () => {
    const controller = new AbortController();
    global.fetch = vi.fn().mockImplementation(async (_url: string, opts: any) => {
      if (opts.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      return {
        ok: true,
        json: async () => ({ success: true, questions: [] })
      };
    });

    controller.abort();

    await expect(
      MockTestGeneratorService.generateChapterMock(
        {
          subject: 'physics',
          chapterId: 'c1',
          chapterName: 'Kinematics',
          questionCount: 10
        },
        undefined,
        controller.signal
      )
    ).rejects.toThrow();
  });

  describe('HIGH-03: reconcileAiAnswerKey Validator', () => {
    it('overrides hallucinated correctOptionIds with authoritative derivation conclusion', () => {
      const q = {
        solution: {
          correctOptionIds: ['A'], // Hallucinated declared key
          text: 'After evaluating the kinetic energy, we find $K = 25\\text{ J}$. Hence, Option (C) is the correct answer.'
        }
      };

      const reconciled = reconcileAiAnswerKey(q, 'MCQ');
      // 'C' corresponds to index '2'
      expect(reconciled).toBe('2');
    });

    it('preserves declared key when derivation conclusion matches', () => {
      const q = {
        solution: {
          correctOptionIds: ['B'],
          text: 'Using conservation of angular momentum, $I_1\\omega_1 = I_2\\omega_2$. Therefore, the correct option is (B).'
        }
      };

      const reconciled = reconcileAiAnswerKey(q, 'MCQ');
      expect(reconciled).toBe('1');
    });

    it('extracts key from "Ans: (D)" pattern when correctOptionIds is missing', () => {
      const q = {
        solution: {
          text: 'Applying Lenz’s law, induced current opposes the flux change. Ans: (D)'
        }
      };

      const reconciled = reconcileAiAnswerKey(q, 'MCQ');
      expect(reconciled).toBe('3');
    });

    it('sanitizes numerical answer containing trailing units', () => {
      const q = {
        correctAnswer: '42.5 m/s'
      };

      const reconciled = reconcileAiAnswerKey(q, 'NUMERICAL');
      expect(reconciled).toBe('42.5');
    });

    it('extracts missing numerical answer from derivation conclusion', () => {
      const q = {
        correctAnswer: '',
        solution: {
          text: 'Substituting $T = 300\\text{ K}$, we get $P = 15$. Hence, the correct value is 15.'
        }
      };

      const reconciled = reconcileAiAnswerKey(q, 'NUMERICAL');
      expect(reconciled).toBe('15');
    });

    it('NEVER cycles or decrements 0-based option indices upon repeated calls (prevents cycling bug)', () => {
      // Test Option C (index 2) without explicit derivation conclusion
      const qC = { correctAnswer: '2', explanation: 'General explanation without a single conclusion pattern' };
      const rC1 = reconcileAiAnswerKey(qC, 'MCQ', '2');
      expect(rC1).toBe('2'); // Must remain 2, NOT decrement to 1
      const rC2 = reconcileAiAnswerKey({ ...qC, correctAnswer: rC1 }, 'MCQ', rC1);
      expect(rC2).toBe('2'); // Must remain 2 on second call
      const rC3 = reconcileAiAnswerKey({ ...qC, correctAnswer: rC2 }, 'MCQ', rC2);
      expect(rC3).toBe('2'); // Must remain 2 on third call

      // Test Option B (index 1)
      const qB = { correctAnswer: '1', explanation: '' };
      const rB1 = reconcileAiAnswerKey(qB, 'MCQ', '1');
      expect(rB1).toBe('1'); // Must remain 1, NOT decrement to 0
      const rB2 = reconcileAiAnswerKey({ ...qB, correctAnswer: rB1 }, 'MCQ', rB1);
      expect(rB2).toBe('1');

      // Test Option D (index 3)
      const qD = { correctAnswer: '3', explanation: '' };
      const rD1 = reconcileAiAnswerKey(qD, 'MCQ', '3');
      expect(rD1).toBe('3');
      const rD2 = reconcileAiAnswerKey({ ...qD, correctAnswer: rD1 }, 'MCQ', rD1);
      expect(rD2).toBe('3');
    });

    it('prioritizes final Conclusion over intermediate option discussions', () => {
      const q = {
        correctAnswer: '0',
        explanation: `
Option (A) is incorrect because the bond order is not 2.
Option (B) is incorrect because there are no unpaired electrons.
Option (D) is incorrect due to steric hindrance.

**Conclusion & Correct Option**
Therefore, Option (C) is the correct answer.
`
      };

      const reconciled = reconcileAiAnswerKey(q, 'MCQ');
      // Must correctly pick C ('2') and NOT be fooled by Option (A) at the top
      expect(reconciled).toBe('2');
    });
  });

  describe('MED-07: Balanced Difficulty Distribution Curve', () => {
    it('distributes batches across foundational, application, and numerical rigor in generateSubjectMock', async () => {
      const fetchCalls: any[] = [];
      global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
        if (String(url).includes('reverify-question')) {
          return {
            ok: true,
            json: async () => ({
              correctAnswer: '2',
              correctOptionLetters: ['C'],
              explanation: 'Verified',
              confidence: 'high'
            })
          };
        }
        const body = JSON.parse(opts.body);
        fetchCalls.push(body);
        return {
          ok: true,
          json: async () => ({
            success: true,
            questions: Array.from({ length: body.count }, (_, i) => ({
              id: `q_${i}`,
              content: `Q ${i}`,
              options: ['A', 'B', 'C', 'D'],
              type: body.questionType,
              correctAnswer: '0'
            }))
          })
        };
      });

      await MockTestGeneratorService.generateSubjectMock({
        subject: 'physics'
      });

      expect(fetchCalls.length).toBe(3);
      // Batch 1: Foundational / Standard
      expect(fetchCalls[0].difficulty).toContain('Foundational');
      // Batch 2: Application / Moderate
      expect(fetchCalls[1].difficulty).toContain('Application');
      // Batch 3: Calculative / Numerical Rigor
      expect(fetchCalls[2].difficulty).toContain('Numerical Rigor');
    });
  });
});
