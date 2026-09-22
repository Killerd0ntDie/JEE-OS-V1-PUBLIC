import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain,
  Send,
  X,
  Maximize2,
  Minimize2,
  Sparkles,
  Bot,
  User,
  Loader2,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  HelpCircle,
  Layers
} from 'lucide-react';
import { RichTextRenderer } from '@/components/MathRenderer';
import { auth } from '@/firebase';

export interface MentorContext {
  testName?: string;
  questionNumber?: number;
  subject?: string;
  chapter?: string;
  topic?: string;
  questionContent?: string;
  options?: string[];
  correctAnswer?: string;
  studentAnswer?: string;
  explanation?: string;
  score?: number;
  totalMarks?: number;
  accuracy?: number;
}

interface Message {
  id: string;
  sender: 'user' | 'mentor';
  text: string;
  timestamp: string;
}

interface MockTestAiMentorModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: MentorContext;
  initialPrompt?: string;
  anchorRef?: React.RefObject<HTMLElement | null>;
  defaultFullscreen?: boolean;
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

export function MockTestAiMentorModal({
  isOpen,
  onClose,
  context,
  initialPrompt,
  anchorRef,
  defaultFullscreen = false
}: MockTestAiMentorModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(defaultFullscreen);
  const [showQuestionPanel, setShowQuestionPanel] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Dynamic Anchor Positioning relative to trigger button
  const [anchorPos, setAnchorPos] = useState<{ top: number; right: number; caretRight: number } | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (isOpen && anchorRef?.current && !isFullscreen) {
      const updatePosition = () => {
        if (!anchorRef.current) return;
        const rect = anchorRef.current.getBoundingClientRect();
        const popoverWidth = Math.min(440, window.innerWidth - 24);
        const centerX = rect.left + rect.width / 2;

        let right = window.innerWidth - (centerX + popoverWidth / 2);
        right = Math.max(12, Math.min(window.innerWidth - popoverWidth - 12, right));

        const caretRight = (window.innerWidth - right) - centerX - 6;

        setAnchorPos({
          top: Math.max(8, rect.bottom + 8),
          right,
          caretRight: Math.max(16, Math.min(popoverWidth - 28, caretRight))
        });
      };

      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen, anchorRef, isFullscreen]);

  // Global Escape key dismiss listener
  useEffect(() => {
    if (!isOpen) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

  // Initialize or reset chat on open or context change
  useEffect(() => {
    if (isOpen) {
      const qContextLabel = context.questionNumber 
        ? `Question ${context.questionNumber} (${context.subject || 'General'})`
        : `your Mock Test performance`;

      const initialGreeting: Message = {
        id: 'init-greeting',
        sender: 'mentor',
        text: `Hey! I'm your AI JEE Mentor. I have full context of **${qContextLabel}**.\n\nAsk me anything: intuitive shortcuts, why your choice was trapped, or how to tackle this step-by-step!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages([initialGreeting]);

      if (initialPrompt) {
        handleSend(initialPrompt);
      } else {
        setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 150);
      }
    }
  }, [isOpen, context.questionNumber, context.testName]);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    const userMsg: Message = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

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
        if (typeof localStorage !== 'undefined') {
          const localKey = localStorage.getItem('gemini_api_key') || localStorage.getItem('jeeos_gemini_api_key');
          if (localKey) {
            headers['x-gemini-api-key'] = localKey;
          }
        }
      } catch {}

      const baseUrl = (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null')
        ? window.location.origin
        : 'http://localhost:3000';
      const url = `${baseUrl}/api/mocktest/mentor-chat`;

      const response = await fetch(url, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          query,
          context
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const rawReply = data.reply || "I've reviewed this question. Remember to verify boundary conditions and check for symmetry properties.";
      const mentorReply = rawReply
        .replace(/(?:^|\n)\s*([•\-\*])\s*#{1,6}\s*(.*)/g, '\n$1 **$2**')
        .replace(/(?:^|\n)\s*#{1,6}\s+(.*)/g, '\n\n**$1**\n');

      const mentorMsg: Message = {
        id: 'mentor-' + Date.now(),
        sender: 'mentor',
        text: mentorReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, mentorMsg]);
    } catch (err: any) {
      console.error('Failed to query AI mentor:', err);
      const isTimeout = err?.name === 'AbortError';
      const fallbackMsg: Message = {
        id: 'err-' + Date.now(),
        sender: 'mentor',
        text: isTimeout
          ? `**Mentor Request Timed Out (15s)**:\n\nNetwork latency prevented full AI generation. Here is a quick tactical hint for **${context.topic || context.subject || 'this problem'}**:\n\nExamine extreme limits or test boundary conditions ($0, \\infty$). Check for dimensional homogeneity among the options!`
          : `**Tactical Shortcut for ${context.topic || context.subject || 'this problem'}**:\n\nIn JEE problems like this, examine extreme limits or test boundary conditions ($0, \\infty$). Notice which options violate dimensional symmetry directly!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const presetSuggestions = [
    { label: "⚡ Intuitive Shortcut", query: "Explain the fastest intuitive shortcut or trick for this problem in 2 sentences." },
    { label: "⚠️ Why Was I Wrong?", query: "Why is my submitted answer incorrect and what examiner trap did I fall into?" },
    { label: "📐 Core Formula Drill", query: "What fundamental governing formula and concept should I review for this?" },
    { label: "🎯 Similar JEE Problem", query: "Give me a quick 1-line variant of this problem to test my understanding." }
  ];

  const popoverStyle: React.CSSProperties = anchorPos
    ? {
        top: `${anchorPos.top}px`,
        right: `${anchorPos.right}px`
      }
    : {};

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {/* 1. Backdrop: Smooth fade-in and fade-out click-catcher */}
      {isOpen && (
        <motion.div
          key="ai-mentor-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={onClose}
          className="fixed inset-0 z-[100059] bg-black/15 pointer-events-auto"
        />
      )}

      {/* 2. FULLSCREEN MODE: Majestic scale and fade transition */}
      {isOpen && isFullscreen && (
        <motion.div
          key="ai-mentor-fullscreen"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100060] bg-[#090a10] flex flex-col font-sans text-left overflow-hidden pointer-events-auto"
        >
        {/* Fullscreen Header */}
        <header className="px-4 py-3 bg-[#11121b] border-b border-zinc-800 flex items-center justify-between gap-3 text-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <Brain className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white font-display">
                  AI JEE Mentor Studio
                </h2>
                {context.questionNumber && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/60 text-indigo-300">
                    Question {context.questionNumber}
                  </span>
                )}
                {context.subject && (
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 capitalize">
                    {context.subject}
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-zinc-400 truncate">
                {context.chapter || context.topic || context.testName || 'Comprehensive Problem Analysis'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Toggle Question Context Split (Desktop) */}
            {context.questionContent && (
              <button
                type="button"
                onClick={() => setShowQuestionPanel(!showQuestionPanel)}
                className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-colors cursor-pointer ${
                  showQuestionPanel
                    ? 'bg-indigo-950/60 border-indigo-700/60 text-indigo-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
                title="Toggle Question Statement Split View"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Question Context</span>
              </button>
            )}

            {/* Minimize / Exit Fullscreen Button */}
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-mono font-bold transition-colors cursor-pointer"
              title="Restore to compact popover"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restore</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
              title="Close Mentor (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Fullscreen Body: Split Cockpit (Question Context + Chat) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Split Pane: Question Statement, Choices, & Key (Desktop) */}
          {context.questionContent && showQuestionPanel && (
            <aside className="hidden lg:flex w-[42%] max-w-xl flex-col border-r border-zinc-800/80 bg-[#0d0e16] overflow-y-auto p-6 space-y-5 custom-scrollbar">
              <div className="bg-[#12131e] border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-md">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-800/50 px-2 py-0.5 rounded">
                    Q. {context.questionNumber || '–'}
                  </span>
                  <div className="flex items-center gap-2">
                    {context.studentAnswer && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                        Your: <b>{context.studentAnswer}</b>
                      </span>
                    )}
                    {context.correctAnswer && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/60 text-emerald-300">
                        Key: <b>{context.correctAnswer}</b>
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-sm text-zinc-100 leading-relaxed font-serif break-words">
                  <RichTextRenderer content={context.questionContent} />
                </div>

                {context.options && context.options.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                    <div className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                      Options:
                    </div>
                    {context.options.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const isCorrect = context.correctAnswer?.toUpperCase().includes(letter) || context.correctAnswer === String(idx);
                      const isStudent = context.studentAnswer?.toUpperCase() === letter || context.studentAnswer === String(idx);

                      let style = 'bg-zinc-900/60 border-zinc-800 text-zinc-300';
                      if (isCorrect) style = 'bg-emerald-950/30 border-emerald-500/60 text-emerald-100';
                      else if (isStudent && !isCorrect) style = 'bg-rose-950/30 border-rose-500/60 text-rose-100';

                      return (
                        <div key={idx} className={`p-2.5 rounded-xl border flex items-start gap-2.5 text-xs ${style}`}>
                          <span className="font-mono font-bold shrink-0">({letter})</span>
                          <div className="flex-1">
                            <RichTextRenderer content={opt} optIndex={idx} questionContent={context.questionContent} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {context.explanation && (
                <div className="bg-[#12131e] border border-zinc-800 rounded-2xl p-5 space-y-3">
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Official Solution & Notes</span>
                  </div>
                  <div className="text-xs text-zinc-300 leading-relaxed font-serif">
                    <RichTextRenderer content={context.explanation} />
                  </div>
                </div>
              )}
            </aside>
          )}

          {/* Right Split Pane: Fullscreen Conversation Stream */}
          <main className="flex-1 flex flex-col bg-[#090a10] overflow-hidden">
            {/* Quick Prompt Chips */}
            <div className="px-4 py-2 bg-[#10111a] border-b border-zinc-800/80 flex items-center gap-2 overflow-x-auto hide-scrollbar shrink-0">
              {presetSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(item.query)}
                  disabled={isLoading}
                  className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-indigo-950/70 text-zinc-300 hover:text-indigo-200 border border-zinc-800 hover:border-indigo-700/50 text-xs font-mono font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap active:scale-95 disabled:opacity-50"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Chat Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
              {messages.map((msg) => {
                const isMentor = msg.sender === 'mentor';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isMentor ? 'justify-start max-w-3xl' : 'justify-end'}`}
                  >
                    {isMentor && (
                      <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`rounded-2xl p-4 text-xs sm:text-sm leading-relaxed break-words ${
                        isMentor
                          ? 'bg-[#12131e] border border-zinc-800 text-zinc-200 shadow-md flex-1'
                          : 'bg-indigo-600 text-white rounded-br-xs shadow-lg shadow-indigo-600/25 max-w-[85%]'
                      }`}
                    >
                      {isMentor ? (
                        <div className="space-y-2">
                          <RichTextRenderer content={msg.text} />
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      )}

                      <div className={`mt-2 text-[9px] font-mono text-right ${isMentor ? 'text-zinc-500' : 'text-indigo-200'}`}>
                        {msg.timestamp}
                      </div>
                    </div>

                    {!isMentor && (
                      <div className="w-8 h-8 rounded-xl bg-indigo-700 flex items-center justify-center text-white shrink-0 mt-0.5">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex gap-2.5 items-center text-xs font-mono text-indigo-400 bg-indigo-950/40 border border-indigo-900/50 px-3.5 py-2.5 rounded-xl w-fit">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Formulating tactical intuition and steps...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer Bar */}
            <div className="p-3 sm:p-4 bg-[#11121c] border-t border-zinc-800 flex items-center gap-2 shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                placeholder={
                  context.questionNumber
                    ? `Ask anything about Question ${context.questionNumber}... (Press Enter to Send)`
                    : "Ask about your test performance... (Press Enter to Send)"
                }
                className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />

              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isLoading}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-indigo-600/25 active:scale-95 disabled:cursor-not-allowed disabled:text-zinc-500 shrink-0"
                title="Send Message"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          </main>
        </div>
      </motion.div>
    )}

    {/* 3. POPOVER MODE: Spring-loaded expansion directly from AI Mentor button anchor */}
    {isOpen && !isFullscreen && (
      <motion.div
        key="ai-mentor-popover"
        style={{
          ...popoverStyle,
          transformOrigin: anchorPos
            ? `calc(100% - ${anchorPos.caretRight}px) 0px`
            : 'top right'
        }}
        initial={{ opacity: 0, scale: 0.85, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: -8 }}
        transition={{
          type: 'spring',
          stiffness: 420,
          damping: 28,
          mass: 0.75
        }}
        className={`fixed ${!anchorPos ? 'top-14 right-4 sm:right-8' : ''} w-[94vw] sm:w-[420px] md:w-[440px] h-[540px] max-h-[82vh] z-[100060] font-sans pointer-events-auto flex flex-col`}
      >
        {/* Top Caret Pointer (aligned to center of AI Mentor button) */}
        {anchorPos && (
          <div
            style={{ right: `${anchorPos.caretRight}px` }}
            className="absolute -top-1.5 w-3 h-3 rotate-45 bg-[#161824] border-t border-l border-indigo-500/40 z-20 pointer-events-none"
          />
        )}

        <div className="relative w-full h-full bg-[#111218]/95 backdrop-blur-2xl border border-indigo-500/40 rounded-2xl shadow-2xl shadow-black/90 ring-1 ring-white/10 flex flex-col overflow-hidden text-left">
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-[#161824] border-b border-zinc-800/80 flex items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
                <Brain className="w-4 h-4" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#161824]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-bold text-white font-display truncate">
                    AI Mentor Quick Chat
                  </h3>
                  {context.questionNumber ? (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-950/80 border border-indigo-800/60 text-indigo-300">
                      Q.{context.questionNumber}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                      Exam
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-mono text-zinc-400 truncate">
                  {context.chapter || context.subject || 'Interactive Problem Solver'}
                </p>
              </div>
            </div>

            {/* Actions: Maximize & Close */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
                title="Expand to Fullscreen Studio"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
                title="Close AI Mentor (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3 py-1.5 bg-zinc-950/70 border-b border-zinc-850 flex items-center gap-1.5 overflow-x-auto hide-scrollbar shrink-0">
            {presetSuggestions.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(item.query)}
                disabled={isLoading}
                className="px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-indigo-950/70 text-zinc-300 hover:text-indigo-200 border border-zinc-800 hover:border-indigo-700/50 text-[10px] font-mono font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap active:scale-95 disabled:opacity-50"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Chat Message Stream */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 space-y-3 custom-scrollbar">
            {messages.map((msg) => {
              const isMentor = msg.sender === 'mentor';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isMentor ? 'justify-start' : 'justify-end'}`}
                >
                  {isMentor && (
                    <div className="w-6 h-6 rounded-md bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                      <Bot className="w-3 h-3" />
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] rounded-xl p-2.5 sm:p-3 text-xs leading-relaxed break-words ${
                      isMentor
                        ? 'bg-zinc-900/90 border border-zinc-800 text-zinc-200 shadow-sm'
                        : 'bg-indigo-600 text-white rounded-br-xs shadow-md shadow-indigo-600/20'
                    }`}
                  >
                    {isMentor ? (
                      <div className="space-y-1.5">
                        <RichTextRenderer content={msg.text} />
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}

                    <div className={`mt-1 text-[8px] font-mono text-right ${isMentor ? 'text-zinc-500' : 'text-indigo-200'}`}>
                      {msg.timestamp}
                    </div>
                  </div>

                  {!isMentor && (
                    <div className="w-6 h-6 rounded-md bg-indigo-700 flex items-center justify-center text-white shrink-0 mt-0.5">
                      <User className="w-3 h-3" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-2 items-center text-xs font-mono text-indigo-400 bg-indigo-950/30 border border-indigo-900/40 px-2.5 py-2 rounded-xl w-fit">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Formulating intuition...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer Bar */}
          <div className="p-2.5 bg-[#14151e] border-t border-zinc-800/90 flex items-center gap-1.5 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={
                context.questionNumber
                  ? `Ask about Question ${context.questionNumber}... (↵)`
                  : "Ask about your test... (↵)"
              }
              className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />

            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isLoading}
              className="p-2 sm:px-3 sm:py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm shadow-indigo-600/20 active:scale-95 disabled:cursor-not-allowed disabled:text-zinc-500 shrink-0"
              title="Send Message"
            >
              <Send className="w-3 h-3" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>,
  document.body
);
}
