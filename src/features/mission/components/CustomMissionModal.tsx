import React, { useState, useEffect } from 'react';
import { getSubjectTheme } from '@/constants/subjectTheme';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { X, Plus, Clock, Sparkles } from 'lucide-react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { SubjectId, TodayMission } from '@/types/index';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface CustomMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  missionToEdit?: TodayMission | null;
}

export const CustomMissionModal: React.FC<CustomMissionModalProps> = ({ isOpen, onClose, missionToEdit }) => {
  const actions = useStudyBrainStore(state => state.actions);
  const chapters = useStudyBrainStore(state => state.chapters);
  const [taskName, setTaskName] = useState('');
  const [subject, setSubject] = useState<SubjectId>('physics');
  const [chapter, setChapter] = useState('');
  const [type, setType] = useState<TodayMission['type']>('Solve DPP');
  const [duration, setDuration] = useState(60);

  useEffect(() => {
    if (missionToEdit && isOpen) {
      setTaskName(missionToEdit.taskName);
      setSubject(missionToEdit.subject);
      setChapter(missionToEdit.chapter || '');
      setType(missionToEdit.type || 'Solve DPP');
      setDuration(missionToEdit.duration || 60);
    } else if (isOpen) {
      setTaskName('');
      setSubject('physics');
      setChapter('');
      setType('Solve DPP');
      setDuration(60);
    }
  }, [missionToEdit, isOpen]);

  useEscapeKey(onClose, isOpen);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    if (missionToEdit) {
      actions.updateMissionDetails(missionToEdit.id, {
        taskName,
        subject,
        chapter: chapter || 'General',
        type,
        duration,
      });
    } else {
      actions.addCustomMission({
        taskName,
        subject,
        chapter: chapter || 'General',
        type,
        duration,
        xp: duration * 1.5,
      });
    }
    
    // Reset form
    setTaskName('');
    setChapter('');
    setDuration(60);
    onClose();
  };

  const subjectOptions = [
    { id: 'physics', label: 'Physics', color: 'text-purple-400 bg-purple-400/10' },
    { id: 'chemistry', label: 'Chemistry', color: 'text-blue-400 bg-blue-400/10' },
    { id: 'maths', label: 'Mathematics', color: 'text-emerald-400 bg-emerald-400/10' },
  ];

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-2xl animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-mission-modal-title"
        className="relative w-full max-w-md bg-[#090a0f] rounded-3xl border border-indigo-500/30 shadow-[0_0_80px_rgba(79,70,229,0.25)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs uppercase font-bold tracking-widest bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20 w-fit">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                Custom Planner Injection
              </div>
              <h2 id="custom-mission-modal-title" className="text-xl font-display font-bold text-white tracking-tight">
                {missionToEdit ? 'Edit Mission' : 'Add Custom Mission'}
              </h2>
            </div>
            <button 
              onClick={onClose}
              aria-label="Close Custom Mission Modal"
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {/* Task Name */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold block">Mission Name</label>
            <input 
              type="text"
              required
              value={taskName}
              onChange={e => setTaskName(e.target.value)}
              placeholder="e.g., Complete coaching module"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono text-sm placeholder-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold block">Subject</label>
            <div className="grid grid-cols-3 gap-2">
              {subjectOptions.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSubject(opt.id as SubjectId)}
                  className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    subject === opt.id 
                      ? `${getSubjectTheme(opt.id).badge} shadow-md` 
                      : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chapter */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold block">Chapter (Optional)</label>
            <select
              value={chapter}
              onChange={e => setChapter(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
            >
              <option value="">General / None</option>
              {chapters.filter(c => c.subject === subject).map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold block">Task Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as TodayMission['type'])}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
            >
              <option value="Solve DPP">Solve Questions (DPP)</option>
              <option value="Solve PYQs">Solve PYQs</option>
              <option value="Watch Lecture">Watch Lecture</option>
              <option value="Revise Formulas">Revise Formulas</option>
              <option value="Review Mistakes">Review Mistakes</option>
            </select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold flex justify-between">
              <span>Estimated Duration</span>
              <span className="text-indigo-400">{duration} mins</span>
            </label>
            <input 
              type="range"
              min="15"
              max="180"
              step="15"
              value={duration}
              onChange={e => setDuration(parseInt(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

        </form>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/[0.02]">
          <button 
            type="submit"
            onClick={handleSubmit}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider py-4 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {missionToEdit ? 'Save Changes' : 'Inject Mission'}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
