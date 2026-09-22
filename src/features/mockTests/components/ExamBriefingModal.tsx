import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Clock, 
  FileText, 
  Award, 
  ShieldAlert, 
  CheckCircle, 
  AlertCircle, 
  BarChart2,
  Maximize2,
  Layers,
  HelpCircle
} from 'lucide-react';
import { MockTest } from '@/types/mockTest';
import { renderMathText } from '../utils/mathText';
import { 
  calculateTestDifficulty, 
  getDifficultyLabel, 
  getDifficultyColors 
} from '../utils/testDifficulty';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface ExamBriefingModalProps {
  isOpen: boolean;
  test: MockTest | null;
  onConfirm: (test: MockTest) => void;
  onCancel: () => void;
}

export function ExamBriefingModal({
  isOpen,
  test,
  onConfirm,
  onCancel
}: ExamBriefingModalProps) {
  useLockBodyScroll(isOpen);
  useEscapeKey(() => {
    if (isOpen) onCancel();
  }, isOpen);

  if (!isOpen || !test || typeof document === 'undefined') return null;

  const totalQuestions = test.sections.reduce((acc, s) => acc + s.questions.length, 0);
  const difficulty = calculateTestDifficulty(test);
  const diffColors = getDifficultyColors(difficulty);
  const diffLabel = getDifficultyLabel(difficulty);

  const isPhysics = test.sections.length === 1 && (test.sections[0].subject || '').toLowerCase().includes('phys');
  const isChemistry = test.sections.length === 1 && (test.sections[0].subject || '').toLowerCase().includes('chem');
  const themeBorder = isPhysics 
    ? 'border-sky-500/40' 
    : isChemistry 
    ? 'border-emerald-500/40' 
    : 'border-indigo-500/40';

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[100050] bg-[#07070a]/98 backdrop-blur-xl flex flex-col font-sans select-none h-screen max-h-screen overflow-hidden text-zinc-200"
      >
        {/* HEADER BAR */}
        <header className="px-5 py-3 border-b border-zinc-800/80 bg-zinc-950/80 flex items-center justify-between gap-4 shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0 tracking-wider shadow-sm">
              NTA
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white font-display leading-tight truncate">
                CBT Examination Briefing
              </h3>
              <p className="text-[11px] font-mono text-zinc-400 leading-tight truncate">
                Please review test instructions before beginning.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
            title="Close Briefing (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* MAIN COMPACT CONTAINER - FITS VIEWPORT WITHOUT SCROLLING */}
        <div className="flex-1 flex flex-col justify-between max-w-5xl mx-auto w-full px-5 py-4 gap-3 overflow-hidden">
          
          {/* 1. Test Title & Tags */}
          <div className={`px-4 py-3 rounded-xl bg-zinc-900/50 border ${themeBorder} shrink-0`}>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border flex items-center gap-1 ${diffColors.bg} ${diffColors.border} ${diffColors.text}`}>
                <BarChart2 className="w-2.5 h-2.5" />
                <span>{diffLabel}</span>
              </span>
              {test.sections.map((s, idx) => (
                <span key={idx} className="text-[10px] font-mono uppercase text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-750">
                  {s.subject}
                </span>
              ))}
            </div>

            <h1 className="text-base sm:text-lg font-bold text-white font-display leading-snug line-clamp-1">
              {renderMathText(test.name)}
            </h1>
          </div>

          {/* 2. Key Metrics & Marking Scheme Strip (Single Row) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 font-mono">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-2.5 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <div className="text-xs sm:text-sm font-bold text-white">{test.durationMinutes} Mins</div>
                <div className="text-[9px] text-zinc-400 uppercase">Duration</div>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-2.5 flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-sky-400 shrink-0" />
              <div>
                <div className="text-xs sm:text-sm font-bold text-white">{totalQuestions} Qs</div>
                <div className="text-[9px] text-zinc-400 uppercase">Questions</div>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-2.5 flex items-center gap-2.5">
              <Award className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs sm:text-sm font-bold text-white">{test.totalMarks} M</div>
                <div className="text-[9px] text-zinc-400 uppercase">Max Marks</div>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-2 flex items-center justify-around text-center">
              <div>
                <div className="text-xs font-bold text-emerald-400">+4 Correct</div>
                <div className="text-[9px] text-zinc-400">Right</div>
              </div>
              <div className="h-6 w-[1px] bg-zinc-800" />
              <div>
                <div className="text-xs font-bold text-rose-400">-1 Wrong</div>
                <div className="text-[9px] text-zinc-400">Penalty</div>
              </div>
            </div>
          </div>

          {/* 3. Two-Column Compact Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-0 flex-1">
            
            {/* Left Box: Section Breakdown */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between space-y-2 overflow-hidden">
              <div className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>Sections & Questions</span>
              </div>

              <div className="space-y-1.5 overflow-y-auto pr-1">
                {test.sections.map((section, idx) => {
                  const mcqCount = section.questions.filter(q => q.type === 'MCQ').length;
                  const numCount = section.questions.filter(q => q.type === 'NUMERICAL').length;
                  const isPhys = (section.subject || '').toLowerCase().includes('phys');
                  const isChem = (section.subject || '').toLowerCase().includes('chem');

                  return (
                    <div key={idx} className="px-3 py-2 rounded-lg bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          isPhys ? 'bg-sky-400' : isChem ? 'bg-emerald-400' : 'bg-indigo-400'
                        }`} />
                        <span className="font-semibold text-zinc-100 uppercase">{section.subject}</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                        <span>{section.questions.length} Questions</span>
                        <span className="text-zinc-600">•</span>
                        <span>{mcqCount} MCQ{numCount > 0 ? ` + ${numCount} Num` : ''}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-850 text-[10px] font-mono text-zinc-400 leading-tight">
                Section navigation is unrestricted. You may switch between sections at any time.
              </div>
            </div>

            {/* Right Box: Rules & Palette */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between space-y-2.5 overflow-hidden">
              {/* Proctoring Rules */}
              <div className="space-y-1.5">
                <div className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Proctoring Rules</span>
                </div>
                <ul className="text-[11px] font-mono text-zinc-300 space-y-1 leading-normal list-disc list-inside">
                  <li>Full-screen mode is required throughout the test.</li>
                  <li>Switching tabs or leaving full-screen is monitored (3 infractions will auto-submit).</li>
                  <li>Answers are saved automatically as you progress.</li>
                </ul>
              </div>

              {/* Palette Legend */}
              <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                <div className="text-[11px] font-mono font-bold text-zinc-400 flex items-center gap-1.5">
                  <HelpCircle className="w-3 h-3 text-indigo-400" />
                  <span>Question Palette</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-900/80 border border-zinc-800">
                    <span className="w-3.5 h-3.5 rounded bg-emerald-600 text-white flex items-center justify-center font-bold text-[8.5px]">1</span>
                    <span className="text-emerald-300">Answered</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-900/80 border border-zinc-800">
                    <span className="w-3.5 h-3.5 rounded bg-rose-600 text-white flex items-center justify-center font-bold text-[8.5px]">2</span>
                    <span className="text-rose-300">Not Answered</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-900/80 border border-zinc-800">
                    <span className="w-3.5 h-3.5 rounded bg-purple-600 text-white flex items-center justify-center font-bold text-[8.5px]">3</span>
                    <span className="text-purple-300">Marked for Review</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-900/80 border border-zinc-800">
                    <span className="w-3.5 h-3.5 rounded bg-zinc-800 text-zinc-400 flex items-center justify-center font-bold text-[8.5px]">4</span>
                    <span className="text-zinc-400">Not Visited</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER BAR */}
        <footer className="px-5 py-3 border-t border-zinc-800/80 bg-zinc-950/90 flex items-center justify-between gap-3 shrink-0 z-30">
          <div className="text-[11px] font-mono text-zinc-400 hidden sm:block">
            Press Esc to cancel • Click Begin Examination when ready
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => onConfirm(test)}
              className="flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white active:scale-[0.98] transition-all tracking-wider uppercase shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Begin Examination</span>
            </button>
          </div>
        </footer>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
