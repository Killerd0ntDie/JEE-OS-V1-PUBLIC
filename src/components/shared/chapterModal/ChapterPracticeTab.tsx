import React from 'react';
import { motion } from 'motion/react';
import { Zap, ArrowUpRight, Play, FileUp, Binary } from 'lucide-react';
import { Chapter } from '@/types/index';
import { MockTest } from '@/types/mockTest';
import { PracticeModule } from './PracticeModule';

export interface ChapterPracticeTabProps {
  chapter: Chapter;
  totalLectures: number;
  dppOnHold: boolean;
  toggleDppHold: () => void;
  completedDpp: number;
  setCompletedDpp: (val: number) => void;
  totalDpp: number;
  setTotalDpp: (val: number) => void;
  pyqOnHold: boolean;
  togglePyqHold: () => void;
  completedPyq: number;
  setCompletedPyq: (val: number) => void;
  totalPyq: number;
  setTotalPyq: (val: number) => void;
  confidence: number;
  setConfidence: (val: number) => void;
  chapterTests: MockTest[];
  onCloseModal: () => void;
  navigate: (path: string) => void;
}

export const ChapterPracticeTab: React.FC<ChapterPracticeTabProps> = ({
  chapter,
  totalLectures,
  dppOnHold,
  toggleDppHold,
  completedDpp,
  setCompletedDpp,
  totalDpp,
  setTotalDpp,
  pyqOnHold,
  togglePyqHold,
  completedPyq,
  setCompletedPyq,
  totalPyq,
  setTotalPyq,
  confidence,
  setConfidence,
  chapterTests,
  onCloseModal,
  navigate,
}) => {
  return (
    <motion.div
      key="practice"
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -14 }}
      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <PracticeModule
          title="DPP Practice"
          colorClass="text-emerald-400"
          badgeColorClass="bg-amber-500/20 border-amber-500/40 text-amber-300"
          subtitle="Problem Sets & Daily Practice"
          holdMsg="DPPs won't be scheduled for this chapter until you turn this off."
          recommendedMsg={`* Recommended: ${Math.max(5, Math.round((totalLectures || 10) * 0.8))} sets for completion.`}
          onHold={dppOnHold}
          setOnHold={toggleDppHold}
          completed={completedDpp}
          setCompleted={setCompletedDpp}
          total={totalDpp}
          setTotal={setTotalDpp}
        />

        <PracticeModule
          title="JEE PYQs"
          colorClass="text-purple-400"
          badgeColorClass="bg-amber-500/20 border-amber-500/40 text-amber-300"
          subtitle="Past Years Questions Drill"
          holdMsg="PYQs won't be scheduled for this chapter until you turn this off."
          recommendedMsg="* Recommended: ~50-80 PYQs per chapter."
          onHold={pyqOnHold}
          setOnHold={togglePyqHold}
          completed={completedPyq}
          setCompleted={setCompletedPyq}
          total={totalPyq}
          setTotal={setTotalPyq}
        />
      </div>

      <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 space-y-3">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-zinc-400 font-bold uppercase tracking-wider">Confidence Score Rating</span>
          <span className="text-indigo-400 font-bold bg-indigo-950/50 px-2.5 py-1 rounded-lg border border-indigo-500/30">{confidence}%</span>
        </div>
        <div className="relative pt-2 pb-1">
          <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-600 via-purple-500 to-emerald-400 rounded-full transition-all duration-150"
              style={{ width: `${confidence}%` }}
            />
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={confidence}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10) || 0;
              setConfidence(Math.max(0, Math.min(100, val)));
            }}
            className="w-full accent-indigo-500 cursor-pointer mt-2"
          />
        </div>
      </div>

      {/* Chapter High-Yield Formula Sheet Shortcut */}
      <div className="p-3.5 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 flex items-center justify-between gap-3 shadow-inner">
        <div className="flex items-center gap-2.5">
          <Binary className="w-4 h-4 text-sky-400" />
          <div>
            <span className="text-xs font-mono font-bold text-zinc-200 uppercase tracking-wider block">
              Chapter Formulas & Theorems
            </span>
            <span className="text-[10px] text-zinc-400 font-sans">
              High-yield KaTeX equations, conditions & ranker shortcuts
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onCloseModal();
            navigate(`/revision?tab=formulas&chapterId=${chapter.id}`);
          }}
          className="text-[10px] font-mono font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors cursor-pointer bg-sky-950/40 border border-sky-800/40 px-2.5 py-1 rounded-lg"
        >
          <span>View Formulas</span>
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>

      {/* Chapter Custom Mock Tests & DPP Drills */}
      <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 space-y-3 shadow-inner">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-mono font-bold text-zinc-200 uppercase tracking-wider">
              Chapter Tests & DPP Drills ({chapterTests.length})
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              onCloseModal();
              navigate(`/mock-tests?nav=${chapter.subject}&chapterId=${chapter.id}`);
            }}
            className="text-[10px] font-mono font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Open in Mock Arena</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {chapterTests.length > 0 ? (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {chapterTests.map(test => {
              const totalQ = test.sections.reduce((sum, s) => sum + s.questions.length, 0);
              return (
                <div
                  key={test.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 transition-all"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <h4 className="text-xs font-bold text-zinc-100 truncate font-display">{test.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-zinc-400">
                      <span>{totalQ} Questions</span>
                      <span>•</span>
                      <span>{test.durationMinutes} mins</span>
                      <span>•</span>
                      <span className="uppercase text-indigo-400 font-semibold">{test.category || test.source || 'Drill'}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onCloseModal();
                      navigate(`/mock-tests?nav=${chapter.subject}&chapterId=${chapter.id}&testId=${test.id}`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Start</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 text-center space-y-2.5">
            <p className="text-xs font-mono text-zinc-400">
              No custom tests or DPPs created for this chapter yet.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  onCloseModal();
                  navigate(`/mock-tests?nav=${chapter.subject}&chapterId=${chapter.id}&openStudio=true`);
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Zap className="w-3 h-3" />
                <span>Generate Chapter Drill</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onCloseModal();
                  navigate(`/mock-tests?nav=${chapter.subject}&chapterId=${chapter.id}&openDpp=true`);
                }}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-300 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileUp className="w-3 h-3 text-emerald-400" />
                <span>Upload DPP</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
