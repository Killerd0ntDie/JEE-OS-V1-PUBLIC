
import { motion } from 'motion/react';
import { Trophy, Search } from 'lucide-react';
import { MockTest } from '@/types/mockTest';
import { MockTestCard } from '../MockTestCard';

interface FullTestsCatalogViewProps {
  tests: MockTest[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  attemptStatsByTest: Map<string, any>;
  customMockTests: MockTest[];
  onStartTest: (test: MockTest) => void;
  onPrintTest: (test: MockTest) => void;
  onDeleteTest: (testId: string) => void;
  navigate: any;
}

export function FullTestsCatalogView({
  tests,
  searchQuery,
  onSearchChange,
  attemptStatsByTest,
  customMockTests,
  onStartTest,
  onPrintTest,
  onDeleteTest,
  navigate
}: FullTestsCatalogViewProps) {
  return (
    <motion.div
      key="full_tests"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
    >
      <div className="space-y-5">
        {/* Hero Header Banner */}
        <div className="surface-2 rounded-3xl p-6 sm:p-7 border border-zinc-800/80 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          {/* Subtle ambient accent */}
          <div className="absolute top-0 right-0 w-80 h-36 bg-indigo-600/10 rounded-full filter blur-3xl pointer-events-none" />

          <div className="space-y-1.5 relative z-10">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-indigo-950/70 border border-indigo-500/40 text-indigo-300 font-mono text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3 h-3 text-indigo-400" />
                <span>Full JEE Simulation</span>
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400 text-xs font-mono">NTA 300M Pattern</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white font-display tracking-tight">
              Full JEE Grand CBT Mocks
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
              Authentic 3-hour, 75-question multi-subject simulations mirroring the official NTA JEE pattern.
            </p>
          </div>

          <div className="relative min-w-[240px] z-10">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search full mocks..."
              className="w-full h-9 pl-8 pr-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-all font-mono shadow-inner"
            />
          </div>
        </div>

        {/* Full Test Cards List */}
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
            <Search className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-zinc-300 font-display">No Full Tests Found</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Try adjusting your search query or generate a new custom mock test.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
