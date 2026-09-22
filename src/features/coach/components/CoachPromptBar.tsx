import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Plus, History, Zap, Sparkles, Target, Flame } from 'lucide-react';
import { springs } from '@/constants/motion';

interface CoachPromptBarProps {
  customInput: string;
  setCustomInput: (val: string) => void;
  onSubmit: (text: string) => void;
  isLoading: boolean;
  isNewChat: boolean;
  onNewChat: () => void;
  onOpenRevisionModal: () => void;
  onOpenHistoryDrawer: () => void;
}

export const CoachPromptBar: React.FC<CoachPromptBarProps> = ({
  customInput,
  setCustomInput,
  onSubmit,
  isLoading,
  isNewChat,
  onNewChat,
  onOpenRevisionModal,
  onOpenHistoryDrawer
}) => {
  const presetSuggestions = [
    { icon: Sparkles, text: 'Analyze high-yield syllabus gaps' },
    { icon: Zap, text: 'Clear active backlog fast' },
    { icon: Target, text: 'Recommend 3 priorities for Physics' },
    { icon: Flame, text: 'Generate 3-day emergency revision drill' }
  ];

  return (
    <div className="pt-2 space-y-2.5 shrink-0 relative z-20">
      
      {/* Preset Prompt Pills (Only for new chats) */}
      <AnimatePresence>
        {isNewChat && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: 10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: 10 }}
            transition={springs.fluid}
            className="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-1 justify-center flex-wrap sm:flex-nowrap"
          >
            {presetSuggestions.map((item, pIdx) => {
              const IconComp = item.icon;
              return (
                <motion.button
                  key={pIdx}
                  type="button"
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={springs.snappy}
                  onClick={() => onSubmit(item.text)}
                  className="text-[11px] font-mono text-zinc-300 bg-zinc-900/90 hover:bg-zinc-800 hover:text-white border border-zinc-800 px-4 py-2.5 rounded-2xl transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2 shadow-lg"
                >
                  <IconComp className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{item.text}</span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Input Capsule */}
      <motion.form
        layout
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(customInput);
        }}
        className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 hover:border-zinc-700 focus-within:border-zinc-600 rounded-full px-5 py-2.5 shadow-2xl flex items-center gap-3 transition-all"
      >
        {/* New Chat Quick Button */}
        {!isNewChat && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={onNewChat}
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="New Chat Session"
          >
            <Plus className="w-4 h-4" />
          </motion.button>
        )}

        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="Ask AI Mentor anything..."
          aria-label="Ask AI Mentor"
          className="flex-1 bg-transparent py-2.5 text-sm sm:text-base text-white placeholder-zinc-500 outline-none font-sans"
        />

        <motion.button
          whileTap={{ scale: 0.9 }}
          type="button"
          onClick={onOpenRevisionModal}
          className="p-2 rounded-full text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer hidden sm:block"
          title="Launch Revision Sprint"
        >
          <Zap className="w-4 h-4" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          type="button"
          onClick={onOpenHistoryDrawer}
          className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Session History"
        >
          <History className="w-4 h-4" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          transition={springs.snappy}
          type="submit"
          disabled={!customInput.trim() || isLoading}
          className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-all cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
        </motion.button>
      </motion.form>

      <p className="text-[10px] font-mono text-zinc-500 text-center">
        AI Mentor evaluates real-time telemetry from StudyBrain. Check important derivations.
      </p>

    </div>
  );
};
