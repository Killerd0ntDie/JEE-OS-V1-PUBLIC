import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Modal } from '@/components/ui/Modal';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { X, Plus, Clock, Sparkles, Trash2 } from 'lucide-react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { SubjectId, TodayMission } from '@/types/index';
import { toLocalDateString } from '@/utils/dateUtils';
import { springs } from '@/constants/motion';

interface CustomMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  missionToEdit?: TodayMission | null;
}

export const CustomMissionModal: React.FC<CustomMissionModalProps> = ({ isOpen, onClose, missionToEdit }) => {
  const actions = useStudyBrainStore(state => state.actions);
  const [taskName, setTaskName] = useState('');
  const [subject, setSubject] = useState<SubjectId>('physics');
  const [chapter, setChapter] = useState('');
  const [type, setType] = useState<TodayMission['type']>('Solve DPP');
  const [duration, setDuration] = useState(60);
  const [targetPYQs, setTargetPYQs] = useState<number | ''>('');

  const todayStr = toLocalDateString();
  const [scheduledDate, setScheduledDate] = useState(todayStr);

  useEffect(() => {
    if (missionToEdit && isOpen) {
      setTaskName(missionToEdit.taskName);
      setSubject(missionToEdit.subject);
      setChapter(missionToEdit.chapter || '');
      setType(missionToEdit.type || 'Solve DPP');
      setDuration(missionToEdit.duration || 60);
      setTargetPYQs(missionToEdit.targetPYQs ?? '');
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
  }, [missionToEdit, isOpen, todayStr]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    if (missionToEdit) {
      await actions.updateMissionDetails(missionToEdit.id, {
        taskName,
        subject,
        chapter,
        type,
        duration,
        xp: targetPYQs !== '' ? Math.round(targetPYQs * 2) : duration * 1.5,
        targetPYQs: targetPYQs === '' ? undefined : targetPYQs,
        date: scheduledDate,
      });
    } else {
      await actions.addCustomMission({
        taskName,
        subject,
        chapter,
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
    { id: 'physics', label: 'Physics' },
    { id: 'chemistry', label: 'Chemistry' },
    { id: 'maths', label: 'Mathematics' },
  ];

  const handleDelete = () => {
    if (missionToEdit) {
      actions.deleteMission(missionToEdit.id);
      onClose();
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      zIndex={100} 
      backdropClassName="bg-black/40 backdrop-blur-sm p-4"
      className="bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden w-full max-w-lg text-left"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-zinc-800/80 bg-zinc-950/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-white">
              {missionToEdit ? 'Edit Mission' : 'Inject Custom Mission'}
            </h3>
            <p className="text-xs font-mono text-zinc-400">
              {missionToEdit ? 'Update scheduled mission parameters' : 'Manually add a targeted task to your queue'}
            </p>
          </div>
        </div>
        <button 
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer select-none active:scale-95"
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
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 text-white font-sans text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
            required
          />
        </div>

        {/* Subject with Gliding Pill */}
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold block">Subject</label>
          <div className="grid grid-cols-3 gap-2 relative bg-zinc-950/80 border border-zinc-850 p-1 rounded-xl">
            {subjectOptions.map(opt => {
              const isActive = subject === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSubject(opt.id as SubjectId)}
                  className={`relative py-2.5 px-3 rounded-lg font-mono text-xs font-bold transition-colors text-center cursor-pointer select-none z-10 ${
                    isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="customMissionSubjectPill"
                      className="absolute inset-0 bg-indigo-600 rounded-lg shadow-md shadow-indigo-600/30 -z-10"
                      transition={springs.fluid}
                    />
                  )}
                  {opt.label}
                </button>
              );
            })}
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
        <div className="space-y-2 relative z-20">
          <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold block">Task Type</label>
          <CustomSelect
            value={type}
            onChange={val => setType(val as TodayMission['type'])}
            options={[
              { value: 'Solve DPP', label: 'Solve Questions (DPP)' },
              { value: 'Solve PYQs', label: 'Solve PYQs Sprint' },
              { value: 'Watch Lecture', label: 'Theory & Lecture' },
              { value: 'Revise Formulas', label: 'Revise Formulas' },
              { value: 'Review Mistakes', label: 'Review Mistakes' },
              { value: 'Break', label: 'Scheduled Rest Break' },
              { value: 'Solve Mock', label: 'Solve Mock Test' }
            ]}
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

        {/* Target PYQs / Questions */}
        {(type === 'Solve DPP' || type === 'Solve PYQs') && (
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold block">Target Questions (Optional)</label>
            <input 
              type="number" 
              placeholder="e.g., 20"
              value={targetPYQs === 0 ? '' : targetPYQs} placeholder="0"
              onChange={e => setTargetPYQs(e.target.value === '' ? '' : parseInt(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
            />
          </div>
        )}

        {/* Duration */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">Planned Duration</label>
            <span className="text-xs font-mono font-bold text-indigo-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {duration} minutes
            </span>
          </div>
          <input 
            type="range" 
            min="15" 
            max="180" 
            step="15"
            value={duration}
            onChange={e => setDuration(parseInt(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>
      </form>

      {/* Footer */}
      <div className="p-6 border-t border-zinc-800/80 bg-zinc-950/40 flex items-center gap-3">
        {missionToEdit && (
          <button 
            type="button"
            onClick={handleDelete}
            className="px-4 py-3.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all active:scale-[0.97] flex items-center justify-center gap-2 cursor-pointer shrink-0 select-none"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            Delete
          </button>
        )}
        <button 
          type="submit"
          onClick={handleSubmit}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider py-3.5 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer select-none"
        >
          <Plus className="w-4 h-4" />
          {missionToEdit ? 'Save Changes' : 'Inject Mission'}
        </button>
      </div>
    </Modal>
  );
};
