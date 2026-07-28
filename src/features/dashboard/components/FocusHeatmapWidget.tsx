import React from 'react';
import { Card } from '../../../components/ui/Card';
import { StudySession } from '../../../types';

interface FocusHeatmapWidgetProps {
  studySessions: StudySession[];
}

export const FocusHeatmapWidget: React.FC<FocusHeatmapWidgetProps> = ({ studySessions }) => {
  // Generate last 14 days dates (inclusive of today)
  const days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Calculate total minutes logged per day
  const dailyMinutesMap = new Map<string, number>();
  studySessions.forEach(session => {
    if (!session.startTime) return;
    const sDate = new Date(session.startTime);
    sDate.setHours(0, 0, 0, 0);
    const dateKey = sDate.toISOString().split('T')[0];
    const existing = dailyMinutesMap.get(dateKey) || 0;
    dailyMinutesMap.set(dateKey, existing + (session.duration || 0));
  });

  // Format date helper
  const formatDateLabel = (d: Date) => {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getDayName = (d: Date) => {
    return d.toLocaleDateString([], { weekday: 'narrow' });
  };

  // Get intensity level based on minutes
  const getIntensity = (mins: number) => {
    if (mins === 0) return 'bg-zinc-900/60 border-zinc-800/80 text-zinc-600';
    if (mins < 90) return 'bg-emerald-950/40 border-emerald-800/50 text-emerald-400';
    if (mins < 240) return 'bg-emerald-600/30 border-emerald-500/50 text-emerald-300 font-bold';
    return 'bg-emerald-500/80 border-emerald-400 text-white font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)]';
  };

  // Active days count in 14-day window
  const activeDays = days.filter(d => {
    const key = d.toISOString().split('T')[0];
    return (dailyMinutesMap.get(key) || 0) > 0;
  }).length;

  return (
    <Card className="p-5 border-zinc-800/80 bg-zinc-950/40 text-left relative overflow-hidden">
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <span className="text-[9px] font-mono text-emerald-400 font-bold tracking-widest uppercase block">
            CONSISTENCY METRIC
          </span>
          <h4 className="text-xs font-semibold text-zinc-200 mt-0.5">14-Day Focus Flow</h4>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-bold text-emerald-400">{activeDays}/14 Days</span>
          <span className="text-[9px] font-mono text-zinc-500 block">Active Study Rate</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 pt-1">
        {days.map((day, idx) => {
          const dateKey = day.toISOString().split('T')[0];
          const mins = dailyMinutesMap.get(dateKey) || 0;
          const hrs = (mins / 60).toFixed(1);
          const isToday = idx === 13;

          return (
            <div
              key={dateKey}
              className="group relative flex flex-col items-center gap-1 cursor-default"
            >
              <div
                className={`w-full aspect-square rounded-lg border transition-all duration-200 flex items-center justify-center text-[9px] font-mono ${getIntensity(mins)} ${
                  isToday ? 'ring-1 ring-emerald-400 ring-offset-1 ring-offset-black' : ''
                }`}
              >
                {mins > 0 ? (mins >= 60 ? `${Math.round(mins/60)}h` : `${mins}m`) : ''}
              </div>

              <span className="text-[8px] font-mono text-zinc-500 uppercase">
                {getDayName(day)}
              </span>

              {/* Tooltip on hover */}
              <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
                <div className="bg-zinc-900 border border-zinc-700 text-zinc-200 px-2 py-1 rounded text-[9px] font-mono whitespace-nowrap shadow-xl">
                  <span className="font-bold text-white">{formatDateLabel(day)}</span>: {hrs} hrs ({mins} mins)
                </div>
                <div className="w-1.5 h-1.5 bg-zinc-900 border-b border-r border-zinc-700 rotate-45 -mt-1" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pt-3 border-t border-zinc-900/60 mt-3">
        <span>Less active</span>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-zinc-900 border border-zinc-800" />
          <span className="w-2.5 h-2.5 rounded bg-emerald-950/40 border border-emerald-800/50" />
          <span className="w-2.5 h-2.5 rounded bg-emerald-600/40 border border-emerald-500/50" />
          <span className="w-2.5 h-2.5 rounded bg-emerald-500 border border-emerald-400" />
        </div>
        <span>High Focus (4h+)</span>
      </div>
    </Card>
  );
};
