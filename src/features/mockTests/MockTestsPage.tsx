import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useNavigate, useSearchParams, } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { MockTest, MockTestAttempt } from '../../types/mockTest';
import { MockTestArena } from './MockTestArena';
import { MockGeneratorMode } from './services/MockTestGeneratorService';
import { MockTestEvaluatingScreen } from './components/MockTestEvaluatingScreen';
import { AuthContext } from '@/features/auth';
import { v4 as uuidv4 } from 'uuid';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { MockResult, SubjectId, Chapter } from '../../types/index';
import { evaluateMockAttempt } from '@/utils/mockScoring';
import { INITIAL_CHAPTERS } from '@/constants/initialSeeds';
import { mockTest1 } from '@/data/mockTests/jeeMain2024Shift1';
import { storageAdapter } from '@/services/StorageAdapter';

import {
  getMockTestCategory,
  isTestForChapter,
  renderMathText,
  MockTestEngineState,
  MockTabMode,
  MockCategoryShelf,
  MockNavCategory
} from './utils/mockTestCategorization';

import { InterruptedSessionBanner, ActiveSessionData } from './components/catalog/InterruptedSessionBanner';
import { MockDirectorySidebar } from './components/catalog/MockDirectorySidebar';
import { FullTestsCatalogView } from './components/catalog/FullTestsCatalogView';
import { PyqTestsCatalogView } from './components/catalog/PyqTestsCatalogView';
import { SubjectChaptersDirectory } from './components/catalog/SubjectChaptersDirectory';
import { PastAttemptsTimeline } from './components/catalog/PastAttemptsTimeline';
import { MockModalsContainer } from './components/catalog/MockModalsContainer';

export { getMockTestCategory, isTestForChapter, renderMathText };
export type { MockTestEngineState, MockTabMode, MockCategoryShelf, MockNavCategory };

interface MockTestsPageProps {
  onNavigate?: (pageId: import('../../types').PageId) => void;
  defaultView?: 'landing' | 'result';
}

export function MockTestsPage({ onNavigate: _onNavigate, defaultView: _defaultView }: MockTestsPageProps) {
  const actions = useStudyBrainStore(state => state.actions);
  const customMockTests = useStudyBrainStore(state => state.customMockTests);
  const storeMocks = useStudyBrainStore(state => state.mocks) || [];
  const mocks = storeMocks;

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

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Preparation telemetry stats from past attempts
  const mockStats = useMemo(() => {
    if (mocks.length === 0) {
      return { totalAttempts: 0, avgScore: 0, bestScore: 0, avgAccuracy: 0 };
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
  const [_studioInitialChapterId, setStudioInitialChapterId] = useState<string | undefined>(undefined);
  const [dppInitialSubject, setDppInitialSubject] = useState<SubjectId | undefined>(undefined);
  const [dppInitialChapterId, setDppInitialChapterId] = useState<string | undefined>(undefined);
  const [dppInitialChapterName, setDppInitialChapterName] = useState<string | undefined>(undefined);
  const [chapterTestFilter, setChapterTestFilter] = useState<'all' | 'dpp' | 'drill' | 'official'>('all');
  const [isConfirmDeleteChapterTestsOpen, setIsConfirmDeleteChapterTestsOpen] = useState(false);

  const authContext = useContext(AuthContext);
  const userId = authContext?.user?.uid || 'guest';

  // All available tests pool - sorted newest created tests first
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
  const [activeSession, setActiveSession] = useState<ActiveSessionData | null>(null);
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
      storageAdapter.removeItem(`jeeos_mock_attempt_${userId}_${testId}`);
      storageAdapter.removeItem(`jeeos_mock_end_${userId}_${testId}`);
      storageAdapter.removeItem(`jeeos_mock_pos_${userId}_${testId}`);
      storageAdapter.removeItem(`jeeos_mock_infractions_${userId}_${testId}`);
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
        storageAdapter.removeItem(`jeeos_mock_attempt_${uid}_${attemptId}`);
        storageAdapter.removeItem(`jeeos_mock_end_${uid}_${attemptId}`);
        storageAdapter.removeItem(`jeeos_mock_pos_${uid}_${attemptId}`);
        storageAdapter.removeItem(`jeeos_mock_infractions_${uid}_${attemptId}`);
        storageAdapter.removeItem(`jeeos_mock_result_${attemptId}`);
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
        storageAdapter.removeItem(`jeeos_mock_attempt_${uid}_${currentTest.id}`);
        storageAdapter.removeItem(`jeeos_mock_end_${uid}_${currentTest.id}`);
        storageAdapter.removeItem(`jeeos_mock_pos_${uid}_${currentTest.id}`);
        storageAdapter.removeItem(`jeeos_mock_infractions_${uid}_${currentTest.id}`);
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
        if (savedResult?.id) {
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
        const keys = storageAdapter.getAllKeys();
        for (const key of keys) {
          if (key.startsWith(prefix)) {
            const testId = key.substring(prefix.length);
            const endTimeStr = storageAdapter.getItem<string>(key);
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

  // Full tests pool
  const fullTests = useMemo(() => {
    return allAvailableTests.filter(test => {
      if (test.source === 'pyq' || test.category === 'pyq' || test.id.startsWith('pyq_') || test.name?.toLowerCase().includes('(pyq cbt paper)')) {
        return false;
      }
      const cat = getMockTestCategory(test);
      const name = (test.name || '').toLowerCase();
      return cat === 'grand' || test.sections.length > 1 || name.includes('grand') || name.includes('full') || test.durationMinutes >= 120;
    });
  }, [allAvailableTests]);

  // PYQ papers pool
  const pyqTests = useMemo(() => {
    return allAvailableTests.filter(test => {
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
                            (c.unit?.toLowerCase().includes(chapterSearchQuery.toLowerCase()));
      const matchesUnit = selectedUnit === 'all' || c.unit === selectedUnit;
      return matchesSearch && matchesUnit;
    });
  }, [isPcmSubject, currentSubjectChapters, chapterSearchQuery, selectedUnit]);

  // All custom tests for active chapter
  const customChapterTests = useMemo(() => {
    if (!activeChapter) return [];
    return allAvailableTests.filter(test => {
      const isMatch = isTestForChapter(test, activeChapter.name, currentSubject, activeChapter.id);
      const isCustomTest = test.isCustom || (customMockTests?.some(ct => ct.id === test.id));
      return isMatch && isCustomTest;
    });
  }, [activeChapter, allAvailableTests, currentSubject, customMockTests]);

  const handleDeleteAllChapterTests = async () => {
    if (!customChapterTests || customChapterTests.length === 0) return;
    try {
      await actions.deleteChapterCustomMockTests(customChapterTests.map(t => t.id));
      setIsConfirmDeleteChapterTestsOpen(false);
    } catch (e) {
      console.error("Failed to delete all chapter tests:", e);
    }
  };

  // Filter counts for active chapter
  const chapterFilterCounts = useMemo(() => {
    if (!activeChapter) return { all: 0, dpp: 0, drill: 0, official: 0 };
    const chapterTests = allAvailableTests.filter(test => isTestForChapter(test, activeChapter.name, currentSubject, activeChapter.id));
    let dpp = 0, drill = 0, official = 0;
    chapterTests.forEach(test => {
      const _isCustomTest = test.isCustom || (customMockTests?.some(ct => ct.id === test.id));
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

      const isCustomTest = test.isCustom || (customMockTests?.some(ct => ct.id === test.id));
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
      <InterruptedSessionBanner
        activeSession={activeSession}
        onDiscard={handleDiscardActiveSession}
        onResume={handleResumeActiveSession}
      />

      {/* 2-COLUMN MASTER-DETAIL LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: NAVIGATION & ACTIONS DIRECTORY */}
        <MockDirectorySidebar
          activeNav={activeNav}
          onSelectNav={handleSelectNav}
          onOpenStudio={() => {
            setStudioInitialMode('FULL_JEE');
            setShowStudio(true);
          }}
          onOpenPyqUpload={() => setShowPyqPaperModal(true)}
          onOpenDppUpload={() => {
            setDppInitialSubject(undefined);
            setDppInitialChapterId(undefined);
            setDppInitialChapterName(undefined);
            setShowDppModal(true);
          }}
          fullTestsCount={fullTests.length}
          pyqTestsCount={pyqTests.length}
          physicsChaptersCount={physicsChapters.length}
          chemistryChaptersCount={chemistryChapters.length}
          mathsChaptersCount={mathsChapters.length}
          pastAttemptsCount={mocks.length}
          mockStats={mockStats}
          onNavigateToMistakes={() => navigate('/mistakes')}
          onNavigateToFormulas={() => navigate('/formulas')}
        />

        {/* RIGHT COLUMN: MAIN WORKSPACE */}
        <main className="w-full lg:col-span-8 xl:col-span-9 min-w-0 space-y-5 pb-16 sm:pb-20">
          <AnimatePresence mode="wait">
            {activeNav === 'full_tests' && (
              <FullTestsCatalogView
                tests={filteredFullTests}
                searchQuery={testSearchQuery}
                onSearchChange={setTestSearchQuery}
                attemptStatsByTest={attemptStatsByTest}
                customMockTests={customMockTests}
                onStartTest={handleStartTest}
                onPrintTest={(t) => setSelectedTestForPrint(t)}
                onDeleteTest={(id) => setTestToDelete(id)}
                navigate={navigate}
              />
            )}

            {activeNav === 'pyq' && (
              <PyqTestsCatalogView
                tests={filteredPyqTests}
                searchQuery={testSearchQuery}
                onSearchChange={setTestSearchQuery}
                onOpenPyqUpload={() => setShowPyqPaperModal(true)}
                attemptStatsByTest={attemptStatsByTest}
                customMockTests={customMockTests}
                onStartTest={handleStartTest}
                onPrintTest={(t) => setSelectedTestForPrint(t)}
                onDeleteTest={(id) => setTestToDelete(id)}
                navigate={navigate}
              />
            )}

            {isPcmSubject && (
              <SubjectChaptersDirectory
                currentSubject={currentSubject}
                currentSubjectChapters={currentSubjectChapters}
                selectedChapterId={selectedChapterId}
                onSelectChapterId={setSelectedChapterId}
                chapterSearchQuery={chapterSearchQuery}
                onChapterSearchChange={setChapterSearchQuery}
                selectedUnit={selectedUnit}
                onSelectedUnitChange={setSelectedUnit}
                availableUnits={availableUnits}
                filteredChapters={filteredChapters}
                activeChapter={activeChapter}
                allAvailableTests={allAvailableTests}
                activeChapterTests={activeChapterTests}
                chapterTestFilter={chapterTestFilter}
                onChapterTestFilterChange={setChapterTestFilter}
                chapterFilterCounts={chapterFilterCounts}
                testSearchQuery={testSearchQuery}
                onTestSearchQueryChange={setTestSearchQuery}
                customChapterTests={customChapterTests}
                attemptStatsByTest={attemptStatsByTest}
                customMockTests={customMockTests}
                onStartTest={handleStartTest}
                onPrintTest={(t) => setSelectedTestForPrint(t)}
                onDeleteTest={(id) => setTestToDelete(id)}
                onOpenStudioForChapter={handleOpenStudioForChapter}
                onOpenDppForChapter={handleOpenDppForChapter}
                onOpenStudioForSubjectSprint={(subj) => {
                  setStudioInitialMode('SUBJECT_SPRINT');
                  setStudioInitialSubject(subj);
                  setShowStudio(true);
                }}
                onRequestDeleteAllChapterTests={() => setIsConfirmDeleteChapterTestsOpen(true)}
                navigate={navigate}
              />
            )}

            {activeNav === 'history' && (
              <PastAttemptsTimeline
                mocks={mocks}
                searchQuery={historySearchQuery}
                onSearchChange={setHistorySearchQuery}
                onStartTest={handleStartTest}
                onDeleteAttempt={handleDeleteAttempt}
                onViewSolutions={(id) => navigate(`/mock-tests/result/${id}`)}
                onGoToAvailableTests={() => handleSelectNav('full_tests')}
              />
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* MODALS */}
      <MockModalsContainer
        showStudio={showStudio}
        onCloseStudio={() => setShowStudio(false)}
        onTestGeneratedFromStudio={handleTestGeneratedFromStudio}
        onOpenPyqFromStudio={() => setShowPyqPaperModal(true)}
        studioInitialMode={studioInitialMode}
        studioInitialSubject={studioInitialSubject}
        showPyqPaperModal={showPyqPaperModal}
        onClosePyqPaperModal={() => setShowPyqPaperModal(false)}
        onPyqTestCreated={(test) => {
          setShowPyqPaperModal(false);
          handleStartTest(test);
        }}
        showDppModal={showDppModal}
        onCloseDppModal={() => setShowDppModal(false)}
        onDppTestCreated={(test) => {
          setShowDppModal(false);
          handleStartTest(test);
        }}
        dppInitialSubject={dppInitialSubject}
        dppInitialChapterId={dppInitialChapterId}
        dppInitialChapterName={dppInitialChapterName}
        selectedTestForPrint={selectedTestForPrint}
        onClosePrintModal={() => setSelectedTestForPrint(null)}
        selectedTestForBriefing={selectedTestForBriefing}
        onConfirmStartExam={handleConfirmStartExam}
        onCancelBriefing={() => setSelectedTestForBriefing(null)}
        testToDelete={testToDelete}
        onCloseDeleteModal={() => setTestToDelete(null)}
        onConfirmDeleteTest={() => testToDelete && handleDeleteTest(testToDelete)}
        isConfirmDeleteChapterTestsOpen={isConfirmDeleteChapterTestsOpen}
        onCloseDeleteChapterTestsModal={() => setIsConfirmDeleteChapterTestsOpen(false)}
        onConfirmDeleteChapterTests={handleDeleteAllChapterTests}
        activeChapter={activeChapter}
        customChapterTestsCount={customChapterTests.length}
      />
    </div>
  );
}
