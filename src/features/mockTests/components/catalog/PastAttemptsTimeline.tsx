import { useMemo } from 'react';
import { motion } from 'motion/react';
import { History, Search, Trash2 } from 'lucide-react';
import { MockResult } from '@/types/index';

interface PastAttemptsTimelineProps {
  mocks: MockResult[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onStartTest: (test: any) => void;
  onDeleteAttempt: (attemptId: string) => void;
  onViewSolutions: (mockId: string) => void;
  onGoToAvailableTests: () => void;
}

export function PastAttemptsTimeline({
  mocks,
  searchQuery,
  onSearchChange,
  onStartTest,
  onDeleteAttempt,
  onViewSolutions,
  onGoToAvailableTests
}: PastAttemptsTimelineProps) {
  const filteredPastAttempts = useMemo(() => {
    if (!mocks) return [];
    const query = searchQuery.trim().toLowerCase();
    const list = query
      ? mocks.filter(m => (m.title || '').toLowerCase().includes(query))
      : [...mocks];
    return list.sort((a, b) => {
      const timeA = Date.parse(a.date) || 0;
      const timeB = Date.parse(b.date) || 0;
      if (timeA !== timeB) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [mocks, searchQuery]);

  return (
    <motion.div
      key="history"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
    >
      <div className="space-y-5">
        <div className="bg-zinc-900/50 rounded-2xl p-5 sm:p-6 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-rose-400" />
              <h2 className="text-lg font-bold text-white font-display">Past Test Attempts</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Review your completed mock test attempts, scores, and question solutions.
            </p>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search past attempts..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-rose-500/50 transition-all font-mono"
            />
          </div>
        </div>

        {/* Timeline Container */}
        {filteredPastAttempts.length > 0 ? (
          <div className="relative pl-6 sm:pl-8 border-l border-zinc-800/80 space-y-6">
            {filteredPastAttempts.map((mock) => {
              const pct = mock.totalQuestions > 0 ? Math.round((mock.totalScore / (mock.totalQuestions * 4)) * 100) : 0;
              const accuracy = mock.attempted > 0 ? Math.round((mock.correct / mock.attempted) * 100) : 0;

              return (
                <div key={mock.id} className="relative group">
                  {/* Timeline node */}
                  <div className="absolute -left-[31px] sm:-left-[39px] top-6 w-4 h-4 rounded-full bg-zinc-950 border-2 border-rose-500 group-hover:scale-125 transition-transform" />

                  <div className="bg-zinc-900/40 hover:bg-zinc-900/60 rounded-2xl p-5 border border-zinc-800/80 hover:border-zinc-700 transition-all shadow-md space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/50">
                            Completed
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {mock.date}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white font-display mt-1">
                          {mock.title}
                        </h3>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-black font-display text-white">
                          {mock.totalScore}
                          <span className="text-xs font-normal text-zinc-500 ml-1">/ {mock.totalQuestions * 4}</span>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400">
                          {accuracy}% Accuracy • {pct}% Score
                        </div>
                      </div>
                    </div>

                    {/* Subject Breakdown Badges */}
                    {mock.subjectBreakdown && (
                      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-zinc-800/80">
                        {Object.entries(mock.subjectBreakdown).map(([subj, rawData]) => {
                          const data = rawData as { score?: number; attempted?: number; correct?: number; accuracy?: number };
                          const isPhysics = subj.toLowerCase().includes('phys');
                          const isChemistry = subj.toLowerCase().includes('chem');
                          return (
                            <div
                              key={subj}
                              className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                                isPhysics
                                  ? 'bg-sky-950/40 border-sky-800/50 text-sky-300'
                                  : isChemistry
                                  ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                                  : 'bg-indigo-950/40 border-indigo-800/50 text-indigo-300'
                              }`}
                            >
                              <span className="font-bold capitalize">{subj}:</span>
                              <span>{data.score ?? 0} M ({data.accuracy !== undefined ? data.accuracy : ((data.attempted || 0) > 0 ? Math.round(((data.correct || 0) / (data.attempted || 1)) * 100) : 0)}%)</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-xs font-mono text-zinc-500">
                        {mock.duration} Mins Elapsed
                      </div>

                      <div className="flex items-center gap-2">
                        {mock.testSnapshot && (
                          <button
                            onClick={() => onStartTest({ ...mock.testSnapshot!, id: `retake-${mock.id}-${Date.now()}` })}
                            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-mono text-zinc-300 transition-colors cursor-pointer"
                          >
                            Retake Test
                          </button>
                        )}

                        <button
                          onClick={() => onDeleteAttempt(mock.id)}
                          className="p-2 rounded-xl bg-zinc-900 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-800/50 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete this attempt and all associated data"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onViewSolutions(mock.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold tracking-wider uppercase transition-colors shadow-sm cursor-pointer"
                        >
                          View Solutions & Scorecard
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : searchQuery.trim() !== '' && mocks.length > 0 ? (
          <div className="bg-zinc-900/40 rounded-2xl p-12 text-center border border-zinc-800/80">
            <Search className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-zinc-300 font-display">No Matches Found</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              No past attempts match &ldquo;{searchQuery}&rdquo;. Try a different search term or clear the filter.
            </p>
            <button
              onClick={() => onSearchChange('')}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-zinc-900 border border-zinc-800 text-rose-300 hover:bg-zinc-850 cursor-pointer"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="bg-zinc-900/40 rounded-2xl p-12 text-center border border-zinc-800/80">
            <History className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-zinc-300 font-display">No Past Attempts Recorded</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Take your first mock test or chapter drill to see your scores and question solutions here.
            </p>
            <button
              onClick={onGoToAvailableTests}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-zinc-900 border border-zinc-800 text-indigo-300 hover:bg-zinc-850 cursor-pointer"
            >
              View Available Tests
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
