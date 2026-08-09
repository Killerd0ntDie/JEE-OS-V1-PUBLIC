import React from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, ArrowRightLeft, Trash2 } from 'lucide-react';
import { getDayFocusPill } from '@jee-os/engines';

export function PlannerCalendarTab({ state }: { state: any }) {
  const {
    viewMode,
    selectedDayIndex,
    setSelectedDayIndex,
    currentDayIndex,
    fullDayNames,
    getDayDateString,
    dailyCapHours,
    mentorProfile,
    selectedDayBlocks,
    setSelectedBlock,
    setIsRationaleExpanded,
    getSubjectStyle,
    getBadgeStyle,
    setMissionToSwap,
    todayMissions,
    setMissionToDelete,
    daysOfWeek,
    weeklyMatrix,
    setViewMode,
  } = state;

  return (
    <>
      {/* 1. DAILY FOCUS VIEW MODE */}
      {viewMode === 'daily' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-zinc-850 bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedDayIndex((prev: number) => Math.max(0, prev - 1))}
                disabled={selectedDayIndex === 0}
                className="p-2 rounded-lg border border-zinc-800 hover:bg-zinc-850 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 font-mono text-xs"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev Day
              </button>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-base font-display font-bold text-white">
                    {fullDayNames[selectedDayIndex]}
                  </span>
                  {selectedDayIndex === currentDayIndex ? (
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      TODAY
                    </span>
                  ) : selectedDayIndex < currentDayIndex ? (
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                      Past Day History
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-full">
                      Upcoming Schedule
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-zinc-400 flex items-center gap-2 flex-wrap">
                  <span>{getDayDateString(selectedDayIndex)} • Daily Capacity Budget: {dailyCapHours} hrs</span>
                  <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 rounded-full uppercase">
                    Strategy: {mentorProfile?.subjectSplitStrategy === '1_a_day_alternating' ? '1 Subject Focus' : mentorProfile?.subjectSplitStrategy === '2_a_day_alternating' ? '2 Subjects Alternating' : '3 Subjects Daily'}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {selectedDayIndex !== currentDayIndex && (
                <button
                  type="button"
                  onClick={() => setSelectedDayIndex(currentDayIndex)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 font-mono text-xs font-bold hover:bg-indigo-600/30 cursor-pointer"
                >
                  Jump to Today
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedDayIndex((prev: number) => Math.min(6, prev + 1))}
                disabled={selectedDayIndex === 6}
                className="p-2 rounded-lg border border-zinc-800 hover:bg-zinc-850 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 font-mono text-xs"
              >
                Next Day
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {selectedDayBlocks.map((block: any) => (
              <div
                key={block.id}
                onClick={() => {
                  setSelectedBlock(block);
                  setIsRationaleExpanded(false);
                }}
                className={`p-5 rounded-2xl border text-left space-y-3 transition-all cursor-pointer ${getSubjectStyle(block.subject)}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900/60 pb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border uppercase ${getBadgeStyle(block.subject)}`}>
                      {block.subject}
                    </span>
                    <span className="text-xs font-mono font-bold text-white bg-zinc-900/80 px-2.5 py-0.5 rounded border border-zinc-800">
                      {block.timeSlot}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">
                      Duration: {block.durationMinutes} mins
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-indigo-400 font-bold bg-indigo-950/80 border border-indigo-800/80 px-2.5 py-0.5 rounded">
                      Score: {block.priorityScore}
                    </span>
                    {block.completed && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const m = todayMissions.find((tm: any) => tm.id === block.id) || {
                          id: block.id,
                          subject: block.subject,
                          chapter: block.chapterName,
                          chapterId: block.chapterId,
                          chapterName: block.chapterName,
                          type: block.taskType,
                          taskName: `${block.taskType}: ${block.chapterName}`,
                          duration: block.durationMinutes,
                          completed: block.completed,
                          xp: 50,
                          unlocked: true,
                        };
                        setMissionToSwap(m);
                      }}
                      className="p-1.5 rounded bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/60 text-indigo-300 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-mono font-bold"
                      title="Change / Swap Subject & Chapter"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      <span>Swap</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMissionToDelete(block.id);
                      }}
                      className="p-1 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete mission"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-base font-display font-bold text-white tracking-tight">
                      {block.chapterName}
                    </h3>
                    <span className="text-xs font-mono text-zinc-400">Unit: {block.unit}</span>
                  </div>
                  <p className="text-xs font-mono text-indigo-300 font-semibold">
                    {block.activity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. REFINED WEEKLY MATRIX VIEW MODE */}
      {viewMode === 'weekly' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3 text-left">
            {daysOfWeek.map((dayName: string, dayIndex: number) => {
              const isToday = dayIndex === currentDayIndex;
              const dayBlocks = weeklyMatrix.filter((b: any) => b.dayIndex === dayIndex);

              return (
                <div 
                  key={dayName}
                  className={`rounded-2xl border p-3 space-y-3 transition-all ${
                    isToday 
                      ? 'border-indigo-500/60 bg-indigo-950/10 ring-1 ring-indigo-500/30' 
                      : 'border-zinc-850 bg-zinc-950/60'
                  }`}
                >
                  <div 
                    onClick={() => {
                      setSelectedDayIndex(dayIndex);
                      setViewMode('daily');
                    }}
                    className="flex flex-col border-b border-zinc-850 pb-2.5 cursor-pointer group gap-1.5"
                    title="Click to view detailed Daily Focus for this day"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {isToday && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>}
                        <span className={`text-xs font-mono font-bold uppercase group-hover:text-indigo-400 transition-colors ${isToday ? 'text-indigo-400' : 'text-zinc-300'}`}>
                          {dayName}
                        </span>
                        {isToday && (
                          <span className="text-[11px] font-mono font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-800/80 px-1.5 py-0.2 rounded uppercase">
                            LIVE
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 font-bold group-hover:text-indigo-300">
                        {dailyCapHours}h →
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 uppercase tracking-wider">
                        {getDayFocusPill(dayIndex, mentorProfile?.subjectSplitStrategy || '3_a_day', mentorProfile?.twoDaySplitConfig)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {dayBlocks.map((block: any) => {
                      const timeMatch = (block.timeSlot || '').match(/(\d{1,2}):(\d{2})/);
                      const startHour = timeMatch ? parseInt(timeMatch[1], 10) : 8;
                      const startMin = timeMatch ? parseInt(timeMatch[2], 10) : 0;
                      const startMins = startHour * 60 + startMin;
                      const endMins = startMins + (block.durationMinutes || 120);

                      const now = new Date();
                      const nowMins = now.getHours() * 60 + now.getMinutes();

                      const isLive = isToday && nowMins >= startMins && nowMins < endMins && !block.completed;
                      const isPast = (dayIndex < currentDayIndex) || (isToday && nowMins >= endMins) || !!block.completed;

                      let cardStyle = getSubjectStyle(block.subject);
                      if (isLive) {
                        cardStyle = 'bg-emerald-950/80 border-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] ring-1 ring-emerald-400/50 text-white';
                      } else if (isPast) {
                        cardStyle = 'bg-zinc-950/60 border-zinc-850 opacity-60 grayscale-[0.25] text-zinc-400';
                      }

                      return (
                        <div
                          key={block.id}
                          onClick={() => {
                            setSelectedBlock(block);
                            setIsRationaleExpanded(false);
                          }}
                          className={`p-3 rounded-xl border text-left space-y-2 transition-all cursor-pointer group shadow-sm ${cardStyle}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getBadgeStyle(block.subject)}`}>
                              {block.subject}
                            </span>
                            {isLive ? (
                              <span className="bg-emerald-500 text-white font-mono font-extrabold text-[11px] px-1.5 py-0.2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] flex items-center gap-1 animate-pulse">
                                <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                                LIVE
                              </span>
                            ) : (
                              <span className="text-[11px] font-mono text-zinc-400 font-semibold">
                                {block.durationMinutes}m
                              </span>
                            )}
                          </div>

                          <h4 className={`text-xs font-display font-bold transition-colors line-clamp-2 leading-snug ${
                            block.completed ? 'text-zinc-400 line-through' : 'text-white group-hover:text-indigo-300'
                          }`}>
                            {block.chapterName}
                          </h4>

                          <p className="text-[10px] font-mono text-zinc-400 line-clamp-1 leading-normal">
                            {block.activity}
                          </p>

                          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1.5 border-t border-zinc-900/60">
                            <span>Score: {block.priorityScore}</span>
                            {block.completed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
