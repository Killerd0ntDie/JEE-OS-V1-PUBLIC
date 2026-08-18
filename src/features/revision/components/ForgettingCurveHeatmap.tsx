import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Flame, AlertTriangle, ShieldCheck, 
  RotateCcw, Sparkles, ChevronRight, Zap, BookOpen 
} from 'lucide-react';
import { Chapter, SubjectId } from '@/types/index';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { audioEngine } from '@/utils/audioEngine';

interface ForgettingCurveHeatmapProps {
  chapters: Chapter[];
  onReviewChapter?: (chapterId: string) => void;
}

export function ForgettingCurveHeatmap({ chapters, onReviewChapter }: ForgettingCurveHeatmapProps) {
  const actions = useStudyBrainStore(state => state.actions);
  const [selectedSubject, setSelectedSubject] = useState<'all' | SubjectId>('all');

  // Compute Ebbinghaus Retention Index for all chapters
  const retentionAudit = useMemo(() => {
    const list = chapters.map(chap => {
      const daysSinceReview = Math.max(1, chap.lastRevisionDaysAgo ?? 5);
      const revisionCount = chap.revisionCount ?? 1;
      
      // Stability factor S increases with each spaced revision cycle
      const stabilityS = Math.max(2, Math.round(3 * Math.pow(1.8, Math.min(5, revisionCount))));
      
      // Ebbinghaus equation: R = exp(-t / S) * 100
      const retentionScore = Math.min(100, Math.max(10, Math.round(Math.exp(-daysSinceReview / stabilityS) * 100)));

      const isDecaying = retentionScore < 55;
      const isCritical = retentionScore < 40;

      return {
        ...chap,
        daysSinceReview,
        revisionCount,
        stabilityS,
        retentionScore,
        isDecaying,
        isCritical
      };
    });

    const filtered = list.filter(c => selectedSubject === 'all' || c.subject === selectedSubject);
    
    // Sort critical decaying chapters to the top
    const criticalChapters = [...filtered].filter(c => c.isDecaying).sort((a, b) => a.retentionScore - b.retentionScore);
    const healthyChapters = [...filtered].filter(c => !c.isDecaying).sort((a, b) => b.retentionScore - a.retentionScore);

    const averageRetention = Math.round(filtered.reduce((acc, c) => acc + c.retentionScore, 0) / Math.max(1, filtered.length));

    return {
      filtered,
      criticalChapters,
      healthyChapters,
      averageRetention,
      decayingCount: criticalChapters.length
    };
  }, [chapters, selectedSubject]);

  const getRetentionBadge = (score: number) => {
    if (score >= 75) return { label: 'High Retention', color: 'text-emerald-400', bg: 'bg-emerald-950/60 border-emerald-500/30' };
    if (score >= 50) return { label: 'Moderate Retention', color: 'text-amber-400', bg: 'bg-amber-950/60 border-amber-500/30' };
    return { label: 'Memory Fading ($R < 50\\%$)', color: 'text-rose-400', bg: 'bg-rose-950/60 border-rose-500/30' };
  };

  return (
    <div className="p-6 rounded-3xl border border-white/10 glass-panel shadow-2xl space-y-6 text-left relative overflow-hidden font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-indigo-400" />
              EBBINGHAUS FORGETTING CURVE // $R = e^{'{'}-t/S{'}'}$
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
            Spaced Repetition Memory Decay Telemetry
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl font-sans leading-relaxed">
            Mathematically tracks memory half-life decay across your syllabus and flags chapters entering the critical forget threshold.
          </p>
        </div>

        {/* Global Average Retention Gauge */}
        <div className="px-4 py-2.5 rounded-2xl bg-zinc-950/70 border border-white/10 flex items-center gap-3 shrink-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-sm border ${
            retentionAudit.averageRetention >= 70
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
          }`}>
            {retentionAudit.averageRetention}%
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-zinc-400 font-bold">Average Retention Index</div>
            <div className="text-xs font-mono font-bold text-white">
              {retentionAudit.decayingCount} Chapters Due for Recall
            </div>
          </div>
        </div>
      </div>

      {/* 1. SUBJECT SWITCHER */}
      <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-white/10 font-mono text-xs w-fit">
        {(['all', 'physics', 'chemistry', 'maths'] as const).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setSelectedSubject(s)}
            className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-colors cursor-pointer ${
              selectedSubject === s ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* 2. CRITICAL DECAY RADAR (HIGH PRIORITY) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-rose-400 uppercase font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Critical Memory Decay Alert ({retentionAudit.criticalChapters.length} Chapters)
          </span>
          <span className="text-zinc-500">Scheduled 15m review recommended</span>
        </div>

        {retentionAudit.criticalChapters.length === 0 ? (
          <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 font-mono text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>All syllabus chapters currently have healthy memory retention ($R \ge 55\%$).</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
            {retentionAudit.criticalChapters.slice(0, 6).map(chap => {
              const badge = getRetentionBadge(chap.retentionScore);

              return (
                <div
                  key={chap.id}
                  className="p-4 rounded-2xl bg-zinc-950/80 border border-rose-500/30 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-zinc-400">{chap.subject}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge.bg} ${badge.color}`}>
                        {chap.retentionScore}% Retention
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white font-sans truncate">
                      {chap.name}
                    </h4>
                    <span className="text-[10px] text-zinc-500 block">
                      Last reviewed {chap.daysSinceReview} days ago • Stability: {chap.stabilityS}d half-life
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      audioEngine.playMechanicalKey('click').catch(() => {});
                      if (onReviewChapter) onReviewChapter(chap.id);
                      else actions.openChapterEditModal(chap.id);
                    }}
                    className="w-full py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Quick Recall Drill (15m)</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
