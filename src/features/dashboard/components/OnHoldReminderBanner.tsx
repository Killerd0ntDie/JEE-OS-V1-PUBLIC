import React, { useState, useEffect } from 'react';
import { PauseCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Chapter } from '@/types';

interface OnHoldReminderBannerProps {
  chapters: Chapter[];
  onOpenChapter: (chapterId: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function OnHoldReminderBanner({
  chapters,
  onOpenChapter,
  isExpanded: externalExpanded,
  onToggleExpand
}: OnHoldReminderBannerProps) {
  const [internalExpanded, setInternalExpanded] = useState<boolean>(true);
  const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  const onHoldChapters = (chapters || []).filter(c => c.chapterOnHold || c.dppOnHold || c.pyqOnHold);

  useEffect(() => {
    if (onHoldChapters.length === 0) return;
    if (externalExpanded === undefined) {
      setInternalExpanded(true);
      const timer = setTimeout(() => {
        setInternalExpanded(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [onHoldChapters.length, externalExpanded]);

  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  if (onHoldChapters.length === 0) return null;

  const startedChapters = (chapters || []).filter(c => (c.completion > 0 && c.completion < 100) || (c.currentLecture && c.currentLecture > 0) || c.theoryComplete);
  const allStartedOnHold = startedChapters.length > 0 && startedChapters.every(c => c.chapterOnHold);

  return (
    <div className="w-full bg-amber-950/40 border border-amber-500/40 rounded-2xl p-3.5 mb-4 font-mono text-left shadow-lg transition-all duration-300">
      <div
        onClick={handleToggle}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <PauseCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
            {allStartedOnHold
              ? 'All started chapters are on hold — remove hold or start a new chapter to generate plan'
              : `${onHoldChapters.length} chapter${onHoldChapters.length > 1 ? 's' : ''} on hold — not being scheduled`}
          </span>
        </div>
        <div className="flex items-center gap-1 text-amber-400/80 hover:text-amber-300 text-[11px] font-bold">
          <span>{isExpanded ? 'Collapse' : 'View Chapters'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-96 opacity-100 mt-3 pt-2 border-t border-amber-500/20' : 'max-h-0 opacity-0 mt-0 pt-0 border-t-0'
        }`}
      >
        <div className="flex flex-wrap gap-2">
          {onHoldChapters.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenChapter(c.id);
              }}
              className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-200 hover:bg-amber-500/25 transition-colors cursor-pointer"
              title="Click to review or resume"
            >
              {c.name}
              {c.chapterOnHold
                ? ' (Entire Chapter)'
                : c.dppOnHold && c.pyqOnHold
                ? ' (DPP + PYQ)'
                : c.dppOnHold
                ? ' (DPP)'
                : ' (PYQ)'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
