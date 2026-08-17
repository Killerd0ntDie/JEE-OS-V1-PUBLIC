import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Activity, Sparkles, AlertTriangle, ShieldCheck, Zap, Info, ArrowRight, Flame } from 'lucide-react';
import { ChapterRevisionSummary } from '@jee-os/engines';
import { BlockMath, InlineMath } from 'react-katex';
import { springs } from '@/constants/motion';

interface EbbinghausDecayCurveProps {
  avgRetentionScore: number;
  overdueCount: number;
  overdueChapters?: ChapterRevisionSummary[];
  upcomingChapters?: ChapterRevisionSummary[];
  masteredChapters?: ChapterRevisionSummary[];
  onInspectChapter?: (chapterId: string) => void;
  onLaunchArena?: () => void;
}

export function EbbinghausDecayCurve({
  avgRetentionScore,
  overdueCount,
  overdueChapters = [],
  upcomingChapters = [],
  masteredChapters = [],
  onInspectChapter,
  onLaunchArena
}: EbbinghausDecayCurveProps) {
  // Interactive Day Horizon Scrubber (Day 1 to Day 60)
  const [selectedDay, setSelectedDay] = useState<number>(30);
  const [activeTab, setActiveTab] = useState<'curve' | 'chapters' | 'math'>('curve');

  // Total active started chapters
  const activeChaptersCount = overdueChapters.length + upcomingChapters.length + masteredChapters.length;

  // Stability factor S calculation based on user's retention score (ranges between 3 to 14 days)
  const memoryStabilityS = useMemo(() => {
    // Standard baseline memory stability is ~4.5 days for moderate retention
    const score = Math.max(30, Math.min(99, avgRetentionScore || 75));
    return Math.max(2.5, +(score / 15).toFixed(1));
  }, [avgRetentionScore]);

  // Exponential decay formula R(t) = 100 * e^(-t / S)
  const calculateUnreinforcedRecall = (day: number, sFactor: number = memoryStabilityS) => {
    const raw = 100 * Math.exp(-day / (sFactor * 1.8));
    return Math.max(5, Math.min(100, Math.round(raw)));
  };

  // Spaced repetition multi-wave recovery model R_spaced(t)
  const calculateSpacedRecall = (day: number) => {
    if (day <= 1) return 98;
    if (day <= 3) {
      // 1st review spike at Day 1: drops slightly to 92% at Day 3
      return Math.max(88, Math.round(98 - (day - 1) * 3));
    }
    if (day <= 7) {
      // 2nd review spike at Day 3: drops slightly to 90% at Day 7
      return Math.max(86, Math.round(96 - (day - 3) * 1.5));
    }
    if (day <= 14) {
      // 3rd review spike at Day 7: drops slightly to 88% at Day 14
      return Math.max(84, Math.round(95 - (day - 7) * 1));
    }
    if (day <= 30) {
      // 4th review spike at Day 14: drops slightly to 85% at Day 30
      return Math.max(82, Math.round(94 - (day - 14) * 0.55));
    }
    // Long term retention with spaced intervals
    return Math.max(80, Math.round(92 - (day - 30) * 0.3));
  };

  // SVG Chart Geometry (viewBox: 0 0 600 200)
  const chartGeometry = useMemo(() => {
    const width = 540;
    const height = 140;
    const paddingX = 40;
    const paddingY = 20;

    const maxDay = 30;
    const getX = (day: number) => paddingX + (day / maxDay) * width;
    const getY = (recallPct: number) => paddingY + ((100 - recallPct) / 100) * height;

    // 1. Generate Unreinforced Decay Path
    const unreinforcedPoints: { x: number; y: number; day: number; recall: number }[] = [];
    for (let d = 0; d <= maxDay; d += 1) {
      const recall = calculateUnreinforcedRecall(d);
      unreinforcedPoints.push({ x: getX(d), y: getY(recall), day: d, recall });
    }
    const unreinforcedPath = unreinforcedPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`, '');
    const unreinforcedArea = `${unreinforcedPath} L ${getX(maxDay)},${getY(0)} L ${getX(0)},${getY(0)} Z`;

    // 2. Generate Spaced Repetition Sawtooth Wave Path
    const spacedPoints: { x: number; y: number; day: number; recall: number }[] = [];
    // Key interval milestones: Day 0 -> Day 1 -> Review -> Day 3 -> Review -> Day 7 -> Review -> Day 14 -> Review -> Day 30
    const milestones = [
      { d: 0, r: 100 },
      { d: 1, r: calculateUnreinforcedRecall(1) },
      { d: 1.05, r: 99 }, // Review spike 1
      { d: 3, r: 91 },
      { d: 3.05, r: 98 }, // Review spike 2
      { d: 7, r: 89 },
      { d: 7.05, r: 97 }, // Review spike 3
      { d: 14, r: 87 },
      { d: 14.05, r: 96 }, // Review spike 4
      { d: 21, r: 90 },
      { d: 30, r: 86 }
    ];

    const spacedPath = milestones.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${getX(pt.d)},${getY(pt.r)}`, '');
    const spacedArea = `${spacedPath} L ${getX(maxDay)},${getY(0)} L ${getX(0)},${getY(0)} Z`;

    // 3. Current scrubber coordinates
    const scrubberX = getX(selectedDay);
    const scrubberUnreinforcedY = getY(calculateUnreinforcedRecall(selectedDay));
    const scrubberSpacedY = getY(calculateSpacedRecall(selectedDay));

    return {
      getX,
      getY,
      unreinforcedPath,
      unreinforcedArea,
      spacedPath,
      spacedArea,
      scrubberX,
      scrubberUnreinforcedY,
      scrubberSpacedY,
      milestones: milestones.filter(m => !m.d.toString().includes('.'))
    };
  }, [memoryStabilityS, selectedDay]);

  const currentUnreinforced = calculateUnreinforcedRecall(selectedDay);
  const currentSpaced = calculateSpacedRecall(selectedDay);
  const retentionGain = currentSpaced - currentUnreinforced;

  return (
    <div className="bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 bg-zinc-900/70 backdrop-blur-2xl border border-white/15 rounded-3xl p-5 md:p-6 space-y-5 text-left select-none shadow-2xl relative overflow-hidden">
      
      {/* Ambient Top Glow */}
      <div className="absolute top-0 right-0 w-80 h-32 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-[10px] uppercase font-bold tracking-widest">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
            <span>Spaced Repetition & Decay Simulator</span>
          </div>
          <h3 className="text-lg md:text-xl font-display font-bold text-white tracking-tight">
            Ebbinghaus Memory Retention & Forgetting Curve
          </h3>
          <p className="text-xs text-zinc-400 max-w-xl leading-relaxed font-sans">
            Mathematical projection of syllabus memory retention over time (R = e^&#123;-t/S&#125;) comparing unreinforced decay against optimal SuperMemo-2 spaced recall.
          </p>
        </div>

        {/* Real-time Stability & Gain Pill */}
        <div className="flex items-center gap-2.5 shrink-0 font-mono text-xs">
          <div className="bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 bg-zinc-950/70 border border-white/10 p-2.5 px-3.5 rounded-2xl space-y-0.5 text-center shadow-md">
            <span className="text-[9px] text-zinc-400 uppercase font-bold block">Memory Stability (S)</span>
            <span className="text-sm font-bold text-indigo-300 font-display">{memoryStabilityS} Days</span>
          </div>
          <div className="bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 bg-emerald-950/60 border border-emerald-500/40 p-2.5 px-3.5 rounded-2xl space-y-0.5 text-center shadow-md">
            <span className="text-[9px] text-emerald-300 uppercase font-bold block">Retention Gain</span>
            <span className="text-sm font-bold text-emerald-400 font-display">+{retentionGain}%</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex gap-1 bg-zinc-950/95 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 border border-white/10 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('curve')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'curve' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Visual Decay Simulation</span>
          </button>
          <button
            onClick={() => setActiveTab('chapters')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'chapters' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Active Chapters at Risk ({overdueChapters.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('math')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'math' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Ebbinghaus & SM-2 Mechanics</span>
          </button>
        </div>

        {/* Time Horizon Preset Buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-400 hidden sm:inline">Simulate Day:</span>
          {[1, 3, 7, 14, 21, 30].map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                selectedDay === day
                  ? 'bg-indigo-950/80 border-indigo-500/60 text-indigo-200 shadow-sm'
                  : 'bg-zinc-950/60 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              Day {day}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB 1: VISUAL DECAY SIMULATION GRAPH ── */}
      {activeTab === 'curve' && (
        <div className="space-y-4">
          <div className="relative bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 bg-zinc-950/80 border border-white/10 rounded-2xl p-4 md:p-5 shadow-inner">
            
            {/* SVG Chart Container with preserved aspect ratio */}
            <div className="relative w-full h-44 sm:h-52">
              <svg 
                className="w-full h-full" 
                viewBox="0 0 620 180" 
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient id="spacedWaveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="unreinforcedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Horizontal Gridlines */}
                {[100, 75, 50, 25, 0].map(pct => {
                  const y = chartGeometry.getY(pct);
                  return (
                    <g key={pct}>
                      <line x1="40" y1={y} x2="580" y2={y} stroke="#27272a" strokeDasharray="3 3" strokeOpacity="0.6" />
                      <text x="32" y={y + 3} textAnchor="end" fontSize="9" fill="#71717a" fontFamily="monospace">
                        {pct}%
                      </text>
                    </g>
                  );
                })}

                {/* X-Axis Vertical Markers */}
                {[0, 3, 7, 14, 21, 30].map(d => {
                  const x = chartGeometry.getX(d);
                  const anchor = d === 30 ? 'end' : d === 0 ? 'start' : 'middle';
                  const dx = d === 30 ? -4 : d === 0 ? 4 : 0;
                  return (
                    <g key={d}>
                      <line x1={x} y1="20" x2={x} y2="160" stroke="#27272a" strokeDasharray="2 2" strokeOpacity="0.4" />
                      <text x={x + dx} y="174" textAnchor={anchor} fontSize="9" fill="#a1a1aa" fontFamily="monospace">
                        {d === 0 ? 'Day 0' : d === 30 ? 'Day 30 (Exam)' : `Day ${d}`}
                      </text>
                    </g>
                  );
                })}

                {/* Area Fills */}
                <path d={chartGeometry.spacedArea} fill="url(#spacedWaveGradient)" />
                <path d={chartGeometry.unreinforcedArea} fill="url(#unreinforcedGradient)" />

                {/* Unreinforced Decay Curve (Red Dashed Line) */}
                <path
                  d={chartGeometry.unreinforcedPath}
                  fill="none"
                  stroke="#f87171"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                />

                {/* Spaced Repetition Reinforcement Sawtooth Curve (Emerald Solid Line) */}
                <path
                  d={chartGeometry.spacedPath}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Interactive Scrubber Guide Line */}
                <line
                  x1={chartGeometry.scrubberX}
                  y1="20"
                  x2={chartGeometry.scrubberX}
                  y2="160"
                  stroke="#818cf8"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />

                {/* Scrubber Nodes */}
                <circle
                  cx={chartGeometry.scrubberX}
                  cy={chartGeometry.scrubberSpacedY}
                  r="5"
                  className="fill-emerald-400 stroke-zinc-950 stroke-2"
                />
                <circle
                  cx={chartGeometry.scrubberX}
                  cy={chartGeometry.scrubberUnreinforcedY}
                  r="5"
                  className="fill-red-400 stroke-zinc-950 stroke-2"
                />

                {/* Floating SVG Metric Pill */}
                <g>
                  <rect
                    x={selectedDay >= 22 ? chartGeometry.scrubberX - 66 : chartGeometry.scrubberX + 8}
                    y={Math.max(22, chartGeometry.scrubberSpacedY - 12)}
                    width="58"
                    height="18"
                    rx="6"
                    className="fill-zinc-950/95 stroke-emerald-500/50 stroke-1"
                  />
                  <text
                    x={selectedDay >= 22 ? chartGeometry.scrubberX - 37 : chartGeometry.scrubberX + 37}
                    y={Math.max(31, chartGeometry.scrubberSpacedY - 3)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                    className="fill-emerald-300"
                  >
                    {currentSpaced}% Recall
                  </text>
                </g>
              </svg>
            </div>

            {/* Interactive Day Scrubber Slider */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Timeline Scrubber: <strong>Day {selectedDay}</strong></span>
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-emerald-400 font-bold">
                    Spaced Recall: {currentSpaced}%
                  </span>
                  <span className="text-red-400 font-bold">
                    Unreinforced: {currentUnreinforced}%
                  </span>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={selectedDay}
                onChange={(e) => setSelectedDay(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
            </div>
          </div>

          {/* Legend & Summary Ribbon */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-zinc-400 px-1">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-2 text-emerald-400 font-bold">
                <span className="w-4 h-1 bg-emerald-400 rounded-full" />
                <span>SuperMemo-2 Spaced Schedule ({currentSpaced}% at Day {selectedDay})</span>
              </span>
              <span className="flex items-center gap-2 text-red-400 font-bold">
                <span className="w-4 h-1 bg-red-400 rounded-full border-dashed" />
                <span>Unreinforced Decay Curve ({currentUnreinforced}% at Day {selectedDay})</span>
              </span>
            </div>

            <div className="text-zinc-300">
              Retention Delta: <strong className="text-emerald-400">+{retentionGain}% protected memory</strong>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: ACTIVE CHAPTERS AT RISK ── */}
      {activeTab === 'chapters' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Decaying / Overdue Column */}
            <div className="bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 bg-zinc-950/60 border border-red-500/30 rounded-2xl p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between border-b border-red-500/20 pb-2">
                <span className="text-xs font-mono font-bold text-red-400 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" />
                  <span>High Forgetting Risk ({overdueChapters.length})</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400">&lt; 50% Recall</span>
              </div>

              {overdueChapters.length === 0 ? (
                <div className="py-6 text-center text-xs font-mono text-zinc-500">
                  Zero chapters in critical decay!
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {overdueChapters.map(c => (
                    <div
                      key={c.chapterId}
                      onClick={() => onInspectChapter?.(c.chapterId)}
                      className="p-2.5 rounded-xl bg-red-950/20 border border-red-500/30 hover:border-red-500/60 transition-all cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <span className="text-white font-semibold block truncate">{c.chapterName}</span>
                        <span className="text-[10px] font-mono text-red-300 uppercase">{c.subject}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-red-400 shrink-0">
                        {c.retentionScore ?? 40}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Review Column */}
            <div className="bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 bg-zinc-950/60 border border-amber-500/30 rounded-2xl p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Review Soon ({upcomingChapters.length})</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400">50% - 75% Recall</span>
              </div>

              {upcomingChapters.length === 0 ? (
                <div className="py-6 text-center text-xs font-mono text-zinc-500">
                  No upcoming chapters due for review.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {upcomingChapters.map(c => (
                    <div
                      key={c.chapterId}
                      onClick={() => onInspectChapter?.(c.chapterId)}
                      className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30 hover:border-amber-500/60 transition-all cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <span className="text-white font-semibold block truncate">{c.chapterName}</span>
                        <span className="text-[10px] font-mono text-amber-300 uppercase">{c.subject}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-amber-400 shrink-0">
                        {c.retentionScore ?? 70}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Secure / Mastered Column */}
            <div className="bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 bg-zinc-950/60 border border-emerald-500/30 rounded-2xl p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Memory Secure ({masteredChapters.length})</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400">&gt; 75% Recall</span>
              </div>

              {masteredChapters.length === 0 ? (
                <div className="py-6 text-center text-xs font-mono text-zinc-500">
                  Complete active recall sessions to consolidate chapters here.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {masteredChapters.map(c => (
                    <div
                      key={c.chapterId}
                      onClick={() => onInspectChapter?.(c.chapterId)}
                      className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 hover:border-emerald-500/60 transition-all cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <span className="text-white font-semibold block truncate">{c.chapterName}</span>
                        <span className="text-[10px] font-mono text-emerald-300 uppercase">{c.subject}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 shrink-0">
                        {c.retentionScore ?? 90}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {overdueChapters.length > 0 && onLaunchArena && (
            <div className="pt-2 text-center">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onLaunchArena}
                className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 mx-auto shadow-lg shadow-red-600/25 transition-colors cursor-pointer"
              >
                <Flame className="w-4 h-4" />
                <span>Rescue {overdueChapters.length} Decaying Chapters in Timed Arena</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: MATHEMATICAL MODEL EXPLAINER ── */}
      {activeTab === 'math' && (
        <div className="bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 bg-zinc-950/70 border border-white/10 rounded-2xl p-5 space-y-4 font-sans text-xs leading-relaxed text-zinc-300 shadow-inner">
          <div className="flex items-center gap-2 text-indigo-400 font-mono font-bold uppercase tracking-wider">
            <Info className="w-4 h-4 text-indigo-400" />
            <span>Mathematical Mechanics: Ebbinghaus & SuperMemo-2 (SM-2)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2 p-4 rounded-2xl bg-zinc-900/80 border border-white/10">
              <h4 className="font-mono font-bold text-white uppercase text-[11px]">1. The Forgetting Curve Formula</h4>
              <div className="p-3 bg-zinc-950 rounded-xl font-mono text-indigo-300 border border-indigo-900/40 text-center">
                <BlockMath math="R(t) = e^{-\frac{t}{S}}" />
              </div>
              <p className="text-zinc-400 text-[11px]">
                <InlineMath math="R" /> is retrievability, <InlineMath math="t" /> is time elapsed in days, and <InlineMath math="S" /> is memory stability. Without review, memory decays exponentially within 48 to 72 hours.
              </p>
            </div>

            <div className="space-y-2 p-4 rounded-2xl bg-zinc-900/80 border border-white/10">
              <h4 className="font-mono font-bold text-white uppercase text-[11px]">2. Interval Expansion Formula (SM-2)</h4>
              <div className="p-3 bg-zinc-950 rounded-xl font-mono text-emerald-300 border border-emerald-900/40 text-center">
                <BlockMath math="I(n) = I(n-1) \times \text{EF}" />
              </div>
              <p className="text-zinc-400 text-[11px]">
                Each successful recall expands the ease factor <InlineMath math="\text{EF}" /> (<InlineMath math="\ge 1.3" />), multiplying the stability interval from 1 day $\to$ 3 days $\to$ 7 days $\to$ 14 days $\to$ 30+ days.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
