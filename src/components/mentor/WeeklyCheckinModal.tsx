import React, { useState } from 'react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { Sparkles, Calendar, RotateCcw, X, Check } from 'lucide-react';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { ModalPortal } from '@/components/ui/ModalPortal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const WeeklyCheckinModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const actions = useStudyBrainStore(state => state.actions);

  const [completedChapters, setCompletedChapters] = useState<string>('');
  const [newBacklogNotes, setNewBacklogNotes] = useState<string>('');
  const [upcomingExams, setUpcomingExams] = useState<string>('');
  const [healthLevel, setHealthLevel] = useState<'Good' | 'Fatigued' | 'Recovering'>('Good');
  const [motivationLevel, setMotivationLevel] = useState<'High' | 'Medium' | 'Low'>('High');
  const [availableHoursThisWeek, setAvailableHoursThisWeek] = useState<number>(35);
  const [unexpectedEvents, setUnexpectedEvents] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useLockBodyScroll(isOpen);
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await actions.submitWeeklyCheckin({
        date: new Date().toISOString().split('T')[0],
        completedChapters: completedChapters.split(',').map(s => s.trim()).filter(Boolean),
        newBacklogNotes,
        upcomingExams,
        healthLevel,
        motivationLevel,
        availableHoursThisWeek,
        unexpectedEvents
      });
      onClose();
    } catch (err) {
      console.error("Weekly check-in error", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto text-left">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="weekly-checkin-modal-title"
        className="relative w-full max-w-lg bg-[#0a0b0e] border border-indigo-900/50 rounded-2xl shadow-2xl overflow-hidden my-6"
      >
        
        {/* Header */}
        <div className="px-6 py-4 bg-indigo-950/30 border-b border-indigo-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest block">
                SUNDAY AUDIT — RECALCULATE ENTIRE WEEK
              </span>
              <h2 id="weekly-checkin-modal-title" className="text-sm font-display font-bold text-white">
                What changed this week?
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Weekly Audit Modal"
            className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-zinc-400 uppercase block">Completed Chapters This Week (comma-separated)</label>
            <input
              type="text"
              value={completedChapters}
              onChange={(e) => setCompletedChapters(e.target.value)}
              placeholder="e.g. Rotation, Electrostatics, Integration"
              className="w-full bg-[#121318] border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-zinc-400 uppercase block">New Backlogs / Missed Lectures</label>
            <input
              type="text"
              value={newBacklogNotes}
              onChange={(e) => setNewBacklogNotes(e.target.value)}
              placeholder="e.g. Missed 2 organic lectures in coaching"
              className="w-full bg-[#121318] border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-zinc-400 uppercase block">Upcoming Tests / School Exams</label>
            <input
              type="text"
              value={upcomingExams}
              onChange={(e) => setUpcomingExams(e.target.value)}
              placeholder="e.g. Major Allen Test on Sunday (Part Syllabus)"
              className="w-full bg-[#121318] border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-zinc-400 uppercase block">Health State</label>
              <select
                value={healthLevel}
                onChange={(e) => setHealthLevel(e.target.value as any)}
                className="w-full bg-[#121318] border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
              >
                <option value="Good">Good / Fit</option>
                <option value="Fatigued">Fatigued</option>
                <option value="Recovering">Recovering</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-zinc-400 uppercase block">Available Hours This Week</label>
              <input
                type="number"
                value={availableHoursThisWeek}
                onChange={(e) => setAvailableHoursThisWeek(parseInt(e.target.value) || 30)}
                className="w-full bg-[#121318] border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-zinc-800 text-zinc-400 font-mono text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg cursor-pointer"
            >
              {isSubmitting ? 'Regenerating...' : 'Regenerate Entire Week Plan'}
            </button>
          </div>

        </form>
      </div>
    </div>
    </ModalPortal>
  );
};
