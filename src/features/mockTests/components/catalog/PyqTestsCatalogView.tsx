
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
        <div className="bg-zinc-900/50 rounded-2xl p-5 sm:p-6 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg font-bold text-white font-display">Official PYQ Shift Papers</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Real past year papers formatted as authentic Computer Based Tests.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search PYQ papers..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500/50 transition-all font-mono"
              />
            </div>

            <button
              onClick={onOpenPyqUpload}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold bg-zinc-900 hover:bg-zinc-850 text-sky-300 border border-zinc-800 transition-all cursor-pointer whitespace-nowrap"
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
          <div className="bg-zinc-900/40 rounded-2xl p-12 text-center border border-zinc-800/80">
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
