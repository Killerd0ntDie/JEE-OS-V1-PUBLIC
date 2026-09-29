import React from 'react';

export interface PracticeModuleProps {
  title: string;
  colorClass: string;
  badgeColorClass: string;
  subtitle: string;
  holdMsg: string;
  recommendedMsg: string;
  onHold: boolean;
  setOnHold: (val: boolean) => void;
  completed: number;
  setCompleted: (val: number) => void;
  total: number;
  setTotal: (val: number) => void;
}

export const PracticeModule: React.FC<PracticeModuleProps> = ({
  title,
  colorClass,
  badgeColorClass,
  subtitle,
  holdMsg,
  recommendedMsg,
  onHold,
  setOnHold,
  completed,
  setCompleted,
  total,
  setTotal,
}) => {
  const percent = Math.min(100, Math.round((completed / (total || 1)) * 100));

  return (
    <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 flex flex-col justify-between gap-3 shadow-inner">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono font-bold tracking-wider uppercase ${colorClass}`}>{title}</span>
          <span className="text-[10px] font-mono text-zinc-400">({percent}%)</span>
        </div>
        <button
          type="button"
          onClick={() => setOnHold(!onHold)}
          className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer select-none active:scale-95 ${
            onHold
              ? badgeColorClass
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
          }`}
        >
          {onHold ? 'ON HOLD' : 'Put on Hold'}
        </button>
      </div>

      <p className="text-[11px] font-mono text-zinc-400 leading-tight">{subtitle}</p>

      {onHold && (
        <div className="p-2 rounded-xl bg-amber-950/30 border border-amber-900/50 text-amber-300 text-[10px] font-mono">
          {holdMsg}
        </div>
      )}

      {/* Progress Track */}
      <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${percent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 font-mono text-xs">
        <div>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">Solved / Done</span>
          <input
            type="number"
            min="0"
            max={total}
            value={completed === 0 ? '' : completed}
            placeholder="0"
            onChange={(e) => {
              const val = parseInt(e.target.value, 10) || 0;
              setCompleted(Math.max(0, Math.min(total, val)));
            }}
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-colors"
          />
        </div>
        <div>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">Total Target</span>
          <input
            type="number"
            min="1"
            value={total === 0 ? '' : total}
            placeholder="0"
            onChange={(e) => setTotal(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-colors"
          />
        </div>
      </div>

      <div className="text-[10px] font-mono text-zinc-400 italic">
        {recommendedMsg}
      </div>
    </div>
  );
};
