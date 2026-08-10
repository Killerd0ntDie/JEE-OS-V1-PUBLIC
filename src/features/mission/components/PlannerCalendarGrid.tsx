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
        className="absolute right-1 -translate-y-1/2 bg-emerald-500 text-white font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.9)] flex items-center gap-1 z-15 pointer-events-none transition-all duration-1000 ease-linear"
        style={{ top: `${nowLineTop}px` }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
        <span>{nowTimeStr}</span>
      </div>
      <div
        className="absolute left-[60px] right-0 h-px bg-gradient-to-r from-emerald-500/80 via-emerald-500/30 to-transparent z-12 pointer-events-none transition-all duration-1000 ease-linear"
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

  // Real system clock live ticker (ticks every 10 seconds)
  const [nowDate, setNowDate] = useState(() => new Date());

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setNowDate(new Date());
    }, 60000); // Only re-render grid every 60s instead of 10s to prevent lag
    return () => clearInterval(timer);
  }, []);

  // Current day calculation
  const currentDayIndex = useMemo(() => {
    const d = nowDate.getDay();
    return d === 0 ? 6 : d - 1; // 0 = Mon
  }, [nowDate]);

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

  // Auto-scroll to the LIVE time line when the view opens or changes
  React.useEffect(() => {
    if (nowLineTop !== null && scrollContainerRef.current) {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: Math.max(0, nowLineTop - 48), // 48px = half hour padding
            behavior: 'smooth',
          });
        }
      }, 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

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
      return 'bg-[rgba(99,102,241,0.14)] border-l-2 border-[rgba(99,102,241,0.6)] hover:bg-[rgba(99,102,241,0.22)] text-indigo-200';
    }
    if (act.includes('revision') || act.includes('flashcard') || s.includes('revision')) {
      return 'bg-[rgba(251,146,60,0.1)] border-l-2 border-[rgba(251,146,60,0.5)] hover:bg-[rgba(251,146,60,0.18)] text-amber-200';
    }
    if (s.includes('math')) {
      return 'bg-[rgba(192,132,252,0.14)] border-l-2 border-[rgba(192,132,252,0.6)] hover:bg-[rgba(192,132,252,0.22)] text-purple-200';
    }
    if (s.includes('phys')) {
      return 'bg-[rgba(56,189,248,0.12)] border-l-2 border-[rgba(56,189,248,0.55)] hover:bg-[rgba(56,189,248,0.2)] text-sky-200';
    }
    if (s.includes('chem')) {
      return 'bg-[rgba(52,211,153,0.12)] border-l-2 border-[rgba(52,211,153,0.55)] hover:bg-[rgba(52,211,153,0.2)] text-emerald-200';
    }
    if (s === 'break') {
      return 'bg-[rgba(255,255,255,0.03)] border-l-2 border-[rgba(255,255,255,0.12)] text-zinc-400';
    }
    return 'bg-indigo-950/20 border-l-2 border-indigo-500/40 text-indigo-200';
  };

  const getSubjectTitle = (block: WeeklyBlock) => {
    if (block.subject === 'physics') return 'Physics';
    if (block.subject === 'chemistry') return 'Chemistry';
    if (block.subject === 'maths') return 'Mathematics';
    if (block.subject === 'revision') return 'Revision';
    if (block.subject === 'break') return 'Break';
    return block.chapterName || 'Study Block';
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
    // Extract first HH:MM from timeSlot like 'Morning (07:00 - 09:30)' or '07:00 - 09:30'
    const timeMatch = (block.timeSlot || '').match(/(\d{1,2}):(\d{2})/);
    const startHour = timeMatch ? parseInt(timeMatch[1], 10) : 8;
    const startMin = timeMatch ? parseInt(timeMatch[2], 10) : 0;

    const totalStartMins = startHour * 60 + startMin;
    const offsetMins = Math.max(0, totalStartMins - 0);

    const topPx = (offsetMins / 60) * 120;
    const duration = getBlockDuration(block);
    const heightPx = Math.max(30, (duration / 60) * 120 - 4);

    return { topPx, heightPx };
  };

  // Extract clean time range from timeSlot like 'Morning (07:00 - 09:30)' -> '07:00 – 09:30'
  const getCleanTimeRange = (timeSlot: string): string => {
    const matches = timeSlot.match(/(\d{1,2}:\d{2})/g);
    if (matches && matches.length >= 2) return `${matches[0]} – ${matches[1]}`;
    if (matches && matches.length === 1) return matches[0];
    return timeSlot;
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col rounded-xl border border-zinc-800/80 bg-[#0c0d14] shadow-xl select-none min-w-0">
      {/* DAY HEADER ROW */}
      <div 
        className="grid border-b border-zinc-800/80 bg-[#090a0f] sticky top-0 z-20"
        style={{ gridTemplateColumns: `60px repeat(${visibleDayIndices.length}, minmax(0, 1fr))` }}
      >
        <div className="border-r border-zinc-800/60 flex items-center justify-center font-space-mono text-[11px] font-bold text-zinc-600 uppercase tracking-widest">
          GMT
        </div>
        {visibleDayIndices.map((dIndex) => {
          const isToday = dIndex === currentDayIndex;
          const dayName = daysOfWeek[dIndex];
          const dayNum = getDayHeaderDate(dIndex);

          return (
            <div
              key={dIndex}
              onClick={() => setSelectedDayIndex(dIndex)}
              className={`py-2.5 px-2 text-center border-l border-zinc-800/60 cursor-pointer transition-all ${
                isToday
                  ? 'bg-zinc-900 border-b-2 border-indigo-500/80'
                  : 'hover:bg-zinc-900/40'
              }`}
            >
              <div className={`font-space-mono text-[10px] font-bold tracking-wider uppercase ${
                isToday ? 'text-indigo-400' : 'text-zinc-400'
              }`}>
                {dayName}
              </div>
              <div className={`font-syne text-base font-bold leading-tight mt-0.5 ${
                isToday ? 'text-white' : 'text-zinc-300'
              }`}>
                {dayNum}
              </div>
              {isToday && (
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mx-auto mt-1" />
              )}
            </div>
          );
        })}
      </div>

      {/* TIMETABLE GRID BODY */}
      <div 
        ref={scrollContainerRef}
        className="grid flex-1 relative overflow-y-auto no-scrollbar bg-[#090a0f]"
        style={{ gridTemplateColumns: `60px repeat(${visibleDayIndices.length}, minmax(0, 1fr))` }}
      >
        {/* TIME COLUMN */}
        <div className="border-r border-zinc-800/60 relative bg-[#090a0f] z-10 pb-[300px]">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="h-[120px] flex items-start justify-end pr-3 pt-1.5 font-space-mono text-[10px] font-medium text-zinc-400 select-none border-b border-zinc-800/40"
            >
              {hour}
            </div>
          ))}

          {/* Time Blob Marker isolated in LiveTimeLine component */}
          <LiveTimeLine />
        </div>

        {/* DAY COLUMNS */}
        {visibleDayIndices.map((dIndex) => {
          const isToday = dIndex === currentDayIndex;
          const dayBlocks = weeklyMatrix.filter((b: WeeklyBlock) => b.dayIndex === dIndex);

          return (
            <div
              key={dIndex}
              className={`border-l border-zinc-800/40 relative min-h-[1088px] pb-[300px] ${
                isToday ? 'bg-indigo-500/[0.015]' : ''
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';

                const colEl = e.currentTarget as HTMLElement;
                const rect = colEl.getBoundingClientRect();
                const offsetY = Math.max(0, e.clientY - rect.top);

                // 120px = 1 hour (60 mins). Column starts at 00:00 AM (0 mins)
                const minsFrom6 = Math.max(0, Math.min(24 * 60, (offsetY / 120) * 60));

                // SNAP TO 5 MINUTES!
                const snappedMinsFrom6 = Math.floor(minsFrom6 / 5) * 5;

                const totalStartMins = snappedMinsFrom6;
                const startH = Math.floor(totalStartMins / 60);
                const startM = totalStartMins % 60;
                const startStr = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;

                const duration = draggedDuration || 75;
                const totalEndMins = totalStartMins + duration;
                const endH = Math.floor(totalEndMins / 60) % 24;
                const endM = totalEndMins % 60;
                const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

                const topPx = (snappedMinsFrom6 / 60) * 120 + 2;
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
                    
                    // Recalculate snap dynamically to avoid stale state from React batching
                    const colEl = e.currentTarget as HTMLElement;
                    const rect = colEl.getBoundingClientRect();
                    const offsetY = Math.max(0, e.clientY - rect.top);
                    const minsFrom6 = Math.max(0, Math.min(24 * 60, (offsetY / 120) * 60));
                    const snappedMinsFrom6 = Math.floor(minsFrom6 / 5) * 5;
                    
                    const startH = Math.floor(snappedMinsFrom6 / 60);
                    const startM = snappedMinsFrom6 % 60;
                    const startStr = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
                    
                    const duration = data.duration || 75;
                    const totalEndMins = snappedMinsFrom6 + duration;
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
              {/* Hourly Cell Lines */}
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="h-[120px] border-b border-zinc-800/40 relative transition-colors pointer-events-none"
                />
              ))}

              {/* LIVE 5-MINUTE SNAP PREVIEW OVERLAY */}
              {dragSnapPreview && dragSnapPreview.dayIndex === dIndex && (
                <div
                  className="absolute left-1 right-1 rounded-lg border-2 border-dashed border-cyan-400 bg-cyan-500/25 shadow-[0_0_20px_rgba(6,182,212,0.4)] z-15 pointer-events-none flex items-center justify-center p-2 text-cyan-200 font-mono text-xs font-bold transition-all duration-75"
                  style={{ top: `${dragSnapPreview.topPx}px`, height: `${dragSnapPreview.heightPx}px` }}
                >
                  <div className="bg-cyan-950/90 px-3 py-1.5 rounded-lg border border-cyan-400/60 shadow-lg text-cyan-300 font-mono text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>Snap to {dragSnapPreview.startStr} ({dragSnapPreview.timeSlotStr})</span>
                  </div>
                </div>
              )}

              {/* LIVE TIME INDICATOR LINE (NOW LINE) */}
              {isToday && nowLineTop !== null && (
                <div
                  className="absolute left-0 right-0 h-[2px] bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.9)] z-12 pointer-events-none"
                  style={{ top: `${nowLineTop}px` }}
                />
              )}

              {/* EVENT BLOCKS (WITH OVERLAP / CLASH DETECTION & SIDE-BY-SIDE SPLIT) */}
              {(() => {
                const isTodayCol = dIndex === currentDayIndex;
                const nowMins = nowDate.getHours() * 60 + nowDate.getMinutes();
                let runningPushMins = nowMins;

                const sortedDayBlocks = [...dayBlocks].sort((a: WeeklyBlock, b: WeeklyBlock) => {
                  if (isTodayCol) {
                    if (a.completed && !b.completed) return -1;
                    if (!a.completed && b.completed) return 1;
                  }
                  // Always order chronologically by each block's own scheduled timeSlot —
                  // this must match DailyMissionTimeline's ordering (which drives the
                  // Dashboard's "push to live" cascade) or the two views disagree about
                  // which mission is actually live. Previously this fell back to parsing
                  // a number out of the activity/chapter text (e.g. "Lecture 5/20") for
                  // today's uncompleted blocks, which silently reordered missions whenever
                  // the planner scheduled them out of lecture-number order, causing the
                  // wrong lecture to be marked LIVE here vs. on the Dashboard.
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
                    const matchFull = block.timeSlot.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
                    const matchStart = block.timeSlot.match(/(\d{1,2}):(\d{2})/);
                    
                    if (matchFull) {
                      startMins = parseInt(matchFull[1]) * 60 + parseInt(matchFull[2]);
                      endMins = parseInt(matchFull[3]) * 60 + parseInt(matchFull[4]);
                    } else if (matchStart) {
                      startMins = parseInt(matchStart[1]) * 60 + parseInt(matchStart[2]);
                      endMins = startMins + duration;
                    }
                  }

                  let isPushedLive = false;
                  let effectiveSlot = block.timeSlot || '';

                  // If on TODAY and block is UNCOMPLETED: push forward sequentially to auto-balance breaks & tasks
                  if (isTodayCol && !block.completed) {
                    const shouldSnapToLive = !block.isManualOverride || startMins < runningPushMins;
                    
                    if (shouldSnapToLive && startMins !== runningPushMins) {
                      startMins = runningPushMins;
                      endMins = startMins + duration;
                      topPx = (startMins / 60) * 120;

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
                  
                  // Find all other blocks that overlap VISUALLY (to handle inflated heights)
                  const visualOverlaps = blockMetrics.filter((other) => {
                    if (other.block.id === block.id) return false;
                    return startPx < other.endPx && endPx > other.startPx;
                  });

                  // Find blocks that overlap MATHEMATICALLY in time (to show true CLASH warning)
                  const timeOverlaps = blockMetrics.filter((other) => {
                    if (other.block.id === block.id) return false;
                    if (startMins === 0 || other.startMins === 0) return false;
                    return startMins < other.endMins && endMins > other.startMins;
                  });

                  const isVisuallyClashing = visualOverlaps.length > 0;
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

                  // Keep base subject color class, only apply glowing border ring when LIVE
                  let blockStyleClass = colorClass;
                  if (isLiveStatus) {
                    blockStyleClass = `${colorClass} border-2 border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.45)] ring-1 ring-amber-400/60 z-10`;
                  } else if (isPastStatus) {
                    blockStyleClass = 'bg-zinc-950/70 border-zinc-850 opacity-60 grayscale-[0.25] text-zinc-400 hover:opacity-90 transition-opacity';
                  }

                  const typeStr = (block.taskType || (block as any).type || '').toLowerCase();
                  const actStr = (block.activity || '').toLowerCase();
                  let aimLabel = 'Practice';
                  
                  if (typeStr.includes('lecture') || actStr.includes('lecture') || actStr.includes('lec')) aimLabel = 'Lecture';
                  else if (typeStr.includes('dpp') || actStr.includes('dpp')) aimLabel = 'DPP';
                  else if (typeStr.includes('pyq') || actStr.includes('pyq')) aimLabel = 'PYQs';
                  else if (typeStr.includes('formula') || actStr.includes('formula') || typeStr.includes('revision') || actStr.includes('revision')) aimLabel = 'Revision';
                  else if (typeStr.includes('mistake') || actStr.includes('mistake')) aimLabel = 'Mistakes';
                  else if (typeStr.includes('mock') || actStr.includes('mock') || actStr.includes('test')) aimLabel = 'Mock Exam';
                  else if (typeStr.includes('break') || block.subject === 'break') aimLabel = 'Break';
                  else if (block.taskType) aimLabel = block.taskType;
                  else if ((block as any).type) aimLabel = (block as any).type;

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
                      className={`absolute rounded-lg overflow-hidden cursor-grab active:cursor-grabbing hover:z-15 transition-all duration-150 ease-out border backdrop-blur-md select-none group flex flex-col justify-center ${blockStyleClass} ${viewMode === 'weekly' ? 'px-1 py-1' : 'px-2.5 py-1.5'}`}
                      style={{
                        top: `${topPx + 2}px`,
                        height: `${heightPx}px`,
                        left: leftStyle,
                        width: widthStyle,
                      }}
                    >
                      {block.subject === 'break' ? (
                        <div className="flex items-center justify-between gap-1 w-full h-full">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="opacity-0 group-hover:opacity-60 transition-opacity font-space-mono text-[11px] text-zinc-400 shrink-0">⋮⋮</span>
                            {isTimeClashing && (
                              <span className="font-mono text-[11px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/60 px-1 py-0.2 rounded animate-pulse shrink-0">
                                ⚠️
                              </span>
                            )}
                            <span className={`font-space-grotesk font-bold ${viewMode === 'weekly' ? 'text-[11px]' : 'text-[11px]'} text-zinc-200 truncate`}>
                              ☕ {block.activity || 'Take a Break'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isLiveStatus ? (
                               <span className="bg-amber-500 text-black font-mono font-black text-[11px] px-2 py-0.2 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.6)] flex items-center gap-1 shrink-0 animate-pulse">
                                 <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                                 LIVE
                               </span>
                             ) : block.completed ? (
                               <span className="text-[11px] font-space-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">✓ DONE</span>
                             ) : (
                               <span className="text-[11px] font-space-mono font-medium text-zinc-400 leading-none">{getCleanTimeRange(item.effectiveSlot || block.timeSlot || '')}</span>
                             )}
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* ROW 1: Gripper + Clash Warning + LIVE / Time Badge */}
                          <div className="flex items-center justify-between gap-1 leading-none">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="opacity-0 group-hover:opacity-60 transition-opacity font-space-mono text-[11px] text-zinc-400 shrink-0">⋮⋮</span>
                              {isTimeClashing && (
                                <span className={`font-mono text-[11px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/60 rounded animate-pulse shrink-0 ${viewMode === 'weekly' ? 'px-0.5' : 'px-1 py-0.2'}`}>
                                  {viewMode === 'weekly' ? '⚠️' : '⚠️ CLASH'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {isLiveStatus ? (
                                <div className="flex items-center gap-1">
                                  <span className="bg-amber-500 text-black font-mono font-black text-[10px] px-1.5 py-0.2 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.6)] flex items-center gap-1 shrink-0 animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                                    LIVE
                                  </span>
                                  <span className="text-[10px] font-space-mono font-bold text-amber-300 bg-amber-950/70 border border-amber-500/40 px-1 py-0.2 rounded">
                                    {getCleanTimeRange(item.effectiveSlot || block.timeSlot || '')}
                                  </span>
                                </div>
                              ) : block.completed ? (
                                <span className="text-[11px] font-space-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">✓ DONE</span>
                              ) : (
                                <span className="text-[11px] font-space-mono font-medium text-zinc-300 leading-none">{getCleanTimeRange(item.effectiveSlot || block.timeSlot || '')}</span>
                              )}
                            </div>
                          </div>

                          {/* ROW 2: Mission Title + Inline Aim Badge */}
                          <div className="flex items-center gap-1.5 mt-1 min-w-0">
                            <span className={`font-space-grotesk font-extrabold text-white truncate leading-tight tracking-tight shrink min-w-0 ${viewMode === 'weekly' ? 'text-[9.5px]' : 'text-[11px] md:text-[12px]'}`}>
                              {block.activity || 'Study Session'}
                            </span>
                            <span className={`font-space-mono font-bold text-[11px] uppercase px-1.5 py-0.2 rounded bg-black/40 border border-white/10 text-zinc-300 tracking-wider shrink-0 ${viewMode === 'weekly' ? 'hidden' : ''}`}>
                              {aimLabel}
                            </span>
                          </div>

                          {/* ROW 3: Chapter Name */}
                          <div className="font-sans font-medium text-[10px] text-zinc-300 truncate mt-0.5 leading-tight">
                            {block.chapterName}
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
