import React from 'react';
import { motion } from 'motion/react';
import { 
  Columns2, Rows3, RotateCcw, 
  CheckCircle2, XCircle, MinusCircle, LayoutGrid 
} from 'lucide-react';
import { SubjectId } from '@/types';
import { MockTest } from '@/types/mockTest';
import { getSubjectTheme } from '@/constants/subjectTheme';
import { springs } from '@/constants/motion';

export interface QuestionReviewControlStripProps {
  test: MockTest;
  analysis: any;
  presentSubjects: SubjectId[];
  selectedSubject: 'ALL' | SubjectId;
  setSelectedSubject: (sub: 'ALL' | SubjectId) => void;
  statusFilter: 'ALL' | 'CORRECT' | 'INCORRECT' | 'UNATTEMPTED';
  setStatusFilter: (filter: 'ALL' | 'CORRECT' | 'INCORRECT' | 'UNATTEMPTED') => void;
  workspaceMode: 'split' | 'reader' | 'reattempt';
  setWorkspaceMode: (mode: 'split' | 'reader' | 'reattempt') => void;
  onQuestionChange: (idx: number) => void;
  setIsPaletteOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}

export const QuestionReviewControlStrip: React.FC<QuestionReviewControlStripProps> = ({
  test,
  analysis,
  presentSubjects,
  selectedSubject,
  setSelectedSubject,
  statusFilter,
  setStatusFilter,
  workspaceMode,
  setWorkspaceMode,
  onQuestionChange,
  setIsPaletteOpen,
}) => {
  return (
    <div className="bg-[#101116] border border-zinc-800/90 rounded-2xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md flex-wrap">
      {/* Left: Subject Pills or Test Metadata */}
      <div className="flex items-center gap-2 flex-wrap">
        {presentSubjects.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => { setSelectedSubject('ALL'); onQuestionChange(0); }}
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
                  onClick={() => { setSelectedSubject(sub); onQuestionChange(0); }}
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
                onClick={() => { setStatusFilter(status); onQuestionChange(0); }}
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
  );
};
