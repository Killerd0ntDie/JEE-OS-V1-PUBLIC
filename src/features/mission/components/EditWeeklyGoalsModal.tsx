import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Edit3 } from 'lucide-react';
import { createPortal } from 'react-dom';

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
}

export function EditWeeklyGoalsModal({ initialGoals, onClose, onSave }: EditWeeklyGoalsModalProps) {
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

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-2xl bg-[#0a0a0c] border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh] hide-scrollbar flex flex-col gap-6"
      >
        <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
          <div>
            <h2 className="text-xl font-display font-black text-white tracking-tight flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-indigo-400" />
              Edit 4-Week Milestone Roadmap
            </h2>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              Manually set your focus and objectives for the upcoming weeks.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-full text-zinc-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {goals.map((goal, i) => (
            <div key={i} className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/20 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono font-bold text-indigo-400">WEEK {i + 1}</span>
                <select
                  value={goal.status}
                  onChange={(e) => updateGoal(i, 'status', e.target.value)}
                  className="bg-[#050505] border border-zinc-800 rounded-lg px-3 py-1 text-xs font-mono text-zinc-300 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="Upcoming">Upcoming</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-mono text-zinc-500 uppercase font-bold tracking-widest mb-1.5 block">Milestone Title</label>
                  <input
                    type="text"
                    value={goal.title}
                    onChange={(e) => updateGoal(i, 'title', e.target.value)}
                    placeholder="e.g. Mechanics Core & Vectors"
                    className="w-full bg-[#050505] border border-zinc-800 rounded-lg px-4 py-2.5 text-sm font-sans font-medium text-white focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-zinc-500 uppercase font-bold tracking-widest mb-1.5 block">Focus & Tasks</label>
                  <textarea
                    value={goal.focus}
                    onChange={(e) => updateGoal(i, 'focus', e.target.value)}
                    placeholder="Focus: Kinematics, NLM, Work Power Energy. Complete 45 DPPs & 30 PYQs."
                    rows={2}
                    className="w-full bg-[#050505] border border-zinc-800 rounded-lg px-4 py-2.5 text-xs font-mono text-zinc-400 focus:border-indigo-500 focus:outline-none transition-colors resize-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 font-mono text-sm hover:text-white hover:bg-zinc-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(goals);
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-sm font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.2)] transition-all"
          >
            <Save className="w-4 h-4" />
            Save Roadmap
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
