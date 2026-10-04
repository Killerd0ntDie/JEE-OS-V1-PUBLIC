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
        {/* Hero Header Banner */}
        <div className="surface-2 rounded-3xl p-6 sm:p-7 border border-zinc-800/80 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          {/* Subtle ambient accent */}
          <div className="absolute top-0 right-0 w-80 h-36 bg-rose-600/10 rounded-full filter blur-3xl pointer-events-none" />

          <div className="space-y-1.5 relative z-10">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-rose-950/70 border border-rose-500/40 text-rose-300 font-mono text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                <History className="w-3 h-3 text-rose-400" />
                <span>Attempt Forensics</span>
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400 text-xs font-mono">Full Scorecards</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white font-display tracking-tight">
              Past Test Attempts
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
              Review your completed mock test attempts, scores, and question solutions.
            </p>
          </div>

          <div className="relative min-w-[240px] z-10">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search past attempts..."
              className="w-full h-9 pl-8 pr-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-rose-500/50 transition-all font-mono shadow-inner"
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

                  <div className="surface-1 hover:border-white/10 rounded-2xl p-5 border border-white/5 transition-all shadow-lg space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/70 px-2.5 py-0.5 rounded-lg border border-emerald-500/40">
                            Completed
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">
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
                      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-white/5">
                        {Object.entries(mock.subjectBreakdown).map(([subj, rawData]) => {
                          const data = rawData as { score?: number; attempted?: number; correct?: number; accuracy?: number };
                          const isPhysics = subj.toLowerCase().includes('phys');
                          const isChemistry = subj.toLowerCase().includes('chem');
                          return (
                            <div
                              key={subj}
                              className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-semibold ${
                                isPhysics
                                  ? 'bg-sky-950/70 border-sky-500/40 text-sky-300'
                                  : isChemistry
                                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                                  : 'bg-indigo-950/70 border-indigo-500/40 text-indigo-300'
                              }`}
                            >
                              <span className="capitalize">{subj}:</span>
                              <span>{data.score ?? 0} M ({data.accuracy !== undefined ? data.accuracy : ((data.attempted || 0) > 0 ? Math.round(((data.correct || 0) / (data.attempted || 1)) * 100) : 0)}%)</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div className="text-xs font-mono text-zinc-400">
                        {mock.duration} Mins Elapsed
                      </div>

                      <div className="flex items-center gap-2">
                        {mock.testSnapshot && (
                          <button
                            onClick={() => onStartTest({ ...mock.testSnapshot!, id: `retake-${mock.id}-${Date.now()}` })}
                            className="px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-700/60 text-xs font-mono font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer shadow-xs"
                          >
                            Retake Test
                          </button>
                        )}

                        <button
                          onClick={() => onDeleteAttempt(mock.id)}
                          className="p-2 rounded-xl bg-zinc-900/90 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-800/50 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer shadow-xs"
                          title="Delete this attempt and all associated data"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onViewSolutions(mock.id)}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold tracking-wider uppercase transition-all shadow-md shadow-indigo-600/25 border border-indigo-400/30 cursor-pointer"
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
          <div className="surface-2 rounded-2xl p-10 text-center border border-zinc-800/80 shadow-md">
            <Search className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-zinc-300 font-display">No Matches Found</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              No past attempts match &ldquo;{searchQuery}&rdquo;. Try a different search term or clear the filter.
            </p>
            <button
              onClick={() => onSearchChange('')}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-zinc-900/90 border border-zinc-800 text-rose-300 hover:bg-zinc-850 cursor-pointer"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="surface-2 rounded-2xl p-10 text-center border border-zinc-800/80 shadow-md">
            <History className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-zinc-300 font-display">No Past Attempts Recorded</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Take your first mock test or chapter drill to see your scores and question solutions here.
            </p>
            <button
              onClick={onGoToAvailableTests}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-zinc-900/90 border border-zinc-800 text-indigo-300 hover:bg-zinc-850 cursor-pointer"
            >
              View Available Tests
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
