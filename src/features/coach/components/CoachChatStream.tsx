import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Copy, Check, Brain } from 'lucide-react';
import { MarkdownView } from '@/components/shared/MarkdownView';
import { springs } from '@/constants/motion';
import { ChatMessage } from '../hooks/useChatSessions';
import { CoachActionCard } from './CoachActionCard';
import { CoachAction } from '@jee-os/engines';

interface CoachChatStreamProps {
  chatHistory: ChatMessage[];
  sessionId: string | null;
  isLoading: boolean;
  copiedMsgIdx: number | null;
  onCopyMessage: (text: string, idx: number) => void;
  onApplyAction: (msgIndex: number, actionIndex: number, action: CoachAction) => void;
}

export const CoachChatStream: React.FC<CoachChatStreamProps> = ({
  chatHistory,
  sessionId,
  isLoading,
  copiedMsgIdx,
  onCopyMessage,
  onApplyAction
}) => {
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (instant = false) => {
    if (messagesContainerRef.current) {
      if (instant) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      } else {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [chatHistory, isLoading]);

  return (
    <div 
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto space-y-4 pt-2 sm:pt-3 pb-3 pr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {chatHistory.map((msg, idx) => (
          <motion.div 
            key={`${sessionId || 'new'}-${idx}`}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={springs.snappy}
            className={`w-full flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {/* USER MESSAGE (CLEAN DARK CHARCOAL PILL) */}
            {msg.role === 'user' ? (
              <div className="max-w-[85%] sm:max-w-xl bg-zinc-800 text-zinc-100 border border-zinc-700/80 rounded-3xl rounded-tr-xs px-5 py-3.5 shadow-md text-xs sm:text-sm font-sans leading-relaxed text-left">
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <span className="text-[10px] font-mono text-zinc-400 block text-right pt-1.5 opacity-60">
                  {msg.time}
                </span>
              </div>
            ) : (
              
              /* AI MENTOR RESPONSE (NATURAL CLEAN CARD WITH TYPOGRAPHY) */
              <div className="w-full flex items-start gap-3.5 text-left">
                <div className="w-8 h-8 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5 shadow-sm">
                  <Bot className="w-4 h-4 text-indigo-400" />
                </div>

                <div className="flex-1 space-y-2.5 min-w-0 max-w-2xl">
                  <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-3xl rounded-tl-xs p-5 md:p-6 shadow-xl text-zinc-200 text-xs sm:text-sm leading-relaxed space-y-3">
                    {/* Clean Markdown rendering */}
                    <MarkdownView content={msg.text} />

                    {/* Actionable Suggested Mission Cards */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-4 space-y-2 border-t border-zinc-800 pt-3.5">
                        <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase tracking-widest block mb-1">
                          Recommended Tactical Actions
                        </span>
                        {msg.actions.map((act, aIdx) => {
                          const isApplied = msg.appliedActionIndices?.includes(aIdx) ?? false;
                          return (
                            <CoachActionCard
                              key={aIdx}
                              action={act}
                              isApplied={isApplied}
                              onApply={() => onApplyAction(idx, aIdx, act)}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Message Action Footer */}
                  <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs pl-1">
                    <button
                      type="button"
                      onClick={() => onCopyMessage(msg.text, idx)}
                      className="p-1 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                      title="Copy response"
                    >
                      {copiedMsgIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="text-[10px]">{copiedMsgIdx === idx ? 'Copied' : 'Copy'}</span>
                    </button>
                    <span>•</span>
                    <span className="text-[10px]">{msg.time}</span>
                  </div>

                </div>
              </div>
            )}

          </motion.div>
        ))}
      </AnimatePresence>

      {/* Thinking Loading State */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springs.snappy}
          className="w-full flex items-start gap-3.5 text-left"
        >
          <div className="w-8 h-8 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200 shrink-0 mt-0.5 shadow-sm">
            <Bot className="w-4 h-4 text-indigo-400 animate-spin" />
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-3xl rounded-tl-xs px-5 py-4 text-xs font-mono text-zinc-300 flex items-center gap-2.5 shadow-xl">
            <Brain className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span>AI Mentor is evaluating syllabus telemetry & memory decay curve...</span>
          </div>
        </motion.div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
