import React, { useState, useMemo } from 'react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { Card } from '@/components/ui/Card';
import { Network, AlertTriangle, ArrowRight, Activity, CalendarDays, RefreshCw } from 'lucide-react';
import { Chapter } from '@/types';

export function WarRoomSandbox() {
  const chapters = useStudyBrainStore(state => state.chapters);
  const chapterTelemetryMap = useStudyBrainStore(state => state.chapterTelemetryMap);

  // Sandbox local state for assignments
  // weekId (1, 2, 3, 4) -> Array of Chapter IDs
  const [weekAssignments, setWeekAssignments] = useState<Record<number, string[]>>({
    1: [], 2: [], 3: [], 4: []
  });

  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);

  // Chapters that are unassigned
  const pendingChapters = useMemo(() => {
    const assignedIds = new Set(Object.values(weekAssignments).flat());
    return chapters.filter(c => !c.theoryComplete && !assignedIds.has(c.id)).slice(0, 10); // Limit to top 10 for UI
  }, [chapters, weekAssignments]);

  // Calculate Butterfly Effect Drops
  const butterflyEffect = useMemo(() => {
    let projectedDrop = 0;
    let delayedDependencies = 0;

    // Simulate drop based on delayed assignments
    // If a chapter is assigned to week 3 or 4, we flag it as "delayed"
    const delayedIds = [...weekAssignments[3], ...weekAssignments[4]];
    
    delayedIds.forEach(id => {
      const chap = chapters.find(c => c.id === id);
      if (chap) {
        projectedDrop += chap.weightage || 4;
        
        // Count dependencies mapped in telemetry
        const telemetry = chapterTelemetryMap?.[id];
        if (telemetry && telemetry.isBottleneck) {
          delayedDependencies += 2; // rough mock of dependencies affected
        }
      }
    });

    return { projectedDrop, delayedDependencies };
  }, [weekAssignments, chapters, chapterTelemetryMap]);

  const handleAssign = (week: number) => {
    if (!selectedChapter) return;
    
    setWeekAssignments(prev => {
      const newAssignments = { ...prev };
      // Remove from any existing week
      for (const w in newAssignments) {
        newAssignments[w as unknown as number] = newAssignments[w as unknown as number].filter(id => id !== selectedChapter);
      }
      // Add to new week
      newAssignments[week].push(selectedChapter);
      return newAssignments;
    });
    setSelectedChapter(null);
  };

  const getChapterName = (id: string) => chapters.find(c => c.id === id)?.name || 'Unknown Chapter';

  return (
    <Card className="border border-indigo-900/50 bg-indigo-950/10 p-6 relative overflow-hidden">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs font-bold uppercase tracking-wider mb-1">
            <Network className="w-4 h-4" />
            <span>Strategic Sandbox (War Room)</span>
          </div>
          <h3 className="text-xl font-display font-bold text-white">Simulate Schedule Changes</h3>
          <p className="text-xs text-zinc-400">Click a pending chapter, then click a week to assign it. Watch the butterfly effect.</p>
        </div>

        {/* Live Butterfly Effect Metrics */}
        <div className="flex gap-4">
          <div className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${butterflyEffect.delayedDependencies > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">Dependencies Delayed</div>
              <div className="text-lg font-display font-bold text-white">{butterflyEffect.delayedDependencies} Chapters</div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${butterflyEffect.projectedDrop > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">Projected Marks Drop</div>
              <div className="text-lg font-display font-bold text-white">-{butterflyEffect.projectedDrop} Marks</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Pending Chapters Pool */}
        <div className="lg:col-span-1 space-y-3">
          <div className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2">
            Pending Queue
          </div>
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto hide-scrollbar pr-2">
            {pendingChapters.map(chap => (
              <button
                key={chap.id}
                onClick={() => setSelectedChapter(chap.id === selectedChapter ? null : chap.id)}
                className={`text-left p-2.5 rounded-lg border text-xs font-mono transition-all ${
                  selectedChapter === chap.id 
                    ? 'bg-indigo-600/20 border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.2)] text-indigo-300' 
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                }`}
              >
                {chap.name}
              </button>
            ))}
            {pendingChapters.length === 0 && (
              <div className="text-xs text-zinc-500 font-mono text-center p-4">All queued chapters assigned.</div>
            )}
          </div>
        </div>

        {/* 4-Week Grid */}
        <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(weekNum => (
            <div 
              key={weekNum}
              onClick={() => handleAssign(weekNum)}
              className={`p-4 rounded-xl border flex flex-col gap-3 min-h-[250px] transition-all ${
                selectedChapter 
                  ? 'bg-indigo-950/20 border-indigo-500/30 cursor-pointer hover:bg-indigo-900/30 hover:border-indigo-400 border-dashed'
                  : 'bg-zinc-900/40 border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between border-b border-zinc-800/50 pb-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className={`w-4 h-4 ${weekNum <= 2 ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span className="font-mono text-xs font-bold text-zinc-200">WEEK {weekNum}</span>
                </div>
                {weekNum > 2 && <span className="text-[9px] font-mono text-amber-500/70 bg-amber-950/50 px-1.5 py-0.5 rounded">Delay Risk</span>}
              </div>

              <div className="flex-1 flex flex-col gap-2">
                {weekAssignments[weekNum].map(id => (
                  <div key={id} className="p-2 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-between group">
                    <span className="text-[10px] font-mono text-zinc-300 truncate pr-2">{getChapterName(id)}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setWeekAssignments(prev => ({
                          ...prev,
                          [weekNum]: prev[weekNum].filter(cid => cid !== id)
                        }));
                      }}
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {weekAssignments[weekNum].length === 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-[10px] font-mono text-zinc-600 text-center px-4">
                      {selectedChapter ? 'Click to assign here' : 'Empty'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
