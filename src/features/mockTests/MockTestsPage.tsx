import React, { useState, useEffect, useRef, useMemo, useContext } from 'react';
import { useLocation, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Clock, Target, ChevronRight, FileText, Award, Plus, 
  Loader2, X, Sparkles, Search, CheckCircle2, XCircle, ArrowRight, ArrowLeft,
  BarChart3, Layers, BookOpen, AlertTriangle, RotateCcw, FileUp, Trash2, Printer,
  Trophy, Zap, Calendar, Atom, FlaskConical, Calculator, History, Check, GraduationCap
} from 'lucide-react';
import { MockTest, MockTestAttempt, MockQuestion, QuestionType } from '../../types/mockTest';
import { MockTestArena } from './MockTestArena';
import { MockTestGeneratorStudio } from './components/MockTestGeneratorStudio';
import { MockGeneratorMode } from './services/MockTestGeneratorService';
import { UploadPyqPaperModal } from './components/UploadPyqPaperModal';
import { UploadDppModal } from './components/UploadDppModal';
import { PrintableTestPaperModal } from './components/PrintableTestPaperModal';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { MockTestCard } from './components/MockTestCard';
import { ExamBriefingModal } from './components/ExamBriefingModal';
import { MockTestEvaluatingScreen } from './components/MockTestEvaluatingScreen';
import { AuthContext } from '@/features/auth';
import { v4 as uuidv4 } from 'uuid';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { getSubjectTheme } from '@/constants/subjectTheme';
import { MockResult, SubjectId, Chapter } from '../../types/index';
import { InlineMath } from 'react-katex';
import { springs } from '@/constants/motion';
import { evaluateMockAttempt } from '@/utils/mockScoring';
import { INITIAL_CHAPTERS } from '@/constants/initialSeeds';
import { mockTest1 } from '@/data/mockTests/jeeMain2024Shift1';

export type MockTestEngineState = 'LANDING' | 'ARENA' | 'EVALUATING';
export type MockTabMode = 'available' | 'history';
export type MockCategoryShelf = 'all' | 'grand' | 'sprint' | 'dpp';
export type MockNavCategory = 'full_tests' | 'pyq' | 'physics' | 'chemistry' | 'maths' | 'history';

// Categorization helper for test organization
export function getMockTestCategory(test: MockTest): 'grand' | 'sprint' | 'dpp' {
  if (test.category) {
    if (test.category === 'grand' || test.category === 'pyq') return 'grand';
    if (test.category === 'dpp' || test.category === 'chapter') return 'dpp';
    if (test.category === 'sprint') return 'sprint';
  }

  if (test.source === 'dpp' || test.chapterId || test.chapterName) {
    return 'dpp';
  }

  const totalQuestions = test.sections.reduce((acc, s) => acc + s.questions.length, 0);
  const nameLower = (test.name || '').toLowerCase();
  
  // Check if test spans multiple distinct subjects (true multi-subject grand full test)
  const distinctSubjects = new Set(test.sections.map(s => s.subject));
  const isMultiSubject = distinctSubjects.size > 1;

  if (
    isMultiSubject ||
    (totalQuestions >= 70 && test.durationMinutes >= 150) || 
    (test.totalMarks >= 250) ||
    nameLower.includes('grand') || 
    nameLower.includes('all-india') ||
    (nameLower.includes('full') && (isMultiSubject || totalQuestions >= 60)) || 
    (nameLower.includes('shift') && isMultiSubject)
  ) {
    return 'grand';
  }

  if (
    nameLower.includes('dpp') || 
    nameLower.includes('daily') || 
    nameLower.includes('worksheet') || 
    nameLower.includes('chapter') || 
    nameLower.includes('drill') || 
    totalQuestions <= 20
  ) {
    return 'dpp';
  }

  return 'sprint';
}

// Check if a test belongs to a specific chapter (Strictly excludes Grand Full Tests)
export function isTestForChapter(test: MockTest, chapterName: string, subject?: SubjectId, chapterId?: string): boolean {
  if (!chapterName) return false;
  
  // Direct chapterId match
  if (chapterId && test.chapterId && test.chapterId === chapterId) {
    return true;
  }

  // True multi-subject grand full tests are full exam simulations, NOT chapter tests
  const distinctSubjects = new Set(test.sections.map(s => s.subject));
  if (distinctSubjects.size > 1) {
    return false;
  }

  const cat = getMockTestCategory(test);
  if (cat === 'grand') {
    return false;
  }

  const target = chapterName.toLowerCase().trim();
  const testName = (test.name || '').toLowerCase().trim();
  const testChap = (test.chapterName || '').toLowerCase().trim();
  
  // Direct chapter name matches
  if (testChap && (testChap === target || testChap.includes(target) || target.includes(testChap))) {
    return true;
  }

  // Explicit test name match
  if (testName.includes(target)) return true;

  // Significant token fuzzy match (e.g. "Rotational Motion" -> ["rotational", "motion"])
  const cleanTokens = (s: string) => s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3 && !['and', 'the', 'for', 'with', 'chapter', 'test', 'dpp', 'mock', 'drill', 'mastery'].includes(t));

  const targetTokens = cleanTokens(chapterName);
  if (targetTokens.length > 0) {
    const testTokens = cleanTokens(test.name + ' ' + (test.chapterName || ''));
    const matchedCount = targetTokens.filter(tok => testTokens.some(tt => tt.includes(tok) || tok.includes(tt))).length;
    if (matchedCount === targetTokens.length || (targetTokens.length >= 2 && matchedCount >= targetTokens.length - 1)) {
      return true;
    }
  }
  
  // Section questions match
  return test.sections.some(sec => {
    if (subject && sec.subject && sec.subject !== subject) return false;
    return sec.questions.some(q => {
      const qChap = (q.chapter || '').toLowerCase().trim();
      const qTopic = (q.topic || '').toLowerCase().trim();
      if (!qChap && !qTopic) return false;
      if (qChap && (qChap === target || qChap.includes(target) || (qChap.length >= 4 && target.includes(qChap)))) return true;
      if (qTopic && (qTopic === target || qTopic.includes(target) || (qTopic.length >= 4 && target.includes(qTopic)))) return true;
      
      // Token match on question chapter/topic
      if (targetTokens.length > 0) {
        const qTokens = cleanTokens(qChap + ' ' + qTopic);
        const matched = targetTokens.filter(tok => qTokens.some(qt => qt.includes(tok) || tok.includes(qt))).length;
        if (matched === targetTokens.length || (targetTokens.length >= 2 && matched >= targetTokens.length - 1)) {
          return true;
        }
      }
      return false;
    });
  });
}

// Helper to render text with inline math: parses text replacing $math$ with <InlineMath math="math"/>
const renderMathText = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(\$.*?\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith('$') && part.endsWith('$')) {
      const math = part.slice(1, -1);
      return <InlineMath key={i} math={math} />;
    }
    return <span key={i}>{part}</span>;
  });
};

interface MockTestsPageProps {
  onNavigate?: (pageId: import('../../types').PageId) => void;
  defaultView?: 'landing' | 'result';
}

export function MockTestsPage({ onNavigate, defaultView }: MockTestsPageProps) {
  const actions = useStudyBrainStore(state => state.actions);
  const customMockTests = useStudyBrainStore(state => state.customMockTests);
  const storeMocks = useStudyBrainStore(state => state.mocks) || [];
  const mocks = useMemo(() => {
    if (storeMocks.length > 0) return storeMocks;
    if (typeof localStorage !== 'undefined') {
      try {
        const cached = localStorage.getItem('jeeos_mock_results_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // ignore
      }
    }
    return storeMocks;
  }, [storeMocks]);

  React.useEffect(() => {
    if (storeMocks.length === 0) {
      import('@/utils/idb').then(({ idbGet }) => {
        idbGet<MockResult[]>('jeeos_mock_results').then((idbMocks) => {
          if (idbMocks && idbMocks.length > 0) {
            useStudyBrainStore.getState().setState({ mocks: idbMocks });
          }
        }).catch(() => {});
      });
    }
  }, [storeMocks.length]);

  const rawChapters = useStudyBrainStore(state => state.chapters) || [];
  const allChapters: Chapter[] = rawChapters.length > 0 ? rawChapters : INITIAL_CHAPTERS;

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = useParams<{ attemptId?: string; tabOrId?: string }>();

  // Preparation telemetry stats from past attempts
  const mockStats = useMemo(() => {
    if (mocks.length === 0) {
      return {
        totalAttempts: 0,
        avgScore: 0,
        bestScore: 0,
        avgAccuracy: 0
      };
    }
    const totalScore = mocks.reduce((sum, m) => sum + (m.totalScore || 0), 0);
    const bestScore = Math.max(...mocks.map(m => m.totalScore || 0));
    const attemptedQs = mocks.reduce((sum, m) => sum + (m.attempted || 0), 0);
    const correctQs = mocks.reduce((sum, m) => sum + (m.correct || 0), 0);
    const avgAccuracy = attemptedQs > 0 ? Math.round((correctQs / attemptedQs) * 100) : 0;
    const avgScore = Math.round(totalScore / mocks.length);
    return {
      totalAttempts: mocks.length,
      avgScore,
      bestScore,
      avgAccuracy
    };
  }, [mocks]);

  const [engineState, setEngineState] = useState<MockTestEngineState>('LANDING');
  const [activeNav, setActiveNav] = useState<MockNavCategory>('full_tests');
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [testSearchQuery, setTestSearchQuery] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [chapterSearchQuery, setChapterSearchQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  
  // Studio & Uploader Options
  const [studioInitialMode, setStudioInitialMode] = useState<MockGeneratorMode>('FULL_JEE');
  const [studioInitialSubject, setStudioInitialSubject] = useState<SubjectId | undefined>(undefined);
  const [studioInitialChapterId, setStudioInitialChapterId] = useState<string | undefined>(undefined);
  const [dppInitialSubject, setDppInitialSubject] = useState<SubjectId | undefined>(undefined);
  const [dppInitialChapterId, setDppInitialChapterId] = useState<string | undefined>(undefined);
  const [dppInitialChapterName, setDppInitialChapterName] = useState<string | undefined>(undefined);
  const [chapterTestFilter, setChapterTestFilter] = useState<'all' | 'dpp' | 'drill' | 'official'>('all');
  const [isConfirmDeleteChapterTestsOpen, setIsConfirmDeleteChapterTestsOpen] = useState(false);

  const authContext = useContext(AuthContext);
  const userId = authContext?.user?.uid || 'guest';

  // All available tests pool - sorted newest created tests first, pushing older tests down
  const allAvailableTests = useMemo(() => {
    const list = [...(customMockTests || [])].sort((a, b) => {
      const timeA = a.createdAt || (a.id.includes('_') ? parseInt(a.id.split('_')[1], 10) || 0 : 0);
      const timeB = b.createdAt || (b.id.includes('_') ? parseInt(b.id.split('_')[1], 10) || 0 : 0);
      return timeB - timeA;
    });
    if (list.some(t => t.id === mockTest1.id)) return list;
    return [...list, mockTest1];
  }, [customMockTests]);

  const [selectedTest, setSelectedTest] = useState<MockTest | null>(null);
  const [selectedTestForBriefing, setSelectedTestForBriefing] = useState<MockTest | null>(null);
  const [activeSession, setActiveSession] = useState<{
    testId: string;
    test: MockTest;
    remainingSeconds: number;
  } | null>(null);
  const [showPyqPaperModal, setShowPyqPaperModal] = useState(false);
  const [showDppModal, setShowDppModal] = useState(false);
  const [selectedTestForPrint, setSelectedTestForPrint] = useState<MockTest | null>(null);
  const [showStudio, setShowStudio] = useState(false);
  const [testToDelete, setTestToDelete] = useState<string | null>(null);
  const [evaluatingTest, setEvaluatingTest] = useState<MockTest | null>(null);
  const [evaluationStatus, setEvaluationStatus] = useState<string>('Processing candidate responses...');

  // Read URL query parameters on mount or change
  useEffect(() => {
    const navParam = (searchParams.get('category') || searchParams.get('nav')) as MockNavCategory;
    if (navParam && ['full_tests', 'pyq', 'physics', 'chemistry', 'maths', 'history'].includes(navParam)) {
      setActiveNav(navParam);
    }
    const chapId = searchParams.get('chapterId');
    if (chapId) {
      setSelectedChapterId(chapId);
    }
    const testId = searchParams.get('testId');
    if (testId) {
      const found = allAvailableTests.find(t => t.id === testId);
      if (found) {
        setSelectedTestForBriefing(found);
      }
    }
    if (searchParams.get('openStudio') === 'true') {
      if (chapId) setStudioInitialChapterId(chapId);
      if (navParam && ['physics', 'chemistry', 'maths'].includes(navParam)) {
        setStudioInitialSubject(navParam as SubjectId);
        setStudioInitialMode('CHAPTER_DRILL');
      }
      setShowStudio(true);
    }
    if (searchParams.get('openDpp') === 'true') {
      if (navParam && ['physics', 'chemistry', 'maths'].includes(navParam)) {
        setDppInitialSubject(navParam as SubjectId);
      }
      setShowDppModal(true);
    }
  }, [searchParams, allAvailableTests]);

  // Handler to initiate test entrance (opens CBT briefing modal)
  const handleStartTest = (test: MockTest) => {
    setSelectedTestForBriefing(test);
  };

  // Handler once user confirms starting from briefing modal
  const handleConfirmStartExam = (test: MockTest) => {
    setSelectedTestForBriefing(null);
    setSelectedTest(test);
    setEngineState('ARENA');
    if (typeof document !== 'undefined' && typeof document.documentElement.requestFullscreen === 'function' && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const handleDiscardActiveSession = (testId: string) => {
    try {
      localStorage.removeItem(`jeeos_mock_attempt_${userId}_${testId}`);
      localStorage.removeItem(`jeeos_mock_end_${userId}_${testId}`);
      localStorage.removeItem(`jeeos_mock_pos_${userId}_${testId}`);
      localStorage.removeItem(`jeeos_mock_infractions_${userId}_${testId}`);
    } catch (e) {
      console.warn("Failed to clear interrupted test state:", e);
    }
    setActiveSession(null);
  };

  const handleResumeActiveSession = (test: MockTest) => {
    setSelectedTest(test);
    setEngineState('ARENA');
  };

  const handleReturnToDashboard = () => {
    setEngineState('LANDING');
    setSelectedTest(null);
    setSelectedTestForBriefing(null);
  };

  const handleDeleteAttempt = async (attemptId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this test attempt? All scores, telemetry, and solution review data for this attempt will be permanently removed.")) {
      return;
    }
    try {
      await actions.deleteMockResult(attemptId);
      try {
        const uid = userId || 'guest';
        localStorage.removeItem(`jeeos_mock_attempt_${uid}_${attemptId}`);
        localStorage.removeItem(`jeeos_mock_end_${uid}_${attemptId}`);
        localStorage.removeItem(`jeeos_mock_pos_${uid}_${attemptId}`);
        localStorage.removeItem(`jeeos_mock_infractions_${uid}_${attemptId}`);
        localStorage.removeItem(`jeeos_mock_result_${attemptId}`);
      } catch (e) {
        console.warn("Attempt cleanup storage notice:", e);
      }
    } catch (err) {
      console.error("Failed to delete attempt:", err);
    }
  };

  // Test completion in arena -> Save to store and route to MockTestResultPage
  const handleTestComplete = async (attempt: MockTestAttempt) => {
    const currentTest = selectedTest;

    // 1. Immediately purge interrupted session storage keys and clear activeSession state
    try {
      const uid = userId || 'guest';
      if (currentTest) {
        localStorage.removeItem(`jeeos_mock_attempt_${uid}_${currentTest.id}`);
        localStorage.removeItem(`jeeos_mock_end_${uid}_${currentTest.id}`);
        localStorage.removeItem(`jeeos_mock_pos_${uid}_${currentTest.id}`);
        localStorage.removeItem(`jeeos_mock_infractions_${uid}_${currentTest.id}`);
      }
    } catch (e) {
      console.warn("Failed to clear interrupted test state:", e);
    }
    setActiveSession(null);

    // 2. Set engine state to EVALUATING (NO FLASH OF LANDING PAGE)
    setEvaluatingTest(currentTest);
    setEngineState('EVALUATING');
    setEvaluationStatus('Saving responses...');
    
    if (currentTest) {
      const evaluation = evaluateMockAttempt(currentTest, attempt);
      const isPastAttemptRetake = currentTest.id.startsWith('retake-');
      const originalMockId = isPastAttemptRetake ? currentTest.id.replace('retake-', '') : undefined;

      // Calculate true elapsed duration in minutes
      const totalQuestionSeconds = Object.values(attempt.questions || {}).reduce(
        (sum, q) => sum + (q.timeSpentSeconds || 0),
        0
      );
      const elapsedFromTimestamps = (attempt.startTime && attempt.endTime)
        ? Math.floor((new Date(attempt.endTime).getTime() - new Date(attempt.startTime).getTime()) / 1000)
        : 0;
      const effectiveSeconds = elapsedFromTimestamps > 0
        ? elapsedFromTimestamps
        : (totalQuestionSeconds > 0 ? totalQuestionSeconds : (evaluation.totalTimeSpent || 0));
      const actualDurationMinutes = effectiveSeconds > 0
        ? Math.max(1, Math.round(effectiveSeconds / 60))
        : currentTest.durationMinutes;

      // Map evaluation.subjectStats to MockResult.subjectBreakdown
      const subjectBreakdown: Record<SubjectId, { score: number; attempted: number; correct: number }> = {
        physics: { score: 0, attempted: 0, correct: 0 },
        chemistry: { score: 0, attempted: 0, correct: 0 },
        maths: { score: 0, attempted: 0, correct: 0 }
      };
      if (evaluation.subjectStats) {
        Object.entries(evaluation.subjectStats).forEach(([subj, stats]) => {
          const key = subj.toLowerCase() as SubjectId;
          subjectBreakdown[key] = {
            score: stats.score,
            attempted: stats.attempted,
            correct: stats.correct
          };
        });
      }

      const newMockResult: MockResult = {
        id: uuidv4(),
        title: currentTest.name,
        date: new Date().toISOString(),
        totalScore: evaluation.totalScore,
        correct: evaluation.correct,
        incorrect: evaluation.incorrect,
        attempted: evaluation.attempted,
        totalQuestions: evaluation.totalQuestions,
        duration: actualDurationMinutes,
        subjectBreakdown,
        testSnapshot: currentTest,
        attemptData: attempt,
        isRetake: isPastAttemptRetake,
        originalAttemptId: originalMockId
      };

      setEvaluationStatus('Calculating scores & accuracy...');

      let targetResultId = newMockResult.id;
      try {
        const savedResult = await actions.addMockResult(newMockResult);
        if (savedResult && savedResult.id) {
          targetResultId = savedResult.id;
        }
      } catch (e) {
        console.error("Failed to add mock result:", e);
      }

      const mistakesBatch = (evaluation as any).mistakesToLog || (evaluation as any).mistakes;
      if (mistakesBatch && mistakesBatch.length > 0) {
        setEvaluationStatus('Updating chapter progress...');
        try {
          await actions.addMistakesBatch(mistakesBatch);
        } catch (e) {
          console.error("Failed to batch save mistakes from test completion:", e);
        }
      }

      setEvaluationStatus('Preparing scorecard...');
      // Smooth animation pacing (min 800ms)
      await new Promise(resolve => setTimeout(resolve, 800));

      navigate(`/mock-tests/result/${targetResultId}`);
      setEngineState('LANDING');
      setEvaluatingTest(null);
      setSelectedTest(null);
    } else {
      navigate('/mock-tests');
      setEngineState('LANDING');
      setEvaluatingTest(null);
      setSelectedTest(null);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    try {
      await actions.deleteCustomMockTest(testId);
      setTestToDelete(null);
    } catch (e) {
      console.error("Failed to delete custom mock test:", e);
    }
  };

  const handleDeleteAllChapterTests = async () => {
    if (!customChapterTests || customChapterTests.length === 0) return;
    try {
      await actions.deleteChapterCustomMockTests(customChapterTests.map(t => t.id));
      setIsConfirmDeleteChapterTestsOpen(false);
    } catch (e) {
      console.error("Failed to delete all chapter tests:", e);
    }
  };

  const handleTestGeneratedFromStudio = async (generatedTest: MockTest) => {
    try {
      await actions.addCustomMockTest(generatedTest);
    } catch (e) {
      console.error("Failed to add generated mock test to store:", e);
    }
    setShowStudio(false);
    setSelectedTestForBriefing(generatedTest);
  };


  // Scan for in-progress / interrupted test session
  useEffect(() => {
    const scanForActiveSession = () => {
      if (typeof window === 'undefined') return null;
      const prefix = `jeeos_mock_end_${userId}_`;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            const testId = key.substring(prefix.length);
            const endTimeStr = localStorage.getItem(key);
            const endTime = endTimeStr ? parseInt(endTimeStr, 10) : 0;
            const remainingSeconds = Math.floor((endTime - Date.now()) / 1000);
            if (remainingSeconds > 0) {
              const matchingTest = allAvailableTests.find(t => t.id === testId);
              if (matchingTest) {
                return {
                  testId,
                  test: matchingTest,
                  remainingSeconds
                };
              }
            }
          }
        }
      } catch (e) {
        console.warn("Error scanning active session:", e);
      }
      return null;
    };

    setActiveSession(scanForActiveSession());

    const timer = setInterval(() => {
      setActiveSession(prev => {
        if (!prev) return scanForActiveSession();
        const newSec = prev.remainingSeconds - 1;
        if (newSec <= 0) return null;
        return { ...prev, remainingSeconds: newSec };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [userId, allAvailableTests]);

  // Precompute attempt statistics by test ID or name
  const attemptStatsByTest = useMemo(() => {
    const map = new Map<string, {
      count: number;
      bestScore: number;
      bestAccuracy: number;
      lastDate: string;
      lastAttemptId: string;
    }>();

    mocks.forEach(mock => {
      const key = mock.testSnapshot?.id || mock.title;
      const current = map.get(key) || { count: 0, bestScore: -Infinity, bestAccuracy: 0, lastDate: mock.date, lastAttemptId: mock.id };
      const accuracy = mock.attempted > 0 ? Math.round((mock.correct / mock.attempted) * 100) : 0;
      const isNewer = !current.lastDate || new Date(mock.date).getTime() >= new Date(current.lastDate).getTime();
      map.set(key, {
        count: current.count + 1,
        bestScore: Math.max(current.bestScore, mock.totalScore),
        bestAccuracy: Math.max(current.bestAccuracy, accuracy),
        lastDate: isNewer ? mock.date : current.lastDate,
        lastAttemptId: isNewer ? mock.id : current.lastAttemptId
      });
    });

    return map;
  }, [mocks]);

  // Subject chapters subsets
  const physicsChapters = useMemo(() => allChapters.filter(c => c.subject === 'physics'), [allChapters]);
  const chemistryChapters = useMemo(() => allChapters.filter(c => c.subject === 'chemistry'), [allChapters]);
  const mathsChapters = useMemo(() => allChapters.filter(c => c.subject === 'maths'), [allChapters]);

  // Full tests pool - authentic multi-subject grand CBT tests
  const fullTests = useMemo(() => {
    return allAvailableTests.filter(test => {
      // Official PYQ papers belong to PYQ section
      if (test.source === 'pyq' || test.category === 'pyq' || test.id.startsWith('pyq_') || test.name?.toLowerCase().includes('(pyq cbt paper)')) {
        return false;
      }
      const cat = getMockTestCategory(test);
      const name = (test.name || '').toLowerCase();
      return cat === 'grand' || test.sections.length > 1 || name.includes('grand') || name.includes('full') || test.durationMinutes >= 120;
    });
  }, [allAvailableTests]);

  // PYQ papers pool - strictly authentic and uploaded official PYQ papers
  const pyqTests = useMemo(() => {
    return allAvailableTests.filter(test => {
      // Must not be a coaching DPP or chapter drill
      if (test.source === 'dpp' || test.category === 'dpp') return false;
      if (test.chapterId && !test.name?.toLowerCase().includes('pyq') && !test.name?.toLowerCase().includes('shift')) {
        return false;
      }
      const name = (test.name || '').toLowerCase();
      return (
        test.source === 'pyq' ||
        test.category === 'pyq' ||
        test.id.startsWith('pyq_') ||
        name.includes('(pyq cbt paper)') ||
        /jee\s*main\s*20\d\d/i.test(name) ||
        /jee\s*adv(anced)?\s*20\d\d/i.test(name) ||
        /\bshift\s*[12]\b/i.test(name)
      );
    });
  }, [allAvailableTests]);

  // Navigation handlers
  const handleSelectNav = (nav: MockNavCategory) => {
    setActiveNav(nav);
    setSelectedChapterId(null);
    setTestSearchQuery('');
    setHistorySearchQuery('');
    setChapterSearchQuery('');
    setSelectedUnit('all');
  };

  const handleOpenStudioForChapter = (subject: SubjectId, chapterId: string) => {
    setStudioInitialMode('CHAPTER_DRILL');
    setStudioInitialSubject(subject);
    setStudioInitialChapterId(chapterId);
    setShowStudio(true);
  };

  const handleOpenDppForChapter = (subject: SubjectId, chapterId?: string, chapterName?: string) => {
    setDppInitialSubject(subject);
    setDppInitialChapterId(chapterId);
    setDppInitialChapterName(chapterName);
    setShowDppModal(true);
  };

  // Active Subject details for PCM
  const isPcmSubject = activeNav === 'physics' || activeNav === 'chemistry' || activeNav === 'maths';
  const currentSubject: SubjectId = isPcmSubject ? (activeNav as SubjectId) : 'physics';
  const currentSubjectChapters = isPcmSubject
    ? (activeNav === 'physics' ? physicsChapters : activeNav === 'chemistry' ? chemistryChapters : mathsChapters)
    : [];

  const activeChapter = selectedChapterId ? currentSubjectChapters.find(c => c.id === selectedChapterId) : null;

  // Available unique units for subject
  const availableUnits = useMemo(() => {
    if (!isPcmSubject) return [];
    const unitsSet = new Set<string>();
    currentSubjectChapters.forEach(c => {
      if (c.unit) unitsSet.add(c.unit);
    });
    return Array.from(unitsSet);
  }, [isPcmSubject, currentSubjectChapters]);

  // Filtered chapters for chapter grid
  const filteredChapters = useMemo(() => {
    if (!isPcmSubject) return [];
    return currentSubjectChapters.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(chapterSearchQuery.toLowerCase()) ||
                            (c.unit && c.unit.toLowerCase().includes(chapterSearchQuery.toLowerCase()));
      const matchesUnit = selectedUnit === 'all' || c.unit === selectedUnit;
      return matchesSearch && matchesUnit;
    });
  }, [isPcmSubject, currentSubjectChapters, chapterSearchQuery, selectedUnit]);

  // All custom tests for active chapter (for bulk deletion and count)
  const customChapterTests = useMemo(() => {
    if (!activeChapter) return [];
    return allAvailableTests.filter(test => {
      const isMatch = isTestForChapter(test, activeChapter.name, currentSubject, activeChapter.id);
      const isCustomTest = test.isCustom || (customMockTests && customMockTests.some(ct => ct.id === test.id));
      return isMatch && isCustomTest;
    });
  }, [activeChapter, allAvailableTests, currentSubject, customMockTests]);

  // Filter counts for active chapter
  const chapterFilterCounts = useMemo(() => {
    if (!activeChapter) return { all: 0, dpp: 0, drill: 0, official: 0 };
    const chapterTests = allAvailableTests.filter(test => isTestForChapter(test, activeChapter.name, currentSubject, activeChapter.id));
    let dpp = 0, drill = 0, official = 0;
    chapterTests.forEach(test => {
      const isCustomTest = test.isCustom || (customMockTests && customMockTests.some(ct => ct.id === test.id));
      const testNameLower = (test.name || '').toLowerCase();
      const isDpp = test.source === 'dpp' || test.category === 'dpp' || testNameLower.includes('dpp') || testNameLower.includes('worksheet');
      const isDrill = test.source === 'generated' || test.category === 'chapter' || testNameLower.includes('drill') || testNameLower.includes('mastery');
      if (isDpp) dpp++;
      else if (isDrill) drill++;
      else official++;
    });
    return { all: chapterTests.length, dpp, drill, official };
  }, [activeChapter, allAvailableTests, currentSubject, customMockTests]);

  // Filtered tests for active chapter with smart categorization
  const activeChapterTests = useMemo(() => {
    if (!activeChapter) return [];
    return allAvailableTests.filter(test => {
      const isMatch = isTestForChapter(test, activeChapter.name, currentSubject, activeChapter.id);
      const matchesSearch = test.name.toLowerCase().includes(testSearchQuery.toLowerCase());
      if (!isMatch || !matchesSearch) return false;

      const isCustomTest = test.isCustom || (customMockTests && customMockTests.some(ct => ct.id === test.id));
      const testNameLower = (test.name || '').toLowerCase();
      const isDpp = test.source === 'dpp' || test.category === 'dpp' || testNameLower.includes('dpp') || testNameLower.includes('worksheet');
      const isDrill = test.source === 'generated' || test.category === 'chapter' || testNameLower.includes('drill') || testNameLower.includes('mastery');
      const isOfficial = !isCustomTest || test.source === 'pyq' || test.category === 'pyq' || test.category === 'grand';

      if (chapterTestFilter === 'dpp') return isDpp;
      if (chapterTestFilter === 'drill') return isDrill;
      if (chapterTestFilter === 'official') return isOfficial;
      return true;
    });
  }, [activeChapter, allAvailableTests, currentSubject, testSearchQuery, chapterTestFilter, customMockTests]);

  // Filtered Full Tests
  const filteredFullTests = useMemo(() => {
    return fullTests.filter(t => t.name.toLowerCase().includes(testSearchQuery.toLowerCase()));
  }, [fullTests, testSearchQuery]);

  // Filtered PYQ Tests
  const filteredPyqTests = useMemo(() => {
    return pyqTests.filter(t => t.name.toLowerCase().includes(testSearchQuery.toLowerCase()));
  }, [pyqTests, testSearchQuery]);

  // Filtered Past Attempts - newest attempts first with decoupled search
  const filteredPastAttempts = useMemo(() => {
    if (!mocks) return [];
    const query = historySearchQuery.trim().toLowerCase();
    const list = query
      ? mocks.filter(m => (m.title || '').toLowerCase().includes(query))
      : [...mocks];
    return list.sort((a, b) => {
      const timeA = Date.parse(a.date) || 0;
      const timeB = Date.parse(b.date) || 0;
      if (timeA !== timeB) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [mocks, historySearchQuery]);

  // If inside Arena, render full screen arena
  if (engineState === 'ARENA' && selectedTest) {
    return (
      <MockTestArena 
        test={selectedTest}
        onComplete={handleTestComplete}
        onExit={handleReturnToDashboard}
        initialExamStarted={true}
      />
    );
  }

  // If evaluating, render full screen evaluation loading screen
  if (engineState === 'EVALUATING') {
    return (
      <MockTestEvaluatingScreen 
        test={evaluatingTest || selectedTest}
        statusMessage={evaluationStatus}
      />
    );
  }

  return (
    <div className="w-full space-y-6 text-zinc-100 font-sans select-none">
      
      {/* 0. ACTIVE INTERRUPTED CBT SIMULATION BANNER */}
      <AnimatePresence>
        {activeSession && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-zinc-900 border border-amber-500/40 shadow-lg shadow-amber-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-sans"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                <Zap className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40">
                    Active Test In Progress
                  </span>
                  <span className="text-[11px] font-mono text-amber-300 font-bold">
                    ⏱️ {Math.floor(activeSession.remainingSeconds / 60)}m {activeSession.remainingSeconds % 60}s remaining
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white truncate font-display mt-0.5">
                  {activeSession.test.name}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => handleDiscardActiveSession(activeSession.testId)}
                className="px-3 py-1.5 rounded-xl text-xs font-mono font-semibold text-zinc-400 hover:text-rose-300 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-800/40 transition-colors cursor-pointer"
              >
                Discard Attempt
              </button>
              <button
                type="button"
                onClick={() => handleResumeActiveSession(activeSession.test)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-mono font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 active:scale-98 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume CBT</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2-COLUMN MASTER-DETAIL LAYOUT (Starts right at the top, no giant header banner) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: NAVIGATION & ACTIONS DIRECTORY (Directly on page, not inside an outer box) */}
        <aside className="w-full lg:col-span-4 xl:col-span-3 space-y-2.5 lg:sticky lg:top-5 self-start">
          
          {/* Header & Brand */}
          <div className="flex items-center justify-between gap-2 pb-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/90 border border-indigo-500/40 flex items-center justify-center text-white shrink-0 shadow-sm">
                <Trophy className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-white font-display leading-tight whitespace-nowrap">
                  Mock Test Engine
                </h1>
                <span className="text-[10px] font-mono text-zinc-500 block leading-tight">
                  CBT Simulation
                </span>
              </div>
            </div>
            <span className="shrink-0 text-[10px] font-mono font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md whitespace-nowrap">
              Available Tests
            </span>
          </div>

          {/* Quick Actions */}
          <div className="space-y-1.5">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={springs.snappy}
              onClick={() => {
                setStudioInitialMode('FULL_JEE');
                setShowStudio(true);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/30 shadow-sm transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
              <span>AI Mock Generator</span>
            </motion.button>

            <div className="grid grid-cols-2 gap-1.5">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={springs.snappy}
                onClick={() => setShowPyqPaperModal(true)}
                className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-mono font-medium bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Upload PYQ"
              >
                <FileUp className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate">Upload PYQ</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={springs.snappy}
                onClick={() => {
                  setDppInitialSubject(undefined);
                  setDppInitialChapterId(undefined);
                  setDppInitialChapterName(undefined);
                  setShowDppModal(true);
                }}
                className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-medium bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                <span>Upload DPP</span>
              </motion.button>
            </div>
          </div>

          {/* Section 1: Full Syllabus Simulations */}
          <div className="space-y-1 pt-0.5">
            <div className="px-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500">
              Full Papers & PYQs
            </div>

            {/* Full Tests */}
            <motion.button
              whileTap={{ scale: 0.985 }}
              onClick={() => handleSelectNav('full_tests')}
              className={`relative w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors group ${
                activeNav === 'full_tests'
                  ? 'border border-zinc-700 shadow-sm'
                  : 'border border-zinc-850 bg-zinc-900/40 hover:bg-zinc-850/60 hover:border-zinc-750 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {activeNav === 'full_tests' && (
                <motion.div
                  layoutId="activeNavHighlight"
                  className="absolute inset-0 bg-zinc-800/90 border-l-2 border-l-amber-500 rounded-xl"
                  transition={springs.fluid}
                />
              )}
              <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  activeNav === 'full_tests'
                    ? 'bg-amber-950/70 border border-amber-700/60 text-amber-300'
                    : 'bg-amber-950/40 border border-amber-800/30 text-amber-400/80 group-hover:text-amber-400'
                }`}>
                  <Trophy className="w-3.5 h-3.5" />
                </div>
                <span className={`text-xs font-semibold font-display truncate ${activeNav === 'full_tests' ? 'text-white' : 'text-zinc-200 group-hover:text-white'}`}>
                  Full JEE CBT Mocks
                </span>
              </div>
              <span className={`relative z-10 shrink-0 text-[10px] font-mono font-medium px-2 py-0.5 rounded border transition-colors ${
                activeNav === 'full_tests'
                  ? 'bg-zinc-700/80 text-zinc-200 border-zinc-600'
                  : 'bg-zinc-850/80 text-zinc-400 border-zinc-800'
              }`}>
                {fullTests.length}
              </span>
            </motion.button>

            {/* PYQ Papers */}
            <motion.button
              whileTap={{ scale: 0.985 }}
              onClick={() => handleSelectNav('pyq')}
              className={`relative w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors group ${
                activeNav === 'pyq'
                  ? 'border border-zinc-700 shadow-sm'
                  : 'border border-zinc-850 bg-zinc-900/40 hover:bg-zinc-850/60 hover:border-zinc-750 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {activeNav === 'pyq' && (
                <motion.div
                  layoutId="activeNavHighlight"
                  className="absolute inset-0 bg-zinc-800/90 border-l-2 border-l-sky-500 rounded-xl"
                  transition={springs.fluid}
                />
              )}
              <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  activeNav === 'pyq'
                    ? 'bg-sky-950/70 border border-sky-700/60 text-sky-300'
                    : 'bg-sky-950/40 border border-sky-800/30 text-sky-400/80 group-hover:text-sky-400'
                }`}>
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <span className={`text-xs font-semibold font-display truncate ${activeNav === 'pyq' ? 'text-white' : 'text-zinc-200 group-hover:text-white'}`}>
                  PYQ Papers
                </span>
              </div>
              <span className={`relative z-10 shrink-0 text-[10px] font-mono font-medium px-2 py-0.5 rounded border transition-colors ${
                activeNav === 'pyq'
                  ? 'bg-zinc-700/80 text-zinc-200 border-zinc-600'
                  : 'bg-zinc-850/80 text-zinc-400 border-zinc-800'
              }`}>
                {pyqTests.length}
              </span>
            </motion.button>
          </div>

          {/* Section 2: Subject Chapters */}
          <div className="space-y-1 pt-1.5 border-t border-zinc-850">
            <div className="px-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500">
              Subject Chapters
            </div>

            {/* Physics */}
            <motion.button
              whileTap={{ scale: 0.985 }}
              onClick={() => handleSelectNav('physics')}
              className={`relative w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors group ${
                activeNav === 'physics'
                  ? 'border border-zinc-700 shadow-sm'
                  : 'border border-zinc-850 bg-zinc-900/40 hover:bg-zinc-850/60 hover:border-zinc-750 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {activeNav === 'physics' && (
                <motion.div
                  layoutId="activeNavHighlight"
                  className="absolute inset-0 bg-zinc-800/90 border-l-2 border-l-sky-500 rounded-xl"
                  transition={springs.fluid}
                />
              )}
              <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  activeNav === 'physics'
                    ? 'bg-sky-950/70 border border-sky-700/60 text-sky-300'
                    : 'bg-sky-950/40 border border-sky-800/30 text-sky-400/80 group-hover:text-sky-400'
                }`}>
                  <Atom className="w-3.5 h-3.5" />
                </div>
                <span className={`text-xs font-semibold font-display truncate ${activeNav === 'physics' ? 'text-white' : 'text-zinc-200 group-hover:text-white'}`}>
                  Physics
                </span>
              </div>
              <span className={`relative z-10 shrink-0 text-[10px] font-mono font-medium px-2 py-0.5 rounded border transition-colors ${
                activeNav === 'physics'
                  ? 'bg-sky-950/80 text-sky-300 border-sky-700/60'
                  : 'bg-sky-950/30 text-sky-400/90 border-sky-800/40'
              }`}>
                {physicsChapters.length} Ch
              </span>
            </motion.button>

            {/* Chemistry */}
            <motion.button
              whileTap={{ scale: 0.985 }}
              onClick={() => handleSelectNav('chemistry')}
              className={`relative w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors group ${
                activeNav === 'chemistry'
                  ? 'border border-zinc-700 shadow-sm'
                  : 'border border-zinc-850 bg-zinc-900/40 hover:bg-zinc-850/60 hover:border-zinc-750 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {activeNav === 'chemistry' && (
                <motion.div
                  layoutId="activeNavHighlight"
                  className="absolute inset-0 bg-zinc-800/90 border-l-2 border-l-emerald-500 rounded-xl"
                  transition={springs.fluid}
                />
              )}
              <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  activeNav === 'chemistry'
                    ? 'bg-emerald-950/70 border border-emerald-700/60 text-emerald-300'
                    : 'bg-emerald-950/40 border border-emerald-800/30 text-emerald-400/80 group-hover:text-emerald-400'
                }`}>
                  <FlaskConical className="w-3.5 h-3.5" />
                </div>
                <span className={`text-xs font-semibold font-display truncate ${activeNav === 'chemistry' ? 'text-white' : 'text-zinc-200 group-hover:text-white'}`}>
                  Chemistry
                </span>
              </div>
              <span className={`relative z-10 shrink-0 text-[10px] font-mono font-medium px-2 py-0.5 rounded border transition-colors ${
                activeNav === 'chemistry'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                  : 'bg-emerald-950/30 text-emerald-400/90 border-emerald-800/40'
              }`}>
                {chemistryChapters.length} Ch
              </span>
            </motion.button>

            {/* Mathematics */}
            <motion.button
              whileTap={{ scale: 0.985 }}
              onClick={() => handleSelectNav('maths')}
              className={`relative w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors group ${
                activeNav === 'maths'
                  ? 'border border-zinc-700 shadow-sm'
                  : 'border border-zinc-850 bg-zinc-900/40 hover:bg-zinc-850/60 hover:border-zinc-750 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {activeNav === 'maths' && (
                <motion.div
                  layoutId="activeNavHighlight"
                  className="absolute inset-0 bg-zinc-800/90 border-l-2 border-l-indigo-500 rounded-xl"
                  transition={springs.fluid}
                />
              )}
              <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  activeNav === 'maths'
                    ? 'bg-indigo-950/70 border border-indigo-700/60 text-indigo-300'
                    : 'bg-indigo-950/40 border border-indigo-800/30 text-indigo-400/80 group-hover:text-indigo-400'
                }`}>
                  <Calculator className="w-3.5 h-3.5" />
                </div>
                <span className={`text-xs font-semibold font-display truncate ${activeNav === 'maths' ? 'text-white' : 'text-zinc-200 group-hover:text-white'}`}>
                  Mathematics
                </span>
              </div>
              <span className={`relative z-10 shrink-0 text-[10px] font-mono font-medium px-2 py-0.5 rounded border transition-colors ${
                activeNav === 'maths'
                  ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60'
                  : 'bg-indigo-950/30 text-indigo-400/90 border-indigo-800/40'
              }`}>
                {mathsChapters.length} Ch
              </span>
            </motion.button>
          </div>

          {/* Section 3: History & Analytics */}
          <div className="space-y-1.5 pt-1.5 border-t border-zinc-850">
            <div className="flex items-center justify-between px-1">
              <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500">
                History & Analytics
              </div>
              <span className="text-[9px] font-mono text-indigo-400 bg-indigo-950/60 border border-indigo-800/40 px-2 py-0.5 rounded">
                Target: 99%ile
              </span>
            </div>

            <motion.button
              role="button"
              whileTap={{ scale: 0.985 }}
              onClick={() => handleSelectNav('history')}
              className={`relative w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors group ${
                activeNav === 'history'
                  ? 'border border-zinc-700 shadow-sm'
                  : 'border border-zinc-850 bg-zinc-900/40 hover:bg-zinc-850/60 hover:border-zinc-750 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {activeNav === 'history' && (
                <motion.div
                  layoutId="activeNavHighlight"
                  className="absolute inset-0 bg-zinc-800/90 border-l-2 border-l-rose-500 rounded-xl"
                  transition={springs.fluid}
                />
              )}
              <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  activeNav === 'history'
                    ? 'bg-rose-950/70 border border-rose-700/60 text-rose-300'
                    : 'bg-rose-950/40 border border-rose-800/30 text-rose-400/80 group-hover:text-rose-400'
                }`}>
                  <History className="w-3.5 h-3.5" />
                </div>
                <span className={`text-xs font-semibold font-display truncate ${activeNav === 'history' ? 'text-white' : 'text-zinc-200 group-hover:text-rose-200'}`}>
                  Past Attempts
                </span>
              </div>
              <span className={`relative z-10 shrink-0 text-[10px] font-mono font-medium px-2 py-0.5 rounded border transition-colors ${
                activeNav === 'history'
                  ? 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                  : 'bg-zinc-850/80 text-zinc-400 border-zinc-800'
              }`}>
                {mocks.length}
              </span>
            </motion.button>

            {/* Comfortably Proportioned Readiness Card */}
            <div className="bg-zinc-900/60 border border-zinc-850 rounded-xl p-2.5 space-y-2">
              {/* Micro Telemetry Metrics */}
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="bg-zinc-850/60 border border-zinc-800/80 rounded-lg py-1 px-1">
                  <div className="text-[9px] font-mono uppercase text-zinc-400 font-medium">Mocks</div>
                  <div className="text-xs font-bold font-mono text-zinc-100 mt-0.5">
                    {mockStats.totalAttempts}
                  </div>
                </div>
                <div className="bg-zinc-850/60 border border-zinc-800/80 rounded-lg py-1 px-1">
                  <div className="text-[9px] font-mono uppercase text-zinc-400 font-medium">Avg Score</div>
                  <div className="text-xs font-bold font-mono text-amber-400 mt-0.5">
                    {mockStats.avgScore}<span className="text-[9px] text-zinc-500 font-normal">/300</span>
                  </div>
                </div>
                <div className="bg-zinc-850/60 border border-zinc-800/80 rounded-lg py-1 px-1">
                  <div className="text-[9px] font-mono uppercase text-zinc-400 font-medium">Accuracy</div>
                  <div className="text-xs font-bold font-mono text-emerald-400 mt-0.5">
                    {mockStats.avgAccuracy}%
                  </div>
                </div>
              </div>

              {/* Prep Shortcuts */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => navigate('/mistakes')}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-850/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-[10px] font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  <span>Mistake Vault</span>
                </button>

                <button
                  onClick={() => navigate('/formulas')}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-850/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-[10px] font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Speed Drills</span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: MAIN WORKSPACE */}
        <main className="w-full lg:col-span-8 xl:col-span-9 min-w-0 space-y-5 pb-16 sm:pb-20">

          {/* VIEW 1: FULL TESTS DIRECTORY */}
          <AnimatePresence mode="wait">
          {activeNav === 'full_tests' && (
            <motion.div
              key="full_tests"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
            <div className="space-y-5">
              <div className="bg-zinc-900/50 rounded-2xl p-5 sm:p-6 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-lg font-bold text-white font-display">Full JEE Grand CBT Mocks</h2>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Authentic 3-hour, 75-question multi-subject simulations mirroring the official NTA JEE pattern.
                  </p>
                </div>

                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={testSearchQuery}
                    onChange={(e) => setTestSearchQuery(e.target.value)}
                    placeholder="Search full mocks..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Full Test Cards List */}
              <div className="flex flex-col gap-3 w-full">
                {filteredFullTests.map(test => (
                  <MockTestCard
                    key={test.id}
                    test={test}
                    attemptStats={attemptStatsByTest.get(test.id) || attemptStatsByTest.get(test.name)}
                    onStart={handleStartTest}
                    onPrint={(t) => setSelectedTestForPrint(t)}
                    onDelete={(id) => setTestToDelete(id)}
                    isCustom={customMockTests.some(t => t.id === test.id)}
                    navigate={navigate}
                  />
                ))}
              </div>

              {filteredFullTests.length === 0 && (
                <div className="bg-zinc-900/40 rounded-2xl p-12 text-center border border-zinc-800/80">
                  <Search className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-zinc-300 font-display">No Full Tests Found</h4>
                  <p className="text-xs text-zinc-500 mt-1">
                    Try adjusting your search query or generate a new custom mock test.
                  </p>
                </div>
              )}
            </div>
            </motion.div>
          )}

          {/* VIEW 2: PYQ PAPERS DIRECTORY */}
          {activeNav === 'pyq' && (
            <motion.div
              key="pyq"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
            <div className="space-y-5">
              <div className="bg-zinc-900/50 rounded-2xl p-5 sm:p-6 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-sky-400" />
                    <h2 className="text-lg font-bold text-white font-display">Official PYQ Shift Papers</h2>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Real past year papers formatted as authentic Computer Based Tests.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="relative min-w-[200px]">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={testSearchQuery}
                      onChange={(e) => setTestSearchQuery(e.target.value)}
                      placeholder="Search PYQ papers..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500/50 transition-all font-mono"
                    />
                  </div>

                  <button
                    onClick={() => setShowPyqPaperModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold bg-zinc-900 hover:bg-zinc-850 text-sky-300 border border-zinc-800 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload PYQ</span>
                  </button>
                </div>
              </div>

              {/* PYQ Cards List */}
              <div className="flex flex-col gap-3 w-full">
                {filteredPyqTests.map(test => (
                  <MockTestCard
                    key={test.id}
                    test={test}
                    attemptStats={attemptStatsByTest.get(test.id) || attemptStatsByTest.get(test.name)}
                    onStart={handleStartTest}
                    onPrint={(t) => setSelectedTestForPrint(t)}
                    onDelete={(id) => setTestToDelete(id)}
                    isCustom={customMockTests.some(t => t.id === test.id)}
                    navigate={navigate}
                  />
                ))}
              </div>

              {filteredPyqTests.length === 0 && (
                <div className="bg-zinc-900/40 rounded-2xl p-12 text-center border border-zinc-800/80">
                  <FileText className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-zinc-300 font-display">No PYQ Papers Available</h4>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                    Click "Upload PYQ" to parse an official NTA question paper PDF directly into a full CBT test.
                  </p>
                </div>
              )}
            </div>
            </motion.div>
          )}

          {/* VIEW 3: PCM SUBJECT CHAPTER-FIRST EXPLORER */}
          {isPcmSubject && (
            <motion.div
              key={`pcm-${currentSubject}-${selectedChapterId || 'dir'}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
            <div className="space-y-5">
              {/* SUB-VIEW 3A: CHAPTERS DIRECTORY (Default for PCM subjects) */}
              {!selectedChapterId && (
                <>
                  {/* Subject Hero Header Bar */}
                  <div className="bg-zinc-900/50 rounded-2xl p-5 sm:p-6 border border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                        currentSubject === 'physics'
                          ? 'bg-sky-950/60 border-sky-800/60 text-sky-400'
                          : currentSubject === 'chemistry'
                          ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
                          : 'bg-indigo-950/60 border-indigo-800/60 text-indigo-400'
                      }`}>
                        {currentSubject === 'physics' && <Atom className="w-5 h-5" />}
                        {currentSubject === 'chemistry' && <FlaskConical className="w-5 h-5" />}
                        {currentSubject === 'maths' && <Calculator className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base sm:text-lg font-bold text-white font-display capitalize">
                            {currentSubject} Chapters
                          </h2>
                          <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
                            {currentSubjectChapters.length} Chapters
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Select any chapter below to inspect targeted practice tests, coaching DPPs, or generate custom drills.
                        </p>
                      </div>
                    </div>

                    {/* Filter & Sprint Controls */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Search box */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={chapterSearchQuery}
                          onChange={(e) => setChapterSearchQuery(e.target.value)}
                          placeholder={`Search ${currentSubject} chapters...`}
                          className="pl-8 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
                        />
                      </div>

                      {/* Unit filter */}
                      {availableUnits.length > 0 && (
                        <select
                          value={selectedUnit}
                          onChange={(e) => setSelectedUnit(e.target.value)}
                          className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 focus:outline-none font-mono"
                        >
                          <option value="all" className="bg-zinc-900">All Units</option>
                          {availableUnits.map(unit => (
                            <option key={unit} value={unit} className="bg-zinc-900">{unit}</option>
                          ))}
                        </select>
                      )}

                      {/* Subject sprint shortcut */}
                      <button
                        onClick={() => {
                          setStudioInitialMode('SUBJECT_SPRINT');
                          setStudioInitialSubject(currentSubject);
                          setShowStudio(true);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                          currentSubject === 'physics'
                            ? 'bg-zinc-900 text-sky-300 border-zinc-800 hover:bg-zinc-850'
                            : currentSubject === 'chemistry'
                            ? 'bg-zinc-900 text-emerald-300 border-zinc-800 hover:bg-zinc-850'
                            : 'bg-zinc-900 text-indigo-300 border-zinc-800 hover:bg-zinc-850'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Subject Sprint (25 Qs)</span>
                      </button>
                    </div>
                  </div>

                  {/* Chapters Full-Width List */}
                  <div className="flex flex-col gap-3 w-full">
                    {filteredChapters.map(chapter => {
                      const testsForChapter = allAvailableTests.filter(t => isTestForChapter(t, chapter.name, currentSubject, chapter.id));
                      const weightageNum = chapter.weightage ?? 4;
                      const approxQs = Math.max(1, Math.round(weightageNum / 3.3));
                      const isHighYield = chapter.priority === 1;

                      return (
                        <div
                          key={chapter.id}
                          onClick={() => setSelectedChapterId(chapter.id)}
                          className="group relative w-full bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          {/* Left: Metadata, Title, Stats & Progress Bar */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                              {isHighYield && (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-700/50 text-amber-300 flex items-center gap-1 shrink-0">
                                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                                  <span>High Yield (P1)</span>
                                </span>
                              )}

                              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border shrink-0 ${
                                chapter.difficulty === 'Hard'
                                  ? 'bg-rose-950/40 text-rose-300 border-rose-800/50'
                                  : chapter.difficulty === 'Medium'
                                  ? 'bg-amber-950/40 text-amber-300 border-amber-800/50'
                                  : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
                              }`}>
                                {chapter.difficulty || 'Medium'}
                              </span>

                              <span className="text-zinc-500 uppercase tracking-wider font-semibold">
                                {chapter.unit || 'Core Unit'}
                              </span>

                              <span className="text-zinc-600">•</span>
                              <span className="text-zinc-400">
                                Weightage: {weightageNum}% (~{approxQs} Qs)
                              </span>

                              <span className="text-zinc-600">•</span>
                              <span className="text-zinc-400">
                                {chapter.solvedQuestions ?? 0} Qs Solved
                              </span>

                              {chapter.pyqsComplete ? (
                                <>
                                  <span className="text-zinc-600">•</span>
                                  <span className="text-emerald-400 font-medium">✓ PYQs Done</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-zinc-600">•</span>
                                  <span className="text-zinc-500">PYQs Pending</span>
                                </>
                              )}

                              {chapter.revisionStage && (
                                <>
                                  <span className="text-zinc-600">•</span>
                                  <span className="text-sky-400 font-medium">{chapter.revisionStage}</span>
                                </>
                              )}
                            </div>

                            <h3 className="text-sm sm:text-base font-bold text-zinc-100 group-hover:text-white font-display transition-colors truncate">
                              {chapter.name}
                            </h3>

                            {/* Syllabus Completion bar & Confidence */}
                            <div className="flex items-center gap-3 max-w-md">
                              <div className="flex-1 h-1.5 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    currentSubject === 'physics' ? 'bg-sky-400' : currentSubject === 'chemistry' ? 'bg-emerald-400' : 'bg-indigo-400'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(5, chapter.completion || 0))}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                                {chapter.completion || 0}% Mastery
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                                • {chapter.confidence ?? chapter.completion ?? 0}% Confidence
                              </span>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center justify-between md:justify-end gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-800/80 shrink-0">
                            <span className="text-xs font-mono text-zinc-400 group-hover:text-zinc-200 transition-colors flex items-center gap-1.5 bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-zinc-800">
                              <BookOpen className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-400" />
                              <span>{testsForChapter.length} {testsForChapter.length === 1 ? 'Test' : 'Tests'}</span>
                            </span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDppForChapter(currentSubject, chapter.id, chapter.name);
                              }}
                              title="Upload DPP for this chapter"
                              className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-mono font-medium text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                            >
                              <FileUp className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="hidden sm:inline">Upload DPP</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenStudioForChapter(currentSubject, chapter.id);
                              }}
                              title="Quick Drill Generator"
                              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>Drill</span>
                            </button>

                            <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all hidden sm:block" />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {filteredChapters.length === 0 && (
                    <div className="bg-zinc-900/40 rounded-2xl p-12 text-center border border-zinc-800/80">
                      <Search className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                      <h4 className="text-sm font-bold text-zinc-300 font-display">No Chapters Match "{chapterSearchQuery}"</h4>
                      <p className="text-xs text-zinc-500 mt-1">
                        Try searching for a different keyword or reset unit filter.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* SUB-VIEW 3B: DRILLED-DOWN CHAPTER TESTS */}
              {selectedChapterId && activeChapter && (
                <div className="space-y-5">
                  {/* Breadcrumb & Navigation Bar */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedChapterId(null)}
                      className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-400 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-850 px-3.5 py-1.5 rounded-xl border border-zinc-800 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 text-indigo-400" />
                      <span>Back to {currentSubject.toUpperCase()} Chapters</span>
                    </button>

                    <div className="text-xs font-mono text-zinc-400">
                      {currentSubject.toUpperCase()} &gt; {activeChapter.unit}
                    </div>
                  </div>

                  {/* Chapter Hero Summary Banner */}
                  <div className="bg-zinc-900/50 rounded-2xl p-5 sm:p-6 border border-zinc-800/80 relative overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
                            {activeChapter.unit || 'Core Unit'}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-indigo-400 bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
                            {activeChapter.completion || 0}% Mastery
                          </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white font-display mt-2">
                          {activeChapter.name}
                        </h2>
                        <p className="text-xs text-zinc-400 mt-1">
                          Practice tests, high-yield concept workouts, and uploaded DPP worksheets for this chapter.
                        </p>
                      </div>

                      {/* Chapter Actions (NO gradients) */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          onClick={() => handleOpenStudioForChapter(currentSubject, activeChapter.id)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/50 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                        >
                          <Zap className="w-4 h-4" />
                          <span>Generate Chapter Drill (15 Qs)</span>
                        </button>

                        <button
                          onClick={() => handleOpenDppForChapter(currentSubject, activeChapter.id, activeChapter.name)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer"
                        >
                          <FileUp className="w-4 h-4 text-emerald-400" />
                          <span>Upload DPP</span>
                        </button>

                        {customChapterTests.length > 0 && (
                          <button
                            onClick={() => setIsConfirmDeleteChapterTestsOpen(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 hover:text-rose-100 transition-all cursor-pointer"
                            title={`Delete all ${customChapterTests.length} custom tests for this chapter`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>Delete All Tests ({customChapterTests.length})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Chapter Test Filter Tabs & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setChapterTestFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                          chapterTestFilter === 'all'
                            ? 'bg-zinc-800 text-white border-zinc-700 shadow-sm'
                            : 'bg-zinc-900/60 text-zinc-400 border-zinc-850 hover:bg-zinc-850 hover:text-zinc-200'
                        }`}
                      >
                        <span>All Tests</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                          {chapterFilterCounts.all}
                        </span>
                      </button>
                      <button
                        onClick={() => setChapterTestFilter('dpp')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                          chapterTestFilter === 'dpp'
                            ? 'bg-emerald-950/60 text-emerald-200 border-emerald-700/60 shadow-sm'
                            : 'bg-zinc-900/60 text-zinc-400 border-zinc-850 hover:bg-zinc-850 hover:text-zinc-200'
                        }`}
                      >
                        <FileText className="w-3 h-3 text-emerald-400" />
                        <span>Coaching DPPs</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                          {chapterFilterCounts.dpp}
                        </span>
                      </button>
                      <button
                        onClick={() => setChapterTestFilter('drill')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                          chapterTestFilter === 'drill'
                            ? 'bg-indigo-950/60 text-indigo-200 border-indigo-700/60 shadow-sm'
                            : 'bg-zinc-900/60 text-zinc-400 border-zinc-850 hover:bg-zinc-850 hover:text-zinc-200'
                        }`}
                      >
                        <Zap className="w-3 h-3 text-indigo-400" />
                        <span>AI Drills</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                          {chapterFilterCounts.drill}
                        </span>
                      </button>
                      <button
                        onClick={() => setChapterTestFilter('official')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                          chapterTestFilter === 'official'
                            ? 'bg-amber-950/60 text-amber-200 border-amber-700/60 shadow-sm'
                            : 'bg-zinc-900/60 text-zinc-400 border-zinc-850 hover:bg-zinc-850 hover:text-zinc-200'
                        }`}
                      >
                        <GraduationCap className="w-3 h-3 text-amber-400" />
                        <span>Official PYQs</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60">
                          {chapterFilterCounts.official}
                        </span>
                      </button>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={testSearchQuery}
                        onChange={(e) => setTestSearchQuery(e.target.value)}
                        placeholder="Search chapter tests..."
                        className="w-full bg-zinc-900/70 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 font-sans"
                      />
                    </div>
                  </div>

                  {/* Chapter Test Cards List */}
                  <div className="flex flex-col gap-3 w-full">
                    {activeChapterTests.map(test => (
                      <MockTestCard
                        key={test.id}
                        test={test}
                        attemptStats={attemptStatsByTest.get(test.id) || attemptStatsByTest.get(test.name)}
                        onStart={handleStartTest}
                        onPrint={(t) => setSelectedTestForPrint(t)}
                        onDelete={(id) => setTestToDelete(id)}
                        isCustom={customMockTests.some(t => t.id === test.id)}
                        navigate={navigate}
                      />
                    ))}
                  </div>

                  {/* Empty state for chapter */}
                  {activeChapterTests.length === 0 && (
                    <div className="bg-zinc-900/40 rounded-2xl p-10 text-center border border-zinc-800/80 space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-indigo-400">
                        <Target className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white font-display">No Custom Drills for {activeChapter.name} Yet</h4>
                        <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                          Generate a targeted 15-question AI drill or upload a coaching DPP worksheet to practice this chapter.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-3 pt-2">
                        <button
                          onClick={() => handleOpenStudioForChapter(currentSubject, activeChapter.id)}
                          className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all cursor-pointer"
                        >
                          Generate 15-Q Drill
                        </button>
                        <button
                          onClick={() => handleOpenDppForChapter(currentSubject, activeChapter.name)}
                          className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 transition-all cursor-pointer"
                        >
                          Upload Coaching DPP
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            </motion.div>
          )}

          {/* VIEW 4: PAST ATTEMPTS (AUTOPSY CHRONOLOGY) */}
          {activeNav === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
            <div className="space-y-5">
              <div className="bg-zinc-900/50 rounded-2xl p-5 sm:p-6 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-rose-400" />
                    <h2 className="text-lg font-bold text-white font-display">Past Test Attempts</h2>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Review your completed mock test attempts, scores, and question solutions.
                  </p>
                </div>

                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="Search past attempts..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-rose-500/50 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Timeline Container */}
              {filteredPastAttempts.length > 0 ? (
                <div className="relative pl-6 sm:pl-8 border-l border-zinc-800/80 space-y-6">
                  {filteredPastAttempts.map((mock) => {
                    const testDuration = mock.duration || 180;
                    const pct = mock.totalQuestions > 0 ? Math.round((mock.totalScore / (mock.totalQuestions * 4)) * 100) : 0;
                    const accuracy = mock.attempted > 0 ? Math.round((mock.correct / mock.attempted) * 100) : 0;

                    return (
                      <div key={mock.id} className="relative group">
                        {/* Timeline node */}
                        <div className="absolute -left-[31px] sm:-left-[39px] top-6 w-4 h-4 rounded-full bg-zinc-950 border-2 border-rose-500 group-hover:scale-125 transition-transform" />

                        <div className="bg-zinc-900/40 hover:bg-zinc-900/60 rounded-2xl p-5 border border-zinc-800/80 hover:border-zinc-700 transition-all shadow-md space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/50">
                                  Completed
                                </span>
                                <span className="text-[10px] font-mono text-zinc-500">
                                  {mock.date}
                                </span>
                              </div>
                              <h3 className="text-base font-bold text-white font-display mt-1">
                                {mock.title}
                              </h3>
                            </div>

                            <div className="text-right">
                              <div className="text-xl font-black font-display text-white">
                                {mock.totalScore}
                                <span className="text-xs font-normal text-zinc-500 ml-1">/ {mock.totalQuestions * 4}</span>
                              </div>
                              <div className="text-[10px] font-mono text-zinc-400">
                                {accuracy}% Accuracy • {pct}% Score
                              </div>
                            </div>
                          </div>

                          {/* Subject Breakdown Badges */}
                          {mock.subjectBreakdown && (
                            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-zinc-800/80">
                              {Object.entries(mock.subjectBreakdown).map(([subj, data]) => {
                                const isPhysics = subj.toLowerCase().includes('phys');
                                const isChemistry = subj.toLowerCase().includes('chem');
                                return (
                                  <div
                                    key={subj}
                                    className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                                      isPhysics
                                        ? 'bg-sky-950/40 border-sky-800/50 text-sky-300'
                                        : isChemistry
                                        ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                                        : 'bg-indigo-950/40 border-indigo-800/50 text-indigo-300'
                                    }`}
                                  >
                                    <span className="font-bold capitalize">{subj}:</span>
                                    <span>{data.score} M ({(data as any).accuracy !== undefined ? (data as any).accuracy : (data.attempted > 0 ? Math.round((data.correct / data.attempted) * 100) : 0)}%)</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center justify-between pt-2">
                            <div className="text-xs font-mono text-zinc-500">
                              {mock.duration} Mins Elapsed
                            </div>

                            <div className="flex items-center gap-2">
                              {mock.testSnapshot && (
                                <button
                                  onClick={() => handleStartTest({ ...mock.testSnapshot!, id: `retake-${mock.id}-${Date.now()}` })}
                                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-mono text-zinc-300 transition-colors cursor-pointer"
                                >
                                  Retake Test
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteAttempt(mock.id)}
                                className="p-2 rounded-xl bg-zinc-900 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-800/50 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Delete this attempt and all associated data"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => navigate(`/mock-tests/result/${mock.id}`)}
                                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold tracking-wider uppercase transition-colors shadow-sm cursor-pointer"
                              >
                                View Solutions & Scorecard
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : historySearchQuery.trim() !== '' && mocks.length > 0 ? (
                <div className="bg-zinc-900/40 rounded-2xl p-12 text-center border border-zinc-800/80">
                  <Search className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-zinc-300 font-display">No Matches Found</h4>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                    No past attempts match &ldquo;{historySearchQuery}&rdquo;. Try a different search term or clear the filter.
                  </p>
                  <button
                    onClick={() => setHistorySearchQuery('')}
                    className="mt-4 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-zinc-900 border border-zinc-800 text-rose-300 hover:bg-zinc-850 cursor-pointer"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                <div className="bg-zinc-900/40 rounded-2xl p-12 text-center border border-zinc-800/80">
                  <History className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-zinc-300 font-display">No Past Attempts Recorded</h4>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                    Take your first mock test or chapter drill to see your scores and question solutions here.
                  </p>
                  <button
                    onClick={() => handleSelectNav('full_tests')}
                    className="mt-4 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-zinc-900 border border-zinc-800 text-indigo-300 hover:bg-zinc-850 cursor-pointer"
                  >
                    View Available Tests
                  </button>
                </div>
              )}
            </div>
            </motion.div>
          )}
          </AnimatePresence>

        </main>
      </div>

      {/* MODALS */}
      <MockTestGeneratorStudio
          isOpen={showStudio}
          onClose={() => setShowStudio(false)}
          onTestGenerated={handleTestGeneratedFromStudio}
          onOpenPyqUploader={() => setShowPyqPaperModal(true)}
          initialMode={studioInitialMode}
          initialSubject={studioInitialSubject}
        />

      <UploadPyqPaperModal
          isOpen={showPyqPaperModal}
          onClose={() => setShowPyqPaperModal(false)}
          onTestCreated={(test) => {
            setShowPyqPaperModal(false);
            handleStartTest(test);
          }}
        />

      <UploadDppModal
          isOpen={showDppModal}
          onClose={() => setShowDppModal(false)}
          onTestCreated={(test) => {
            setShowDppModal(false);
            handleStartTest(test);
          }}
          initialSubject={dppInitialSubject}
          initialChapterId={dppInitialChapterId}
          initialChapterName={dppInitialChapterName}
        />

      {selectedTestForPrint && (
        <PrintableTestPaperModal
          isOpen={!!selectedTestForPrint}
          onClose={() => setSelectedTestForPrint(null)}
          test={selectedTestForPrint}
        />
      )}

      {selectedTestForBriefing && (
        <ExamBriefingModal
          isOpen={!!selectedTestForBriefing}
          test={selectedTestForBriefing}
          onConfirm={handleConfirmStartExam}
          onCancel={() => setSelectedTestForBriefing(null)}
        />
      )}

      {testToDelete && (
        <ConfirmDeleteModal
          isOpen={!!testToDelete}
          onClose={() => setTestToDelete(null)}
          onConfirm={() => handleDeleteTest(testToDelete)}
          title="Delete Mock Test"
          message="Are you sure you want to delete this custom test? This action cannot be undone."
        />
      )}

      {isConfirmDeleteChapterTestsOpen && activeChapter && (
        <ConfirmDeleteModal
          isOpen={isConfirmDeleteChapterTestsOpen}
          onClose={() => setIsConfirmDeleteChapterTestsOpen(false)}
          onConfirm={handleDeleteAllChapterTests}
          title={`Delete All Tests for ${activeChapter.name}?`}
          message={`Are you sure you want to permanently delete all ${customChapterTests.length} custom tests and DPP worksheets created for this chapter? Default curriculum seeds and official mock papers will remain unaffected.`}
          confirmLabel={`Delete All (${customChapterTests.length})`}
        />
      )}
    </div>
  );
}

