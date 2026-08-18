import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart, Activity, Clock, ShieldCheck, 
  AlertTriangle, BookOpen, Target, RotateCcw, 
  Flame, Filter, ChevronRight, CheckCircle2, Zap
} from 'lucide-react';
import { StudySession, SubjectId } from '@/types/index';
import { springs } from '@/constants/motion';

interface StudyActivityTelemetryProps {
  studySessions: StudySession[];
}

export function StudyActivityTelemetry({ studySessions }: StudyActivityTelemetryProps) {
  const [selectedActivityFilter, setSelectedActivityFilter] = useState<'ALL' | 'Lecture' | 'Practice' | 'Revision' | 'Mock'>('ALL');

  // Compute Activity Distribution
  const activityBreakdown = useMemo(() => {
    let lectureMins = 0;
    let practiceMins = 0;
    let revisionMins = 0;
    let mockMins = 0;
    let totalMins = 0;
    let totalInterruptions = 0;
    let totalIdleMins = 0;

    studySessions.forEach(s => {
      const d = s.duration || 0;
      totalMins += d;
      totalInterruptions += s.focusInterruptions || 0;
      totalIdleMins += s.idleTime || 0;

      if (s.type === 'Lecture') lectureMins += d;
      else if (s.type === 'Practice') practiceMins += d;
      else if (s.type === 'Revision') revisionMins += d;
      else if (s.type === 'Mock') mockMins += d;
      else practiceMins += d; // Default
    });

    const safeTotal = Math.max(1, totalMins);
    const lecturePct = Math.round((lectureMins / safeTotal) * 100);
    const practicePct = Math.round((practiceMins / safeTotal) * 100);
    const revisionPct = Math.round((revisionMins / safeTotal) * 100);
    const mockPct = Math.round((mockMins / safeTotal) * 100);

    // Focus Quality Index (FQI)
    // Formula: 100 - (Idle Penalty) - (Interruption Penalty)
    const idlePenalty = Math.min(30, (totalIdleMins / safeTotal) * 40);
    const interruptionPenalty = Math.min(30, totalInterruptions * 2);
    const fqiScore = Math.max(40, Math.round(100 - idlePenalty - interruptionPenalty));

    return {
      lectureMins,
      practiceMins,
      revisionMins,
      mockMins,
      totalHours: (totalMins / 60).toFixed(1),
      lecturePct,
      practicePct,
      revisionPct,
      mockPct,
      totalInterruptions,
      totalIdleMins,
      fqiScore
    };
  }, [studySessions]);

  // Filtered Sessions List
  const filteredSessions = useMemo(() => {
    let list = [...studySessions].reverse();
    if (selectedActivityFilter !== 'ALL') {
      list = list.filter(s => s.type === selectedActivityFilter);
    }
    return list.slice(0, 8);
  }, [studySessions, selectedActivityFilter]);

  const getActivityTheme = (type: StudySession['type']) => {
    switch (type) {
      case 'Lecture':
        return { label: 'Theory / Lecture', color: 'text-sky-400', bg: 'bg-sky-950/40 border-sky-500/30' };
      case 'Practice':
        return { label: 'DPP / Solving', color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-500/30' };
      case 'Revision':
        return { label: 'Spaced Recall', color: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-500/30' };
      case 'Mock':
        return { label: 'Mock Test', color: 'text-rose-400', bg: 'bg-rose-950/40 border-rose-500/30' };
      default:
        return { label: 'Self Study', color: 'text-indigo-400', bg: 'bg-indigo-950/40 border-indigo-500/30' };
    }
  };

  return (
    <div className="p-6 rounded-3xl border border-white/10 glass-panel shadow-2xl space-y-6 text-left relative overflow-hidden font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300">
              STUDY TELEMETRY & FOCUS QUALITY
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
            Activity Type Split & Focus Quality Index
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl font-sans leading-relaxed">
            Measures your ratio of Theory vs Problem Solving vs Revision against the optimal JEE Advanced Golden Ratio.
          </p>
        </div>

        {/* Focus Quality Index Pill */}
        <div className="px-4 py-2.5 rounded-2xl bg-zinc-950/70 border border-white/10 flex items-center gap-3 shrink-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-sm border ${
            activityBreakdown.fqiScore >= 80
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
          }`}>
            {activityBreakdown.fqiScore}%
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-zinc-400 font-bold">Focus Quality Index (FQI)</div>
            <div className="text-xs font-mono font-bold text-white">
              {activityBreakdown.fqiScore >= 80 ? 'Deep Work State' : 'Minor Distraction Leaks'}
            </div>
          </div>
        </div>
      </div>

      {/* 1. ACTIVITY TYPE DISTRIBUTION BAR & RATIO BENCHMARK */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-zinc-400 uppercase tracking-wider font-bold">Study Time Distribution ({activityBreakdown.totalHours} Total Hours)</span>
          <span className="text-zinc-400">Target Ratio: 25% Theory : 55% Solving : 20% Revision</span>
        </div>

        {/* Multi-Segment Stacked Progress Bar */}
        <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden flex border border-white/10 shadow-inner">
          <div 
            className="bg-sky-500 h-full transition-all" 
            style={{ width: `${activityBreakdown.lecturePct}%` }}
            title={`Theory: ${activityBreakdown.lecturePct}%`}
          />
          <div 
            className="bg-emerald-500 h-full transition-all" 
            style={{ width: `${activityBreakdown.practicePct}%` }}
            title={`Problem Solving: ${activityBreakdown.practicePct}%`}
          />
          <div 
            className="bg-purple-500 h-full transition-all" 
            style={{ width: `${activityBreakdown.revisionPct}%` }}
            title={`Revision: ${activityBreakdown.revisionPct}%`}
          />
          <div 
            className="bg-rose-500 h-full transition-all" 
            style={{ width: `${activityBreakdown.mockPct}%` }}
            title={`Mock Tests: ${activityBreakdown.mockPct}%`}
          />
        </div>

        {/* Activity Category Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          
          <div className="p-3 rounded-2xl bg-zinc-950/60 border border-sky-500/20 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-sky-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
              Theory / Lectures
            </span>
            <div className="text-base font-mono font-bold text-white">
              {Math.round(activityBreakdown.lectureMins / 60)}h <span className="text-xs text-zinc-400">({activityBreakdown.lecturePct}%)</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">Target: ~25%</span>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-950/60 border border-emerald-500/20 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              DPP & Solving
            </span>
            <div className="text-base font-mono font-bold text-white">
              {Math.round(activityBreakdown.practiceMins / 60)}h <span className="text-xs text-zinc-400">({activityBreakdown.practicePct}%)</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">Target: ~55% (Core)</span>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-950/60 border border-purple-500/20 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-purple-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
              Spaced Recall
            </span>
            <div className="text-base font-mono font-bold text-white">
              {Math.round(activityBreakdown.revisionMins / 60)}h <span className="text-xs text-zinc-400">({activityBreakdown.revisionPct}%)</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">Target: ~15%</span>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-950/60 border border-rose-500/20 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-rose-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
              Mock Tests
            </span>
            <div className="text-base font-mono font-bold text-white">
              {Math.round(activityBreakdown.mockMins / 60)}h <span className="text-xs text-zinc-400">({activityBreakdown.mockPct}%)</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">Target: ~10%</span>
          </div>

        </div>
      </div>

      {/* 2. RECENT SESSION LOG & INTERRUPTIONS AUDIT */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            Recent Session Telemetry & Interruption Log
          </h3>

          {/* Glider Filter */}
          <div className="flex items-center gap-1 bg-zinc-950/60 border border-white/10 p-1 rounded-xl font-mono text-xs">
            {(['ALL', 'Practice', 'Lecture', 'Revision', 'Mock'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setSelectedActivityFilter(f)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedActivityFilter === f
                    ? 'bg-indigo-600/30 border border-indigo-500/40 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-zinc-500 border border-dashed border-zinc-850 rounded-2xl">
            No study sessions found matching the selected filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-xs">
            {filteredSessions.map((session, idx) => {
              const theme = getActivityTheme(session.type);
              const dateStr = session.startTime 
                ? new Date(session.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : 'Recent';

              return (
                <div
                  key={session.id || idx}
                  className="p-3.5 rounded-2xl bg-zinc-950/70 border border-white/5 hover:border-white/20 transition-all flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${theme.bg} ${theme.color}`}>
                        {theme.label}
                      </span>
                      <span className="text-[10px] text-zinc-500">{dateStr}</span>
                    </div>
                    <span className="font-bold text-white font-sans text-xs truncate block">
                      {session.chapterId || session.subjectId?.toUpperCase() || 'General Study Session'}
                    </span>
                  </div>

                  <div className="text-right shrink-0 space-y-0.5">
                    <div className="font-bold text-zinc-200">
                      {session.duration}m
                    </div>
                    {session.questionsSolved && session.questionsSolved > 0 ? (
                      <span className="text-[10px] text-emerald-400 block">
                        {session.questionsSolved} Qs ({session.accuracy ?? 80}%)
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-500 block">
                        {session.focusInterruptions || 0} breaks
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
