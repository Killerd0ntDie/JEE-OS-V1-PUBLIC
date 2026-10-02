
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
          onClick={onOpenStudio}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors cursor-pointer"
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
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-mono font-medium bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
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
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-medium bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
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
          onClick={() => onSelectNav('full_tests')}
          className={`relative w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors group ${
            activeNav === 'full_tests'
              ? 'bg-zinc-800/90 text-white shadow-xs'
              : 'bg-transparent hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200'
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
                ? 'bg-amber-950/70 text-amber-300'
                : 'bg-amber-950/40 text-amber-400/80 group-hover:text-amber-400'
            }`}>
              <Trophy className="w-3.5 h-3.5" />
            </div>
            <span className={`text-xs font-semibold font-display truncate ${activeNav === 'full_tests' ? 'text-white' : 'text-zinc-200 group-hover:text-white'}`}>
              Full JEE CBT Mocks
            </span>
          </div>
          <span className={`relative z-10 shrink-0 text-[10px] font-mono font-medium px-2 py-0.5 rounded transition-colors ${
            activeNav === 'full_tests'
              ? 'bg-zinc-700/80 text-zinc-200'
              : 'bg-zinc-850/80 text-zinc-400'
          }`}>
            {fullTestsCount}
          </span>
        </motion.button>

        {/* PYQ Papers */}
        <motion.button
          whileTap={{ scale: 0.985 }}
          onClick={() => onSelectNav('pyq')}
          className={`relative w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors group ${
            activeNav === 'pyq'
              ? 'bg-zinc-800/90 text-white shadow-xs'
              : 'bg-transparent hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200'
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
                ? 'bg-sky-950/70 text-sky-300'
                : 'bg-sky-950/40 text-sky-400/80 group-hover:text-sky-400'
            }`}>
              <FileText className="w-3.5 h-3.5" />
            </div>
            <span className={`text-xs font-semibold font-display truncate ${activeNav === 'pyq' ? 'text-white' : 'text-zinc-200 group-hover:text-white'}`}>
              PYQ Papers
            </span>
          </div>
          <span className={`relative z-10 shrink-0 text-[10px] font-mono font-medium px-2 py-0.5 rounded transition-colors ${
            activeNav === 'pyq'
              ? 'bg-zinc-700/80 text-zinc-200'
              : 'bg-zinc-850/80 text-zinc-400'
          }`}>
            {pyqTestsCount}
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
          onClick={() => onSelectNav('physics')}
          className={`relative w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors group ${
            activeNav === 'physics'
              ? 'bg-zinc-800/90 text-white shadow-xs'
              : 'bg-transparent hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200'
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
                ? 'bg-sky-950/70 text-sky-300'
                : 'bg-sky-950/40 text-sky-400/80 group-hover:text-sky-400'
            }`}>
              <Atom className="w-3.5 h-3.5" />
            </div>
            <span className={`text-xs font-semibold font-display truncate ${activeNav === 'physics' ? 'text-white' : 'text-zinc-200 group-hover:text-white'}`}>
              Physics
            </span>
          </div>
          <span className={`relative z-10 shrink-0 text-[10px] font-mono font-medium px-2 py-0.5 rounded transition-colors ${
            activeNav === 'physics'
              ? 'bg-sky-950/80 text-sky-300'
              : 'bg-sky-950/40 text-sky-400/90'
          }`}>
            {physicsChaptersCount} Ch
          </span>
        </motion.button>

        {/* Chemistry */}
        <motion.button
          whileTap={{ scale: 0.985 }}
          onClick={() => onSelectNav('chemistry')}
          className={`relative w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors group ${
            activeNav === 'chemistry'
              ? 'bg-zinc-800/90 text-white shadow-xs'
              : 'bg-transparent hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200'
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
                ? 'bg-emerald-950/70 text-emerald-300'
                : 'bg-emerald-950/40 text-emerald-400/80 group-hover:text-emerald-400'
            }`}>
              <FlaskConical className="w-3.5 h-3.5" />
            </div>
            <span className={`text-xs font-semibold font-display truncate ${activeNav === 'chemistry' ? 'text-white' : 'text-zinc-200 group-hover:text-white'}`}>
              Chemistry
            </span>
          </div>
          <span className={`relative z-10 shrink-0 text-[10px] font-mono font-medium px-2 py-0.5 rounded transition-colors ${
            activeNav === 'chemistry'
              ? 'bg-emerald-950/80 text-emerald-300'
              : 'bg-emerald-950/40 text-emerald-400/90'
          }`}>
            {chemistryChaptersCount} Ch
          </span>
        </motion.button>

        {/* Mathematics */}
        <motion.button
          whileTap={{ scale: 0.985 }}
          onClick={() => onSelectNav('maths')}
          className={`relative w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors group ${
            activeNav === 'maths'
              ? 'bg-zinc-800/90 text-white shadow-xs'
              : 'bg-transparent hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200'
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
                ? 'bg-indigo-950/70 text-indigo-300'
                : 'bg-indigo-950/40 text-indigo-400/80 group-hover:text-indigo-400'
            }`}>
              <Calculator className="w-3.5 h-3.5" />
            </div>
            <span className={`text-xs font-semibold font-display truncate ${activeNav === 'maths' ? 'text-white' : 'text-zinc-200 group-hover:text-white'}`}>
              Mathematics
            </span>
          </div>
          <span className={`relative z-10 shrink-0 text-[10px] font-mono font-medium px-2 py-0.5 rounded transition-colors ${
            activeNav === 'maths'
              ? 'bg-indigo-950/80 text-indigo-300'
              : 'bg-indigo-950/40 text-indigo-400/90'
          }`}>
            {mathsChaptersCount} Ch
          </span>
        </motion.button>
      </div>

      {/* Section 3: History & Analytics */}
      <div className="space-y-1.5 pt-1.5 border-t border-zinc-850">
        <div className="flex items-center justify-between px-1">
          <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500">
            History & Analytics
          </div>
          <span className="text-[9px] font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded">
            Target: 99%ile
          </span>
        </div>

        <motion.button
          role="button"
          whileTap={{ scale: 0.985 }}
          onClick={() => onSelectNav('history')}
          className={`relative w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors group ${
            activeNav === 'history'
              ? 'bg-zinc-800/90 text-white shadow-xs'
              : 'bg-transparent hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200'
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
                ? 'bg-rose-950/70 text-rose-300'
                : 'bg-rose-950/40 text-rose-400/80 group-hover:text-rose-400'
            }`}>
              <History className="w-3.5 h-3.5" />
            </div>
            <span className={`text-xs font-semibold font-display truncate ${activeNav === 'history' ? 'text-white' : 'text-zinc-200 group-hover:text-rose-200'}`}>
              Past Attempts
            </span>
          </div>
          <span className={`relative z-10 shrink-0 text-[10px] font-mono font-medium px-2 py-0.5 rounded transition-colors ${
            activeNav === 'history'
              ? 'bg-rose-950/80 text-rose-300'
              : 'bg-zinc-850/80 text-zinc-400'
          }`}>
            {pastAttemptsCount}
          </span>
        </motion.button>

        {/* Readiness Card */}
        <div className="bg-zinc-900/60 border border-zinc-850 rounded-xl p-2.5 space-y-2">
          {/* Micro Telemetry Metrics */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-zinc-850/60 rounded-lg py-1 px-1">
              <div className="text-[9px] font-mono uppercase text-zinc-400 font-medium">Mocks</div>
              <div className="text-xs font-bold font-mono text-zinc-100 mt-0.5">
                {mockStats.totalAttempts}
              </div>
            </div>
            <div className="bg-zinc-850/60 rounded-lg py-1 px-1">
              <div className="text-[9px] font-mono uppercase text-zinc-400 font-medium">Avg Score</div>
              <div className="text-xs font-bold font-mono text-amber-400 mt-0.5">
                {mockStats.avgScore}<span className="text-[9px] text-zinc-500 font-normal">/300</span>
              </div>
            </div>
            <div className="bg-zinc-850/60 rounded-lg py-1 px-1">
              <div className="text-[9px] font-mono uppercase text-zinc-400 font-medium">Accuracy</div>
              <div className="text-xs font-bold font-mono text-emerald-400 mt-0.5">
                {mockStats.avgAccuracy}%
              </div>
            </div>
          </div>

          {/* Prep Shortcuts */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onNavigateToMistakes}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-850/80 hover:bg-zinc-800 text-[10px] font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>Mistake Vault</span>
            </button>

            <button
              onClick={onNavigateToFormulas}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-850/80 hover:bg-zinc-800 text-[10px] font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Speed Drills</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
