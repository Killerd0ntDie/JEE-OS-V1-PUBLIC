import React, { useState, useEffect } from 'react';
import { getSubjectTheme } from '@/constants/subjectTheme';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { X, Plus, Clock, Sparkles, Trash2 } from 'lucide-react';
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
  const [targetPYQs, setTargetPYQs] = useState<number | ''>('');

  const todayStr = new Date().toISOString().split('T')[0];
  const [scheduledDate, setScheduledDate] = useState(todayStr);

  useEffect(() => {
    if (missionToEdit && isOpen) {
      setTaskName(missionToEdit.taskName);
      setSubject(missionToEdit.subject);
      setChapter(missionToEdit.chapter || '');
      setType(missionToEdit.type || 'Solve DPP');
      setDuration(missionToEdit.duration || 60);
      if (missionToEdit.targetPYQs !== undefined) {
        setTargetPYQs(missionToEdit.targetPYQs);
      } else {
        setTargetPYQs('');
      }
      if ((missionToEdit as any).date) {
        setScheduledDate((missionToEdit as any).date);
      }
    } else if (isOpen) {
      setTaskName('');
      setSubject('physics');
      setChapter('');
      setType('Solve DPP');
      setDuration(60);
      setTargetPYQs('');
      setScheduledDate(todayStr);
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
        targetPYQs: targetPYQs === '' ? undefined : targetPYQs,
      });
    } else {
      actions.addCustomMission({
        taskName,
        subject,
        chapter: chapter || 'General',
        type,
        duration,
        xp: targetPYQs !== '' ? Math.round(targetPYQs * 2) : duration * 1.5,
        targetPYQs: targetPYQs === '' ? undefined : targetPYQs,
        date: scheduledDate,
      });
    }
    
    // Reset form
    setTaskName('');
    setChapter('');
    setDuration(60);
    setTargetPYQs('');
    onClose();
  };

  const subjectOptions = [
    { id: 'physics', label: 'Physics', color: 'text-purple-400 bg-purple-400/10' },
    { id: 'chemistry', label: 'Chemistry', color: 'text-blue-400 bg-blue-400/10' },
    { id: 'maths', label: 'Mathematics', color: 'text-emerald-400 bg-emerald-400/10' },
  ];

  const handleDelete = () => {
    if (missionToEdit) {
      actions.deleteMission(missionToEdit.id);
      onClose();
    }
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-syne font-bold text-lg text-white">
                {missionToEdit ? 'Edit Mission' : 'Inject Custom Mission'}
              </h3>
              <p className="text-xs font-mono text-zinc-400">
                {missionToEdit ? 'Update scheduled mission parameters' : 'Manually add a targeted task to your queue'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[60vh] text-left">
          {/* Task Name */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold block">Mission / Task Title</label>
            <input 
              type="text" 
              placeholder="e.g., Solve 15 Electrochemistry PYQs"
              value={taskName}
              onChange={e => setTaskName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-sans text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
              required
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
                  className={`py-2.5 px-3 rounded-xl font-mono text-xs font-bold border transition-all text-center cursor-pointer ${
                    subject === opt.id 
                      ? 'border-indigo-500 bg-indigo-500/20 text-white shadow-sm' 
                      : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chapter */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold block">Chapter</label>
            <input 
              type="text" 
              placeholder="e.g., Electrochemistry"
              value={chapter}
              onChange={e => setChapter(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-sans text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
            />
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

          {/* Target PYQs Optional Manual Override */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold flex justify-between">
              <span>Target PYQs <span className="text-zinc-500 lowercase normal-case text-[10px]">(Optional)</span></span>
            </label>
            <input 
              type="number"
              placeholder="Leave empty for auto-calculate"
              value={targetPYQs}
              onChange={e => setTargetPYQs(e.target.value ? parseInt(e.target.value) : '')}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Scheduled Date */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold block">Scheduled Date</label>
            <input 
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
            />
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
        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex items-center gap-3">
          {missionToEdit && (
            <button 
              type="button"
              onClick={handleDelete}
              className="px-4 py-3.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              Delete
            </button>
          )}
          <button 
            type="submit"
            onClick={handleSubmit}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider py-3.5 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
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
