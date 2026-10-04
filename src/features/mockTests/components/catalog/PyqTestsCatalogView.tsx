
import { motion } from 'motion/react';
import { FileText, Search, Plus } from 'lucide-react';
import { MockTest } from '@/types/mockTest';
import { MockTestCard } from '../MockTestCard';

interface PyqTestsCatalogViewProps {
  tests: MockTest[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenPyqUpload: () => void;
  attemptStatsByTest: Map<string, any>;
  customMockTests: MockTest[];
  onStartTest: (test: MockTest) => void;
  onPrintTest: (test: MockTest) => void;
  onDeleteTest: (testId: string) => void;
  navigate: any;
}

export function PyqTestsCatalogView({
  tests,
  searchQuery,
  onSearchChange,
  onOpenPyqUpload,
  attemptStatsByTest,
  customMockTests,
  onStartTest,
  onPrintTest,
  onDeleteTest,
  navigate
}: PyqTestsCatalogViewProps) {
  return (
    <motion.div
      key="pyq"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
    >
      <div className="space-y-5">
        {/* Hero Header Banner */}
        <div className="surface-2 rounded-3xl p-6 sm:p-7 border border-zinc-800/80 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          {/* Subtle ambient accent */}
          <div className="absolute top-0 right-0 w-80 h-36 bg-sky-600/10 rounded-full filter blur-3xl pointer-events-none" />

          <div className="space-y-1.5 relative z-10">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-sky-950/70 border border-sky-500/40 text-sky-300 font-mono text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-sky-400" />
                <span>Official Archives</span>
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400 text-xs font-mono">Shift Papers</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white font-display tracking-tight">
              Official PYQ Shift Papers
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
              Real past year papers formatted as authentic Computer Based Tests.
            </p>
          </div>

          <div className="flex items-center gap-2.5 z-10">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search PYQ papers..."
                className="w-full h-9 pl-8 pr-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500/50 transition-all font-mono shadow-inner"
              />
            </div>

            <button
              onClick={onOpenPyqUpload}
              className="h-9 flex items-center gap-1.5 px-3.5 rounded-xl text-xs font-mono font-bold bg-zinc-900/90 hover:bg-zinc-850 text-sky-300 border border-zinc-700/60 transition-all cursor-pointer whitespace-nowrap shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload PYQ</span>
            </button>
          </div>
        </div>

        {/* PYQ Cards List */}
        <div className="flex flex-col gap-3 w-full">
          {tests.map(test => (
            <MockTestCard
              key={test.id}
              test={test}
              attemptStats={attemptStatsByTest.get(test.id) || attemptStatsByTest.get(test.name)}
              onStart={onStartTest}
              onPrint={onPrintTest}
              onDelete={onDeleteTest}
              isCustom={customMockTests.some(t => t.id === test.id)}
              navigate={navigate}
            />
          ))}
        </div>

        {tests.length === 0 && (
          <div className="surface-2 rounded-2xl p-10 text-center border border-zinc-800/80 shadow-md">
            <FileText className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-zinc-300 font-display">No PYQ Papers Available</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Click &ldquo;Upload PYQ&rdquo; to parse an official NTA question paper PDF directly into a full CBT test.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
