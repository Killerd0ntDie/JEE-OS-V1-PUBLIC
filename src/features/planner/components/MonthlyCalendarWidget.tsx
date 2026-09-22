import React, { useMemo, useState } from 'react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { toLocalDateString } from '@/utils/dateUtils';
import { Target, CheckCircle2, Calendar, Sparkles, BookOpen, Layers } from 'lucide-react';
import { WeeklyBlock } from '@jee-os/engines';

export interface MonthlyCalendarWidgetProps {
  state?: any;
}

export function MonthlyCalendarWidget({ state }: MonthlyCalendarWidgetProps) {
  const studySessions = useStudyBrainStore(state => state.studySessions);
  const chapters = useStudyBrainStore(state => state.chapters);
  const weeklyMatrix = useStudyBrainStore(state => (state as any).weeklyMatrix) || [];
  const settings = useStudyBrainStore(state => state.settings);
  const dailyQuota = settings.dailyQuota || 6;

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayStr = toLocalDateString(today);
  
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const calendarData = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; 
    const daysInMonth = lastDay.getDate();
    
    // Group past study sessions by date
    const sessionMap = new Map<string, number>();
    studySessions.forEach(s => {
      if (!s.startTime) return;
      const dStr = s.startTime.split('T')[0];
      const mins = s.duration || 0;
      sessionMap.set(dStr, (sessionMap.get(dStr) || 0) + mins);
    });

    // Group planned weekly matrix blocks by day of week (0=Mon ... 6=Sun)
    const dayOfWeekBlocksMap = new Map<number, WeeklyBlock[]>();
    weeklyMatrix.forEach((b: WeeklyBlock) => {
      const arr = dayOfWeekBlocksMap.get(b.dayIndex) || [];
      arr.push(b);
      dayOfWeekBlocksMap.set(b.dayIndex, arr);
    });

    const cells = [];
    
    // Leading padding for starting day of month
    for (let i = 0; i < startingDayOfWeek; i++) {
      cells.push(null);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const dateStr = toLocalDateString(cellDate);
      const isPast = cellDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isToday = dateStr === todayStr;
      
      const dayOfWeekIndex = cellDate.getDay() === 0 ? 6 : cellDate.getDay() - 1;
      const plannedBlocks = dayOfWeekBlocksMap.get(dayOfWeekIndex) || [];

      // Check if this day has mock tests scheduled
      const hasMock = plannedBlocks.some(b => {
        const act = (b.activity || '').toLowerCase();
        const sub = (b.subject || '').toLowerCase();
        return act.includes('mock') || act.includes('paper') || sub.includes('mock');
      });

      // Check if heavy revision day
      const hasRevision = plannedBlocks.some(b => {
        const act = (b.activity || '').toLowerCase();
        return act.includes('revision') || act.includes('formula') || act.includes('mistake');
      });

      const loggedMins = sessionMap.get(dateStr) || 0;
      const loggedHours = Math.round((loggedMins / 60) * 10) / 10;

      const plannedMins = plannedBlocks.reduce((acc, b) => acc + (b.durationMinutes || 75), 0);
      const plannedHours = Math.round((plannedMins / 60) * 10) / 10;

      let status: 'completed' | 'on-track' | 'planned' | 'mock-day' | 'idle' = 'idle';
      let tooltip = '';

      if (hasMock) {
        status = 'mock-day';
        tooltip = `Full Syllabus Mock Exam Day (${plannedHours}h scheduled)`;
      } else if (isPast) {
        if (loggedHours >= dailyQuota * 0.8) {
          status = 'completed';
          tooltip = `Target Achieved: ${loggedHours}h logged`;
        } else if (loggedHours > 0) {
          status = 'on-track';
          tooltip = `Partial Study: ${loggedHours}h logged`;
        } else {
          status = 'idle';
          tooltip = `Rest / Unrecorded Day`;
        }
      } else {
        if (plannedHours > 0) {
          status = 'planned';
          tooltip = `Planned Schedule: ${plannedHours}h • ${plannedBlocks.length} tasks`;
        } else {
          status = 'idle';
          tooltip = `Open Study Window`;
        }
      }

      cells.push({
        date: cellDate,
        dateStr,
        dayNum: d,
        isToday,
        isPast,
        status,
        hasMock,
        hasRevision,
        loggedHours,
        plannedHours,
        taskCount: plannedBlocks.length,
        tooltip,
        dayOfWeekIndex
      });
    }

    // Trailing padding to fill last row
    const totalCells = Math.ceil(cells.length / 7) * 7;
    while (cells.length < totalCells) cells.push(null);

    return cells;
  }, [year, month, studySessions, chapters, weeklyMatrix, dailyQuota, todayStr]);

  const handleCellClick = (cell: any) => {
    if (!cell || !state) return;
    if (state.setSelectedDayIndex) {
      state.setSelectedDayIndex(cell.dayOfWeekIndex);
    }
    if (state.setViewMode) {
      state.setViewMode('daily');
    }
  };

  return (
    <div className="p-5 rounded-2xl border border-zinc-850/90 bg-zinc-950/80 backdrop-blur-xl shadow-xl space-y-4 select-none">
      
      {/* HEADER & LEGEND */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-850/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-sm font-mono font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <span>{today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 font-normal">
                Live Timetable Heatmap
              </span>
            </h4>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" /> Target Met</div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm" /> Planned Tasks</div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm" /> Mock Test</div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm" /> Revision</div>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-widest py-1 bg-zinc-900/40 rounded-lg border border-zinc-850/50">
            {day}
          </div>
        ))}
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {calendarData.map((cell, idx) => {
          if (!cell) {
            return (
              <div key={`empty-${idx}`} className="h-20 bg-zinc-900/10 rounded-xl border border-zinc-900/30 opacity-40" />
            );
          }

          let cellStyle = 'bg-zinc-900/30 border-zinc-850/80 hover:border-zinc-700';
          let badge = null;

          if (cell.isToday) {
            cellStyle = 'bg-indigo-950/40 border-indigo-500/80 ring-1 ring-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.2)]';
            badge = <span className="text-[8px] font-mono font-bold uppercase px-1 py-0.2 rounded bg-indigo-500 text-zinc-950">Today</span>;
          } else if (cell.hasMock) {
            cellStyle = 'bg-rose-950/30 border-rose-500/40 hover:border-rose-400';
            badge = <span className="text-[8px] font-mono font-bold uppercase px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">Mock</span>;
          } else if (cell.status === 'completed') {
            cellStyle = 'bg-emerald-950/30 border-emerald-500/40 hover:border-emerald-400';
            badge = <span className="text-[8px] font-mono font-bold text-emerald-400">✓ {cell.loggedHours}h</span>;
          } else if (cell.hasRevision) {
            cellStyle = 'bg-amber-950/30 border-amber-500/40 hover:border-amber-400';
            badge = <span className="text-[8px] font-mono font-bold text-amber-300">Rev</span>;
          } else if (cell.plannedHours > 0) {
            cellStyle = 'bg-indigo-950/20 border-zinc-800 hover:border-indigo-500/50';
            badge = <span className="text-[8px] font-mono text-indigo-300/80">{cell.plannedHours}h</span>;
          }

          const isHovered = hoveredDate === cell.dateStr;

          return (
            <div 
              key={cell.dateStr} 
              onMouseEnter={() => setHoveredDate(cell.dateStr)}
              onMouseLeave={() => setHoveredDate(null)}
              onClick={() => handleCellClick(cell)}
              className={`relative h-20 rounded-xl border p-2 flex flex-col justify-between transition-all duration-150 cursor-pointer ${cellStyle} ${isHovered ? 'scale-[1.03] z-20 shadow-xl' : ''}`}
            >
              {/* Day Number and Badge */}
              <div className="flex items-center justify-between gap-1 leading-none">
                <span className={`text-xs font-mono font-bold ${
                  cell.isToday ? 'text-indigo-300' : cell.isPast ? 'text-zinc-500' : 'text-zinc-300'
                }`}>
                  {cell.dayNum}
                </span>
                {badge}
              </div>

              {/* Progress visual or planned task dot indicator */}
              <div className="space-y-1">
                {cell.status === 'completed' && (
                  <div className="h-1 bg-emerald-950 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400" style={{ width: `${Math.min(100, (cell.loggedHours / dailyQuota) * 100)}%` }} />
                  </div>
                )}

                {cell.plannedHours > 0 && !cell.isPast && (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span className="text-[9px] font-mono text-zinc-400 truncate">
                      {cell.taskCount} tasks
                    </span>
                  </div>
                )}
              </div>

              {/* Hover Tooltip Overlay */}
              {isHovered && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-44 p-2 rounded-xl bg-zinc-950 border border-zinc-750 text-[10px] font-mono text-zinc-200 shadow-2xl z-50 animate-in fade-in duration-100 pointer-events-none space-y-1">
                  <div className="font-bold text-indigo-300 flex items-center justify-between">
                    <span>{cell.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <span className="text-zinc-400 text-[9px]">Click to view day →</span>
                  </div>
                  <div className="text-zinc-300">{cell.tooltip}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
