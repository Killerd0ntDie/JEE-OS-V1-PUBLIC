
import { 
  AlertTriangle, Clock, LayoutGrid, X 
} from 'lucide-react';
import { MockTest, MockTestAttempt } from '../../types/mockTest';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';

import { TestForensicsSection } from './components/TestForensicsSection';
import { PrintableTestPaperModal } from './components/PrintableTestPaperModal';
import { MockTestAiMentorModal } from './components/MockTestAiMentorModal';
import { useResultAnalytics } from './hooks/useResultAnalytics';
import { ResultHeader } from './components/result/ResultHeader';
import { QuestionReviewSection } from './components/result/QuestionReviewSection';
import { StatTile, Button } from '@/components/ui';
import { calculateMockMasteryMetrics, calculateSubjectAccuracy } from '@jee-os/engines';

interface MockTestResultProps {
  test: MockTest;
  attempt: MockTestAttempt;
  onClose: () => void;
  onNavigate?: (pageId: import('../../types').PageId) => void;
}

export function MockTestResult({ test, attempt, onClose, onNavigate }: MockTestResultProps) {
  const chapters = useStudyBrainStore(state => state.chapters) || [];

  const {
    activeTab,
    selectedSubject,
    setSelectedSubject,
    statusFilter,
    setStatusFilter,
    activeQuestionIdx,
    showPrintModal,
    setShowPrintModal,
    isPaletteOpen,
    setIsPaletteOpen,
    workspaceMode,
    setWorkspaceMode,
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
  } = useResultAnalytics({
    test,
    attempt,
    chapters
  });

  return (
    <div className="w-full space-y-4 text-left font-sans select-none pb-12">
      {/* 1. TOP APP BAR */}
      <ResultHeader
        testName={test.name}
        questionCount={analysis.detailedQuestions.length}
        totalScore={analysis.totalScore}
        totalMarks={test.totalMarks}
        accuracyRate={accuracyRate}
        activeTab={activeTab}
        handleTabChange={handleTabChange}
        onClose={onClose}
        onNavigate={onNavigate}
        correctCount={analysis.correct}
        incorrectCount={analysis.incorrect}
        setShowPrintModal={setShowPrintModal}
      />

      {/* 2. MAIN BODY: QUESTIONS STUDIO OR EXAM FORENSICS */}
      {activeTab === 'questions' ? (
        <QuestionReviewSection
          test={test}
          analysis={analysis}
          presentSubjects={presentSubjects}
          selectedSubject={selectedSubject}
          setSelectedSubject={setSelectedSubject}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          workspaceMode={workspaceMode}
          setWorkspaceMode={setWorkspaceMode}
          filteredQuestions={filteredQuestions}
          currentQItem={currentQItem}
          activeQuestionIdx={activeQuestionIdx}
          handleQuestionChange={handleQuestionChange}
          setIsPaletteOpen={setIsPaletteOpen}
          customExplanations={customExplanations}
          isGeneratingExplanation={isGeneratingExplanation}
          handleGenerateAiExplanation={handleGenerateAiExplanation}
          mistakeTags={mistakeTags}
          handleSetMistakeTag={handleSetMistakeTag}
          pinnedQuestions={pinnedQuestions}
          setPinnedQuestions={setPinnedQuestions}
          reattemptAnswers={reattemptAnswers}
          setReattemptAnswers={setReattemptAnswers}
          revealedReattempts={revealedReattempts}
          setRevealedReattempts={setRevealedReattempts}
          revealedHints={revealedHints}
          setRevealedHints={setRevealedHints}
          setMentorInitialPrompt={setMentorInitialPrompt}
          setIsMentorModalOpen={setIsMentorModalOpen}
          setShowPrintModal={setShowPrintModal}
          onNavigate={onNavigate}
          activeBtnRef={activeBtnRef}
        />
      ) : (
        /* 2. TAB B: UNIFIED EXAM FORENSICS & SCORE AUTOPSY */
        <div className="space-y-6 text-left">
          {(() => {
            const masteryMetrics = calculateMockMasteryMetrics(analysis.totalScore, analysis.whatIfScore, test.totalMarks);
            const safeTotalMarks = test.totalMarks > 0 ? test.totalMarks : 1;
            const baseWidth = Math.max(0, Math.min(100, (analysis.totalScore / safeTotalMarks) * 100));
            const deltaWidth = Math.max(0, Math.min(100, (masteryMetrics.avoidablePenalty / safeTotalMarks) * 100));

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* LEFT COLUMN: HERO SCORE-UPLIFT MATRIX */}
                <div className="lg:col-span-7 bg-surface-1 border border-border-subtle rounded-2xl p-5 space-y-4 shadow-xl">
                  {/* Score Summary Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <StatTile
                      label="Actual Score"
                      value={`${analysis.totalScore} / ${test.totalMarks}`}
                      subtext={`Mastery: ${masteryMetrics.masteryLevel}%`}
                      accent="cyan"
                      tabular
                    />
                    <StatTile
                      label={test.totalMarks >= 150 ? "Predicted AIR" : "Simulated Rank"}
                      value={analysis.actualRank ? `#${analysis.actualRank.toLocaleString()}` : `${masteryMetrics.masteryLevel}%`}
                      subtext={test.totalMarks >= 150 ? "JEE Cutoff Calibration" : "Full Potential"}
                      accent="violet"
                      tabular
                    />
                    <StatTile
                      label="What-If Zero-Penalty"
                      value={`${analysis.whatIfScore} / ${test.totalMarks}`}
                      subtext={`+${masteryMetrics.avoidablePenalty} Marks Trapped`}
                      accent="amber"
                      tabular
                    />
                  </div>

                  {/* Progress bar visual comparison */}
                  <div className="space-y-2 pt-2 border-t border-border-subtle">
                    <div className="w-full h-3 rounded-full bg-surface-2 border border-border-subtle overflow-hidden relative">
                      <div 
                        className="h-full bg-cyan-500 rounded-full transition-all duration-700" 
                        style={{ width: `${baseWidth}%` }}
                      />
                      <div 
                        className="h-full bg-amber-400/40 absolute top-0 rounded-r-full transition-all duration-700" 
                        style={{ 
                          left: `${baseWidth}%`,
                          width: `${deltaWidth}%`
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs font-mono text-zinc-400">
                      <span>Baseline Score ({analysis.totalScore})</span>
                      <span className="text-amber-400 font-semibold tabular-nums">+{masteryMetrics.avoidablePenalty} Marks Recoverable ({analysis.incorrect} Mistakes)</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: STRATEGIC TIME ALLOCATION */}
                <div className="lg:col-span-5 bg-surface-1 border border-border-subtle rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                    <span className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      Exam Time Allocation
                    </span>
                    <span className="text-xs font-mono text-zinc-400 tabular-nums">
                      Total: {Math.round((analysis.totalTimeSpent || (analysis as any).totalDurationSeconds || 0) / 60)}m
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center">
                    {Object.entries(analysis.subjectStats || {}).map(([subj, stats]: [string, any]) => {
                      const timeM = Math.round((stats.timeSpentSeconds || 0) / 60);
                      const acc = calculateSubjectAccuracy(stats.correct, stats.attempted);
                      const colorClass = subj.toLowerCase().includes('phys') ? 'text-sky-400' : subj.toLowerCase().includes('chem') ? 'text-emerald-400' : 'text-amber-400';
                      return (
                        <div key={subj} className="p-3 rounded-xl bg-surface-2 border border-border-subtle space-y-1">
                          <span className="text-2xs font-mono text-zinc-400 block uppercase capitalize">{subj}</span>
                          <div className={`text-base font-mono font-bold tabular-nums ${colorClass}`}>
                            {timeM}m
                          </div>
                          <span className="text-2xs font-mono text-zinc-400 block tabular-nums">
                            {acc}% Acc
                          </span>
                        </div>
                      );
                    })}
                  </div>

              {/* Action Callout */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="md"
                  onClick={() => {
                    handleTabChange('questions');
                    setStatusFilter('INCORRECT');
                    handleQuestionChange(0);
                  }}
                  className="w-full gap-2 font-mono text-xs font-bold"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Review {analysis.incorrect} Negative Mark Traps Now</span>
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

          {/* 2B. DEEP TEST FORENSICS COMPONENT */}
          <TestForensicsSection 
            analysis={analysis} 
            onSelectQuestion={(qIdx) => {
              handleTabChange('questions');
              handleQuestionChange(qIdx);
            }} 
          />
        </div>
      )}

      {/* 3. MODAL: INTERACTIVE QUESTION PALETTE MATRIX (OVERLAY) */}
      {isPaletteOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-elevated border border-border-strong rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-indigo-400" />
                <h3 className="font-display font-bold text-white text-base">Question Palette Matrix</h3>
                <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  {filteredQuestions.length} Questions
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPaletteOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 text-center">
              <div className="flex items-center justify-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>{analysis.correct} Correct</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>{analysis.incorrect} Mistakes</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-600"></span>
                <span>{analysis.unattempted} Skipped</span>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 overflow-y-auto custom-scrollbar p-1 flex-1">
              {filteredQuestions.map((item, idx) => {
                const isSelected = idx === activeQuestionIdx;
                return (
                  <button
                    key={item.question.id}
                    type="button"
                    onClick={() => {
                      handleQuestionChange(idx);
                      setIsPaletteOpen(false);
                    }}
                    className={`h-11 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center relative border ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-400 text-white ring-2 ring-indigo-400/50 scale-105 shadow-lg shadow-indigo-600/40 z-10'
                        : item.isCorrect
                        ? 'bg-emerald-950/60 border-emerald-800/70 text-emerald-300 hover:bg-emerald-900/60'
                        : item.isIncorrect
                        ? 'bg-rose-950/60 border-rose-800/70 text-rose-300 hover:bg-rose-900/60'
                        : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200'
                    }`}
                  >
                    <span>{item.globalIndex}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-zinc-850 flex items-center justify-between text-xs text-zinc-400 font-mono">
              <span>Press <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-300">P</kbd> or click to close</span>
              <button
                type="button"
                onClick={() => setIsPaletteOpen(false)}
                className="px-3 py-1 bg-zinc-900 hover:bg-zinc-850 text-white rounded-lg border border-zinc-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL: AUTHENTIC PRINTABLE TEST BOOKLET (PDF EXPORT) */}
      {showPrintModal && (
        <PrintableTestPaperModal
          test={test}
          isOpen={showPrintModal}
          detailedQuestions={analysis.detailedQuestions}
          onClose={() => setShowPrintModal(false)}
          defaultMode="COMPLETE"
        />
      )}

      {/* 3B. MODAL: IN-MODAL AI MENTOR QUICK CHAT */}
      <MockTestAiMentorModal
        isOpen={isMentorModalOpen}
        onClose={() => setIsMentorModalOpen(false)}
        anchorRef={aiMentorBtnRef}
        initialPrompt={mentorInitialPrompt}
        context={{
          testName: test.name,
          questionNumber: currentQItem?.globalIndex,
          subject: currentQItem?.sectionSubject,
          chapter: currentQItem?.question.chapter,
          topic: currentQItem?.question.topic,
          questionContent: currentQItem?.question.content,
          options: currentQItem?.question.options,
          correctAnswer: currentQItem?.question.correctAnswer,
          studentAnswer: currentQItem?.attempt.selectedAnswer,
          explanation: currentQItem?.question.explanation,
          score: analysis.totalScore,
          totalMarks: test.totalMarks,
          accuracy: accuracyRate
        }}
      />
    </div>
  );
}
