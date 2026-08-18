import React, { useState } from 'react';
import { ListTodo, Check, ChevronRight, Play, Pause, CheckCircle2, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { springs } from '@/constants/motion';
import { audioEngine } from '@/utils/audioEngine';

export interface MissionChecklistWidgetProps {
  progressPercent: number;
  checklist: Record<string, boolean>;
  activeSubject?: 'physics' | 'chemistry' | 'maths' | string;
  onToggleTask: (task: string) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onCompleteAll: () => void;
  onStartPractice: () => void;
  onAddTask?: (task: string) => void;
  onRemoveTask?: (task: string) => void;
}

export function MissionChecklistWidget({
  progressPercent,
  checklist,
  activeSubject = 'physics',
  onToggleTask,
  isPaused,
  onTogglePause,
  onCompleteAll,
  onStartPractice,
  onAddTask,
  onRemoveTask
}: MissionChecklistWidgetProps) {
  const [newTaskInput, setNewTaskInput] = useState('');

  const handleAddTask = () => {
    const trimmed = newTaskInput.trim();
    if (!trimmed || !onAddTask) return;
    if (checklist[trimmed] !== undefined) {
      setNewTaskInput('');
      return;
    }
    audioEngine.playRadioRelayClick().catch(() => {});
    onAddTask(trimmed);
    setNewTaskInput('');
  };

  // Dynamic Subject Theme
  const getTheme = () => {
    const s = (activeSubject || '').toLowerCase();
    if (s.includes('chem')) {
      return {
        accentText: 'text-emerald-400',
        accentBg: 'bg-emerald-500/10',
        accentBorder: 'border-emerald-500/20',
        bar: 'bg-emerald-500',
        checkboxActive: 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_8px_rgba(16,185,129,0.3)]',
        doneText: 'text-emerald-400',
        hoverBorder: 'group-hover:border-emerald-400',
        focusBorder: 'focus:border-emerald-500',
        buttonAdd: 'bg-emerald-600/15 hover:bg-emerald-600/30 border-emerald-500/30 text-emerald-300',
      };
    }
    if (s.includes('math')) {
      return {
        accentText: 'text-purple-400',
        accentBg: 'bg-purple-500/10',
        accentBorder: 'border-purple-500/20',
        bar: 'bg-purple-500',
        checkboxActive: 'bg-purple-600 border-purple-500 text-white shadow-[0_0_8px_rgba(168,85,247,0.3)]',
        doneText: 'text-purple-400',
        hoverBorder: 'group-hover:border-purple-400',
        focusBorder: 'focus:border-purple-500',
        buttonAdd: 'bg-purple-600/15 hover:bg-purple-600/30 border-purple-500/30 text-purple-300',
      };
    }
    // Default: Sky Blue
    return {
      accentText: 'text-sky-400',
      accentBg: 'bg-sky-500/10',
      accentBorder: 'border-sky-500/20',
      bar: 'bg-sky-500',
      checkboxActive: 'bg-sky-500 border-sky-400 text-white shadow-[0_0_8px_rgba(56,189,248,0.3)]',
      doneText: 'text-sky-400',
      hoverBorder: 'group-hover:border-sky-400',
      focusBorder: 'focus:border-sky-500',
      buttonAdd: 'bg-sky-600/15 hover:bg-sky-600/30 border-sky-500/30 text-sky-300',
    };
  };

  const theme = getTheme();

  return (
    <div className="w-full h-full flex flex-col justify-between p-5 sm:p-6 select-none text-left">
      <div className="w-full flex-1 flex flex-col min-h-0 space-y-4">
        
        {/* Header with Progress Bar */}
        <div className="space-y-3 border-b border-white/10 pb-3.5 shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl ${theme.accentBg} border ${theme.accentBorder} ${theme.accentText} flex items-center justify-center shadow-sm`}>
                <ListTodo className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-tactical font-black tracking-wider text-white uppercase">
                  <span className="eva-japanese-badge">任務項目 // </span>DIRECTIVES
                </h3>
                <p className="text-[10px] text-zinc-400 font-mono mt-0.5 uppercase">
                  Complete targets to calibrate XP
                </p>
              </div>
            </div>
            <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-xl border shadow-sm transition-colors uppercase tracking-wider ${
              progressPercent === 100 
                ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300 shadow-emerald-950/50' 
                : `${theme.accentBg} ${theme.accentBorder} ${theme.accentText}`
            }`}>
              {progressPercent}% DONE
            </span>
          </div>
          
          {/* Animated Top Progress Bar */}
          <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-white/10">
            <motion.div 
              className={`h-full rounded-full transition-colors ${
                progressPercent === 100 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : theme.bar
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Checklist Entries */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 min-h-[140px] max-h-[320px]">
          {Object.keys(checklist).map((task) => {
            const isChecked = checklist[task];
            return (
              <motion.div
                key={task}
                whileHover={{ x: 2 }}
                transition={springs.snappy}
                onClick={() => {
                  if (!isChecked) {
                    audioEngine.playMechanicalKey('clack').catch(() => {});
                    audioEngine.playTacticalBeep(1400).catch(() => {});
                  } else {
                    audioEngine.playMechanicalKey('click').catch(() => {});
                  }
                  onToggleTask(task);
                }}
                className={`group py-2.5 px-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-between border ${
                  isChecked
                    ? 'border-white/5 bg-zinc-950/40 text-zinc-500'
                    : 'border-white/10 bg-zinc-900/70 hover:bg-zinc-850/80 hover:border-emerald-500/40 text-zinc-200 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <motion.div 
                    whileTap={{ scale: 0.85 }}
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                      isChecked
                        ? theme.checkboxActive
                        : `border-zinc-700 bg-zinc-950/80 ${theme.hoverBorder}`
                    }`}
                  >
                    {isChecked && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={springs.snappy}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </motion.div>
                    )}
                  </motion.div>
                  <span className={`text-xs font-tactical font-bold tracking-wide truncate uppercase ${
                    isChecked ? 'line-through text-zinc-600' : 'text-zinc-200 group-hover:text-white'
                  }`}>
                    {task}
                  </span>
                </div>

                {/* Icon status indicator */}
                <div className="flex items-center gap-2 shrink-0 font-mono">
                  {isChecked ? (
                    <span className={`text-[10px] font-mono ${theme.doneText} font-bold uppercase tracking-wider`}>DONE ✓</span>
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                  )}
                  {onRemoveTask && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.85 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveTask(task);
                      }}
                      title="Remove item"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-red-400 p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Add Custom Checklist Item */}
        {onAddTask && (
          <div className="flex items-center gap-2 pt-1 shrink-0 font-mono">
            <input
              type="text"
              value={newTaskInput}
              onChange={(e) => setNewTaskInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTask();
                }
                e.stopPropagation();
              }}
              placeholder="Add your own checklist item..."
              className={`flex-1 bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none ${theme.focusBorder} transition-colors shadow-inner`}
            />
            <motion.button
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              transition={springs.snappy}
              onClick={handleAddTask}
              disabled={!newTaskInput.trim()}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl ${theme.buttonAdd} disabled:opacity-40 disabled:cursor-not-allowed text-xs font-mono font-bold uppercase transition-colors cursor-pointer shadow-sm`}
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </motion.button>
          </div>
        )}

      </div>

      {/* Primary Footer CTAs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-4 border-t border-white/10 mt-4 shrink-0 font-mono">
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          transition={springs.snappy}
          onClick={onStartPractice}
          className="w-full py-2.5 sm:py-3 rounded-xl border border-white/10 bg-zinc-950/80 hover:bg-zinc-900 text-zinc-300 hover:text-white text-[11px] font-mono font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
        >
          <Play className="w-3.5 h-3.5 text-zinc-400" />
          Practice Mode
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          transition={springs.snappy}
          onClick={() => {
            audioEngine.playMechanicalKey('heavy').catch(() => {});
            onTogglePause();
          }}
          className="w-full py-2.5 sm:py-3 rounded-xl border border-amber-500/40 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 text-[11px] font-mono font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.15)] active:scale-95"
        >
          {isPaused ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
          {isPaused ? 'Resume Session' : 'Pause Session'}
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          transition={springs.snappy}
          onClick={() => {
            audioEngine.playMechanicalKey('clack').catch(() => {});
            audioEngine.playSuccess().catch(() => {});
            onCompleteAll();
          }}
          className="w-full py-2.5 sm:py-3 rounded-xl border border-emerald-400/50 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] font-mono font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.35)] active:scale-95"
        >
          <CheckCircle2 className="w-4 h-4" />
          Complete
        </motion.button>
      </div>

    </div>
  );
}