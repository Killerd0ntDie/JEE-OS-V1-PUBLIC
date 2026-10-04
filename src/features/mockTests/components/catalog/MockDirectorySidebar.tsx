
import { motion } from 'motion/react';
import { 
  Trophy, Sparkles, FileUp, Target, FileText, 
  Atom, FlaskConical, Calculator, History, AlertTriangle, Zap 
} from 'lucide-react';
import { springs } from '@/constants/motion';
import { MockNavCategory } from '../../utils/mockTestCategorization';

interface MockDirectorySidebarProps {
  activeNav: MockNavCategory;
  onSelectNav: (nav: MockNavCategory) => void;
  onOpenStudio: () => void;
  onOpenPyqUpload: () => void;
  onOpenDppUpload: () => void;
  fullTestsCount: number;
  pyqTestsCount: number;
  physicsChaptersCount: number;
  chemistryChaptersCount: number;
  mathsChaptersCount: number;
  pastAttemptsCount: number;
  mockStats: {
    totalAttempts: number;
    avgScore: number;
    bestScore: number;
    avgAccuracy: number;
  };
  onNavigateToMistakes: () => void;
  onNavigateToFormulas: () => void;
}

export function MockDirectorySidebar({
  activeNav,
  onSelectNav,
  onOpenStudio,
  onOpenPyqUpload,
  onOpenDppUpload,
  fullTestsCount,
  pyqTestsCount,
  physicsChaptersCount,
  chemistryChaptersCount,
  mathsChaptersCount,
  pastAttemptsCount,
  mockStats,
  onNavigateToMistakes,
  onNavigateToFormulas
}: MockDirectorySidebarProps) {
  return (
    <aside className="w-full lg:col-span-4 xl:col-span-3 lg:sticky lg:top-4 self-start lg:h-[calc(100dvh-2.5rem)] flex flex-col justify-between overflow-y-auto no-scrollbar">
      {/* 1. Header & Brand + Quick Actions */}
      <div className="space-y-2">
        {/* Header & Brand */}
        <div className="flex items-center justify-between gap-1.5 pb-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-600/90 border border-indigo-400/30 flex items-center justify-center text-white shrink-0 shadow-sm shadow-indigo-600/25">
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-white font-display leading-tight truncate">
                Mock Test Engine
              </h1>
              <span className="text-[10px] font-mono text-zinc-400 block leading-tight">
                CBT Simulation
              </span>
            </div>
          </div>
          <span className="shrink-0 text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-300 bg-indigo-950/70 border border-indigo-500/40 px-2 py-0.5 rounded-lg whitespace-nowrap">
            Available Tests
          </span>
        </div>

        {/* Quick Actions */}
        <div className="space-y-1.5">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={springs.snappy}
            onClick={onOpenStudio}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 border border-indigo-400/40 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
            <span>AI Mock Generator</span>
          </motion.button>

          <div className="grid grid-cols-2 gap-1.5">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={springs.snappy}
              onClick={onOpenPyqUpload}
              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-xs font-mono font-semibold surface-1 hover:bg-zinc-800/80 text-zinc-300 hover:text-white border border-white/5 hover:border-white/10 transition-all cursor-pointer shadow-xs"
              title="Upload PYQ"
            >
              <FileUp className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate">Upload PYQ</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={springs.snappy}
              onClick={onOpenDppUpload}
              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-xs font-mono font-semibold surface-1 hover:bg-zinc-800/80 text-zinc-300 hover:text-white border border-white/5 hover:border-white/10 transition-all cursor-pointer shadow-xs"
              title="Upload DPP"
            >
              <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Upload DPP</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* 2. Section 1: Full Syllabus Simulations */}
      <div className="space-y-1 pt-1.5 border-t border-white/5">
        <div className="px-1 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
          Full Papers & PYQs
        </div>

        {/* Full Tests */}
        <motion.button
          whileTap={{ scale: 0.985 }}
          onClick={() => onSelectNav('full_tests')}
          className={`relative w-full flex items-center justify-between px-2.5 py-1.5 sm:py-2 rounded-xl text-left cursor-pointer transition-colors group ${
            activeNav === 'full_tests'
              ? 'surface-2 text-white shadow-sm border border-white/10'
              : 'bg-transparent hover:bg-white/[0.04] text-zinc-400 hover:text-zinc-200 border border-transparent'
          }`}
        >
          {activeNav === 'full_tests' && (
            <motion.div
              layoutId="activeNavHighlight"
              className="absolute inset-0 bg-white/[0.06] border-l-2 border-l-amber-400 rounded-xl"
              transition={springs.fluid}
            />
          )}
          <div className="relative z-10 flex items-center gap-2 min-w-0">
            <div className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              activeNav === 'full_tests'
                ? 'bg-amber-950/70 text-amber-300 border border-amber-500/40'
                : 'bg-amber-950/40 text-amber-400/80 border border-amber-500/20 group-hover:text-amber-300'
            }`}>
              <Trophy className="w-3.5 h-3.5" />
            </div>
            <span className={`text-xs font-semibold font-display truncate ${activeNav === 'full_tests' ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
              Full JEE CBT Mocks
            </span>
          </div>
          <span className={`relative z-10 shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-colors ${
            activeNav === 'full_tests'
              ? 'bg-amber-950/70 border-amber-500/40 text-amber-300'
              : 'bg-white/5 border-white/10 text-zinc-400'
          }`}>
            {fullTestsCount}
          </span>
        </motion.button>

        {/* PYQ Papers */}
        <motion.button
          whileTap={{ scale: 0.985 }}
          onClick={() => onSelectNav('pyq')}
          className={`relative w-full flex items-center justify-between px-2.5 py-1.5 sm:py-2 rounded-xl text-left cursor-pointer transition-colors group ${
            activeNav === 'pyq'
              ? 'surface-2 text-white shadow-sm border border-white/10'
              : 'bg-transparent hover:bg-white/[0.04] text-zinc-400 hover:text-zinc-200 border border-transparent'
          }`}
        >
          {activeNav === 'pyq' && (
            <motion.div
              layoutId="activeNavHighlight"
              className="absolute inset-0 bg-white/[0.06] border-l-2 border-l-sky-400 rounded-xl"
              transition={springs.fluid}
            />
          )}
          <div className="relative z-10 flex items-center gap-2 min-w-0">
            <div className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              activeNav === 'pyq'
                ? 'bg-sky-950/70 text-sky-300 border border-sky-500/40'
                : 'bg-sky-950/40 text-sky-400/80 border border-sky-500/20 group-hover:text-sky-300'
            }`}>
              <FileText className="w-3.5 h-3.5" />
            </div>
            <span className={`text-xs font-semibold font-display truncate ${activeNav === 'pyq' ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
              PYQ Papers
            </span>
          </div>
          <span className={`relative z-10 shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-colors ${
            activeNav === 'pyq'
              ? 'bg-sky-950/70 border-sky-500/40 text-sky-300'
              : 'bg-white/5 border-white/10 text-zinc-400'
          }`}>
            {pyqTestsCount}
          </span>
        </motion.button>
      </div>

      {/* 3. Section 2: Subject Chapters */}
      <div className="space-y-1 pt-1.5 border-t border-white/5">
        <div className="px-1 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
          Subject Chapters
        </div>

        {/* Physics */}
        <motion.button
          whileTap={{ scale: 0.985 }}
          onClick={() => onSelectNav('physics')}
          className={`relative w-full flex items-center justify-between px-2.5 py-1.5 sm:py-2 rounded-xl text-left cursor-pointer transition-colors group ${
            activeNav === 'physics'
              ? 'surface-2 text-white shadow-sm border border-white/10'
              : 'bg-transparent hover:bg-white/[0.04] text-zinc-400 hover:text-zinc-200 border border-transparent'
          }`}
        >
          {activeNav === 'physics' && (
            <motion.div
              layoutId="activeNavHighlight"
              className="absolute inset-0 bg-white/[0.06] border-l-2 border-l-sky-400 rounded-xl"
              transition={springs.fluid}
            />
          )}
          <div className="relative z-10 flex items-center gap-2 min-w-0">
            <div className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              activeNav === 'physics'
                ? 'bg-sky-950/70 text-sky-300 border border-sky-500/40'
                : 'bg-sky-950/40 text-sky-400/80 border border-sky-500/20 group-hover:text-sky-300'
            }`}>
              <Atom className="w-3.5 h-3.5" />
            </div>
            <span className={`text-xs font-semibold font-display truncate ${activeNav === 'physics' ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
              Physics
            </span>
          </div>
          <span className={`relative z-10 shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-colors ${
            activeNav === 'physics'
              ? 'bg-sky-950/70 border-sky-500/40 text-sky-300'
              : 'bg-sky-950/30 border-sky-500/20 text-sky-400'
          }`}>
            {physicsChaptersCount} Ch
          </span>
        </motion.button>

        {/* Chemistry */}
        <motion.button
          whileTap={{ scale: 0.985 }}
          onClick={() => onSelectNav('chemistry')}
          className={`relative w-full flex items-center justify-between px-2.5 py-1.5 sm:py-2 rounded-xl text-left cursor-pointer transition-colors group ${
            activeNav === 'chemistry'
              ? 'surface-2 text-white shadow-sm border border-white/10'
              : 'bg-transparent hover:bg-white/[0.04] text-zinc-400 hover:text-zinc-200 border border-transparent'
          }`}
        >
          {activeNav === 'chemistry' && (
            <motion.div
              layoutId="activeNavHighlight"
              className="absolute inset-0 bg-white/[0.06] border-l-2 border-l-emerald-400 rounded-xl"
              transition={springs.fluid}
            />
          )}
          <div className="relative z-10 flex items-center gap-2 min-w-0">
            <div className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              activeNav === 'chemistry'
                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40'
                : 'bg-emerald-950/40 text-emerald-400/80 border border-emerald-500/20 group-hover:text-emerald-300'
            }`}>
              <FlaskConical className="w-3.5 h-3.5" />
            </div>
            <span className={`text-xs font-semibold font-display truncate ${activeNav === 'chemistry' ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
              Chemistry
            </span>
          </div>
          <span className={`relative z-10 shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-colors ${
            activeNav === 'chemistry'
              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
              : 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400'
          }`}>
            {chemistryChaptersCount} Ch
          </span>
        </motion.button>

        {/* Mathematics */}
        <motion.button
          whileTap={{ scale: 0.985 }}
          onClick={() => onSelectNav('maths')}
          className={`relative w-full flex items-center justify-between px-2.5 py-1.5 sm:py-2 rounded-xl text-left cursor-pointer transition-colors group ${
            activeNav === 'maths'
              ? 'surface-2 text-white shadow-sm border border-white/10'
              : 'bg-transparent hover:bg-white/[0.04] text-zinc-400 hover:text-zinc-200 border border-transparent'
          }`}
        >
          {activeNav === 'maths' && (
            <motion.div
              layoutId="activeNavHighlight"
              className="absolute inset-0 bg-white/[0.06] border-l-2 border-l-indigo-400 rounded-xl"
              transition={springs.fluid}
            />
          )}
          <div className="relative z-10 flex items-center gap-2 min-w-0">
            <div className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              activeNav === 'maths'
                ? 'bg-indigo-950/70 text-indigo-300 border border-indigo-500/40'
                : 'bg-indigo-950/40 text-indigo-400/80 border border-indigo-500/20 group-hover:text-indigo-300'
            }`}>
              <Calculator className="w-3.5 h-3.5" />
            </div>
            <span className={`text-xs font-semibold font-display truncate ${activeNav === 'maths' ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
              Mathematics
            </span>
          </div>
          <span className={`relative z-10 shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-colors ${
            activeNav === 'maths'
              ? 'bg-indigo-950/70 border-indigo-500/40 text-indigo-300'
              : 'bg-indigo-950/30 border-indigo-500/20 text-indigo-400'
          }`}>
            {mathsChaptersCount} Ch
          </span>
        </motion.button>
      </div>

      {/* 4. Section 3: History & Analytics */}
      <div className="space-y-1 pt-1.5 border-t border-white/5">
        <div className="flex items-center justify-between px-1">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
            History & Analytics
          </div>
          <span className="text-[9px] font-mono font-bold text-indigo-300 bg-indigo-950/70 border border-indigo-500/40 px-2 py-0.5 rounded-md">
            Target: 99%ile
          </span>
        </div>

        <motion.button
          role="button"
          whileTap={{ scale: 0.985 }}
          onClick={() => onSelectNav('history')}
          className={`relative w-full flex items-center justify-between px-2.5 py-1.5 sm:py-2 rounded-xl text-left cursor-pointer transition-colors group ${
            activeNav === 'history'
              ? 'surface-2 text-white shadow-sm border border-white/10'
              : 'bg-transparent hover:bg-white/[0.04] text-zinc-400 hover:text-zinc-200 border border-transparent'
          }`}
        >
          {activeNav === 'history' && (
            <motion.div
              layoutId="activeNavHighlight"
              className="absolute inset-0 bg-white/[0.06] border-l-2 border-l-rose-400 rounded-xl"
              transition={springs.fluid}
            />
          )}
          <div className="relative z-10 flex items-center gap-2 min-w-0">
            <div className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              activeNav === 'history'
                ? 'bg-rose-950/70 text-rose-300 border border-rose-500/40'
                : 'bg-rose-950/40 text-rose-400/80 border border-rose-500/20 group-hover:text-rose-300'
            }`}>
              <History className="w-3.5 h-3.5" />
            </div>
            <span className={`text-xs font-semibold font-display truncate ${activeNav === 'history' ? 'text-white' : 'text-zinc-300 group-hover:text-rose-200'}`}>
              Past Attempts
            </span>
          </div>
          <span className={`relative z-10 shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-colors ${
            activeNav === 'history'
              ? 'bg-rose-950/70 border-rose-500/40 text-rose-300'
              : 'bg-white/5 border-white/10 text-zinc-400'
          }`}>
            {pastAttemptsCount}
          </span>
        </motion.button>
      </div>

      {/* 5. Bottom Pinned Area: Readiness Telemetry Card */}
      <div className="pt-1.5 border-t border-white/5">
        <div className="surface-2 border border-zinc-800/80 rounded-2xl p-2.5 sm:p-3 space-y-2 sm:space-y-2.5 shadow-md">
          {/* Micro Telemetry Metrics */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-white/[0.03] border border-white/5 rounded-xl py-1.5 px-1">
              <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">Mocks</div>
              <div className="text-xs sm:text-sm font-bold font-mono text-zinc-100 mt-0.5">
                {mockStats.totalAttempts}
              </div>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-xl py-1.5 px-1">
              <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">Avg Score</div>
              <div className="text-xs sm:text-sm font-bold font-mono text-amber-400 mt-0.5">
                {mockStats.avgScore}<span className="text-[9px] text-zinc-500 font-normal">/300</span>
              </div>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-xl py-1.5 px-1">
              <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">Accuracy</div>
              <div className="text-xs sm:text-sm font-bold font-mono text-emerald-400 mt-0.5">
                {mockStats.avgAccuracy}%
              </div>
            </div>
          </div>

          {/* Prep Shortcuts */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={onNavigateToMistakes}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 sm:py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 text-[11px] sm:text-xs font-mono font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
              <span className="truncate">Mistake Vault</span>
            </button>

            <button
              type="button"
              onClick={onNavigateToFormulas}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 sm:py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 text-[11px] sm:text-xs font-mono font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <Zap className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">Speed Drills</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
