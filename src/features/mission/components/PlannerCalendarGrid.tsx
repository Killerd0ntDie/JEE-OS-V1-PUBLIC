import React, { useMemo, useState } from 'react';
import { WeeklyBlock } from '@jee-os/engines';

export interface PlannerCalendarGridProps {
  state: any;
}

const HOURS = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
];

// ---------------------------------------------------------
// Isolated Component to prevent grid re-renders every 10s
// ---------------------------------------------------------
const LiveTimeLine = () => {
  const [nowDate, setNowDate] = useState(() => new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setNowDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const { nowLineTop, nowTimeStr } = useMemo(() => {
    const currentMins = nowDate.getHours() * 60 + nowDate.getMinutes();
    const startMins = 0; // 00:00 = 0
    const offsetMins = currentMins - startMins;
    const hoursStr = String(nowDate.getHours()).padStart(2, '0');
    const minsStr = String(nowDate.getMinutes()).padStart(2, '0');
    const timeStr = `${hoursStr}:${minsStr}`;

    if (offsetMins < 0 || offsetMins > 24 * 60) return { nowLineTop: null, nowTimeStr: timeStr };
    return { nowLineTop: (offsetMins / 60) * 120, nowTimeStr: timeStr };
  }, [nowDate]);

  if (nowLineTop === null) return null;

  return (
    <>
      <div
        className="absolute right-1 -translate-y-1/2 bg-emerald-500 text-zinc-950 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.8)] flex items-center gap-1 z-20 pointer-events-none transition-all duration-1000 ease-linear"
        style={{ top: `${nowLineTop}px` }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-950 animate-ping" />
        <span>{nowTimeStr}</span>
      </div>
      <div
        className="absolute left-[60px] right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-emerald-500/50 to-transparent z-15 pointer-events-none transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(16,185,129,0.5)]"
        style={{ top: `${nowLineTop}px` }}
      />
    </>
  );
};

export function PlannerCalendarGrid({ state }: { state: any }) {
  const {
    viewMode,
    selectedDayIndex,
    setSelectedDayIndex,
    weeklyMatrix,
    setSelectedBlock,
    daysOfWeek,
  } = state;

  const [dragSnapPreview, setDragSnapPreview] = useState<{
    dayIndex: number;
    timeSlotStr: string;
    startStr: string;
    endStr: string;
    topPx: number;
    heightPx: number;
  } | null>(null);
  const [draggedDuration, setDraggedDuration] = useState<number>(75);

  // Real system clock live ticker (ticks every 60 seconds)
  const [nowDate, setNowDate] = useState(() => new Date());

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setNowDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Current day calculation — during overnight hours (before dayStartTime),
  // the student is still on the PREVIOUS day's schedule
  const currentDayIndex = useMemo(() => {
    const startHour = parseInt((state?.settings?.dayStartTime || '07:00').split(':')[0]) || 7;
    const isOvernightWindow = nowDate.getHours() < startHour;
    const effectiveDate = new Date(nowDate);
    if (isOvernightWindow) {
      effectiveDate.setDate(effectiveDate.getDate() - 1);
    }
    const d = effectiveDate.getDay();
    return d === 0 ? 6 : d - 1; // 0 = Mon
  }, [nowDate, state?.settings?.dayStartTime]);

  const visibleDayIndices = useMemo(() => {
    if (viewMode === 'daily') return [selectedDayIndex];
    return [0, 1, 2, 3, 4, 5, 6];
  }, [viewMode, selectedDayIndex]);

  // Current time position calculation relative to 00:00 (0 mins)
  const { nowLineTop, nowTimeStr } = useMemo(() => {
    const currentMins = nowDate.getHours() * 60 + nowDate.getMinutes();
    const startMins = 0; // 00:00 = 0
    const offsetMins = currentMins - startMins;
    const hoursStr = String(nowDate.getHours()).padStart(2, '0');
    const minsStr = String(nowDate.getMinutes()).padStart(2, '0');
    const timeStr = `${hoursStr}:${minsStr}`;

    if (offsetMins < 0 || offsetMins > 24 * 60) return { nowLineTop: null, nowTimeStr: timeStr };
    return { nowLineTop: (offsetMins / 60) * 120, nowTimeStr: timeStr }; // 120px per hour
  }, [nowDate]);

  // Helper to extract duration from timeSlot or block property
  const getBlockDuration = (block: WeeklyBlock): number => {
    const matches = (block.timeSlot || '').match(/(\d{1,2}):(\d{2})/g);
    if (matches && matches.length >= 2) {
      const [h1, m1] = matches[0].split(':').map(Number);
      const [h2, m2] = matches[1].split(':').map(Number);
      const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diff > 0) return diff;
    }
    return block.durationMinutes || 75;
  };

  // Compute total planned hours per day for header badges
  const dayStatsMap = useMemo(() => {
    const map: Record<number, { minutes: number; count: number }> = {
      0: { minutes: 0, count: 0 },
      1: { minutes: 0, count: 0 },
      2: { minutes: 0, count: 0 },
      3: { minutes: 0, count: 0 },
      4: { minutes: 0, count: 0 },
      5: { minutes: 0, count: 0 },
      6: { minutes: 0, count: 0 },
    };
    weeklyMatrix.forEach((b: WeeklyBlock) => {
      if (map[b.dayIndex]) {
        map[b.dayIndex].minutes += getBlockDuration(b);
        map[b.dayIndex].count += 1;
      }
    });
    return map;
  }, [weeklyMatrix]);

  // Auto-scroll to active study window or live time line when view opens
  React.useEffect(() => {
    if (scrollContainerRef.current) {
      const startHour = parseInt((state?.settings?.dayStartTime || '07:00').split(':')[0]) || 7;
      const defaultStudyTop = (Math.max(6, startHour) * 120) - 30;
      const targetTop = nowLineTop !== null ? Math.max(0, nowLineTop - 60) : defaultStudyTop;

      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: targetTop,
            behavior: 'smooth',
          });
        }
      }, 60);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // Real-time block status evaluator (LIVE vs PAST vs UPCOMING)
  const getBlockStatus = (block: WeeklyBlock, dIndex: number) => {
    const isTodayColumn = dIndex === currentDayIndex;
    const isPastColumn = dIndex < currentDayIndex;
    const isFutureColumn = dIndex > currentDayIndex;

    const timeMatch = (block.timeSlot || '').match(/(\d{1,2}):(\d{2})/);
    const startHour = timeMatch ? parseInt(timeMatch[1], 10) : 8;
    const startMin = timeMatch ? parseInt(timeMatch[2], 10) : 0;
    const startMins = startHour * 60 + startMin;

    const duration = getBlockDuration(block);
    const endMins = startMins + duration;

    const nowMins = nowDate.getHours() * 60 + nowDate.getMinutes();

    const isLive = isTodayColumn && nowMins >= startMins && nowMins < endMins && !block.completed;
    const isPast = isPastColumn || (isTodayColumn && nowMins >= endMins) || !!block.completed;
    const isUpcoming = isFutureColumn || (isTodayColumn && nowMins < startMins);

    return { isLive, isPast, isUpcoming, startMins, endMins };
  };

  const getSubjectColorClass = (subject: string | undefined, activity?: string) => {
    const s = (subject || 'unknown').toLowerCase();
    const act = (activity || '').toLowerCase();
    if (act.includes('mock') || act.includes('paper') || s.includes('mock')) {
      return 'bg-gradient-to-br from-rose-950/60 to-zinc-950/90 border-l-4 border-l-rose-500 border-zinc-800/80 text-rose-200 hover:border-rose-400 shadow-md';
    }
    if (act.includes('revision') || act.includes('flashcard') || s.includes('revision')) {
      return 'bg-gradient-to-br from-amber-950/60 to-zinc-950/90 border-l-4 border-l-amber-500 border-zinc-800/80 text-amber-200 hover:border-amber-400 shadow-md';
    }
    if (s.includes('math')) {
      return 'bg-gradient-to-br from-indigo-950/60 to-zinc-950/90 border-l-4 border-l-indigo-500 border-zinc-800/80 text-indigo-200 hover:border-indigo-400 shadow-md';
    }
    if (s.includes('phys')) {
      return 'bg-gradient-to-br from-sky-950/60 to-zinc-950/90 border-l-4 border-l-sky-500 border-zinc-800/80 text-sky-200 hover:border-sky-400 shadow-md';
    }
    if (s.includes('chem')) {
      return 'bg-gradient-to-br from-emerald-950/60 to-zinc-950/90 border-l-4 border-l-emerald-500 border-zinc-800/80 text-emerald-200 hover:border-emerald-400 shadow-md';
    }
    if (s === 'break') {
      return 'bg-zinc-950/70 border border-dashed border-zinc-800 text-zinc-400 hover:border-zinc-700';
    }
    return 'bg-gradient-to-br from-indigo-950/60 to-zinc-950/90 border-l-4 border-l-indigo-500 border-zinc-800/80 text-indigo-200 hover:border-indigo-400 shadow-md';
  };

  // Helper to format date string for day headers
  const getDayHeaderDate = (dIndex: number) => {
    const today = new Date();
    const diff = dIndex - currentDayIndex;
    const target = new Date(today);
    target.setDate(today.getDate() + diff);
    const dayNum = String(target.getDate()).padStart(2, '0');
    return dayNum;
  };

  const calculateBlockPos = (block: WeeklyBlock, blockIndex: number) => {
    const timeMatch = (block.timeSlot || '').match(/(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?/);
    let startHour = timeMatch ? parseInt(timeMatch[1], 10) : 8;
    const startMin = timeMatch ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch ? timeMatch[3] : undefined;
    if (ampm) {
      const isPM = ampm.toLowerCase() === 'pm';
      if (isPM && startHour !== 12) startHour += 12;
      if (!isPM && startHour === 12) startHour = 0;
    }
    if (startHour < 6) startHour += 24; // midnight shift

    const totalStartMins = startHour * 60 + startMin;
    const offsetMins = Math.max(0, totalStartMins - 0);

    const topPx = (offsetMins / 60) * 120;
    const duration = getBlockDuration(block);
    const heightPx = Math.max(32, (duration / 60) * 120 - 4);

    return { topPx, heightPx };
  };

  // Extract clean time range from timeSlot
  const getCleanTimeRange = (timeSlot: string): string => {
    const matches = timeSlot.match(/(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?)/g);
    if (matches && matches.length >= 2) return `${matches[0]} – ${matches[1]}`;
    if (matches && matches.length === 1) return matches[0];
    return timeSlot;
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col rounded-2xl border border-zinc-850/90 bg-zinc-950/80 shadow-2xl select-none min-w-0 backdrop-blur-xl">
      {/* DAY HEADER ROW */}
      <div 
        className="grid border-b border-zinc-800/80 bg-zinc-950/95 sticky top-0 z-25"
        style={{ gridTemplateColumns: `60px repeat(${visibleDayIndices.length}, minmax(0, 1fr))` }}
      >
        <div className="border-r border-zinc-800/70 flex items-center justify-center font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          TIME
        </div>
        {visibleDayIndices.map((dIndex) => {
          const isToday = dIndex === currentDayIndex;
          const dayName = daysOfWeek[dIndex];
          const dayNum = getDayHeaderDate(dIndex);
          const stats = dayStatsMap[dIndex] || { minutes: 0, count: 0 };
          const hoursVal = Math.round((stats.minutes / 60) * 10) / 10;

          return (
            <div
              key={dIndex}
              onClick={() => setSelectedDayIndex(dIndex)}
              className={`py-2 px-2 text-center border-l border-zinc-850/80 cursor-pointer transition-all ${
                isToday
                  ? 'bg-indigo-950/40 border-b-2 border-b-indigo-500 shadow-inner'
                  : 'hover:bg-zinc-900/50'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <span className={`font-mono text-[10px] font-bold tracking-wider uppercase ${
                  isToday ? 'text-indigo-400' : 'text-zinc-400'
                }`}>
                  {dayName}
                </span>
                {isToday && (
                  <span className="text-[9px] font-mono font-extrabold uppercase px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Today
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-center gap-2 mt-0.5">
                <span className={`text-base font-bold leading-tight font-display ${
                  isToday ? 'text-white font-extrabold' : 'text-zinc-200'
                }`}>
                  {dayNum}
                </span>
                {stats.count > 0 && (
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900/80 border border-zinc-800 px-1.5 py-0.2 rounded-full">
                    {hoursVal}h
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* TIMETABLE GRID BODY */}
      <div 
        ref={scrollContainerRef}
        className="grid flex-1 relative overflow-y-auto no-scrollbar bg-zinc-950/70"
        style={{ gridTemplateColumns: `60px repeat(${visibleDayIndices.length}, minmax(0, 1fr))` }}
      >
        {/* TIME COLUMN */}
        <div className="border-r border-zinc-850/80 relative bg-zinc-950/90 z-10 pb-[300px]">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="h-24 md:h-[120px] flex items-start justify-end pr-2.5 pt-1.5 font-mono text-[10px] font-medium text-zinc-500 select-none border-b border-zinc-850/60"
            >
              {hour}
            </div>
          ))}

          {/* Time Marker */}
          <LiveTimeLine />
        </div>

        {/* DAY COLUMNS */}
        {visibleDayIndices.map((dIndex) => {
          const isToday = dIndex === currentDayIndex;
          const dayBlocks = weeklyMatrix.filter((b: WeeklyBlock) => b.dayIndex === dIndex);

          return (
            <div
              key={dIndex}
              className={`border-l border-zinc-850/60 relative min-h-[1088px] pb-[300px] transition-colors ${
                isToday ? 'bg-indigo-500/[0.02]' : ''
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';

                const colEl = e.currentTarget as HTMLElement;
                const rect = colEl.getBoundingClientRect();
                const offsetY = Math.max(0, e.clientY - rect.top);

                const minsFromMidnight = Math.max(0, Math.min(24 * 60, (offsetY / 120) * 60));
                const snappedMinsFromMidnight = Math.floor(minsFromMidnight / 5) * 5;

                const totalStartMins = snappedMinsFromMidnight;
                const startH = Math.floor(totalStartMins / 60);
                const startM = totalStartMins % 60;
                const startStr = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;

                const duration = draggedDuration || 75;
                const totalEndMins = totalStartMins + duration;
                const endH = Math.floor(totalEndMins / 60) % 24;
                const endM = totalEndMins % 60;
                const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

                const topPx = (snappedMinsFromMidnight / 60) * 120 + 2;
                const heightPx = Math.max(30, (duration / 60) * 120 - 4);
                const timeSlotStr = `${startStr} - ${endStr}`;

                if (!dragSnapPreview || dragSnapPreview.dayIndex !== dIndex || dragSnapPreview.topPx !== topPx) {
                  setDragSnapPreview({
                    dayIndex: dIndex,
                    timeSlotStr,
                    startStr,
                    endStr,
                    topPx,
                    heightPx,
                  });
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragSnapPreview(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragSnapPreview(null);

                try {
                  const raw = e.dataTransfer.getData('text/plain');
                  if (raw) {
                    const data = JSON.parse(raw);
                    
                    const colEl = e.currentTarget as HTMLElement;
                    const rect = colEl.getBoundingClientRect();
                    const offsetY = Math.max(0, e.clientY - rect.top);
                    const minsFromMidnight = Math.max(0, Math.min(24 * 60, (offsetY / 120) * 60));
                    const snappedMinsFromMidnight = Math.floor(minsFromMidnight / 5) * 5;
                    
                    const startH = Math.floor(snappedMinsFromMidnight / 60);
                    const startM = snappedMinsFromMidnight % 60;
                    const startStr = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
                    
                    const duration = data.duration || 75;
                    const totalEndMins = snappedMinsFromMidnight + duration;
                    const endH = Math.floor(totalEndMins / 60) % 24;
                    const endM = totalEndMins % 60;
                    const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
                    const timeSlotStr = `${startStr} - ${endStr}`;

                    if (data.blockId && state.handleMoveBlock) {
                      state.handleMoveBlock(data.blockId, dIndex, timeSlotStr);
                    }
                  }
                } catch (err) {
                  console.error('Failed to parse drag drop data:', err);
                }
              }}
            >
              {/* Hourly Grid Lines with Half-Hour Subdivisions */}
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="h-24 md:h-[120px] border-b border-zinc-850/60 relative pointer-events-none"
                >
                  {/* Subtle 30-minute guide */}
                  <div className="absolute top-1/2 left-0 right-0 h-px border-b border-dashed border-zinc-900/40" />
                </div>
              ))}

              {/* LIVE 5-MINUTE SNAP PREVIEW OVERLAY */}
              {dragSnapPreview && dragSnapPreview.dayIndex === dIndex && (
                <div
                  className="absolute left-1 right-1 rounded-xl border-2 border-dashed border-cyan-400 bg-cyan-500/20 shadow-[0_0_24px_rgba(6,182,212,0.35)] z-20 pointer-events-none flex items-center justify-center p-2 text-cyan-200 font-mono text-xs font-bold transition-all duration-75"
                  style={{ top: `${dragSnapPreview.topPx}px`, height: `${dragSnapPreview.heightPx}px` }}
                >
                  <div className="bg-cyan-950/95 px-3 py-1.5 rounded-lg border border-cyan-400/60 shadow-lg text-cyan-300 font-mono text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>Snap to {dragSnapPreview.startStr} ({dragSnapPreview.timeSlotStr})</span>
                  </div>
                </div>
              )}

              {/* LIVE TIME INDICATOR LINE (NOW LINE) */}
              {isToday && nowLineTop !== null && (
                <div
                  className="absolute left-0 right-0 h-[2px] bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.9)] z-15 pointer-events-none"
                  style={{ top: `${nowLineTop}px` }}
                />
              )}

              {/* EVENT BLOCKS */}
              {(() => {
                const isTodayCol = dIndex === currentDayIndex;
                const dayStartTime = state?.settings?.dayStartTime || '07:00';
                const parseTimeVal = (val: string | undefined, fallback: number) => {
                  const p = parseInt(val || '', 10);
                  return isNaN(p) ? fallback : p;
                };
                const startHourVal = parseTimeVal(dayStartTime.split(':')[0], 7);

                let nowHour = nowDate.getHours();
                const isOvernightCycle = nowHour < startHourVal;
                let logicalNowHour = isOvernightCycle ? nowHour + 24 : nowHour;
                const nowMins = logicalNowHour * 60 + nowDate.getMinutes();
                let runningPushMins = Math.max(startHourVal * 60, isOvernightCycle ? startHourVal * 60 : nowMins);

                const sortedDayBlocks = [...dayBlocks].sort((a: WeeklyBlock, b: WeeklyBlock) => {
                  if (isTodayCol) {
                    if (a.completed && !b.completed) return -1;
                    if (!a.completed && b.completed) return 1;
                  }
                  const getMins = (blk: WeeklyBlock) => {
                    const match = (blk.timeSlot || '').match(/(\d{1,2}):(\d{2})/);
                    return match ? parseInt(match[1]) * 60 + parseInt(match[2]) : 9999;
                  };
                  return getMins(a) - getMins(b);
                });

                const blockMetrics = sortedDayBlocks.map((block: WeeklyBlock, bIdx: number) => {
                  let { topPx, heightPx } = calculateBlockPos(block, bIdx);
                  const duration = getBlockDuration(block);

                  let startMins = 0;
                  let endMins = 0;
                  if (block.timeSlot) {
                    const matchFull = block.timeSlot.match(/(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?\s*[-–]\s*(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?/);
                    const matchStart = block.timeSlot.match(/(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?/);
                    
                    if (matchFull) {
                      let sH = parseInt(matchFull[1]);
                      if (matchFull[3]?.toLowerCase() === 'pm' && sH !== 12) sH += 12;
                      if (matchFull[3]?.toLowerCase() === 'am' && sH === 12) sH = 0;
                      
                      let eH = parseInt(matchFull[4]);
                      if (matchFull[6]?.toLowerCase() === 'pm' && eH !== 12) eH += 12;
                      if (matchFull[6]?.toLowerCase() === 'am' && eH === 12) eH = 0;

                      startMins = sH * 60 + parseInt(matchFull[2]);
                      endMins = eH * 60 + parseInt(matchFull[5]);
                    } else if (matchStart) {
                      let sH = parseInt(matchStart[1]);
                      if (matchStart[3]?.toLowerCase() === 'pm' && sH !== 12) sH += 12;
                      if (matchStart[3]?.toLowerCase() === 'am' && sH === 12) sH = 0;

                      startMins = sH * 60 + parseInt(matchStart[2]);
                      endMins = startMins + duration;
                    }
                  }

                  let isPushedLive = false;
                  let effectiveSlot = block.timeSlot || '';

                  if (isTodayCol && !block.completed && !isOvernightCycle) {
                    const shouldSnapToLive = !block.isManualOverride || startMins < runningPushMins;
                    
                    if (shouldSnapToLive && startMins < runningPushMins) {
                      startMins = runningPushMins;
                      endMins = startMins + duration;
                      topPx = ((startMins % 1440) / 60) * 120;

                      const sH = Math.floor((startMins % 1440) / 60).toString().padStart(2, '0');
                      const sM = (startMins % 60).toString().padStart(2, '0');
                      const eH = Math.floor((endMins % 1440) / 60).toString().padStart(2, '0');
                      const eM = (endMins % 60).toString().padStart(2, '0');
                      effectiveSlot = `${sH}:${sM} - ${eH}:${eM}`;
                    }

                    if (nowMins >= startMins && nowMins < endMins) {
                      isPushedLive = true;
                    }

                    runningPushMins = endMins;
                  }

                  const startPx = topPx;
                  const endPx = topPx + heightPx;

                  return { block, bIdx, topPx, heightPx, startPx, endPx, startMins, endMins, isPushedLive, effectiveSlot };
                });

                return blockMetrics.map((item) => {
                  const { block, bIdx, topPx, heightPx, startPx, endPx, startMins, endMins } = item;
                  
                  const visualOverlaps = blockMetrics.filter((other) => {
                    if (other.block.id === block.id) return false;
                    return startPx < other.endPx && endPx > other.startPx;
                  });

                  const timeOverlaps = blockMetrics.filter((other) => {
                    if (other.block.id === block.id) return false;
                    if (startMins === 0 || other.startMins === 0) return false;
                    return startMins < other.endMins && endMins > other.startMins;
                  });

                  const isTimeClashing = timeOverlaps.length > 0;
                  
                  let leftStyle = '3px';
                  let widthStyle = 'calc(100% - 6px)';

                  if (isTimeClashing) {
                    const cluster = [item, ...timeOverlaps].sort((a, b) => {
                      const idA = a.block.id ? String(a.block.id) : '';
                      const idB = b.block.id ? String(b.block.id) : '';
                      return idA.localeCompare(idB);
                    });
                    const colIndex = cluster.findIndex(c => c.block.id === block.id) % 2;
                    leftStyle = colIndex === 0 ? '3px' : 'calc(50% + 2px)';
                    widthStyle = 'calc(50% - 5px)';
                  }

                  const colorClass = getSubjectColorClass(block.subject, block.activity);
                  const status = getBlockStatus(block, dIndex);
                  
                  let isLiveStatus = status.isLive || item.isPushedLive;
                  if (isTodayCol && !block.completed) {
                    isLiveStatus = item.isPushedLive;
                  }
                  
                  let isPastStatus = status.isPast;
                  if (item.effectiveSlot && item.effectiveSlot !== block.timeSlot) {
                    isPastStatus = item.endMins <= nowMins;
                  }

                  let blockStyleClass = colorClass;
                  if (isLiveStatus) {
                    blockStyleClass = `${colorClass} ring-2 ring-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.35)] z-15`;
                  } else if (isPastStatus) {
                    blockStyleClass = 'bg-zinc-950/80 border-zinc-850/80 opacity-55 text-zinc-400 hover:opacity-90 transition-opacity';
                  }

                  // Smart Parsing for Clean, Untruncated Display
                  const rawActivity = block.activity || '';
                  const chapterName = block.chapterName || '';
                  const timeSlotStr = item.effectiveSlot || block.timeSlot || '';
                  
                  const startMatch = timeSlotStr.match(/(\d{1,2}:\d{2})/);
                  const startTime = startMatch ? startMatch[1] : '';

                  const lecMatch = rawActivity.match(/Lecture\s+(\d+\/\d+|\d+)/i) || rawActivity.match(/Lec\s+(\d+\/\d+|\d+)/i);
                  const lecTag = lecMatch ? `Lec ${lecMatch[1]}` : null;

                  const typeStr = (block.taskType || (block as any).type || '').toLowerCase();
                  const actStr = rawActivity.toLowerCase();
                  
                  let tagLabel = 'Task';
                  let displayTitle = rawActivity;

                  if (block.subject === 'break' || typeStr.includes('break')) {
                    tagLabel = 'Break';
                    displayTitle = rawActivity || 'Break';
                  } else if (lecTag) {
                    tagLabel = lecTag;
                    displayTitle = chapterName || rawActivity.replace(/Lecture\s+\d+\/\d+:\s*/i, '').trim();
                  } else if (typeStr.includes('dpp') || actStr.includes('dpp')) {
                    tagLabel = 'DPP';
                    displayTitle = chapterName || rawActivity.replace(/Solve DPP:\s*/i, '').trim();
                  } else if (typeStr.includes('pyq') || actStr.includes('pyq')) {
                    tagLabel = 'PYQs';
                    displayTitle = chapterName || rawActivity.replace(/Solve PYQs:\s*/i, '').trim();
                  } else if (typeStr.includes('formula') || actStr.includes('formula') || typeStr.includes('revision') || actStr.includes('revision')) {
                    tagLabel = 'Rev';
                    displayTitle = chapterName || rawActivity.replace(/Revise\s*/i, '').trim();
                  } else if (typeStr.includes('mistake') || actStr.includes('mistake')) {
                    tagLabel = 'Mistake';
                    displayTitle = chapterName || rawActivity;
                  } else if (typeStr.includes('mock') || actStr.includes('mock') || actStr.includes('test')) {
                    tagLabel = 'Mock';
                    displayTitle = chapterName || rawActivity;
                  } else {
                    displayTitle = chapterName || rawActivity || 'Study Session';
                    tagLabel = block.durationMinutes ? `${block.durationMinutes}m` : 'Study';
                  }

                  return (
                    <div
                      key={`grid-${dIndex}-${block.id}-${bIdx}`}
                      draggable="true"
                      onDragStart={(e) => {
                        setDraggedDuration(block.durationMinutes || 75);
                        e.dataTransfer.setData('text/plain', JSON.stringify({ blockId: block.id, duration: block.durationMinutes || 75 }));
                        e.dataTransfer.effectAllowed = 'move';
                        const targetEl = e.currentTarget as HTMLElement;
                        setTimeout(() => {
                          targetEl.style.opacity = '0.2';
                        }, 0);
                      }}
                      onDragEnd={(e) => {
                        (e.currentTarget as HTMLElement).style.opacity = '1';
                        setDragSnapPreview(null);
                      }}
                      onClick={() => setSelectedBlock(block)}
                      className={`absolute rounded-xl overflow-hidden cursor-grab active:cursor-grabbing hover:z-20 transition-all duration-150 ease-out border backdrop-blur-md select-none group flex flex-col justify-start gap-1 ${blockStyleClass} ${viewMode === 'weekly' ? 'p-1.5' : 'p-2.5'}`}
                      style={{
                        top: `${topPx + 2}px`,
                        height: `${heightPx}px`,
                        left: leftStyle,
                        width: widthStyle,
                      }}
                    >
                      {block.subject === 'break' ? (
                        <div className="flex items-center justify-between gap-1 w-full h-full text-[10px] font-mono">
                          <span className="font-bold text-zinc-300 truncate flex items-center gap-1">
                            ☕ <span>{displayTitle}</span>
                          </span>
                          <span className="text-zinc-500 font-medium shrink-0">
                            {startTime ? `${startTime}` : `${block.durationMinutes || 15}m`}
                          </span>
                        </div>
                      ) : (
                        <>
                          {/* TOP ROW: Start Time + LIVE / Tag Badge */}
                          <div className="flex items-center justify-between gap-1 leading-none shrink-0">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="opacity-0 group-hover:opacity-60 transition-opacity font-mono text-[9px] text-zinc-400 shrink-0">⋮⋮</span>
                              {isTimeClashing && (
                                <span className="font-mono text-[9px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/60 rounded px-0.5 shrink-0">
                                  ⚠️
                                </span>
                              )}
                              <span className="text-[10px] font-mono font-bold text-zinc-300">
                                {viewMode === 'weekly' ? startTime : getCleanTimeRange(timeSlotStr)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {isLiveStatus ? (
                                <span className="bg-emerald-500 text-zinc-950 font-mono font-extrabold text-[9px] px-1 py-0.2 rounded uppercase flex items-center gap-0.5 shadow-sm animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
                                  LIVE
                                </span>
                              ) : block.completed ? (
                                <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/20 px-1 py-0.2 rounded border border-emerald-500/30">✓</span>
                              ) : (
                                <span className="text-[9px] font-mono font-bold uppercase px-1 py-0.2 rounded bg-black/50 border border-white/10 text-zinc-300">
                                  {tagLabel}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* MAIN TITLE: Full wrap with line-clamp */}
                          <div className="min-w-0 flex-1 flex flex-col justify-center overflow-hidden">
                            <p 
                              className={`font-bold text-white leading-tight tracking-tight break-words line-clamp-2 ${
                                viewMode === 'weekly' ? 'text-[10.5px]' : 'text-xs'
                              }`}
                              title={rawActivity || chapterName}
                            >
                              {displayTitle}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
