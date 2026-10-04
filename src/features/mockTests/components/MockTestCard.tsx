import React from 'react';
import { 
  Play, 
  Printer, 
  Trash2, 
  CheckCircle2, 
  BarChart2,
  FileText,
  Zap,
  GraduationCap,
  Award,
  Clock
} from 'lucide-react';
import { MockTest } from '@/types/mockTest';
import { renderMathText } from '../utils/mathText';
import { 
  calculateTestDifficulty, 
  getDifficultyLabel, 
  getDifficultyColors 
} from '../utils/testDifficulty';

function formatRelativeTime(timestamp?: number): string | null {
  if (!timestamp) return null;
  const diff = Date.now() - timestamp;
  if (diff < 0) return 'Just now';
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'Just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export interface MockTestCardProps {
  test: MockTest;
  attemptStats?: {
    count: number;
    bestScore: number;
    bestAccuracy: number;
    lastDate: string;
    lastAttemptId: string;
  };
  onStart: (test: MockTest) => void;
  onPrint: (test: MockTest) => void;
  onDelete: (id: string) => void;
  isCustom: boolean;
  navigate: (path: string) => void;
}

export function MockTestCard({
  test,
  attemptStats,
  onStart,
  onPrint,
  onDelete,
  isCustom,
  navigate
}: MockTestCardProps) {
  const totalQuestions = test.sections.reduce((acc, s) => acc + s.questions.length, 0);
  const isAttempted = attemptStats && attemptStats.count > 0;
  const bestPct = isAttempted ? Math.round((attemptStats.bestScore / test.totalMarks) * 100) : 0;
  const difficulty = calculateTestDifficulty(test);
  const difficultyColors = getDifficultyColors(difficulty);
  const difficultyLabel = getDifficultyLabel(difficulty);

  const testNameLower = (test.name || '').toLowerCase();
  const isDpp = test.source === 'dpp' || test.category === 'dpp' || testNameLower.includes('dpp') || testNameLower.includes('worksheet');
  const isPyq = test.source === 'pyq' || test.category === 'pyq' || testNameLower.includes('shift') || testNameLower.includes('pyq') || /\b20\d\d\b/.test(testNameLower);
  const isDrill = test.source === 'generated' || test.category === 'chapter' || testNameLower.includes('drill') || testNameLower.includes('mastery');

  // Mark as recent if created within 48h or custom created in current session
  const isRecent = Boolean(test.createdAt && (Date.now() - test.createdAt < 48 * 3600 * 1000));
  const relativeTime = formatRelativeTime(test.createdAt);

  return (
    <div className={`group rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 shadow-lg border relative w-full ${
      isRecent
        ? 'surface-1 border-cyan-500/40 hover:border-cyan-400/60 ring-1 ring-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.12)]'
        : isAttempted 
        ? 'surface-1 hover:border-emerald-500/40 border-emerald-500/25' 
        : isCustom
        ? 'surface-1 hover:border-indigo-500/40 border-indigo-500/25'
        : 'surface-1 hover:border-white/10 border-white/5'
    }`}>
      {/* Left side: Badges, Title, Sections, and Telemetry */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Row 1: Badges & Inline Telemetry */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          {/* Pulsing "NEW" badge for newly created tests */}
          {isRecent && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>NEW</span>
            </span>
          )}

          {/* Distinct Source Pill - single prominent badge */}
          {isDpp ? (
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
              <FileText className="w-2.5 h-2.5 text-emerald-400" />
              <span>Coaching DPP</span>
            </span>
          ) : isDrill ? (
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-indigo-950/70 border border-indigo-500/40 text-indigo-300 flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-indigo-400" />
              <span>Chapter Drill</span>
            </span>
          ) : isPyq ? (
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-amber-950/70 border border-amber-500/40 text-amber-300 flex items-center gap-1">
              <GraduationCap className="w-2.5 h-2.5 text-amber-400" />
              <span>Official PYQ</span>
            </span>
          ) : (
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-purple-950/70 border border-purple-500/40 text-purple-300 flex items-center gap-1">
              <Award className="w-2.5 h-2.5 text-purple-400" />
              <span>Grand Mock</span>
            </span>
          )}

          {/* Clean Inline Typography with • dividers */}
          <span className="text-zinc-200 font-semibold">{test.durationMinutes} Mins</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400">{totalQuestions} Qs • {test.totalMarks} M</span>
          <span className="text-zinc-600">•</span>
          <span className={`font-semibold flex items-center gap-1 ${difficultyColors.text}`}>
            <BarChart2 className="w-2.5 h-2.5" />
            <span>{difficultyLabel}</span>
          </span>

          {/* Relative creation time */}
          {relativeTime && (
            <>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-500 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-zinc-500" />
                <span>{relativeTime}</span>
              </span>
            </>
          )}
        </div>

        {/* Row 2: Title */}
        <h3 className="text-sm sm:text-base font-bold text-white font-display line-clamp-1 group-hover:text-indigo-300 transition-colors">
          {renderMathText(test.name)}
        </h3>

        {/* Row 3: Sections list & Attempt Telemetry */}
        <div className="flex items-center gap-2 flex-wrap pt-0.5 text-xs font-mono">
          <div className="flex items-center gap-1.5 flex-wrap">
            {test.sections.map((sec, idx) => {
              const isPhysics = (sec.subject || '').toLowerCase().includes('phys');
              const isChemistry = (sec.subject || '').toLowerCase().includes('chem');
              const colorClass = isPhysics 
                ? 'text-sky-400' 
                : isChemistry 
                ? 'text-emerald-400' 
                : 'text-indigo-400';
              return (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="text-zinc-600">•</span>}
                  <span className={`${colorClass} font-medium uppercase text-[11px]`}>
                    {sec.subject} ({sec.questions.length})
                  </span>
                </React.Fragment>
              );
            })}
          </div>

          <span className="text-zinc-700">|</span>

          <div className="inline-flex items-center">
            {isAttempted ? (
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 font-medium">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>
                  Best: {attemptStats.bestScore}/{test.totalMarks} ({bestPct}%) • {attemptStats.count} attempt{attemptStats.count > 1 ? 's' : ''}
                </span>
              </div>
            ) : (
              <span className="text-[11px] font-mono text-zinc-500">
                Unattempted CBT Simulation
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center justify-between md:justify-end gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-800/80">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPrint(test)}
            className="p-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-800 hover:border-zinc-700 cursor-pointer shadow-xs"
            title="Print test paper"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          {isAttempted && (
            <button
              type="button"
              onClick={() => navigate(`/mock-tests/result/${attemptStats.lastAttemptId}`)}
              className="px-3 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-850 text-zinc-300 hover:text-white text-xs font-mono font-bold border border-zinc-750 hover:border-zinc-700 transition-colors cursor-pointer shadow-xs"
            >
              Autopsy
            </button>
          )}

          {isCustom && (
            <button
              type="button"
              onClick={() => onDelete(test.id)}
              className="p-2 rounded-xl bg-zinc-900/90 hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400 transition-colors border border-zinc-800 hover:border-rose-800/50 cursor-pointer shadow-xs"
              title="Delete test"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => onStart(test)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 border border-indigo-400/30 active:scale-[0.98] hover:scale-[1.02] transition-all tracking-wider uppercase cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          <span>Start Test</span>
        </button>
      </div>
    </div>
  );
}
