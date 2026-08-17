import { useMemo, useState } from 'react';
import { Calendar, Flame, Zap, Sparkles } from 'lucide-react';
import { StudySession } from '@/types/index';
import { toLocalDateString } from '@/utils/dateUtils';
import { motion } from 'motion/react';

interface RevisionCalendarHeatmapProps {
  sessions: StudySession[];
}

export function RevisionCalendarHeatmap({ sessions }: RevisionCalendarHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<{ dateStr: string; count: number } | null>(null);

  // Generate 30-day activity grid
  const daysGrid = useMemo(() => {
    const days: { dateStr: string; count: number; dayName: string }[] = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = toLocalDateString(d);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      
      const sessCount = sessions.filter(s => s.startTime.startsWith(dateStr) && (s.type === 'Revision' || (s.questionsSolved ?? 0) > 0)).length;
      days.push({ dateStr, count: sessCount, dayName });
    }

    return days;
  }, [sessions]);

  const totalReviews30d = daysGrid.reduce((acc, d) => acc + d.count, 0);
  const activeDays30d = daysGrid.filter(d => d.count > 0).length;

  return (
    <div className="bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 bg-zinc-900/70 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 space-y-4 text-left select-none shadow-2xl relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-[10px] uppercase font-bold tracking-widest">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Spaced Consistency Telemetry</span>
          </div>
          <h4 className="text-lg font-display font-bold text-white tracking-tight">
            30-Day Spaced Repetition Heatmap
          </h4>
        </div>
        
        {/* Quick Activity Stats */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 bg-zinc-950/60 border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-zinc-300"><strong>{activeDays30d}</strong>/30 Active Days</span>
          </div>
          <div className="bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 bg-indigo-950/60 border border-indigo-500/40 px-3 py-1.5 rounded-xl text-indigo-300 flex items-center gap-1.5 shadow-sm">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span><strong>{totalReviews30d}</strong> Sessions</span>
          </div>
        </div>
      </div>

      {/* 30-Day Grid */}
      <div className="bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 bg-zinc-950/70 border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="overflow-x-auto pb-1 custom-scrollbar">
          <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-30 gap-1.5 pt-1 min-w-[480px] sm:min-w-0">
            {daysGrid.map((day, idx) => {
              const intensity = 
                day.count >= 4 ? 'bg-indigo-500 shadow-md shadow-indigo-500/40 border border-indigo-300/50' :
                day.count >= 2 ? 'bg-indigo-600/90 border border-indigo-500/40' :
                day.count === 1 ? 'bg-indigo-900/60 border border-indigo-700/40' :
                'bg-zinc-900/60 border border-white/5';

              return (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.2, zIndex: 10 }}
                  onMouseEnter={() => setHoveredDay({ dateStr: day.dayName, count: day.count })}
                  onMouseLeave={() => setHoveredDay(null)}
                  title={`${day.dayName}: ${day.count} sessions`}
                  className={`h-7 rounded-lg transition-all cursor-pointer flex items-center justify-center text-[10px] font-mono font-bold ${intensity} ${day.count > 0 ? 'text-white' : 'text-zinc-600'}`}
                >
                  {day.count > 0 ? day.count : ''}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Hovered Tooltip / Legend Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-zinc-400 pt-2 border-t border-white/10">
          <div>
            {hoveredDay ? (
              <span className="text-indigo-300 font-bold">
                {hoveredDay.dateStr} • {hoveredDay.count} active revision session{hoveredDay.count === 1 ? '' : 's'}
              </span>
            ) : (
              <span>Hover over any day node to view session frequency</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-zinc-400">Idle</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-md bg-zinc-900 border border-white/5" />
              <span className="w-3 h-3 rounded-md bg-indigo-900/60 border border-indigo-700/40" />
              <span className="w-3 h-3 rounded-md bg-indigo-600 border border-indigo-500/40" />
              <span className="w-3 h-3 rounded-md bg-indigo-500 border border-indigo-300/50 shadow-sm shadow-indigo-500/50" />
            </div>
            <span className="text-indigo-300 font-bold">Peak Velocity</span>
          </div>
        </div>
      </div>
    </div>
  );
}
