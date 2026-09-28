import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Skull, Send, Brain, CheckCircle2, Sparkles, X, Clock,
  AlertTriangle, BookOpen, RotateCcw
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Mistake } from '@/types/index';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { RichTextRenderer } from '@/components/MathRenderer';
import { audioEngine } from '@/utils/audioEngine';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { auth } from '@/firebase';
import { storageAdapter } from '@/services/StorageAdapter';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AiInterrogationModalProps {
  isOpen: boolean;
  onClose: () => void;
  mistake: Mistake | null;
}

export const AiInterrogationModal: React.FC<AiInterrogationModalProps> = ({
  isOpen,
  onClose,
  mistake
}) => {
  const actions = useStudyBrainStore(state => state.actions);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMastered, setIsMastered] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEscapeKey(onClose, isOpen);

  // Initialize or reset chat when modal opens
  useEffect(() => {
    if (isOpen && mistake) {
      setIsMastered(false);
      setInputValue('');
      const initialGreeting: Message = {
        id: 'msg-init',
        role: 'assistant',
        content: `I'm your AI JEE Diagnostic Coach. I have your attempt for **${mistake.chapter}** (${mistake.topic || 'General'}).\n\nI want to find where your intuition or calculation diverged. What was your reasoning for the very first step in your calculation?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([initialGreeting]);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, mistake?.id]);

  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  if (!mistake) return null;

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: 'usr-' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        if (auth?.currentUser) {
          const token = await auth.currentUser.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        } else {
          headers['Authorization'] = 'Bearer guest_or_dev_token';
        }
      } catch {
        headers['Authorization'] = 'Bearer guest_or_dev_token';
      }

      try {
        const localKey = storageAdapter.getGeminiApiKey();
        if (localKey) {
          headers['x-gemini-api-key'] = localKey;
        }
      } catch {}

      const baseUrl = (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null')
        ? window.location.origin
        : 'http://localhost:3000';
      const url = `${baseUrl}/api/mistakes/interrogate`;

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mistakeId: mistake.id,
          questionText: mistake.questionText,
          correctSolution: mistake.correctSolution || mistake.correctMethod,
          studentMethod: mistake.studentMethod,
          studentAnswer: mistake.studentMethod,
          subject: mistake.subject,
          chapter: mistake.chapter,
          topic: mistake.topic,
          mistakeTypes: mistake.mistakeTypes,
          userMessage: text,
          history: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      let reply = data.reply || "Let's review the governing formula for this question carefully.";

      // Check if candidate demonstrated mastery
      if (reply.includes('[MASTERED]')) {
        reply = reply.replace(/\[MASTERED\]/g, '').trim();
        setIsMastered(true);
        audioEngine.playSuccessChime();
        await actions.updateMistakeStatus(mistake.id, 'Mastered');
      }

      const aiMsg: Message = {
        id: 'ai-' + Date.now(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error("[InterrogationModal] Error during chat:", err);
      const fallbackMsg: Message = {
        id: 'ai-err-' + Date.now(),
        role: 'assistant',
        content: "Let's verify the dimensions and boundary conditions of this system. Check if work done by the force changes sign depending on the direction of displacement.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen && !!mistake}
      onClose={onClose}
      zIndex={100010}
      backdropClassName="bg-black/35 backdrop-blur-sm"
      className="w-full max-w-4xl h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-indigo-900/50 bg-[#0d0e14] my-auto"
    >
      {/* Modal Header */}
      <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-950/60 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
              <span>Socratic Error Autopsy</span>
              {isMastered && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  Concept Mastered!
                </span>
              )}
            </h3>
            <p className="text-[11px] font-mono text-zinc-400">
              {mistake.subject.toUpperCase()} • {mistake.chapter}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Split Body: Question Context Panel + Chat Stream */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        
        {/* Left Column: Problem Snapshot (5 cols on md) */}
        <div className="md:col-span-5 p-4 border-r border-zinc-800/80 bg-zinc-950/50 overflow-y-auto space-y-3 custom-scrollbar text-left text-xs font-sans">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
            <span className="font-mono font-bold text-zinc-400 uppercase text-[11px]">Problem Statement</span>
            {mistake.source && (
              <span className="font-mono text-[10px] text-zinc-500">{mistake.source}</span>
            )}
          </div>

          <div className="text-zinc-200 leading-relaxed overflow-x-auto">
            <RichTextRenderer content={mistake.questionText} />
          </div>

          {mistake.studentMethod && (
            <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/30 text-rose-200 text-xs space-y-1">
              <span className="text-rose-400 font-mono font-bold uppercase block text-[10px]">Your Submitted Attempt:</span>
              <div className="font-mono text-[11px] leading-relaxed">
                <RichTextRenderer content={mistake.studentMethod} />
              </div>
            </div>
          )}

          {mistake.mistakeTypes && mistake.mistakeTypes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {mistake.mistakeTypes.map(t => (
                <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Multi-Turn Socratic Chat (7 cols on md) */}
        <div className="md:col-span-7 flex flex-col min-h-0 bg-[#0d0e14]">
          
          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 custom-scrollbar text-left">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed space-y-1 ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-br-xs shadow-md'
                        : 'bg-zinc-900/90 text-zinc-200 border border-zinc-800 rounded-bl-xs shadow-sm font-sans'
                    }`}
                  >
                    <RichTextRenderer content={m.content} />
                    <div className={`text-[9px] font-mono mt-1 ${isUser ? 'text-indigo-200' : 'text-zinc-500'}`}>
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 p-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span>Coach is diagnosing your derivation...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Response Chips */}
          <div className="px-4 py-2 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono text-zinc-400 shrink-0 custom-scrollbar">
            <span className="shrink-0 text-zinc-600">Quick:</span>
            {[
              "I used the wrong formula",
              "I missed a sign convention (+/-)",
              "Give me a hint without spoiling answer"
            ].map(hint => (
              <button
                key={hint}
                onClick={() => handleSend(hint)}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white whitespace-nowrap cursor-pointer transition-colors"
              >
                {hint}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-zinc-800 bg-zinc-950/90 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Explain your thought process or ask for a hint..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 font-sans"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-all cursor-pointer shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>

      </div>
    </Modal>
  );
};
