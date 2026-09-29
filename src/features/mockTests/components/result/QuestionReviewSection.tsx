import React from 'react';
import { BookOpen, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import { SubjectId, PageId } from '../../../../types';
import { MockTest } from '../../../../types/mockTest';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { EvaluatedMockQuestion } from '@/utils/mockScoring';
import { storageAdapter } from '@/services/StorageAdapter';
import {
  QuestionReviewControlStrip,
  QuestionReviewCard,
  QuestionSolutionCard,
  QuestionPaletteScroll,
  BlindReattemptCard
} from './review';

export interface QuestionReviewSectionProps {
  test: MockTest;
  analysis: any;
  presentSubjects: SubjectId[];
  selectedSubject: 'ALL' | SubjectId;
  setSelectedSubject: (sub: 'ALL' | SubjectId) => void;
  statusFilter: 'ALL' | 'CORRECT' | 'INCORRECT' | 'UNATTEMPTED';
  setStatusFilter: (filter: 'ALL' | 'CORRECT' | 'INCORRECT' | 'UNATTEMPTED') => void;
  workspaceMode: 'split' | 'reader' | 'reattempt';
  setWorkspaceMode: (mode: 'split' | 'reader' | 'reattempt') => void;
  filteredQuestions: EvaluatedMockQuestion[];
  currentQItem: EvaluatedMockQuestion | undefined;
  activeQuestionIdx: number;
  handleQuestionChange: (newIdx: number) => void;
  setIsPaletteOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  customExplanations: Record<string, string>;
  isGeneratingExplanation: Record<string, boolean>;
  handleGenerateAiExplanation: (qItem: EvaluatedMockQuestion) => Promise<void>;
  mistakeTags: Record<string, string>;
  handleSetMistakeTag: (qId: string, tagId: string) => void;
  pinnedQuestions: Record<string, boolean>;
  setPinnedQuestions: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  reattemptAnswers: Record<string, string>;
  setReattemptAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  revealedReattempts: Record<string, boolean>;
  setRevealedReattempts: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  revealedHints: Record<string, boolean>;
  setRevealedHints: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setMentorInitialPrompt: (prompt: string) => void;
  setIsMentorModalOpen: (open: boolean) => void;
  setShowPrintModal: (open: boolean) => void;
  onNavigate?: (pageId: PageId) => void;
  activeBtnRef: React.RefObject<HTMLButtonElement | null>;
}

export function QuestionReviewSection({
  test,
  analysis,
  presentSubjects,
  selectedSubject,
  setSelectedSubject,
  statusFilter,
  setStatusFilter,
  workspaceMode,
  setWorkspaceMode,
  filteredQuestions,
  currentQItem,
  activeQuestionIdx,
  handleQuestionChange,
  setIsPaletteOpen,
  customExplanations,
  isGeneratingExplanation,
  handleGenerateAiExplanation,
  mistakeTags,
  handleSetMistakeTag,
  pinnedQuestions,
  setPinnedQuestions,
  reattemptAnswers,
  setReattemptAnswers,
  revealedReattempts,
  setRevealedReattempts,
  revealedHints,
  setRevealedHints,
  setMentorInitialPrompt,
  setIsMentorModalOpen,
  setShowPrintModal,
  onNavigate,
  activeBtnRef
}: QuestionReviewSectionProps) {
  const actions = useStudyBrainStore(state => state.actions);

  const extractKeyFormula = (explanation?: string) => {
    if (!explanation) return 'Refer to the step-by-step analytical derivation for core formulas.';
    const formulaMatch = explanation.match(/(?:\*\*Key Concept[^*]*\*\*|\*\*Formula[^*]*\*\*):?\s*([^\n]+)/i);
    if (formulaMatch) return formulaMatch[1].trim();
    const mathMatches = explanation.match(/\$\$[\s\S]*?\$\$|\$[^$\n]+?\$/g);
    if (mathMatches && mathMatches.length > 0) {
      return mathMatches.slice(0, 3).join('   •   ');
    }
    return 'Apply fundamental conservation laws, steric geometry rules, and standard JEE identities.';
  };

  const handleAskMentor = (prompt: string) => {
    if (onNavigate) {
      storageAdapter.setSession('jeeos_pending_coach_prompt', prompt);
      onNavigate('ai-coach');
    } else {
      setMentorInitialPrompt(prompt);
      setIsMentorModalOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* 2A. CONTROL STRIP */}
      <QuestionReviewControlStrip
        test={test}
        analysis={analysis}
        presentSubjects={presentSubjects}
        selectedSubject={selectedSubject}
        setSelectedSubject={setSelectedSubject}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        workspaceMode={workspaceMode}
        setWorkspaceMode={setWorkspaceMode}
        onQuestionChange={handleQuestionChange}
        setIsPaletteOpen={setIsPaletteOpen}
      />

      {/* 2B. WORKSPACE RENDERING */}
      {!currentQItem ? (
        <div className="p-16 text-center bg-[#101116] border border-zinc-800/90 rounded-3xl space-y-3">
          <BookOpen className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-display font-bold text-white">No Questions in Current Filter</h3>
          <p className="text-xs font-mono text-zinc-400">Try switching your status filter or clearing subject selection.</p>
        </div>
      ) : workspaceMode === 'split' ? (
        /* MODE 1: SPLIT COCKPIT */
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start min-w-0">
            {/* LEFT COLUMN: QUESTION CARD */}
            <div className="lg:col-span-6 space-y-4 min-w-0">
              <QuestionReviewCard
                qItem={currentQItem}
                test={test}
                mistakeTags={mistakeTags}
                onSetMistakeTag={handleSetMistakeTag}
                pinnedQuestions={pinnedQuestions}
                setPinnedQuestions={setPinnedQuestions}
                onAskAiMentor={(prompt) => {
                  setMentorInitialPrompt(prompt);
                  setIsMentorModalOpen(true);
                }}
                actions={actions}
              />
            </div>

            {/* RIGHT COLUMN: SOLUTION CARD */}
            <div className="lg:col-span-6 space-y-4 min-w-0">
              <QuestionSolutionCard
                qItem={currentQItem}
                customExplanation={customExplanations[currentQItem.question.id]}
                isGenerating={!!isGeneratingExplanation[currentQItem.question.id]}
                onGenerate={handleGenerateAiExplanation}
                onAskAi={() => {
                  setMentorInitialPrompt(`Explain the key steps and intuition for Question ${currentQItem.globalIndex}.`);
                  setIsMentorModalOpen(true);
                }}
                onOpenPalette={() => setIsPaletteOpen(true)}
                onOpenPdf={() => setShowPrintModal(true)}
              />
            </div>
          </div>

          {/* DOCKED BOTTOM NAVIGATION BAR */}
          <div className="bg-[#101116] border border-zinc-800/90 rounded-2xl p-3 shadow-md flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleQuestionChange(Math.max(0, activeQuestionIdx - 1))}
              disabled={activeQuestionIdx === 0}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 border border-zinc-800 text-zinc-200 cursor-pointer transition-colors flex items-center gap-2 text-xs font-mono font-bold"
              title="Previous Question (← or H)"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <span className="text-white font-bold">Q.{currentQItem.globalIndex}</span>
                <span className="text-zinc-600">/</span>
                <span>{filteredQuestions.length} Questions in Filter</span>
              </div>

              <button
                type="button"
                onClick={() => setIsPaletteOpen(true)}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 cursor-pointer"
                title="Open Full Question Palette Matrix (P)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleQuestionChange(Math.min(filteredQuestions.length - 1, activeQuestionIdx + 1))}
              disabled={activeQuestionIdx === filteredQuestions.length - 1}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white cursor-pointer transition-colors flex items-center gap-2 text-xs font-mono font-bold shadow-md shadow-indigo-600/30"
              title="Next Question (→ or L)"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : workspaceMode === 'reader' ? (
        /* MODE 2: READER STREAM */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start min-w-0">
          <div className="lg:col-span-8 space-y-5 min-w-0">
            <QuestionReviewCard
              qItem={currentQItem}
              test={test}
              mistakeTags={mistakeTags}
              onSetMistakeTag={handleSetMistakeTag}
              pinnedQuestions={pinnedQuestions}
              setPinnedQuestions={setPinnedQuestions}
              onAskAiMentor={handleAskMentor}
              actions={actions}
            />

            <QuestionSolutionCard
              qItem={currentQItem}
              customExplanation={customExplanations[currentQItem.question.id]}
              isGenerating={!!isGeneratingExplanation[currentQItem.question.id]}
              onGenerate={handleGenerateAiExplanation}
              onAskAi={() => handleAskMentor(`Explain the key steps and intuition for Question ${currentQItem.globalIndex}.`)}
              onOpenPalette={() => setIsPaletteOpen(true)}
              onOpenPdf={() => setShowPrintModal(true)}
            />

            <div className="bg-[#101116] border border-zinc-800/90 rounded-2xl p-3 shadow-md flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleQuestionChange(Math.max(0, activeQuestionIdx - 1))}
                disabled={activeQuestionIdx === 0}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 border border-zinc-800 text-zinc-200 cursor-pointer transition-colors flex items-center gap-2 text-xs font-mono font-bold"
                title="Previous Question (← or H)"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <span className="text-white font-bold">Q.{currentQItem.globalIndex}</span>
                <span className="text-zinc-600">/</span>
                <span>{filteredQuestions.length} Questions in Filter</span>
              </div>

              <button
                type="button"
                onClick={() => handleQuestionChange(Math.min(filteredQuestions.length - 1, activeQuestionIdx + 1))}
                disabled={activeQuestionIdx === filteredQuestions.length - 1}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white cursor-pointer transition-colors flex items-center gap-2 text-xs font-mono font-bold shadow-md shadow-indigo-600/30"
                title="Next Question (→ or L)"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* RIGHT: PERSISTENT QUESTION PALETTE */}
          <div className="lg:col-span-4 lg:sticky lg:top-4 space-y-4">
            <QuestionPaletteScroll
              filteredQuestions={filteredQuestions}
              activeQuestionIdx={activeQuestionIdx}
              analysis={analysis}
              pinnedQuestions={pinnedQuestions}
              onQuestionChange={handleQuestionChange}
              activeBtnRef={activeBtnRef}
            />
          </div>
        </div>
      ) : (
        /* MODE 3: BLIND RE-ATTEMPT */
        <div className="space-y-5">
          <BlindReattemptCard
            currentQItem={currentQItem}
            revealedHints={revealedHints}
            setRevealedHints={setRevealedHints}
            revealedReattempts={revealedReattempts}
            setRevealedReattempts={setRevealedReattempts}
            reattemptAnswers={reattemptAnswers}
            setReattemptAnswers={setReattemptAnswers}
            customExplanation={customExplanations[currentQItem.question.id]}
            isGeneratingExplanation={!!isGeneratingExplanation[currentQItem.question.id]}
            onGenerateAiExplanation={handleGenerateAiExplanation}
            extractKeyFormula={extractKeyFormula}
          />

          <div className="max-w-4xl mx-auto bg-[#101116] border border-zinc-800/90 rounded-2xl p-3 shadow-md flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleQuestionChange(Math.max(0, activeQuestionIdx - 1))}
              disabled={activeQuestionIdx === 0}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 border border-zinc-800 text-zinc-200 cursor-pointer text-xs font-mono font-bold flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span className="text-white font-bold">Q.{currentQItem.globalIndex}</span>
              <span className="text-zinc-600">/</span>
              <span>{filteredQuestions.length}</span>
            </div>

            <button
              type="button"
              onClick={() => handleQuestionChange(Math.min(filteredQuestions.length - 1, activeQuestionIdx + 1))}
              disabled={activeQuestionIdx === filteredQuestions.length - 1}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white cursor-pointer text-xs font-mono font-bold flex items-center gap-2"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
