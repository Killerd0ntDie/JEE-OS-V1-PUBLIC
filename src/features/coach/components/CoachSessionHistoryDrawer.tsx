import React from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { History, Plus, X, MessageSquare, Trash2 } from 'lucide-react';
import { springs } from '@/constants/motion';
import { ChatSession } from '../hooks/useChatSessions';

interface CoachSessionHistoryDrawerProps {
  isOpen: boolean;
  sessionId: string | null;
  allSessions: ChatSession[];
  onClose: () => void;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
}

export const CoachSessionHistoryDrawer: React.FC<CoachSessionHistoryDrawerProps> = ({
  isOpen,
  sessionId,
  allSessions,
  onClose,
  onNewChat,
  onSelectSession,
  onDeleteSession
}) => {
  if (typeof document === 'undefined') return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100010] flex justify-end">
          {/* Subtle blurred backdrop without harsh blackout */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/35 backdrop-blur-sm"
          />

          {/* Drawer content */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={springs.fluid}
            className="w-full max-w-sm h-full bg-[#0e0f14] border-l border-zinc-800 p-6 shadow-2xl relative z-10 flex flex-col justify-between"
          >
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-base font-bold text-white font-display">Session History</h3>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={onNewChat}
                className="w-full py-2.5 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-white font-mono text-xs font-bold flex items-center justify-between shadow-lg cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-400" />
                  <span>New Strategy Session</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">⌘N</span>
              </motion.button>

              {/* Sessions List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pt-2 pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {allSessions.length === 0 ? (
                  <p className="text-xs text-zinc-500 font-mono py-8 text-center">
                    No saved strategy sessions yet.
                  </p>
                ) : (
                  allSessions.map(sess => {
                    const isSelected = sessionId === sess.id;
                    return (
                      <motion.div
                        key={sess.id}
                        whileHover={{ scale: 1.01 }}
                        onClick={() => onSelectSession(sess.id)}
                        className={`w-full text-left p-3 rounded-2xl text-xs flex items-center justify-between gap-2 transition-all cursor-pointer group ${
                          isSelected 
                            ? 'bg-indigo-600/20 border border-indigo-500/50 text-white font-bold shadow-md' 
                            : 'bg-zinc-900/60 border border-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-850'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-zinc-500'}`} />
                          <span className="truncate block font-sans">
                            {sess.title}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => onDeleteSession(sess.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-opacity cursor-pointer"
                          title="Delete session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-zinc-800 font-mono text-xs text-zinc-400">
              <span>{allSessions.length} total strategy sessions recorded</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
