import React from 'react';
import { motion } from 'motion/react';
import { CustomSelect } from '@/components/ui/CustomSelect';

export interface ChapterMetaTabProps {
  weightage: number;
  priority: 1 | 2 | 3;
  setPriority: (val: 1 | 2 | 3) => void;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  setDifficulty: (val: 'Easy' | 'Medium' | 'Hard') => void;
  serialNumber: string;
  setSerialNumber: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
}

export const ChapterMetaTab: React.FC<ChapterMetaTabProps> = ({
  weightage,
  priority,
  setPriority,
  difficulty,
  setDifficulty,
  serialNumber,
  setSerialNumber,
  notes,
  setNotes,
}) => {
  return (
    <motion.div
      key="meta"
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -14 }}
      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3 sm:gap-4 font-mono text-xs">
        <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 space-y-1.5">
          <label className="block text-zinc-400 uppercase text-[10px] font-bold tracking-wider">JEE Weightage %</label>
          <input
            type="number"
            value={weightage === 0 ? '' : weightage}
            placeholder="0"
            readOnly
            className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-xl px-3.5 py-2 text-zinc-400 cursor-not-allowed font-bold"
          />
          <span className="text-[10px] text-zinc-400 italic block">* System benchmark derived</span>
        </div>
        <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 space-y-1.5 relative z-20">
          <label className="block text-zinc-400 uppercase text-[10px] font-bold tracking-wider">Priority Tier</label>
          <CustomSelect
            size="sm"
            value={priority}
            onChange={(val) => setPriority(parseInt(val as string, 10) as 1 | 2 | 3)}
            options={[
              { value: 1, label: 'Tier 1 (High Priority)' },
              { value: 2, label: 'Tier 2 (Medium Priority)' },
              { value: 3, label: 'Tier 3 (Low Priority)' },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 font-mono text-xs">
        <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 space-y-1.5 relative z-10">
          <label className="block text-zinc-400 uppercase text-[10px] font-bold tracking-wider">Difficulty Level</label>
          <CustomSelect
            size="sm"
            value={difficulty}
            onChange={(val) => setDifficulty(val as 'Easy' | 'Medium' | 'Hard')}
            options={[
              { value: 'Easy', label: 'Easy' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Hard', label: 'Hard' },
            ]}
          />
        </div>
        <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 space-y-1.5">
          <label className="block text-zinc-400 uppercase text-[10px] font-bold tracking-wider">Serial Number (Sorting)</label>
          <input
            type="text"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            placeholder="e.g. 05"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 font-mono"
          />
        </div>
      </div>

      <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 space-y-1.5">
        <label className="block font-mono text-zinc-400 uppercase text-[10px] font-bold tracking-wider">Chapter Notes & Weak Points</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Key concepts to revise, formula pitfalls, weak sub-topics..."
          rows={2}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 font-mono resize-none"
        />
      </div>
    </motion.div>
  );
};
