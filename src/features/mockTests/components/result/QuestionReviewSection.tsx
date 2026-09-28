import React from 'react';
import { motion } from 'motion/react';
import { 
  Clock, BookOpen, Check, RotateCcw, Calendar, Printer,
  LayoutGrid, Columns2, Rows3, Tag, Lightbulb, HelpCircle,
  Eye, EyeOff, Brain, CheckCircle2, XCircle, MinusCircle, 
  ChevronLeft, ChevronRight, Sparkles
} from 'lucide-react';
import { SubjectId, PageId } from '../../../../types';
import { MockTest } from '../../../../types/mockTest';
import { RichTextRenderer } from '@/components/MathRenderer';
import { getSubjectTheme } from '@/constants/subjectTheme';
import { springs } from '@/constants/motion';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { 
  formatCorrectAnswerKey, 
  EvaluatedMockQuestion,
  isMultiChoiceQuestion,
  isOptionSelectedInAnswer,
  getAllCorrectOptionIndices
} from '@/utils/mockScoring';
import { AiExplanationCard } from './AiExplanationCard';
import { storageAdapter } from '@/services/StorageAdapter';

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
    const mathMatches = explanation.match(/\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$/g);
    if (mathMatches && mathMatches.length > 0) {
      return mathMatches.slice(0, 3).join('   •   ');
    }
    return 'Apply fundamental conservation laws, steric geometry rules, and standard JEE identities.';
  };

  return (
    <div className="space-y-4">
      {/* 2A. CONTROL STRIP: HYBRID WORKSPACE SWITCHER + STATUS TRIAGE + PALETTE BUTTON */}
      <div className="bg-[#101116] border border-zinc-800/90 rounded-2xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md flex-wrap">
        
        {/* Left: Subject Pills or Test Metadata */}
        <div className="flex items-center gap-2 flex-wrap">
          {presentSubjects.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => { setSelectedSubject('ALL'); handleQuestionChange(0); }}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                  selectedSubject === 'ALL'
                    ? 'bg-zinc-100 text-black shadow-md'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                All Subjects ({analysis.detailedQuestions.length})
              </button>
              {presentSubjects.map(sub => {
                const theme = getSubjectTheme(sub);
                const isSelected = selectedSubject === sub;
                const subCount = analysis.detailedQuestions.filter((q: any) => q.sectionSubject === sub).length;
                const subMarks = analysis.subjectAnalysis[sub]?.score ?? 0;
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => { setSelectedSubject(sub); handleQuestionChange(0); }}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                      isSelected
                        ? `${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText} shadow-md`
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800'
                    }`}
                  >
                    <span className="capitalize">{sub}</span>
                    <span className="text-[10px] opacity-75">({subCount})</span>
                    {subMarks !== undefined && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-950/60">
                        {subMarks}M
                      </span>
                    )}
                  </button>
                );
              })}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase text-indigo-400 bg-indigo-950/60 border border-indigo-800/50 px-2.5 py-1 rounded-lg">
                {presentSubjects[0] || 'Mock Test'}
              </span>
              <span className="text-xs font-mono text-zinc-400">
                {analysis.detailedQuestions.length} Questions • {test.totalMarks} Total Marks
              </span>
            </div>
          )}
        </div>

        {/* Center: Workspace Layout Switcher */}
        <div className="flex items-center gap-1 bg-zinc-950/90 border border-zinc-800/90 p-1 rounded-xl text-xs font-mono self-start md:self-auto">
          <button
            type="button"
            onClick={() => setWorkspaceMode('split')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer text-[11px] ${
              workspaceMode === 'split' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Split Cockpit (Default): 50/50 side-by-side view (Press V to toggle)"
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Split Cockpit</span>
          </button>

          <button
            type="button"
            onClick={() => setWorkspaceMode('reader')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer text-[11px] ${
              workspaceMode === 'reader' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Reader Stream: Spacious vertical flow with sticky palette"
          >
            <Rows3 className="w-3.5 h-3.5" />
            <span>Reader Stream</span>
          </button>

          <button
            type="button"
            onClick={() => setWorkspaceMode('reattempt')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer text-[11px] ${
              workspaceMode === 'reattempt' ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Active Recall: Blind re-solve mistakes before seeing solution"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Blind Re-Attempt</span>
          </button>
        </div>

        {/* Right: Status Filters + Quick Question Matrix Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-zinc-950/80 border border-zinc-800/80 p-1 rounded-xl text-xs font-mono">
            {(['ALL', 'INCORRECT', 'CORRECT', 'UNATTEMPTED'] as const).map(status => {
              const isActive = statusFilter === status;
              const count = 
                status === 'ALL' ? analysis.detailedQuestions.length :
                status === 'CORRECT' ? analysis.correct :
                status === 'INCORRECT' ? analysis.incorrect :
                analysis.unattempted;

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => { setStatusFilter(status); handleQuestionChange(0); }}
                  className={`relative px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer select-none z-10 flex items-center gap-1.5 text-[11px] ${
                    isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeAnalysisStatusFilterGlider"
                      className={`absolute inset-0 rounded-lg -z-10 shadow-sm ${
                        status === 'CORRECT' ? 'bg-emerald-600' :
                        status === 'INCORRECT' ? 'bg-rose-600' :
                        status === 'UNATTEMPTED' ? 'bg-zinc-700' : 'bg-indigo-600'
                      }`}
                      transition={springs.fluid}
                    />
                  )}
                  {status === 'CORRECT' && <CheckCircle2 className="w-3 h-3 text-emerald-300" />}
                  {status === 'INCORRECT' && <XCircle className="w-3 h-3 text-rose-300" />}
                  {status === 'UNATTEMPTED' && <MinusCircle className="w-3 h-3 text-zinc-400" />}
                  <span>
                    {status === 'ALL' ? `All (${count})` :
                     status === 'CORRECT' ? `Correct (${count})` :
                     status === 'INCORRECT' ? `Mistakes (${count})` :
                     `Skipped (${count})`}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIsPaletteOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Open Question Palette Matrix (Press P)"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
            <span>Palette (P)</span>
          </button>
        </div>

      </div>

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
            {/* LEFT COLUMN (6 COLS) */}
            <div className="lg:col-span-6 space-y-4 min-w-0">
              <div className="bg-[#101116] border border-zinc-800/90 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl min-w-0">
                {/* Meta Header */}
                <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-white bg-indigo-950/60 border border-indigo-800/50 px-2.5 py-1 rounded-lg">
                      Q. {currentQItem.globalIndex}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400 font-semibold uppercase">
                      {isMultiChoiceQuestion(currentQItem.question) ? 'Multiple Choice (+4, -1)' : currentQItem.question.type === 'NUMERICAL' ? 'Numerical (+4, 0)' : 'Single Choice (+4, -1)'}
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-[11px] font-mono text-zinc-400 truncate max-w-[180px]">
                      {currentQItem.question.chapter || currentQItem.sectionSubject}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                      currentQItem.isCorrect
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                        : currentQItem.isIncorrect
                        ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}>
                      {currentQItem.isCorrect ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> :
                       currentQItem.isIncorrect ? <XCircle className="w-3 h-3 text-rose-400" /> :
                       <MinusCircle className="w-3 h-3 text-zinc-400" />}
                      <span>
                        {currentQItem.isCorrect ? `+${currentQItem.question.marks.correct} M` : currentQItem.isIncorrect ? `${currentQItem.question.marks.incorrect} M` : '0 M'}
                      </span>
                    </span>

                    <span className="text-zinc-500 text-[11px] font-mono flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-lg">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      <span>{currentQItem.attempt.timeSpentSeconds || 0}s</span>
                    </span>
                  </div>
                </div>

                {/* Question Statement */}
                <div className="text-sm text-zinc-100 leading-relaxed font-sans min-w-0 max-w-full break-words overflow-x-auto custom-scrollbar">
                  <RichTextRenderer content={currentQItem.question.content} imageUrl={currentQItem.question.imageUrl} />
                </div>

                {/* Option Cards */}
                {(currentQItem.question.type === 'MCQ' || currentQItem.question.type === 'MULTI' || (Array.isArray(currentQItem.question.options) && currentQItem.question.options.length > 0)) && currentQItem.question.options && (
                  <div className="space-y-2.5 pt-1">
                    {(() => {
                      const correctIndices = getAllCorrectOptionIndices(currentQItem.question);
                      return currentQItem.question.options.map((opt, optIdx) => {
                        const optKey = String.fromCharCode(65 + optIdx);
                        const isSelected = isOptionSelectedInAnswer(currentQItem.attempt.selectedAnswer, optIdx);
                        const isCorrect = correctIndices.includes(optIdx);

                        let cardStyle = 'bg-zinc-900/40 border-zinc-800/80 text-zinc-300 hover:border-zinc-700/80';
                        if (isCorrect) {
                          cardStyle = 'bg-emerald-950/30 border-emerald-500/60 text-emerald-100 ring-1 ring-emerald-500/30';
                        } else if (isSelected && !isCorrect) {
                          cardStyle = 'bg-rose-950/30 border-rose-500/60 text-rose-100 ring-1 ring-rose-500/30';
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`p-3 rounded-2xl border transition-all duration-200 min-w-0 max-w-full ${cardStyle}`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <span className={`w-5 h-5 rounded-md font-mono text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                isCorrect
                                  ? 'bg-emerald-500 text-black'
                                  : isSelected && !isCorrect
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-zinc-800 text-zinc-300'
                              }`}>
                                {optKey}
                              </span>

                              {isSelected && !isCorrect && (
                                <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-800/60 shrink-0 flex items-center gap-1">
                                  <XCircle className="w-3 h-3" />
                                  <span>YOUR CHOICE</span>
                                </span>
                              )}
                              {isCorrect && isSelected && (
                                <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60 shrink-0 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>YOUR CHOICE (CORRECT)</span>
                                </span>
                              )}
                              {isCorrect && !isSelected && (
                                <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800/60 shrink-0 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>CORRECT ANSWER</span>
                                </span>
                              )}
                            </div>

                            <div className="text-xs sm:text-[13px] font-sans leading-relaxed min-w-0 break-words overflow-x-auto overflow-y-visible py-1 custom-scrollbar">
                              <RichTextRenderer content={opt} optIndex={optIdx} questionContent={currentQItem.question.content} />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}

                {/* Numerical Comparison */}
                {currentQItem.question.type === 'NUMERICAL' && (
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-xs font-mono">
                    <div className="space-y-1">
                      <span className="text-zinc-500 uppercase font-bold text-[10px] block">Your Value:</span>
                      <div className={`text-sm font-bold ${currentQItem.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {currentQItem.attempt.selectedAnswer || 'Not Attempted'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-zinc-500 uppercase font-bold text-[10px] block">Official Key:</span>
                      <div className="text-sm font-bold text-emerald-400">
                        {currentQItem.question.correctAnswer}
                      </div>
                    </div>
                  </div>
                )}

                {/* Self-Audit Mistake Tagging Strip */}
                {currentQItem.isIncorrect && (
                  <div className="p-3 bg-zinc-950/80 border border-rose-900/40 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-rose-300 flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-rose-400" />
                        Self-Audit: Why did you lose marks?
                      </span>
                      {mistakeTags[currentQItem.question.id] && (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                          Logged
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'calc_error', label: '🔢 Calc Slip', desc: 'Arithmetical or sign slip' },
                        { id: 'concept_gap', label: '🧠 Concept Gap', desc: 'Didn’t understand core formula' },
                        { id: 'formula_forgot', label: '📐 Formula Slip', desc: 'Misremembered formula' },
                        { id: 'trap_caught', label: '🪤 Caught in Trap', desc: 'Fell for examiner distractor' },
                        { id: 'time_rush', label: '⏱️ Time Pressure', desc: 'Rushed under the clock' }
                      ].map(tag => {
                        const isSelected = mistakeTags[currentQItem.question.id] === tag.id;
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => handleSetMistakeTag(currentQItem.question.id, tag.id)}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-semibold transition-all border cursor-pointer ${
                              isSelected
                                ? 'bg-rose-950 border-rose-500 text-rose-200 ring-1 ring-rose-500/50'
                                : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                            }`}
                            title={tag.desc}
                          >
                            {tag.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Question Action Row */}
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between font-mono text-xs flex-wrap gap-2">
                  {(() => {
                    const isPinned = !!pinnedQuestions[currentQItem.question.id];
                    const chapterName = currentQItem.question.chapter || 'Chapter Revision';
                    const topicName = currentQItem.question.topic || chapterName;
                    const recommendedDuration = Math.max(15, Math.min(45, Math.ceil(((currentQItem.attempt.timeSpentSeconds || 120) * 1.5) / 60 / 5) * 5));

                    return (
                      <button
                        type="button"
                        disabled={isPinned}
                        onClick={async () => {
                          await actions.addCustomMission({
                            taskName: `Fix Mistake: ${topicName} (Q${currentQItem.globalIndex})`,
                            subject: currentQItem.sectionSubject,
                            chapter: chapterName,
                            type: 'Review Mistakes',
                            duration: recommendedDuration,
                            xp: 40
                          });
                          setPinnedQuestions(prev => ({ ...prev, [currentQItem.question.id]: true }));
                        }}
                        className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                          isPinned
                            ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300 font-bold'
                            : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-300 hover:text-white'
                        }`}
                      >
                        {isPinned ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Pinned to Revision Notebook ({recommendedDuration}m)</span>
                          </>
                        ) : (
                          <>
                            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Bookmark for Revision ({recommendedDuration}m)</span>
                          </>
                        )}
                      </button>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => {
                      setMentorInitialPrompt(`Can you explain the intuition and step-by-step approach for Question ${currentQItem.globalIndex}?`);
                      setIsMentorModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Ask AI Mentor to explain this exact question"
                  >
                    <Brain className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Ask AI Mentor</span>
                  </button>
                </div>

              </div>
            </div>

            {/* RIGHT COLUMN (6 COLS): DETAILED SOLUTION STUDIO */}
            <div className="lg:col-span-6 space-y-4 min-w-0">
              <div className="bg-[#101116] border border-indigo-900/40 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl min-w-0">
                <div className="border-b border-zinc-800/80 pb-3 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-white font-display">
                      Detailed Solution & Derivation
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-lg">
                      Key: {formatCorrectAnswerKey(currentQItem.question.correctAnswer)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setMentorInitialPrompt(`Explain the key steps and intuition for Question ${currentQItem.globalIndex}.`);
                        setIsMentorModalOpen(true);
                      }}
                      className="px-2 py-1 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Ask AI Mentor about this solution"
                    >
                      <Brain className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="hidden sm:inline text-[11px]">Ask AI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPaletteOpen(true)}
                      className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Open Question Palette Matrix (Press P)"
                    >
                      <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="hidden sm:inline text-[11px]">Palette (P)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPrintModal(true)}
                      className="p-1 sm:px-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      title="Print Authentic NTA Exam Booklet & Solutions (PDF)"
                    >
                      <Printer className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="hidden sm:inline text-[11px]">PDF</span>
                    </button>
                  </div>
                </div>

                {/* Direct Detailed Solution Body */}
                <div className="min-w-0">
                  <AiExplanationCard
                    qItem={currentQItem}
                    customExplanation={customExplanations[currentQItem.question.id]}
                    isGenerating={!!isGeneratingExplanation[currentQItem.question.id]}
                    onGenerate={handleGenerateAiExplanation}
                  />
                </div>
              </div>
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
            {/* QUESTION CARD */}
            <div className="bg-[#101116] border border-zinc-800/90 rounded-3xl p-5 sm:p-7 space-y-6 shadow-xl min-w-0">
              <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-3 flex-wrap">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-sm font-bold text-white bg-indigo-950/60 border border-indigo-800/50 px-3 py-1 rounded-lg">
                    Q. {currentQItem.globalIndex}
                  </span>
                  <span className="text-xs font-mono text-zinc-400 font-semibold uppercase tracking-wider">
                    {isMultiChoiceQuestion(currentQItem.question) ? 'Multiple Choice (+4, -1)' : currentQItem.question.type === 'NUMERICAL' ? 'Numerical (+4, 0)' : 'Single Choice (+4, -1)'}
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-xs font-mono text-zinc-400">
                    {currentQItem.sectionSubject} • {currentQItem.question.chapter}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                    currentQItem.isCorrect
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : currentQItem.isIncorrect
                      ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}>
                    {currentQItem.isCorrect ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> :
                     currentQItem.isIncorrect ? <XCircle className="w-3.5 h-3.5 text-rose-400" /> :
                     <MinusCircle className="w-3.5 h-3.5 text-zinc-400" />}
                    <span>
                      {currentQItem.isCorrect ? `+${currentQItem.question.marks.correct} M` : currentQItem.isIncorrect ? `${currentQItem.question.marks.incorrect} M` : '0 M'}
                    </span>
                  </span>

                  <span className="text-zinc-500 text-xs font-mono flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-lg">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    <span>{currentQItem.attempt.timeSpentSeconds || 0}s</span>
                  </span>
                </div>
              </div>

              <div className="text-sm sm:text-[15px] text-zinc-100 leading-relaxed font-sans min-w-0 max-w-full break-words overflow-x-auto custom-scrollbar p-1">
                <RichTextRenderer content={currentQItem.question.content} imageUrl={currentQItem.question.imageUrl} />
              </div>

              {(currentQItem.question.type === 'MCQ' || currentQItem.question.type === 'MULTI' || (Array.isArray(currentQItem.question.options) && currentQItem.question.options.length > 0)) && currentQItem.question.options && (
                <div className="space-y-3 pt-2">
                  {(() => {
                    const correctIndices = getAllCorrectOptionIndices(currentQItem.question);
                    return currentQItem.question.options.map((opt, optIdx) => {
                      const optKey = String.fromCharCode(65 + optIdx);
                      const isSelected = isOptionSelectedInAnswer(currentQItem.attempt.selectedAnswer, optIdx);
                      const isCorrect = correctIndices.includes(optIdx);

                      let cardStyle = 'bg-zinc-900/40 border-zinc-800/80 text-zinc-300 hover:border-zinc-700/80';
                      if (isCorrect) {
                        cardStyle = 'bg-emerald-950/30 border-emerald-500/60 text-emerald-100 ring-1 ring-emerald-500/30';
                      } else if (isSelected && !isCorrect) {
                        cardStyle = 'bg-rose-950/30 border-rose-500/60 text-rose-100 ring-1 ring-rose-500/30';
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 min-w-0 max-w-full ${cardStyle}`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <span className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                              isCorrect
                                ? 'bg-emerald-500 text-black shadow-sm shadow-emerald-500/40'
                                : isSelected && !isCorrect
                                ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/40'
                                : 'bg-zinc-800 text-zinc-300'
                            }`}>
                              {optKey}
                            </span>

                            {isSelected && !isCorrect && (
                              <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-950/80 px-2.5 py-0.5 rounded-full border border-rose-800/60 shrink-0 flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                <span>YOUR CHOICE</span>
                              </span>
                            )}
                            {isCorrect && isSelected && (
                              <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800/60 shrink-0 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>YOUR CHOICE (CORRECT)</span>
                              </span>
                            )}
                            {isCorrect && !isSelected && (
                              <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800/60 shrink-0 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>CORRECT ANSWER</span>
                              </span>
                            )}
                          </div>

                          <div className="text-xs sm:text-sm font-sans leading-relaxed min-w-0 break-words overflow-x-auto overflow-y-visible py-1 custom-scrollbar">
                            <RichTextRenderer content={opt} optIndex={optIdx} questionContent={currentQItem.question.content} />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {currentQItem.question.type === 'NUMERICAL' && (
                <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-xs font-mono">
                  <div className="space-y-1">
                    <span className="text-zinc-500 uppercase font-bold text-[10px] block">Your Submitted Value:</span>
                    <div className={`text-base font-bold ${currentQItem.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {currentQItem.attempt.selectedAnswer || 'Not Attempted'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-zinc-500 uppercase font-bold text-[10px] block">Official Key Value:</span>
                    <div className="text-base font-bold text-emerald-400">
                      {currentQItem.question.correctAnswer}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between font-mono text-xs flex-wrap gap-2">
                {(() => {
                  const isPinned = !!pinnedQuestions[currentQItem.question.id];
                  const chapterName = currentQItem.question.chapter || 'Chapter Revision';
                  const topicName = currentQItem.question.topic || chapterName;
                  const recommendedDuration = Math.max(15, Math.min(45, Math.ceil(((currentQItem.attempt.timeSpentSeconds || 120) * 1.5) / 60 / 5) * 5));

                  return (
                    <button
                      type="button"
                      disabled={isPinned}
                      onClick={async () => {
                        await actions.addCustomMission({
                          taskName: `Fix Mistake: ${topicName} (Q${currentQItem.globalIndex})`,
                          subject: currentQItem.sectionSubject,
                          chapter: chapterName,
                          type: 'Review Mistakes',
                          duration: recommendedDuration,
                          xp: 40
                        });
                        setPinnedQuestions(prev => ({ ...prev, [currentQItem.question.id]: true }));
                      }}
                      className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                        isPinned
                          ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300 font-bold'
                          : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-300 hover:text-white'
                      }`}
                    >
                      {isPinned ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Pinned to Revision Notebook ({recommendedDuration}m)</span>
                        </>
                      ) : (
                        <>
                          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Bookmark for Revision ({recommendedDuration}m)</span>
                        </>
                      )}
                    </button>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => {
                    const prompt = `I need help understanding Question ${currentQItem.globalIndex} from Mock Test "${test.name}".\n\nQuestion Statement:\n${currentQItem.question.content}\n\nOfficial Answer: ${currentQItem.question.correctAnswer}\n\nMy Attempt: ${currentQItem.attempt.selectedAnswer || 'Skipped'}\n\nCan you explain the intuition, common traps, and how to approach this problem step-by-step?`;
                    storageAdapter.setSession('jeeos_pending_coach_prompt', prompt);
                    onNavigate?.('ai-coach');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Ask AI Mentor to explain this exact question"
                >
                  <Brain className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Ask AI Mentor</span>
                </button>
              </div>
            </div>

            {/* DETAILED SOLUTION BOX */}
            <div className="bg-[#101116] border border-indigo-900/40 rounded-3xl p-5 sm:p-7 space-y-4 shadow-xl min-w-0">
              <div className="border-b border-zinc-800/80 pb-3 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="font-display font-bold text-white text-sm sm:text-base">
                    Detailed Solution & Analytical Breakdown
                  </span>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-lg">
                  Official Key: {formatCorrectAnswerKey(currentQItem.question.correctAnswer)}
                </span>
              </div>

              <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-sans break-words pt-1">
                <AiExplanationCard
                  qItem={currentQItem}
                  customExplanation={customExplanations[currentQItem.question.id]}
                  isGenerating={!!isGeneratingExplanation[currentQItem.question.id]}
                  onGenerate={handleGenerateAiExplanation}
                />
              </div>
            </div>

            {/* BOTTOM NAVIGATION DOCK */}
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

          {/* RIGHT (4 COLS): PERSISTENT QUESTION PALETTE */}
          <div className="lg:col-span-4 lg:sticky lg:top-4 space-y-4">
            <div className="bg-[#101116] border border-zinc-800/90 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="border-b border-zinc-850 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-indigo-400" />
                  <span className="font-display font-bold text-white text-sm">
                    Question Palette
                  </span>
                </div>
                <span className="text-[11px] font-mono font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">
                  {filteredQuestions.length} Questions
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono bg-zinc-950/80 p-2 rounded-xl border border-zinc-850 text-center">
                <div className="flex items-center justify-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>{analysis.correct} Correct</span>
                </div>
                <div className="flex items-center justify-center gap-1 text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>{analysis.incorrect} Wrong</span>
                </div>
                <div className="flex items-center justify-center gap-1 text-zinc-400">
                  <span className="w-2 h-2 rounded-full bg-zinc-600"></span>
                  <span>{analysis.unattempted} Skip</span>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2 max-h-[55vh] overflow-y-auto custom-scrollbar p-1">
                {filteredQuestions.map((item, idx) => {
                  const isSelected = idx === activeQuestionIdx;
                  return (
                    <button
                      key={item.question.id}
                      ref={isSelected ? activeBtnRef : null}
                      type="button"
                      onClick={() => handleQuestionChange(idx)}
                      className={`h-10 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center relative border ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-400 text-white ring-2 ring-indigo-400/50 scale-105 shadow-md shadow-indigo-600/30 z-10'
                          : item.isCorrect
                          ? 'bg-emerald-950/50 border-emerald-800/70 text-emerald-300 hover:bg-emerald-900/60'
                          : item.isIncorrect
                          ? 'bg-rose-950/50 border-rose-800/70 text-rose-300 hover:bg-rose-900/60'
                          : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200'
                      }`}
                      title={`Q${item.globalIndex} (${item.statusLabel})`}
                    >
                      <span>{item.globalIndex}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-zinc-850">
                <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-850 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      Revision Notebook
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {Object.keys(pinnedQuestions).length} pinned
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                    Pin mistakes or key questions directly to your daily study mission for spaced revision.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MODE 3: BLIND RE-ATTEMPT */
        <div className="max-w-4xl mx-auto space-y-5">
          <div className={`p-4 rounded-3xl border flex items-center justify-between gap-4 flex-wrap ${
            currentQItem.isIncorrect
              ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
              : currentQItem.isUnattempted
              ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
              : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
          }`}>
            <div className="flex items-center gap-3">
              <RotateCcw className="w-5 h-5 shrink-0" />
              <div className="space-y-0.5">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wide">
                  {currentQItem.isIncorrect ? '🔴 Mistake Recovery Challenge' :
                   currentQItem.isUnattempted ? '⚪ Unattempted Opportunity' :
                   '🟢 Mastery Confirmation'}
                </h4>
                <p className="text-xs font-sans opacity-90">
                  {currentQItem.isIncorrect
                    ? `You lost marks on this in the exam. Test yourself fresh without looking at the answer!`
                    : currentQItem.isUnattempted
                    ? `You skipped this question during the test. Take 2 minutes to attempt it now!`
                    : `You got this right (+4 M). Try solving it for speed or check alternative methods.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRevealedHints(prev => ({ ...prev, [currentQItem.question.id]: !prev[currentQItem.question.id] }))}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-800/60 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{revealedHints[currentQItem.question.id] ? 'Hide Hint' : 'Need a Hint?'}</span>
              </button>

              <button
                type="button"
                onClick={() => setRevealedReattempts(prev => ({ ...prev, [currentQItem.question.id]: !prev[currentQItem.question.id] }))}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {revealedReattempts[currentQItem.question.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{revealedReattempts[currentQItem.question.id] ? 'Hide Solution' : 'Reveal Solution'}</span>
              </button>
            </div>
          </div>

          {revealedHints[currentQItem.question.id] && (
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-600/40 space-y-1.5 font-mono text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <Lightbulb className="w-4 h-4" />
                <span>Step 1 Intuitive Hint:</span>
              </div>
              <p className="font-sans text-zinc-300 leading-relaxed">
                {extractKeyFormula(currentQItem.question.explanation)}
              </p>
            </div>
          )}

          <div className="bg-[#101116] border border-zinc-800/90 rounded-3xl p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <span className="font-mono text-xs font-bold text-white bg-indigo-950/60 border border-indigo-800/50 px-2.5 py-1 rounded-lg">
                Q. {currentQItem.globalIndex}
              </span>
              <span className="text-xs font-mono text-zinc-400">
                {currentQItem.question.chapter || currentQItem.sectionSubject}
              </span>
            </div>

            <div className="text-sm sm:text-base text-zinc-100 font-sans leading-relaxed">
              <RichTextRenderer content={currentQItem.question.content} imageUrl={currentQItem.question.imageUrl} />
            </div>

            {(currentQItem.question.type === 'MCQ' || currentQItem.question.type === 'MULTI' || (Array.isArray(currentQItem.question.options) && currentQItem.question.options.length > 0)) && currentQItem.question.options && (
              <div className="space-y-3 pt-2">
                {(() => {
                  const isMulti = isMultiChoiceQuestion(currentQItem.question);
                  const correctIndices = getAllCorrectOptionIndices(currentQItem.question);

                  return currentQItem.question.options.map((opt, optIdx) => {
                    const optKey = String.fromCharCode(65 + optIdx);
                    const currentReattempt = reattemptAnswers[currentQItem.question.id];
                    const isChosen = isOptionSelectedInAnswer(currentReattempt, optIdx);
                    const isRevealed = revealedReattempts[currentQItem.question.id];
                    const isCorrect = correctIndices.includes(optIdx);

                    let cardStyle = 'bg-zinc-900/40 border-zinc-800 text-zinc-300 hover:border-zinc-700';
                    if (isChosen && !isRevealed) {
                      cardStyle = 'bg-indigo-950/40 border-indigo-500 text-white ring-1 ring-indigo-500/50';
                    } else if (isRevealed && isCorrect) {
                      cardStyle = 'bg-emerald-950/40 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/50';
                    } else if (isRevealed && isChosen && !isCorrect) {
                      cardStyle = 'bg-rose-950/40 border-rose-500 text-rose-200 ring-1 ring-rose-500/50';
                    }

                    const handleReattemptToggle = () => {
                      if (isRevealed) return;
                      if (isMulti) {
                        let letters = (currentReattempt || '')
                          .replace(/[^A-D]/gi, '')
                          .toUpperCase()
                          .split('');
                        if (letters.includes(optKey)) {
                          letters = letters.filter(l => l !== optKey);
                        } else {
                          letters.push(optKey);
                        }
                        letters.sort();
                        setReattemptAnswers(prev => ({ ...prev, [currentQItem.question.id]: letters.join('') }));
                      } else {
                        setReattemptAnswers(prev => ({ ...prev, [currentQItem.question.id]: optKey }));
                      }
                    };

                    return (
                      <div
                        key={optIdx}
                        onClick={handleReattemptToggle}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${cardStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center ${
                            isChosen && !isRevealed
                              ? 'bg-indigo-600 text-white'
                              : isRevealed && isCorrect
                              ? 'bg-emerald-500 text-black'
                              : isRevealed && isChosen && !isCorrect
                              ? 'bg-rose-500 text-white'
                              : 'bg-zinc-800 text-zinc-200'
                          }`}>
                            {isChosen && isMulti && !isRevealed ? '✓' : optKey}
                          </span>
                          <div className="text-xs sm:text-sm font-sans flex-1 py-1 overflow-visible">
                            <RichTextRenderer content={opt} optIndex={optIdx} questionContent={currentQItem.question.content} />
                          </div>
                          {isRevealed && isCorrect && (
                            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                              Correct Answer
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {!revealedReattempts[currentQItem.question.id] && reattemptAnswers[currentQItem.question.id] && (
              <div className="pt-3 border-t border-zinc-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setRevealedReattempts(prev => ({ ...prev, [currentQItem.question.id]: true }))}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold shadow-md shadow-emerald-600/30 cursor-pointer"
                >
                  Verify My Re-Attempt
                </button>
              </div>
            )}
          </div>

          {revealedReattempts[currentQItem.question.id] && (
            <div className="bg-[#101116] border border-indigo-900/40 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span className="font-display font-bold text-white text-sm">
                  Complete Analytical Solution
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-lg">
                  Official Key: {formatCorrectAnswerKey(currentQItem.question.correctAnswer)}
                </span>
              </div>
              <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-sans">
                <AiExplanationCard
                  qItem={currentQItem}
                  customExplanation={customExplanations[currentQItem.question.id]}
                  isGenerating={!!isGeneratingExplanation[currentQItem.question.id]}
                  onGenerate={handleGenerateAiExplanation}
                />
              </div>
            </div>
          )}

          <div className="bg-[#101116] border border-zinc-800/90 rounded-2xl p-3 shadow-md flex items-center justify-between">
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
