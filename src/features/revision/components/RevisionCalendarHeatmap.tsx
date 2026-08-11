import { useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { StudySession } from '@/types/index';
import { toLocalDateString } from '@/utils/dateUtils';

interface RevisionCalendarHeatmapProps {
  sessions: StudySession[];
}

export function RevisionCalendarHeatmap({ sessions }: RevisionCalendarHeatmapProps) {
  // Generate 30-day activity grid
  const daysGrid = useMemo(() => {
    const days: { dateStr: string; count: number }[] = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = toLocalDateString(d);
      
      const sessCount = sessions.filter(s => s.startTime.startsWith(dateStr)).length;
      days.push({ dateStr, count: sessCount });
    }

    return days;
  }, [sessions]);

  return (
    <div className="bg-zinc-950/60 border border-zinc-850/80 rounded-2xl p-5 space-y-3 text-left select-none shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
        <div className="flex items-center gap-2">
          <Icon name="Calendar" className="w-4 h-4 text-indigo-400" />
          <h4 className="text-xs font-mono font-bold uppercase text-white tracking-wider">
            30-Day Spaced Revision Heatmap
          </h4>
        </div>
        <span className="text-[10px] font-mono text-zinc-400">
          Last 30 Days Activity
        </span>
      </div>

      {/* 30-Day Grid */}
      <div className="flex flex-wrap gap-1.5 justify-between pt-1">
        {daysGrid.map((day, idx) => {
          const intensity = 
            day.count >= 4 ? 'bg-indigo-500 shadow-sm shadow-indigo-500/50' :
            day.count >= 2 ? 'bg-indigo-600/80' :
            day.count === 1 ? 'bg-indigo-900/60 border border-indigo-800/40' :
            'bg-zinc-900/60 border border-zinc-850';

          return (
            <div
              key={idx}
              className={`w-5 h-5 rounded-md transition-all hover:scale-125 cursor-pointer ${intensity}`}
              title={`${day.dateStr}: ${day.count} revision sessions`}
            />
          );
        })}
      </div>

      <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400 pt-1 border-t border-zinc-900">
        <span>Less Consistent</span>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-zinc-900 border border-zinc-850" />
          <span className="w-2.5 h-2.5 rounded bg-indigo-900/60" />
          <span className="w-2.5 h-2.5 rounded bg-indigo-600" />
          <span className="w-2.5 h-2.5 rounded bg-indigo-500" />
        </div>
        <span>High Velocity</span>
      </div>
    </div>
  );
}
