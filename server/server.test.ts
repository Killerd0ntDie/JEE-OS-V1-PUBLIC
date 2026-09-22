// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'node:http';
import { AddressInfo } from 'node:net';

// Mock Firebase Admin Auth
vi.mock('./firebaseAdmin.js', () => ({
  verifyAuth: vi.fn((req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
    }
    const token = authHeader.split('Bearer ')[1];
    if (token === 'invalid-token') {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    req.user = { uid: 'test-student-uid', email: 'student@example.com' };
    next();
  }),
  adminAuth: {
    verifyIdToken: vi.fn()
  },
  adminDb: null
}));

// Mock @google/genai
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => {
  class MockGoogleGenAI {
    models = {
      generateContent: mockGenerateContent
    };
  }
  return {
    GoogleGenAI: MockGoogleGenAI,
    Type: {
      OBJECT: 'OBJECT',
      ARRAY: 'ARRAY',
      STRING: 'STRING',
      NUMBER: 'NUMBER',
      BOOLEAN: 'BOOLEAN'
    }
  };
});

// Import createServerApp after mocks
import { createServerApp } from '../server';

describe('TEST-01: Express Server API Routes & Gemini AI Integration', () => {
  let server: http.Server;
  let baseUrl: string;
  const validAuthHeader = { Authorization: 'Bearer valid-jwt-token' };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.GEMINI_API_KEY = 'mock-test-gemini-key';

    const app = await createServerApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'mock-test-gemini-key';
  });

  describe('1. Health Check Endpoint (Uptime Monitors)', () => {
    it('GET /api/health returns 200 OK with timestamp and status', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('ok');
      expect(typeof data.timestamp).toBe('string');
      expect(new Date(data.timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('2. Authentication & Authorization Enforcement', () => {
    it('POST /api/coach/analyze rejects unauthenticated requests with 401', async () => {
      const res = await fetch(`${baseUrl}/api/coach/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'How do I revise Rotational Motion?' })
      });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Unauthorized');
    });

    it('POST /api/coach/analyze rejects invalid bearer tokens with 401', async () => {
      const res = await fetch(`${baseUrl}/api/coach/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid-token'
        },
        body: JSON.stringify({ question: 'Test question' })
      });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Invalid token');
    });

    it('POST /api/practice/generate rejects unauthenticated requests with 401', async () => {
      const res = await fetch(`${baseUrl}/api/practice/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId: 'p-1', subject: 'physics' })
      });
      expect(res.status).toBe(401);
    });

    it('POST /api/mocktest/generate rejects unauthenticated requests with 401', async () => {
      const res = await fetch(`${baseUrl}/api/mocktest/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId: 'p-1', subject: 'physics' })
      });
      expect(res.status).toBe(401);
    });

    it('POST /api/planner/generate-plan rejects unauthenticated requests with 401', async () => {
      const res = await fetch(`${baseUrl}/api/planner/generate-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 3 })
      });
      expect(res.status).toBe(401);
    });

    it('POST /api/mocktest/parse-scorecard rejects unauthenticated requests with 401', async () => {
      const res = await fetch(`${baseUrl}/api/mocktest/parse-scorecard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: 'Q1: Physics Mechanics - Answer A, Correct B' })
      });
      expect(res.status).toBe(401);
    });
  });

  describe('3. Zod Schema Validation & Input Hardening', () => {
    it('POST /api/practice/generate returns 400 on missing required fields', async () => {
      const res = await fetch(`${baseUrl}/api/practice/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...validAuthHeader
        },
        body: JSON.stringify({ count: 5 }) // Missing chapterId and subject
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid request payload');
      expect(data.details).toBeDefined();
    });

    it('POST /api/mocktest/generate returns 400 on missing chapterId or subject', async () => {
      const res = await fetch(`${baseUrl}/api/mocktest/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...validAuthHeader
        },
        body: JSON.stringify({}) // Missing fields
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid request payload');
    });

    it('POST /api/coach/analyze returns 400 on invalid data types in schema', async () => {
      const res = await fetch(`${baseUrl}/api/coach/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...validAuthHeader
        },
        body: JSON.stringify({ remainingDays: 'not-a-number' }) // Must be number
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid request payload');
    });

    it('POST /api/mocktest/parse-scorecard returns 400 on missing or too short rawText', async () => {
      const res = await fetch(`${baseUrl}/api/mocktest/parse-scorecard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...validAuthHeader
        },
        body: JSON.stringify({ rawText: 'short' })
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid request payload');
    });
  });

  describe('4. AI Coach Endpoint (/api/coach/analyze)', () => {
    it('returns 503 if GEMINI_API_KEY is not configured', async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GROQ_API_KEY;

      const res = await fetch(`${baseUrl}/api/coach/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...validAuthHeader
        },
        body: JSON.stringify({ question: 'How is my pace?' })
      });

      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.error).toBe('AI service is currently unavailable.');
    });

    it('generates coach analysis with structured output and actions', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          analysis: 'You are on track with Mechanics. Focus on DPP completion for Rotational Motion.',
          actions: [
            { type: 'ADD_MISSION', payload: { subject: 'physics', title: 'Rotational Motion DPP', duration: 45 } }
          ]
        })
      });

      const res = await fetch(`${baseUrl}/api/coach/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...validAuthHeader
        },
        body: JSON.stringify({
          question: 'What should I prioritize today?',
          targetCollege: 'IIT Bombay',
          targetYear: '2027',
          remainingDays: 180
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.analysis).toContain('You are on track');
      expect(data.actions).toHaveLength(1);
      expect(data.actions[0].type).toBe('ADD_MISSION');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('caches coach analysis for identical requests and returns cached flag', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          analysis: 'Cached response analysis text.',
          actions: []
        })
      });

      const payload = {
        question: 'What is my plan for today?',
        targetCollege: 'IIT Delhi',
        targetYear: '2026',
        remainingDays: 95
      };

      // First call (cache miss)
      const res1 = await fetch(`${baseUrl}/api/coach/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...validAuthHeader },
        body: JSON.stringify(payload)
      });
      expect(res1.status).toBe(200);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);

      // Second call (cache hit)
      const res2 = await fetch(`${baseUrl}/api/coach/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...validAuthHeader },
        body: JSON.stringify(payload)
      });
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.cached).toBe(true);
      expect(data2.analysis).toBe('Cached response analysis text.');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1); // Gemini NOT called again
    });
  });

  describe('5. Practice Question Generator (/api/practice/generate)', () => {
    it('successfully generates practice questions using Gemini', async () => {
      const mockQuestions = [
        {
          topic: 'Rotational Dynamics',
          type: 'MCQ_SINGLE',
          difficulty: 'JEE Advanced',
          content: 'A uniform disk of mass $M$ and radius $R$ rolls without slipping...',
          options: [
            { id: 'A', text: '$\\frac{1}{2} M R^2$' },
            { id: 'B', text: '$\\frac{3}{4} M R^2$' },
            { id: 'C', text: '$M R^2$' },
            { id: 'D', text: '$\\frac{2}{3} M R^2$' }
          ],
          solution: {
            text: 'Using conservation of energy and torque about the instantaneous axis of rotation...',
            correctOptionIds: ['B']
          }
        }
      ];

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockQuestions)
      });

      const res = await fetch(`${baseUrl}/api/practice/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...validAuthHeader
        },
        body: JSON.stringify({
          chapterId: 'physics-rotational-motion',
          subject: 'physics',
          count: 1
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.questions).toHaveLength(1);
      expect(data.questions[0].topic).toBe('Rotational Dynamics');
      expect(data.questions[0].solution.correctOptionIds).toEqual(['B']);
    });

    it('masks internal server errors and returns clean 500 JSON without leaking stack trace', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('Internal Gemini RPC connection reset failure'));

      const res = await fetch(`${baseUrl}/api/practice/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...validAuthHeader
        },
        body: JSON.stringify({
          chapterId: 'err-test-chap',
          subject: 'chemistry',
          count: 3
        })
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Internal server error during practice generation');
      expect(data.stack).toBeUndefined();
    });
  });

  describe('6. Gemini Overload Fallback (gemini-3.8-flash -> gemini-3.5-flash)', () => {
    it('automatically falls back to next candidate model when primary returns 429 / high demand', async () => {
      const overloadError = new Error('Model is overloaded with high demand');
      (overloadError as any).status = 429;

      // First call (gemini-3.8-flash) fails with 429
      mockGenerateContent.mockRejectedValueOnce(overloadError);

      // Second call (gemini-3.5-flash fallback) succeeds
      const fallbackQuestions = [
        {
          topic: 'Electrostatics',
          type: 'MCQ_SINGLE',
          difficulty: 'JEE_MAIN',
          content: 'Find electric field at distance $r$ from an infinite line charge...',
          options: [
            { id: 'A', text: '$\\frac{\\lambda}{2\\pi \\epsilon_0 r}$' },
            { id: 'B', text: '$\\frac{\\lambda}{4\\pi \\epsilon_0 r^2}$' },
            { id: 'C', text: 'Zero' },
            { id: 'D', text: '$\\frac{\\lambda r}{\\epsilon_0}$' }
          ],
          solution: {
            text: 'By Gauss law, flux through cylinder is $E \\cdot 2\\pi r L = \\frac{\\lambda L}{\\epsilon_0}$.',
            correctOptionIds: ['A']
          }
        }
      ];

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(fallbackQuestions)
      });

      const res = await fetch(`${baseUrl}/api/mocktest/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...validAuthHeader
        },
        body: JSON.stringify({
          chapterId: 'p-electrostatics',
          chapterName: 'Electrostatics',
          subject: 'physics',
          count: 1
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.questions).toHaveLength(1);
      expect(data.questions[0].topic).toBe('Electrostatics');

      // Verify two attempts were made: first with 3.8-flash, second with 3.5-flash
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(mockGenerateContent.mock.calls[0][0].model).toBe('gemini-3.8-flash');
      expect(mockGenerateContent.mock.calls[1][0].model).toBe('gemini-3.5-flash');
    });

    it('route alias /api/generate-chapter-mock works identically', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify([{ topic: 'Thermodynamics', type: 'MCQ_SINGLE', difficulty: 'JEE_MAIN', content: 'Q1', options: [], solution: { text: 'Sol', correctOptionIds: [] } }])
      });

      const res = await fetch(`${baseUrl}/api/generate-chapter-mock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...validAuthHeader
        },
        body: JSON.stringify({
          chapterId: 'chem-thermo',
          subject: 'chemistry'
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.questions).toBeDefined();
    });
  });

  describe('7. AI Revision Plan Generator (/api/planner/generate-plan)', () => {
    it('generates multi-day revision plan sprint with valid structure', async () => {
      const mockPlan = {
        summary: '3-day targeted recovery sprint focusing on Mechanics bottlenecks and Organic Chemistry retention.',
        days: [
          {
            dayNumber: 1,
            title: 'Mechanics Mastery',
            focusSubject: 'physics',
            tasks: [
              {
                title: 'Solve Rotational Motion PYQs',
                subject: 'physics',
                chapter: 'Rotational Motion',
                type: 'Solve PYQs',
                durationMinutes: 90,
                priority: 'High'
              }
            ]
          }
        ]
      };

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockPlan)
      });

      const res = await fetch(`${baseUrl}/api/planner/generate-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...validAuthHeader
        },
        body: JSON.stringify({
          days: 3,
          dailyAvailableHours: 6,
          bottlenecks: ['Rotational Motion'],
          lowRetentionChapters: ['Chemical Bonding'],
          targetCollege: 'IIT Bombay',
          targetYear: '2027'
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.plan).toBeDefined();
      expect(data.plan.summary).toContain('3-day targeted recovery sprint');
      expect(data.plan.days[0].focusSubject).toBe('physics');
    });
  });

  describe('8. AI Scorecard Parser Endpoint (/api/mocktest/parse-scorecard)', () => {
    it('returns 503 if GEMINI_API_KEY is not configured', async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GROQ_API_KEY;

      const res = await fetch(`${baseUrl}/api/mocktest/parse-scorecard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...validAuthHeader
        },
        body: JSON.stringify({ rawText: 'Q1: Physics - Student Answer: A, Correct Answer: B' })
      });

      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.error).toBe('AI service is currently unavailable.');
    });

    it('successfully parses scorecard text and extracts score, counts, and mistakes', async () => {
      const mockResult = {
        totalQuestions: 75,
        attempted: 60,
        correct: 45,
        incorrect: 15,
        score: 165,
        mistakes: [
          {
            questionNumber: 12,
            subject: 'Physics',
            topic: 'Rotational Dynamics',
            studentAnswer: 'A',
            correctAnswer: 'C',
            reasoning: 'Moment of inertia of solid sphere was miscalculated as 2/3 instead of 2/5.'
          }
        ]
      };

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockResult)
      });

      const res = await fetch(`${baseUrl}/api/mocktest/parse-scorecard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...validAuthHeader
        },
        body: JSON.stringify({
          rawText: 'Scorecard Report: Question 12 Physics Rotational Dynamics. Student chose A, Correct was C.'
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.score).toBe(165);
      expect(data.totalQuestions).toBe(75);
      expect(data.mistakes).toHaveLength(1);
      expect(data.mistakes[0].topic).toBe('Rotational Dynamics');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('caches scorecard parsing for identical requests', async () => {
      const mockResult = {
        totalQuestions: 25,
        attempted: 20,
        correct: 18,
        incorrect: 2,
        score: 70,
        mistakes: []
      };

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockResult)
      });

      const payload = {
        rawText: 'Complete test scorecard text that will be tested for deterministic caching behavior.'
      };

      const res1 = await fetch(`${baseUrl}/api/mocktest/parse-scorecard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...validAuthHeader },
        body: JSON.stringify(payload)
      });
      expect(res1.status).toBe(200);

      const res2 = await fetch(`${baseUrl}/api/mocktest/parse-scorecard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...validAuthHeader },
        body: JSON.stringify(payload)
      });
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.cached).toBe(true);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('9. AI Solution Generator Endpoint (/api/mocktest/generate-explanation)', () => {
    it('POST /api/mocktest/generate-explanation generates structured step-by-step derivation', async () => {
      const mockDerivation = `**Key Concept & Formula**
Electronic configuration and Hund's rule.

**Step 1**
Determine electronic configuration of O2.

**Step 2**
Add electron to pi* antibonding orbital.

**Conclusion & Correct Option**
Electron enters \\pi^* 2p_x or \\pi^* 2p_y orbital. Correct option is C.`;

      mockGenerateContent.mockResolvedValueOnce({
        text: mockDerivation
      });

      const payload = {
        questionContent: 'During change of O 2 to O 2 • ion, the electron adds in which one of the following orbitals?',
        options: ['\\sigma * 2p_z', '\\sigma 2p_z', '\\pi * 2p_x / \\pi * 2p_y', '\\pi 2p_x'],
        correctAnswer: 'C',
        subject: 'chemistry',
        topic: 'Chemical Bonding'
      };

      const res = await fetch(`${baseUrl}/api/mocktest/generate-explanation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...validAuthHeader },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.explanation).toBeDefined();
      expect(data.explanation).toContain('Key Concept');
      expect(data.explanation).toContain('Step 1');
      expect(data.explanation).toContain('Conclusion');
    });
  });

  describe('10. Two-Stage AI Mock Test & PYQ Paper Parser (/api/mocktest/parse-pyq-paper)', () => {
    it('executes Stage 1 (Fast Skeleton) and Stage 2 (Deep Content) successfully', async () => {
      // Mock Stage 1 Response (Skeleton)
      const mockStage1Skeleton = {
        title: 'JEE Advanced 2025 Physics DPP',
        skeleton: [
          {
            qIndex: 1,
            localQuestionNumber: 1,
            sectionName: 'PART - I',
            subject: 'physics',
            type: 'MCQ',
            hasDiagram: true,
            diagramPage: 1,
            diagramDescription: 'Circuit diagram with 4 resistors and an inductor',
            rawSnippet: 'In the given circuit, the switch is closed at t = 0...'
          }
        ]
      };

      // Mock Stage 2 Response (Deep Content & Solutions)
      const mockStage2Questions = {
        title: 'JEE Advanced 2025 Physics DPP',
        questions: [
          {
            topic: 'Electromagnetic Induction',
            subject: 'physics',
            type: 'MCQ',
            difficulty: 'Hard',
            content: 'In the given circuit, the switch is closed at $t = 0$. Find current through the inductor.',
            hasDiagram: true,
            diagramPage: 1,
            diagramDescription: 'Circuit diagram with 4 resistors and an inductor',
            localQuestionNumber: 1,
            sectionName: 'PART - I',
            options: [
              { id: 'A', text: '$I_0 (1 - e^{-t/\\tau})$' },
              { id: 'B', text: '$I_0 e^{-t/\\tau}$' },
              { id: 'C', text: '$2 I_0$' },
              { id: 'D', text: 'Zero' }
            ],
            correctAnswer: 'A',
            solution: {
              text: '**Key Concept & Formula**: RL circuit transient analysis with $\\tau = L/R$.\n\n**Step 1**: Write Kirchhoff loop rule.\n\n**Conclusion & Correct Option**: Current rises exponentially. Option A.'
            }
          }
        ]
      };

      // Two calls to Gemini: Stage 1 then Stage 2
      mockGenerateContent
        .mockResolvedValueOnce({ text: JSON.stringify(mockStage1Skeleton) })
        .mockResolvedValueOnce({ text: JSON.stringify(mockStage2Questions) });

      const res = await fetch(`${baseUrl}/api/mocktest/parse-pyq-paper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...validAuthHeader },
        body: JSON.stringify({
          rawText: 'Q1. In the given circuit, the switch is closed at t = 0...\n(A) I_0 (1 - e^{-t/\\tau})\n(B) I_0 e^{-t/\\tau}\nANSWER KEY:\n1. A',
          paperTitle: 'JEE Advanced 2025 Physics DPP',
          targetSubject: 'physics'
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.questions).toHaveLength(1);
      expect(data.questions[0].hasDiagram).toBe(true);
      expect(data.questions[0].diagramDescription).toBe('Circuit diagram with 4 resistors and an inductor');
      expect(data.questions[0].diagramBbox).toBeUndefined(); // Verify hallucinated diagramBbox is removed!
      expect(data.questions[0].correctAnswer).toBe('A');
      expect(mockGenerateContent).toHaveBeenCalledTimes(2); // Stage 1 + Stage 2
    });

    it('falls back gracefully to deep generation when Stage 1 fails or returns empty', async () => {
      // Stage 1 throws or returns error
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Stage 1 token limit or fast timeout'))
        .mockResolvedValueOnce({
          text: JSON.stringify({
            title: 'Fallback Paper',
            questions: [
              {
                topic: 'Chemical Bonding',
                subject: 'chemistry',
                type: 'MCQ',
                difficulty: 'Medium',
                content: 'Which of the following molecules has zero dipole moment?',
                hasDiagram: false,
                options: [
                  { id: 'A', text: '$\\text{BF}_3$' },
                  { id: 'B', text: '$\\text{NF}_3$' },
                  { id: 'C', text: '$\\text{NH}_3$' },
                  { id: 'D', text: '$\\text{H}_2\\text{O}$' }
                ],
                correctAnswer: 'A',
                solution: {
                  text: '**Key Concept & Formula**: Vector sum of bond dipoles.\n\n**Step 1**: Trigonal planar geometry leads to net zero dipole.\n\n**Conclusion & Correct Option**: Option A.'
                }
              }
            ]
          })
        });

      const res = await fetch(`${baseUrl}/api/mocktest/parse-pyq-paper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...validAuthHeader },
        body: JSON.stringify({
          rawText: 'Q1. Which of the following molecules has zero dipole moment?\n(A) BF3 (B) NF3 (C) NH3 (D) H2O'
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.questions).toHaveLength(1);
      expect(data.questions[0].content).toContain('zero dipole moment');
      expect(data.questions[0].options[0].text).toContain('\\text{BF}_3');
      expect(data.questions[0].hasDiagram).toBe(false);
    });
  });

  describe('11. DPP Metadata Analyzer (/api/mocktest/analyze-dpp-metadata)', () => {
    it('analyzes DPP sheet and extracts structured metadata', async () => {
      const mockDppMeta = {
        title: 'Allen Chemistry DPP - Chemical Bonding',
        sheetName: 'DPP #03',
        subject: 'chemistry',
        chapterName: 'Chemical Bonding',
        recommendedDurationMinutes: 45,
        questionCountEstimate: 20,
        detectedInstitute: 'Allen'
      };

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockDppMeta)
      });

      const res = await fetch(`${baseUrl}/api/mocktest/analyze-dpp-metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: 'ALLEN CAREER INSTITUTE\nDaily Practice Problem (DPP)\nCourse: JEE (Advanced)\nTopic: Chemical Bonding\nDPP No. 03',
          fileName: 'Allen_DPP_03_Chemical_Bonding.pdf',
          chapterNames: ['Chemical Bonding', 'Atomic Structure', 'Thermodynamics']
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.subject).toBe('chemistry');
      expect(data.chapterName).toBe('Chemical Bonding');
      expect(data.detectedInstitute).toBe('Allen');
      expect(data.recommendedDurationMinutes).toBe(45);
      expect(mockGenerateContent).toHaveBeenLastCalledWith(expect.objectContaining({ model: 'gemini-3.5-flash-lite' }));
    });
  });

  describe('12. AI Single-Question Re-verification Endpoint (/api/mocktest/reverify-question)', () => {
    it('POST /api/mocktest/reverify-question rigorously solves MCQ and returns normalized 0-based key', async () => {
      const mockReverifyResponse = {
        correctAnswer: '2', // Option C
        correctOptionLetters: ['C'],
        explanation: '**Key Concept & Formula**\nResonance...\n\n**Step 1: Analysis & Derivation**\nDetailed calculation...\n\n**Step 2: Option Verification**\n(A) is false, (B) is false, (C) is true, (D) is false.\n\n**Conclusion & Correct Option**\nHence, Option (C) is correct.',
        confidence: 'high',
        keyCorrectionMade: true
      };

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockReverifyResponse)
      });

      const payload = {
        questionContent: 'Which of the following has identical bond lengths?',
        options: ['CO3^2-', 'SO4^2-', 'Both A and B', 'None of these'],
        questionType: 'MCQ',
        currentAnswer: '0', // Previous incorrect answer
        subject: 'chemistry',
        topic: 'Chemical Bonding'
      };

      const res = await fetch(`${baseUrl}/api/mocktest/reverify-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...validAuthHeader },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.correctAnswer).toBe('2');
      expect(data.correctOptionLetters).toEqual(['C']);
      expect(data.explanation).toContain('Key Concept');
      expect(data.confidence).toBe('high');
      expect(data.keyCorrectionMade).toBe(true);
    });

    it('POST /api/mocktest/reverify-question handles MULTI type questions', async () => {
      const mockReverifyResponse = {
        correctAnswer: 'ACD',
        correctOptionLetters: ['A', 'C', 'D'],
        explanation: 'Statements A, C, and D are correct.',
        confidence: 'high',
        keyCorrectionMade: false
      };

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockReverifyResponse)
      });

      const payload = {
        questionContent: 'Select all correct statements regarding BF3.',
        options: ['It is planar', 'It is polar', 'It acts as Lewis acid', 'B is sp2 hybridized'],
        questionType: 'MULTI',
        currentAnswer: 'ACD',
        subject: 'chemistry',
        topic: 'Chemical Bonding'
      };

      const res = await fetch(`${baseUrl}/api/mocktest/reverify-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...validAuthHeader },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.correctAnswer).toBe('ACD');
      expect(data.correctOptionLetters).toEqual(['A', 'C', 'D']);
      expect(data.keyCorrectionMade).toBe(false);
    });

    it('returns 400 Bad Request when questionContent is missing', async () => {
      const res = await fetch(`${baseUrl}/api/mocktest/reverify-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...validAuthHeader },
        body: JSON.stringify({
          options: ['A', 'B']
        })
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid payload');
    });

    it('POST /api/mocktest/parse-page-vision parses page image and sanitizes questions without ReferenceError', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          questions: [
            {
              content: 'A particle moves along path ABCD as shown in the figure.',
              options: ['10 m', '5 root 2 m', '9 m', '7 root 2 m'],
              correctAnswer: 'B',
              type: 'MCQ'
            }
          ]
        })
      });

      const res = await fetch(`${baseUrl}/api/mocktest/parse-page-vision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...validAuthHeader },
        body: JSON.stringify({
          pageImages: [
            {
              pageNumber: 1,
              imageBase64: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAkA4JaQAA3AA/vuUAAA='
            }
          ],
          paperTitle: 'Rectilinear Motion DPP #1',
          targetSubject: 'physics'
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.questions)).toBe(true);
      expect(data.questions.length).toBe(1);
      expect(data.questions[0].pageNumber).toBe(1);
      expect(data.questions[0].content).toContain('A particle moves along path ABCD');
    });
  });
});
