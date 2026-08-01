import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, History, Trash2, Calendar, RotateCcw } from 'lucide-react';
import { TodayMission, SubjectId } from '@/types/index';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';

interface CustomMissionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getSubjectBadgeStyle = (subj?: SubjectId) => {
  switch (subj) {
    case 'physics':
      return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    case 'chemistry':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'maths':
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    default:
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
  }
};

export function CustomMissionHistoryModal({ isOpen, onClose }: CustomMissionHistoryModalProps) {
  const actions = useStudyBrainStore(s => s.actions);
  const customMissions = useStudyBrainStore(s => s.customMissions);

  // Filter only completed custom missions
  const completedMissions = customMissions.filter(m => m.completed);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-xl"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-900/80 bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <History className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Custom Mission History</h2>
              <p className="text-sm text-zinc-400">Past custom execution log</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-800 text-zinc-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
          {completedMissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                <History className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-zinc-400 font-medium">No history found</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-[250px]">
                Completed custom missions will appear here automatically.
              </p>
            </div>
          ) : (
            completedMissions.map(mission => (
              <div
                key={mission.id}
                className="group p-4 bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl flex items-center justify-between transition-colors relative overflow-hidden"
              >
                <div className="flex flex-col gap-2 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getSubjectBadgeStyle(mission.subject as SubjectId)}`}>
                      {mission.subject}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-zinc-800/60 border border-zinc-700/50 text-[10px] text-zinc-300 font-mono">
                      {mission.type}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-zinc-800/60 border border-zinc-700/50 text-[10px] text-yellow-500/80 font-mono">
                      ⏱️ {mission.duration}m
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-200">{mission.taskName}</h3>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Completed
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => actions.completeTask(mission.id)}
                    className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 flex items-center justify-center transition-colors cursor-pointer relative z-10"
                    title="Restore to Queue"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => actions.deleteMission(mission.id)}
                    className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 flex items-center justify-center transition-colors cursor-pointer relative z-10"
                    title="Permanently Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
