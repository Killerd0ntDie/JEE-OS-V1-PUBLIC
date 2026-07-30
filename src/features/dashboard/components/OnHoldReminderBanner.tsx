import React from 'react';
import { PauseCircle } from 'lucide-react';
import { Chapter } from '../../../types';

interface OnHoldReminderBannerProps {
  chapters: Chapter[];
  onOpenChapter: (chapterId: string) => void;
}

export function OnHoldReminderBanner({ chapters, onOpenChapter }: OnHoldReminderBannerProps) {
  const onHoldChapters = (chapters || []).filter(c => c.dppOnHold || c.pyqOnHold);

  if (onHoldChapters.length === 0) return null;

  return (
    <div className="w-full bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4 mb-4 font-mono">
      <div className="flex items-center gap-2 mb-2">
        <PauseCircle className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
          {onHoldChapters.length} chapter{onHoldChapters.length > 1 ? 's' : ''} on hold — not being scheduled
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {onHoldChapters.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => onOpenChapter(c.id)}
            className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-200 hover:bg-amber-500/20 transition-colors cursor-pointer"
            title="Click to review or resume"
          >
            {c.name}
            {c.dppOnHold && c.pyqOnHold ? ' (DPP + PYQ)' : c.dppOnHold ? ' (DPP)' : ' (PYQ)'}
          </button>
        ))}
      </div>
    </div>
  );
}
