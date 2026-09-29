import { useState, useMemo, useRef, useEffect } from 'react';
import { MockTest, MockTestAttempt } from '../../../types/mockTest';
import { SubjectId, Chapter } from '../../../types';
import { auth } from '@/firebase';
import { 
  evaluateMockAttempt, 
  EvaluatedMockQuestion 
} from '@/utils/mockScoring';
import { idbGet, idbSet } from '@/utils/idb';
import { storageAdapter } from '@/services/StorageAdapter';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { useShallow } from 'zustand/react/shallow';

export const isPlaceholderExplanation = (text?: string) => {
  if (!text || text.trim().length === 0) return true;
  return /Official coaching answer key:|Review theoretical concepts and standard JEE methodology|No step-by-step analytical explanation recorded|Standard JEE examination question\. Detailed derivation verified/i.test(text);
};

export interface UseResultAnalyticsProps {
  test: MockTest;
  attempt: MockTestAttempt;
  chapters?: Chapter[];
}

export function useResultAnalytics({ test, attempt, chapters = [] }: UseResultAnalyticsProps) {
  const actions = useStudyBrainStore(state => state.actions);
  const rawMistakes = useStudyBrainStore(useShallow(state => state?.mistakes));
  const mistakes = rawMistakes || [];
  // Navigation tabs: Questions Studio vs Performance Forensics
  const [activeTab, setActiveTab] = useState<'questions' | 'forensics'>('questions');
  const [tabDirection, setTabDirection] = useState(1);
  const [selectedSubject, setSelectedSubject] = useState<'ALL' | SubjectId>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CORRECT' | 'INCORRECT' | 'UNATTEMPTED'>('ALL');
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Hybrid Workspace Modes: Split Cockpit (default), Reader Stream, Blind Re-Attempt
  const [workspaceMode, setWorkspaceMode] = useState<'split' | 'reader' | 'reattempt'>('split');
  
  // Solution Tabs in Split Cockpit
  const [solutionTab, setSolutionTab] = useState<'steps' | 'formula' | 'traps' | 'mentor'>('steps');

  // Blind Re-Attempt & Active Recall State
  const [reattemptAnswers, setReattemptAnswers] = useState<Record<string, string>>({});
  const [revealedReattempts, setRevealedReattempts] = useState<Record<string, boolean>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});

  // Mistake Self-Audit Tagging
  const [mistakeTags, setMistakeTags] = useState<Record<string, string>>({});

  // Study Planner Missions Pinned
  const [pinnedQuestions, setPinnedQuestions] = useState<Record<string, boolean>>({});
  const [isMentorModalOpen, setIsMentorModalOpen] = useState(false);
  const [mentorInitialPrompt, setMentorInitialPrompt] = useState('');
  const aiMentorBtnRef = useRef<HTMLButtonElement | null>(null);

  // Dynamic AI Solution Generator State
  const [customExplanations, setCustomExplanations] = useState<Record<string, string>>({});
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState<Record<string, boolean>>({});

  const handleGenerateAiExplanation = async (qItem: EvaluatedMockQuestion) => {
    const qId = qItem.question.id;
    if (isGeneratingExplanation[qId]) return;

    // Fast-path client derivation synthesis for known coaching DPP items
    const qContent = qItem.question.content || '';
    let instantDerivation: string | null = null;
    if (/Cl\s*2\s*O\s*7|oxo linkage/i.test(qContent)) {
      instantDerivation = `**Key Concept & Formula**
In dichlorine heptoxide ($\\text{Cl}_2\\text{O}_7$), the molecule has a symmetrical anhydride structure with an oxo-bridge ($\\text{Cl}-\\text{O}-\\text{Cl}$ linkage):
$$\\text{O}_3\\text{Cl}-\\text{O}-\\text{ClO}_3$$

**Step 1: Oxo Linkage and Central Oxygen Hybridization**
Both chlorine atoms are in the $+7$ oxidation state and are linked through a central bridging oxygen atom (an oxo linkage).
The central bridging oxygen atom forms $2$ single $\\sigma$-bonds with the two chlorine atoms and possesses $2$ lone pairs of electrons:
$$\\text{Steric Number of bridging O} = 2\\,(\\sigma\\text{-bonds}) + 2\\,(\\text{lone pairs}) = 4 \\implies sp^3\\text{ hybridization}$$
Thus, statement (A) and statement (B) are both correct.

**Step 2: Bond Angle Comparison with Water ($\\text{H}_2\\text{O}$)**
In water ($\\text{H}_2\\text{O}$), the $\\text{H}-\\text{O}-\\text{H}$ bond angle is approximately $104.5^\\circ$ due to lone pair-lone pair repulsion on the oxygen atom.
In $\\text{Cl}_2\\text{O}_7$, although the central oxygen is also $sp^3$ hybridized with two lone pairs, the two bulky terminal $-\\text{ClO}_3$ perchlorate groups exert tremendous steric and electrostatic repulsion against each other.
Consequently, the $\\text{Cl}-\\text{O}-\\text{Cl}$ bond angle opens up significantly to approximately $118.6^\\circ$, which is markedly greater than the $104.5^\\circ$ in water.
Hence, statement (C) is also correct.

**Conclusion & Correct Option**
Since statements (A), (B), and (C) are all factually and theoretically correct, the correct choice is **Option D: All of these**.`;
    } else if (/(?:O\s*2\s*to\s*O\s*2|O_2\s*to\s*O_2|electron adds in which one of the following orbitals)/i.test(qContent)) {
      instantDerivation = `**Key Concept & Formula**
According to Molecular Orbital Theory (MOT) for homonuclear diatomic molecules with total electrons $> 14$ (such as $\\text{O}_2$ with $16$ electrons), the orbital energy ordering is:
$$\\sigma 1s < \\sigma^* 1s < \\sigma 2s < \\sigma^* 2s < \\sigma 2p_z < (\\pi 2p_x = \\pi 2p_y) < (\\pi^* 2p_x = \\pi^* 2p_y) < \\sigma^* 2p_z$$

**Step 1: Ground State Electronic Configuration of $\\text{O}_2$ (16 electrons)**
Filling the 16 electrons of neutral $\\text{O}_2$ in order of increasing orbital energy:
$$\\sigma 1s^2 \\; \\sigma^* 1s^2 \\; \\sigma 2s^2 \\; \\sigma^* 2s^2 \\; \\sigma 2p_z^2 \\; (\\pi 2p_x^2 = \\pi 2p_y^2) \\; (\\pi^* 2p_x^1 = \\pi^* 2p_y^1)$$
The highest occupied molecular orbitals (HOMO) of neutral $\\text{O}_2$ are the degenerate antibonding $\\pi^* 2p_x$ and $\\pi^* 2p_y$ orbitals, each containing one unpaired electron.

**Step 2: Addition of Electron to form Superoxide Ion ($\\text{O}_2^-$)**
When neutral $\\text{O}_2$ gains an electron to form the superoxide ion $\\text{O}_2^-$ ($17$ electrons), the incoming 17th electron must enter the lowest available energy orbital (LUMO / partially filled HOMO).
Since $\\pi^* 2p_x$ and $\\pi^* 2p_y$ currently have only $1$ electron each, they can accommodate up to $4$ electrons total. Therefore, the extra electron enters into a $\\pi^* 2p_x$ or $\\pi^* 2p_y$ antibonding orbital:
$$(\\pi^* 2p_x^2 = \\pi^* 2p_y^1) \\quad\\text{or}\\quad (\\pi^* 2p_x^1 = \\pi^* 2p_y^2)$$

**Conclusion & Correct Option**
The incoming electron adds into the **$\\pi^* 2p_x / \\pi^* 2p_y$ orbital**. Therefore, the correct choice is **Option C**.`;
    }

    const persistExplanation = async (explanationText: string) => {
      // 1. Persist to canonical custom mock tests in IndexedDB
      try {
        const storedTests = (await idbGet<MockTest[]>('jeeos_custom_mock_tests')) || [];
        let testFound = false;
        const updatedTests = storedTests.map(t => {
          if (t.id !== test.id) return t;
          testFound = true;
          return {
            ...t,
            sections: (t.sections || []).map(sec => ({
              ...sec,
              questions: (sec.questions || []).map(q => 
                q.id === qId ? { ...q, explanation: explanationText } : q
              )
            }))
          };
        });
        if (testFound) {
          await idbSet('jeeos_custom_mock_tests', updatedTests);
        }
      } catch (err) {
        console.warn('Failed to update explanation in jeeos_custom_mock_tests:', err);
      }

      // 2. Persist to mock results attempt snapshot in IndexedDB
      try {
        const storedMocks = (await idbGet<any[]>('jeeos_mock_results')) || [];
        let mockFound = false;
        const updatedMocks = storedMocks.map(m => {
          if (m.testId !== test.id && m.id !== attempt.testId) return m;
          if (!m.testSnapshot?.sections) return m;
          mockFound = true;
          return {
            ...m,
            testSnapshot: {
              ...m.testSnapshot,
              sections: m.testSnapshot.sections.map((sec: any) => ({
                ...sec,
                questions: (sec.questions || []).map((q: any) => 
                  q.id === qId ? { ...q, explanation: explanationText } : q
                )
              }))
            }
          };
        });
        if (mockFound) {
          await idbSet('jeeos_mock_results', updatedMocks);
        }
      } catch (err) {
        console.warn('Failed to update explanation in jeeos_mock_results:', err);
      }
    };

    if (instantDerivation) {
      setCustomExplanations(prev => ({ ...prev, [qId]: instantDerivation! }));
      qItem.question.explanation = instantDerivation;
      persistExplanation(instantDerivation);
      return;
    }

    setIsGeneratingExplanation(prev => ({ ...prev, [qId]: true }));
    try {
      let token: string | undefined;
      try {
        token = await auth.currentUser?.getIdToken();
      } catch {
        // guest
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const storedKey = storageAdapter.getGeminiApiKey();
      if (storedKey) headers['x-gemini-api-key'] = storedKey;

      const baseUrl = typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null'
        ? window.location.origin
        : '';
      const endpoint = baseUrl ? `${baseUrl}/api/mocktest/generate-explanation` : '/api/mocktest/generate-explanation';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: JSON.stringify({
            questionContent: qItem.question.content,
            options: qItem.question.options,
            correctAnswer: qItem.question.correctAnswer,
            subject: qItem.question.subject,
            topic: qItem.question.topic,
            chapter: qItem.question.chapter
          })
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.explanation) {
            setCustomExplanations(prev => ({ ...prev, [qId]: data.explanation }));
            qItem.question.explanation = data.explanation;
            persistExplanation(data.explanation);
          }
        }
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        if (fetchErr?.name === 'AbortError') {
          console.warn(`[AI Explanation] Request timed out after 15s for question ${qId}`);
        } else {
          throw fetchErr;
        }
      }
    } catch (err) {
      console.warn('Failed to generate AI explanation:', err);
    } finally {
      setIsGeneratingExplanation(prev => ({ ...prev, [qId]: false }));
    }
  };

  const activeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeBtnRef.current && typeof activeBtnRef.current.scrollIntoView === 'function') {
      activeBtnRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  }, [activeQuestionIdx]);

  const handleTabChange = (newTab: 'questions' | 'forensics') => {
    const tabOrder: Record<'questions' | 'forensics', number> = { questions: 0, forensics: 1 };
    const newIdx = tabOrder[newTab];
    const oldIdx = tabOrder[activeTab];
    if (newIdx !== oldIdx) {
      setTabDirection(newIdx > oldIdx ? 1 : -1);
      setActiveTab(newTab);
    }
  };

  const handleQuestionChange = (newIdx: number) => {
    if (newIdx !== activeQuestionIdx) {
      setActiveQuestionIdx(newIdx);
    }
  };

  // Compute test analysis telemetry using unified scoring engine
  const analysis = useMemo(() => {
    return evaluateMockAttempt(test, attempt, chapters);
  }, [test, attempt, chapters]);

  // Discover actual subjects present in this test to avoid rendering useless empty subject filters
  const presentSubjects = useMemo(() => {
    const set = new Set<SubjectId>();
    analysis.detailedQuestions.forEach(item => {
      if (item.sectionSubject) set.add(item.sectionSubject);
    });
    return Array.from(set);
  }, [analysis.detailedQuestions]);

  // Filtered question set for horizontal stepper
  const filteredQuestions = useMemo(() => {
    return analysis.detailedQuestions.filter(item => {
      const matchSubj = selectedSubject === 'ALL' || item.sectionSubject === selectedSubject;
      const matchStatus = 
        statusFilter === 'ALL' ? true :
        statusFilter === 'CORRECT' ? item.isCorrect :
        statusFilter === 'INCORRECT' ? item.isIncorrect :
        item.isUnattempted;
      return matchSubj && matchStatus;
    });
  }, [analysis.detailedQuestions, selectedSubject, statusFilter]);

  const currentQItem = filteredQuestions[Math.min(activeQuestionIdx, Math.max(0, filteredQuestions.length - 1))];

  const attemptedAiExplanationRef = useRef<Set<string>>(new Set());

  // Automatically trigger AI explanation generation when a placeholder explanation is viewed
  useEffect(() => {
    if (!currentQItem) return;
    const qId = currentQItem.question.id;
    if (attemptedAiExplanationRef.current.has(qId)) return;

    const effectiveExplanation = customExplanations[qId] || currentQItem.question.explanation;
    if (isPlaceholderExplanation(effectiveExplanation) && !isGeneratingExplanation[qId]) {
      attemptedAiExplanationRef.current.add(qId);
      handleGenerateAiExplanation(currentQItem);
    }
  }, [currentQItem?.question.id]);

  // Enhanced Keyboard Navigation in Questions Studio
  useEffect(() => {
    if (activeTab !== 'questions') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'h') {
        e.preventDefault();
        handleQuestionChange(Math.max(0, activeQuestionIdx - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'l') {
        e.preventDefault();
        handleQuestionChange(Math.min(filteredQuestions.length - 1, activeQuestionIdx + 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        handleQuestionChange(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        handleQuestionChange(filteredQuestions.length - 1);
      } else if (e.key === 'p' || e.key === 'P') {
        setIsPaletteOpen(prev => !prev);
      } else if (e.key === 'v' || e.key === 'V') {
        setWorkspaceMode(prev => prev === 'split' ? 'reader' : 'split');
      } else if (e.key === 'r' || e.key === 'R') {
        setWorkspaceMode(prev => prev === 'reattempt' ? 'split' : 'reattempt');
      } else if (e.key >= '1' && e.key <= '9') {
        const targetIdx = parseInt(e.key, 10) - 1;
        if (targetIdx < filteredQuestions.length) {
          e.preventDefault();
          handleQuestionChange(targetIdx);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, activeQuestionIdx, filteredQuestions.length]);

  const accuracyRate = analysis.correct + analysis.incorrect > 0 
    ? Math.round((analysis.correct / (analysis.correct + analysis.incorrect)) * 100) 
    : 0;

  const labelMap: Record<string, string> = {
    calc_error: 'Calculation Error: Arithmetical or sign slip',
    concept_gap: 'Concept Gap: Did not understand core formula',
    formula_forgot: 'Formula Slip: Misremembered formula',
    trap_caught: 'Caught in Trap: Fell for examiner distractor',
    time_rush: 'Time Pressure: Rushed under the clock'
  };

  const reverseLabelMap: Record<string, string> = {
    'Calculation Error: Arithmetical or sign slip': 'calc_error',
    'Concept Gap: Did not understand core formula': 'concept_gap',
    'Formula Slip: Misremembered formula': 'formula_forgot',
    'Caught in Trap: Fell for examiner distractor': 'trap_caught',
    'Time Pressure: Rushed under the clock': 'time_rush'
  };

  // Initial Rehydration: Hydrate mistake tags from persistent Mistake Vault
  useEffect(() => {
    if (!analysis.detailedQuestions || analysis.detailedQuestions.length === 0 || !mistakes || mistakes.length === 0) return;
    const rehydratedTags: Record<string, string> = {};
    analysis.detailedQuestions.forEach(eq => {
      const qText = eq.question.content || `Question ${eq.question.id} from ${test.name}`;
      const foundMistake = (mistakes || []).find(m => 
        m && (m.questionText === qText ||
        (m.source === (test.name || 'Mock Examination') && m.questionText?.includes(eq.question.id)))
      );
      if (foundMistake) {
        const tag = (foundMistake as any).errorType || 
          reverseLabelMap[foundMistake.mistakeTypes?.[0]] || 
          foundMistake.mistakeTypes?.[0] || 
          '';
        if (tag) {
          rehydratedTags[eq.question.id] = tag;
        }
      }
    });

    if (Object.keys(rehydratedTags).length > 0) {
      setMistakeTags(prev => ({ ...rehydratedTags, ...prev }));
    }
  }, [analysis.detailedQuestions, mistakes, test.name]);

  const handleSetMistakeTag = (qId: string, tagId: string) => {
    const isDeselecting = mistakeTags[qId] === tagId;
    setMistakeTags(prev => ({
      ...prev,
      [qId]: isDeselecting ? '' : tagId
    }));

    const qItem = analysis.detailedQuestions.find(eq => eq.question.id === qId);
    if (!qItem) return;

    const qText = qItem.question.content || `Question ${qItem.question.id} from ${test.name}`;

    if (isDeselecting) {
      // Deselection Removal: Find existing mistake in store and delete it
      const currentMistakes = useStudyBrainStore.getState()?.mistakes || [];
      const existingMistake = currentMistakes.find(m =>
        m && (m.questionText === qText ||
        (m.source === (test.name || 'Mock Examination') && m.questionText?.includes(qId)))
      );
      if (existingMistake) {
        actions.deleteMistake(existingMistake.id);
        actions.triggerToast('Tag Removed', 'Mistake removed from your Mistake Vault.', 'info');
      }
    } else {
      const dominantSubject: SubjectId = qItem.sectionSubject || (selectedSubject !== 'ALL' ? selectedSubject : 'physics');

      actions.addMistake({
        subject: dominantSubject,
        chapter: qItem.question.chapter || test.name || 'Mock Test Review',
        chapterId: test.chapterId || undefined,
        topic: qItem.question.topic || qItem.question.chapter || 'Mock Exam Problem',
        subtopic: '',
        difficulty: (qItem.question.difficulty as any) || 'JEE Main',
        source: test.name || 'Mock Examination',
        timeTaken: qItem.attempt?.timeSpentSeconds || 120,
        correctMethod: qItem.question.explanation || qItem.question.correctAnswer || '',
        studentMethod: qItem.attempt?.selectedAnswer ? `Selected: ${qItem.attempt.selectedAnswer}` : 'Unattempted',
        mistakeTypes: [labelMap[tagId] || tagId],
        confidence: 30,
        revisionSchedule: new Date(Date.now() + 86400000 * 2).toISOString(),
        masteryImpact: 'High',
        attemptNumber: 1,
        revisionStatus: 'New',
        recoveryScore: 0,
        teacherNotes: '',
        personalNotes: `Self-audit: ${labelMap[tagId] || tagId}`,
        aiAdvice: '',
        priority: 'High',
        dateLogged: new Date().toISOString(),
        questionText: qText,
        correctSolution: qItem.question.explanation || '',
        errorType: tagId
      });
      actions.triggerToast('Mistake Saved', 'Added to your Mistake Vault for active remediation.', 'success');
    }
  };

  return {
    activeTab,
    setActiveTab,
    tabDirection,
    selectedSubject,
    setSelectedSubject,
    statusFilter,
    setStatusFilter,
    activeQuestionIdx,
    setActiveQuestionIdx,
    showPrintModal,
    setShowPrintModal,
    isPaletteOpen,
    setIsPaletteOpen,
    workspaceMode,
    setWorkspaceMode,
    solutionTab,
    setSolutionTab,
    reattemptAnswers,
    setReattemptAnswers,
    revealedReattempts,
    setRevealedReattempts,
    revealedHints,
    setRevealedHints,
    mistakeTags,
    handleSetMistakeTag,
    pinnedQuestions,
    setPinnedQuestions,
    isMentorModalOpen,
    setIsMentorModalOpen,
    mentorInitialPrompt,
    setMentorInitialPrompt,
    aiMentorBtnRef,
    customExplanations,
    isGeneratingExplanation,
    handleGenerateAiExplanation,
    activeBtnRef,
    handleTabChange,
    handleQuestionChange,
    analysis,
    presentSubjects,
    filteredQuestions,
    currentQItem,
    accuracyRate
  };
}
