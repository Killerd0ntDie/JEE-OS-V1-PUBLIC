import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { X, Save, Edit3 } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface Goal {
  weekIndex: number;
  title: string;
  focus: string;
  status: 'Completed' | 'Active' | 'Upcoming';
}

interface EditWeeklyGoalsModalProps {
  initialGoals: Goal[];
  onClose: () => void;
  onSave: (goals: Goal[]) => void;
  isOpen?: boolean;
}

export function EditWeeklyGoalsModal({ initialGoals, onClose, onSave, isOpen = true }: EditWeeklyGoalsModalProps) {
  const [goals, setGoals] = useState<Goal[]>(
    Array.isArray(initialGoals) && initialGoals.length > 0 
      ? initialGoals 
      : [
          { weekIndex: 1, title: '', focus: '', status: 'Active' },
          { weekIndex: 2, title: '', focus: '', status: 'Upcoming' },
          { weekIndex: 3, title: '', focus: '', status: 'Upcoming' },
          { weekIndex: 4, title: '', focus: '', status: 'Upcoming' }
        ]
  );

  const updateGoal = (index: number, field: keyof Goal, value: string) => {
    const newGoals = [...goals];
    newGoals[index] = { ...newGoals[index], [field]: value };
    setGoals(newGoals);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} zIndex={200} className="w-full max-w-2xl bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10">
      <div className="p-6 md:p-8 flex flex-col gap-6 text-left">
        <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
          <div>
            <h2 id="edit-weekly-goals-title" className="text-xl font-display font-black text-white tracking-tight flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-indigo-400" aria-hidden="true" />
              Edit 4-Week Milestone Roadmap
            </h2>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              Manually set your focus and objectives for the upcoming weeks.
            </p>
          </div>
          <button 
            onClick={onClose} 
            aria-label="Close modal"
            className="p-2 hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 cursor-pointer active:scale-95"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-6 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar">
          {goals.map((goal, i) => (
            <div key={goal.weekIndex} className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/20 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-mono font-bold text-indigo-400">WEEK {i + 1}</span>
                <div className="w-36">
                  <CustomSelect
                    size="sm"
                    value={goal.status}
                    onChange={(val) => updateGoal(i, 'status', val as any)}
                    options={[
                      { value: 'Upcoming', label: 'Upcoming' },
                      { value: 'Active', label: 'Active' },
                      { value: 'Completed', label: 'Completed' },
                    ]}
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label htmlFor={`goal-title-${i}`} className="text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-widest mb-1.5 block">Milestone Title</label>
                  <input
                    id={`goal-title-${i}`}
                    type="text"
                    value={goal.title}
                    onChange={(e) => updateGoal(i, 'title', e.target.value)}
                    placeholder="e.g. Mechanics Core & Vectors"
                    className="w-full bg-[#050505] border border-zinc-800 rounded-lg px-4 py-2.5 text-sm font-sans font-medium text-white focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor={`goal-focus-${i}`} className="text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-widest mb-1.5 block">Focus & Tasks</label>
                  <textarea
                    id={`goal-focus-${i}`}
                    value={goal.focus}
                    onChange={(e) => updateGoal(i, 'focus', e.target.value)}
                    placeholder="Focus: Kinematics, NLM, Work Power Energy. Complete 45 DPPs & 30 PYQs."
                    rows={2}
                    className="w-full bg-[#050505] border border-zinc-800 rounded-lg px-4 py-2.5 text-xs font-mono text-zinc-400 focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 font-mono text-sm hover:text-white hover:bg-zinc-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/50 cursor-pointer active:scale-95 select-none"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(goals);
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-sm font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.2)] transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 cursor-pointer select-none"
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            Save Roadmap
          </button>
        </div>
      </div>
    </Modal>
  );
}
