import React from 'react';
import { ListTodo, Check, ChevronRight, Play, Pause, CheckCircle2 } from 'lucide-react';

export interface MissionChecklistWidgetProps {
  progressPercent: number;
  checklist: Record<string, boolean>;
  onToggleTask: (task: string) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onCompleteAll: () => void;
  onStartPractice: () => void;
}

export function MissionChecklistWidget({
  progressPercent,
  checklist,
  onToggleTask,
  isPaused,
  onTogglePause,
  onCompleteAll,
  onStartPractice
}: MissionChecklistWidgetProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">
        
        <div className="flex flex-col gap-3 border-b border-zinc-900/60 pb-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-indigo-400" />
              <span className="text-[11px] font-mono font-bold tracking-wider text-indigo-400 uppercase">
                TODAY'S MISSION CHECKLIST
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500 font-bold bg-zinc-900/80 border border-zinc-850 px-2 py-0.5 rounded">
              {progressPercent}% DONE
            </span>
          </div>
          
          {/* Top horizontal progress bar */}
          <div className="w-full h-1.5 bg-zinc-900/60 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-700 ease-out" 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
        </div>

        {/* Checklist Entries */}
        <div className="space-y-3">
          {Object.keys(checklist).map((task) => {
            const isChecked = checklist[task];
            return (
              <div
                key={task}
                onClick={() => onToggleTask(task)}
                className={`group py-3 px-2 transition-all cursor-pointer flex items-center justify-between select-none border-b last:border-b-0 ${
                  isChecked
                    ? 'border-indigo-500/10 text-indigo-300'
                    : 'border-zinc-900/60 text-zinc-400 hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center shrink-0 transition-all ${
                    isChecked
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'border-zinc-800 bg-transparent'
                  }`}>
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className={`text-[12px] font-medium tracking-wide ${isChecked ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                    {task}
                  </span>
                </div>

                {/* Icon status indicator */}
                <div>
                  {isChecked ? (
                    <span className="text-[10px] font-mono text-indigo-400 font-semibold uppercase tracking-wider">LOGGED ✓</span>
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-600 hover:text-zinc-400" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Primary Footer CTAs */}
        <div className="flex items-center gap-3 pt-6 mt-4">
          <button
            onClick={onStartPractice}
            className="flex-1 py-3 rounded-xl border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-[11px] font-mono font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5" />
            Practice Mode
          </button>
          <button
            onClick={onTogglePause}
            className="flex-1 py-3 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-mono font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>

          <button
            onClick={onCompleteAll}
            className="flex-1 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-mono font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Complete
          </button>
        </div>

      </div>
    </div>
  );
}
