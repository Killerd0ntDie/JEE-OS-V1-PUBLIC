import React, { useMemo, useState } from 'react';
import { useStudyBrain } from '../../../context/StudyBrainContext';
import { Card } from '../../../components/ui/Card';
import { Flame, Brain, Info, CheckCircle2 } from 'lucide-react';

export function MonthlyCalendarWidget() {
  const { state } = useStudyBrain();
  const { studySessions, chapters, settings } = state;
  const dailyQuota = settings.dailyQuota || 4;

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayStr = today.toISOString().split('T')[0];
  
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const calendarData = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; 
    const daysInMonth = lastDay.getDate();
    
    // 1. Group past study sessions by date
    const sessionMap = new Map<string, number>();
    studySessions.forEach(s => {
      if (!s.startTime) return;
      const dStr = s.startTime.split('T')[0];
      const mins = s.durationMinutes || 0;
      sessionMap.set(dStr, (sessionMap.get(dStr) || 0) + mins);
    });

    // 2. Identify vulnerable chapters for decay prediction
    const vulnerableChapters = chapters.filter(c => 
      c.theoryComplete && (c.retentionScore || 100) < 100
    );

    const cells = [];
    
    // Padding
    for (let i = 0; i < startingDayOfWeek; i++) {
      cells.push(null);
    }
    
    // Rolling burnout tracking
    let recentHeavyDays = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const dateStr = cellDate.toISOString().split('T')[0];
      const isPast = cellDate < new Date(today.setHours(0,0,0,0));
      const isToday = dateStr === todayStr;
      
      let status: 'completed' | 'burnout-risk' | 'decay-risk' | 'idle' = 'idle';
      let tooltip = '';
      let value = 0;

      if (isPast) {
        // Evaluate Past
        const minsStudied = sessionMap.get(dateStr) || 0;
        value = minsStudied / 60;
        if (value >= dailyQuota * 1.2) {
          recentHeavyDays++;
          status = 'completed';
          tooltip = `Overachieved: ${value.toFixed(1)}h logged!`;
        } else if (value >= dailyQuota * 0.8) {
          recentHeavyDays = Math.max(0, recentHeavyDays - 0.5);
          status = 'completed';
          tooltip = `On Track: ${value.toFixed(1)}h logged.`;
        } else if (value > 0) {
          recentHeavyDays = 0;
          status = 'idle';
          tooltip = `Light day: ${value.toFixed(1)}h logged.`;
        } else {
          recentHeavyDays = 0;
          tooltip = `No study sessions recorded.`;
        }
      } else {
        // Evaluate Future/Today Predictions
        const daysIntoFuture = Math.floor((cellDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        
        // 1. Check Burnout
        if (recentHeavyDays >= 3) {
          status = 'burnout-risk';
          tooltip = 'Burnout Risk: High cognitive load accumulated. Schedule a Low-Gravity day.';
          recentHeavyDays = 0; // resets after predicting a burnout day
        } 
        // 2. Check Memory Decay
        else {
          const criticalDecays = vulnerableChapters.filter(c => {
            // Simulate -3% retention drop per day
            const projectedRetention = (c.retentionScore || 85) - (daysIntoFuture * 3);
            return projectedRetention < 50; // Critical threshold
          });

          if (criticalDecays.length > 0) {
            status = 'decay-risk';
            tooltip = `Decay Warning: ${criticalDecays.length} chapters (incl. ${criticalDecays[0].name}) dropping below 50% retention.`;
          } else {
            status = 'idle';
            tooltip = 'Optimal scheduling window.';
          }
        }
      }

      cells.push({ date: cellDate, dateStr, isToday, isPast, status, tooltip, value });
    }

    // Pad end
    const totalCells = Math.ceil(cells.length / 7) * 7;
    while (cells.length < totalCells) cells.push(null);

    return cells;
  }, [year, month, studySessions, chapters, dailyQuota, today, todayStr]);

  return (
    <Card className="p-6 border-zinc-800 bg-zinc-950/40 text-left relative">
      
      {/* Dynamic Background Glow based on hover state */}
      <div className="absolute inset-0 rounded-xl opacity-[0.03] pointer-events-none transition-colors duration-500" />

      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4 relative z-10">
        <div>
          <span className="text-[10px] font-mono text-indigo-400 font-bold tracking-widest uppercase block mb-1">
            Biometric Heatmap
          </span>
          <h4 className="text-xl font-display font-semibold text-zinc-100 flex items-center gap-2">
            {today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h4>
        </div>
        
        {/* Legend */}
        <div className="flex gap-4 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" /> Target Met</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500/50" /> Burnout Risk</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500/50" /> Decay Risk</div>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2 text-center relative z-10">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="text-[10px] font-mono text-zinc-500 uppercase font-bold tracking-wider py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-7 gap-2 relative z-10">
        {calendarData.map((cell, idx) => {
          if (!cell) {
            return <div key={`empty-${idx}`} className="aspect-square sm:aspect-auto sm:min-h-[80px] bg-zinc-900/10 rounded-xl border border-zinc-900/30" />;
          }

          // Determine Cell Styling
          let cellStyle = 'bg-zinc-900/30 border-zinc-800/80';
          let icon = null;

          if (cell.isToday) {
            cellStyle = 'bg-indigo-950/40 border-indigo-500/50 ring-1 ring-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]';
          } else if (cell.status === 'completed') {
            cellStyle = 'bg-emerald-950/30 border-emerald-900/50';
            icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/50" />;
          } else if (cell.status === 'burnout-risk') {
            cellStyle = 'bg-amber-950/30 border-amber-900/50';
            icon = <Flame className="w-3.5 h-3.5 text-amber-500/50" />;
          } else if (cell.status === 'decay-risk') {
            cellStyle = 'bg-purple-950/30 border-purple-900/50';
            icon = <Brain className="w-3.5 h-3.5 text-purple-500/50" />;
          } else if (cell.isPast) {
            cellStyle = 'bg-zinc-950/50 border-zinc-900/50 opacity-60';
          }

          const isHovered = hoveredDate === cell.dateStr;

          return (
            <div 
              key={cell.dateStr} 
              onMouseEnter={() => setHoveredDate(cell.dateStr)}
              onMouseLeave={() => setHoveredDate(null)}
              className={`relative aspect-square sm:aspect-auto sm:min-h-[80px] rounded-xl border p-2 flex flex-col transition-all cursor-pointer ${cellStyle} ${isHovered ? 'scale-105 z-20 shadow-xl' : ''}`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-xs font-mono font-bold ${cell.isToday ? 'text-indigo-400' : cell.isPast ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  {cell.date.getDate()}
                </span>
                {icon}
              </div>
              
              {/* Data Visualization */}
              {cell.status === 'completed' && cell.value > 0 && (
                <div className="mt-auto">
                  <div className="h-1 bg-emerald-950 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500/50" style={{ width: `${Math.min(100, (cell.value / dailyQuota) * 100)}%` }} />
                  </div>
                </div>
              )}

              {/* Tooltip Overlay on Hover */}
              {isHovered && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 rounded-lg bg-zinc-900 border border-zinc-700 text-[10px] font-mono text-zinc-300 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 flex items-start gap-2 pointer-events-none">
                  <Info className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                  <span>{cell.tooltip}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
