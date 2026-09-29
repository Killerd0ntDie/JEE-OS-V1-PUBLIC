import React from 'react';
import { motion } from 'motion/react';
import { BookOpen } from 'lucide-react';

export interface ChapterProgressTabProps {
  currentLecture: number;
  setCurrentLecture: (val: number) => void;
  totalLectures: number;
  setTotalLectures: (val: number) => void;
  totalLecturesError: boolean;
  setTotalLecturesError: (val: boolean) => void;
  totalLecturesRef: React.RefObject<HTMLInputElement | null>;
  theoryComplete: boolean;
  setTheoryComplete: (val: boolean) => void;
  teacher: string;
  setTeacher: (val: string) => void;
  avgLectureDuration: number;
  setAvgLectureDuration: (val: number) => void;
}

export const ChapterProgressTab: React.FC<ChapterProgressTabProps> = ({
  currentLecture,
  setCurrentLecture,
  totalLectures,
  setTotalLectures,
  totalLecturesError,
  setTotalLecturesError,
  totalLecturesRef,
  theoryComplete,
  setTheoryComplete,
  teacher,
  setTeacher,
  avgLectureDuration,
  setAvgLectureDuration,
}) => {
  return (
    <motion.div
      key="progress"
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -14 }}
      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4"
    >
      <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 space-y-3">
        <label className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          Lectures Progress Counter
        </label>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div>
            <span className="text-[11px] text-zinc-400 block mb-1 font-mono uppercase tracking-wider">Watched Lectures</span>
            <input
              type="number"
              min="0"
              max={totalLectures}
              disabled={theoryComplete}
              value={currentLecture === 0 ? '' : currentLecture}
              placeholder="0"
              onChange={(e) => {
                const val = parseInt(e.target.value, 10) || 0;
                setCurrentLecture(Math.max(0, Math.min(totalLectures, val)));
              }}
              className={`w-full bg-zinc-900 border rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${theoryComplete ? 'border-indigo-500/30 opacity-70 cursor-not-allowed' : 'border-zinc-800 focus:border-indigo-500'}`}
            />
          </div>
          <div>
            <span className="text-[11px] text-zinc-400 block mb-1 font-mono uppercase tracking-wider">Total Chapter Lectures</span>
            <input
              ref={totalLecturesRef}
              type="number"
              min="1"
              max="100"
              disabled={theoryComplete}
              value={totalLectures === 0 ? '' : totalLectures}
              placeholder="0"
              onChange={(e) => {
                setTotalLectures(parseInt(e.target.value, 10) || 0);
                if (parseInt(e.target.value, 10) > 0) setTotalLecturesError(false);
              }}
              className={`w-full bg-zinc-900 border rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${totalLecturesError ? 'border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.3)]' : theoryComplete ? 'border-indigo-500/30 opacity-70 cursor-not-allowed' : 'border-zinc-800 focus:border-indigo-500'}`}
            />
            {totalLecturesError && (
              <span className="text-[10px] text-rose-400 mt-1 block">Set total lectures first</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 space-y-1.5">
          <span className="text-[11px] text-zinc-400 block font-mono uppercase tracking-wider">Teacher / Coaching Batch</span>
          <input
            type="text"
            placeholder="e.g. Physics Galaxy, PW, Allen"
            value={teacher}
            onChange={(e) => setTeacher(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-white font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500"
          />
        </div>
        <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 space-y-1.5">
          <span className="text-[11px] text-zinc-400 block font-mono uppercase tracking-wider">Avg Duration (mins)</span>
          <input
            type="number"
            value={avgLectureDuration === 0 ? '' : avgLectureDuration}
            placeholder="0"
            onChange={(e) => setAvgLectureDuration(parseInt(e.target.value, 10) || 0)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-white font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500"
          />
        </div>
      </div>

      <label className="flex items-center gap-3 p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 cursor-pointer hover:border-indigo-500/40 transition-all select-none group">
        <input
          type="checkbox"
          checked={theoryComplete}
          onChange={(e) => {
            const isChecked = e.target.checked;
            if (isChecked && (!totalLectures || totalLectures === 0)) {
              setTotalLecturesError(true);
              totalLecturesRef.current?.focus();
              return;
            }
            setTotalLecturesError(false);
            setTheoryComplete(isChecked);
            if (isChecked) {
              setCurrentLecture(totalLectures);
            }
          }}
          className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-0 cursor-pointer accent-indigo-600"
        />
        <div className="flex-1">
          <span className="text-xs font-mono text-zinc-200 font-bold block group-hover:text-indigo-300 transition-colors">
            Theory / All Lectures Completed
          </span>
          <span className="text-[10px] font-mono text-zinc-400">
            Locks theory phase and unlocks 100% priority towards DPP and PYQ solving drills
          </span>
        </div>
      </label>
    </motion.div>
  );
};
