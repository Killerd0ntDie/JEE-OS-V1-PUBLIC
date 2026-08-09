import React, { useState } from 'react';
import { PauseCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chapter } from '@/types';

interface OnHoldReminderBannerProps {
  chapters: Chapter[];
  onOpenChapter: (chapterId: string) => void;
}

export function OnHoldReminderBanner({
  chapters,
  onOpenChapter,
}: OnHoldReminderBannerProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const onHoldChapters = (chapters || []).filter(c => c.chapterOnHold || c.dppOnHold || c.pyqOnHold);

  if (onHoldChapters.length === 0) return null;

  return (
    <div className="w-full text-left">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-2.5 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-sm"
        title="Click to view on-hold chapters"
      >
        <span className="flex items-center gap-1.5">
          <PauseCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{onHoldChapters.length} On Hold</span>
        </span>
        {isExpanded ? <ChevronUp className="w-3 h-3 text-amber-400" /> : <ChevronDown className="w-3 h-3 text-amber-400" />}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full mt-1.5 overflow-hidden"
          >
            <div className="w-full p-2.5 rounded-xl bg-[#090a0f] border border-amber-500/40 shadow-2xl space-y-2 text-xs font-mono">
          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between border-b border-zinc-800 pb-1.5">
            <span>On-Hold Chapters ({onHoldChapters.length})</span>
            <span className="text-zinc-400 text-[11px]">Click to inspect</span>
          </div>
          <div className="max-h-44 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
            {onHoldChapters.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  onOpenChapter(c.id);
                }}
                className="w-full text-left p-2 rounded-lg bg-amber-950/30 hover:bg-amber-900/50 border border-amber-900/40 text-amber-200 hover:text-white transition-colors flex items-center justify-between text-[11px]"
              >
                <span className="truncate font-semibold">{c.name}</span>
                <span className="text-[11px] opacity-75 shrink-0 ml-2">
                  {c.chapterOnHold ? 'Chapter' : c.dppOnHold && c.pyqOnHold ? 'DPP+PYQ' : c.dppOnHold ? 'DPP' : 'PYQ'}
                </span>
              </button>
            ))}
          </div>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
