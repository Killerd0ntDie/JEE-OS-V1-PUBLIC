import React, { useState } from 'react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { MonthlyObjective } from '@/types/index';
import { Target, Sparkles, X, Check } from 'lucide-react';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { Modal } from '@/components/ui/Modal';
import { toLocalDateString } from '@/utils/dateUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const MonthlyObjectiveModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const actions = useStudyBrainStore(state => state.actions);
  const mentorProfile = useStudyBrainStore(state => state.mentorProfile);

  const categories = [
    { title: 'Finish Mechanics', cat: 'Finish Mechanics', desc: 'Clear backlogs and master Kinematics, Newton Laws, Work Energy, and Rotation.' },
    { title: 'Finish Organic Chemistry', cat: 'Finish Organic', desc: 'Master GOC, Isomerism, Hydrocarbons, and Reaction Mechanisms.' },
    { title: 'Complete 12th Syllabus', cat: 'Complete 12th', desc: 'Lock 12th syllabus across Electrostatics, Calculus, and Physical Chemistry.' },
    { title: 'Increase Maths Accuracy', cat: 'Increase Maths Accuracy', desc: 'Solve 200+ PYQs and raise question solving accuracy from 50% to 80%.' },
    { title: 'Boards Exam Focus', cat: 'Boards Focus', desc: 'Derivation practice, NCERT textbook line-by-line reading, and previous 5 yr papers.' },
    { title: 'Revision & Mock Test Rush', cat: 'Revision Rush', desc: 'Complete 3 rounds of formula revision and take 4 full syllabus mock tests.' },
  ] as const;

  const [selectedCat, setSelectedCat] = useState<any>(
    mentorProfile?.monthlyObjective?.category || 'Finish Mechanics'
  );
  const [customDescription, setCustomDescription] = useState<string>(
    mentorProfile?.monthlyObjective?.description || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useLockBodyScroll(isOpen);
  useEscapeKey(onClose, isOpen);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const match = categories.find(c => c.cat === selectedCat);
      const objective: MonthlyObjective = {
        id: `mobj-${Date.now()}`,
        title: match ? match.title : selectedCat,
        category: selectedCat,
        description: customDescription.trim() || (match ? match.desc : selectedCat),
        targetDate: toLocalDateString(new Date(Date.now() + 30 * 86400000))
      };

      await actions.setMonthlyObjective(objective);
      onClose();
    } catch (err) {
      console.error("Monthly objective error", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    
    <Modal isOpen={isOpen} onClose={onClose} zIndex={999} backdropClassName="p-4 bg-black/40 backdrop-blur-md animate-fade-in overflow-y-auto text-left" className="relative w-full max-w-xl border border-indigo-900/50 rounded-2xl shadow-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="px-6 py-4 bg-indigo-950/30 border-b border-indigo-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-widest block">
                MONTHLY HIGHEST PRIORITY OBJECTIVE
              </span>
              <h2 id="monthly-objective-modal-title" className="text-sm font-display font-bold text-white">
                What is your primary goal this month?
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Monthly Goal Modal"
            className="text-zinc-400 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          <p className="text-xs text-zinc-400 leading-relaxed">
            The monthly objective becomes the highest priority in the AI Planner Engine. All weekly targets and daily missions will automatically adapt to achieve this milestone first.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.map(c => {
              const isSelected = selectedCat === c.cat;
              return (
                <button
                  key={c.cat}
                  type="button"
                  onClick={() => setSelectedCat(c.cat as any)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-purple-500 bg-purple-950/40 shadow-lg text-white font-bold'
                      : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-2xs mb-1">
                    <span className={isSelected ? 'text-purple-300' : 'text-zinc-300'}>{c.title}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-normal font-sans">{c.desc}</p>
                </button>
              );
            })}
          </div>

          <div className="space-y-1 pt-2">
            <label className="text-[10px] font-mono text-zinc-400 uppercase block">Custom Focus / Details (Optional)</label>
            <input
              type="text"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="e.g., Focus strictly on HC Verma Mechanics Vol 1 questions"
              className="w-full bg-[#121318] border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-purple-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
            />
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
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-purple-600/20 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Set Highest Priority Objective'}
            </button>
          </div>

        </form>
      </Modal>
    
  );
};
