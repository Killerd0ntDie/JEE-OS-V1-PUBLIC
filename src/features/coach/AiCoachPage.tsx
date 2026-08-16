import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { safelyParseJSON } from '@/utils/jsonParser';
import { ChapterTelemetry, CoachEngine, CoachAction } from '@jee-os/engines';
import { AiRevisionPlanModal } from '@/components/shared/AiRevisionPlanModal';
import { MarkdownView } from '@/components/shared/MarkdownView';
import { useNavigate } from 'react-router-dom';
import { springs } from '@/constants/motion';
import { 
  Bot, Send, Plus, History, 
  Target, Zap, Check, Calendar, Copy, Brain, Sparkles, Flame, X, MessageSquare, Trash2
} from 'lucide-react';

export interface ChatMessage {
  role: 'user' | 'coach';
  text: string;
  time: string;
  actions?: CoachAction[];
  appliedActionIndices?: number[];
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

export function AiCoachPage({ isActive }: { isActive?: boolean }) {
  const actions = useStudyBrainStore(state => state.actions);
  const settings = useStudyBrainStore(state => state.settings);
  const chapterTelemetryMap = useStudyBrainStore(state => state.chapterTelemetryMap);
  const chapters = useStudyBrainStore(state => state.chapters);
  const mistakes = useStudyBrainStore(state => state.mistakes);
  const todayMissions = useStudyBrainStore(state => state.todayMissions) || [];
  const plannerOutput = useStudyBrainStore(state => state.plannerOutput);
  const mentorProfile = useStudyBrainStore(state => state.mentorProfile);
  const analyticsSummary = useStudyBrainStore(state => state.analyticsSummary);
  const analytics = useStudyBrainStore(state => state.analytics);
  const navigate = useNavigate();
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef(sessionId);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);
  
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null);
  const [allSessions, setAllSessions] = useState<ChatSession[]>([]);

  const initialMessage: ChatMessage = {
    role: 'coach',
    text: `### Tactical Syllabus Strategy (${settings.dreamIit || 'IIT'} Focus)\n\n• **Immediate Priority:** Focus on your active in-flight modules and solve 15 high-yield PYQs.\n• **Backlog Resolution:** Use the 70/30 split rule (70% scheduled missions, 30% backlog clearance).\n• **Memory Retention:** Conduct a 15-minute formula recall drill before starting new lectures.`,
    time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  };

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([initialMessage]);
  const chatHistoryRef = useRef(chatHistory);
  useEffect(() => {
    chatHistoryRef.current = chatHistory;
  }, [chatHistory]);
  
  const [customInput, setCustomInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isLoading]);

  // Load and refresh chat sessions
  const refreshSessions = () => {
    const savedChatsStr = localStorage.getItem('jeeos_chats');
    if (savedChatsStr) {
      try {
        const savedChats: Record<string, ChatSession> = safelyParseJSON<Record<string, ChatSession>>(savedChatsStr, {});
        const sorted = Object.values(savedChats).sort((a, b) => b.updatedAt - a.updatedAt);
        setAllSessions(sorted);
        return savedChats;
      } catch (e) {
        console.error("Failed to parse chats", e);
      }
    }
    return {};
  };

  useEffect(() => {
    const savedChats = refreshSessions();
    const activeSession = localStorage.getItem('jeeos_active_chat_session');
    if (activeSession && savedChats[activeSession] && savedChats[activeSession].messages.length > 0) {
      setSessionId(activeSession);
      setChatHistory(savedChats[activeSession].messages);
    } else {
      setChatHistory([initialMessage]);
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      const pendingPrompt = sessionStorage.getItem('pendingCoachPrompt');
      if (pendingPrompt) {
        sessionStorage.removeItem('pendingCoachPrompt');
        setTimeout(() => {
          handleSendMessage(pendingPrompt);
        }, 300);
      }
    }
  }, [isActive]);

  const saveSession = (messages: ChatMessage[]) => {
    let currentId = sessionIdRef.current;
    if (!currentId) {
      currentId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      setSessionId(currentId);
      localStorage.setItem('jeeos_active_chat_session', currentId);
    }

    const savedChatsStr = localStorage.getItem('jeeos_chats');
    const savedChats: Record<string, ChatSession> = safelyParseJSON<Record<string, ChatSession>>(savedChatsStr, {});
    
    let title = savedChats[currentId]?.title;
    if (!title) {
      const firstUserMsg = messages.find(m => m.role === 'user');
      title = firstUserMsg ? (firstUserMsg.text.length > 34 ? firstUserMsg.text.substring(0, 34) + '...' : firstUserMsg.text) : 'Strategy Session';
    }

    savedChats[currentId] = {
      id: currentId,
      title,
      updatedAt: Date.now(),
      messages
    };

    const chatArray = Object.values(savedChats).sort((a, b) => a.updatedAt - b.updatedAt);
    if (chatArray.length > 30) {
      const capped = chatArray.slice(-30);
      for (const key in savedChats) delete savedChats[key];
      capped.forEach(c => savedChats[c.id] = c);
    }
    
    try {
      localStorage.setItem('jeeos_chats', JSON.stringify(savedChats));
    } catch (e) {
      console.warn('Failed to save chats to local storage', e);
    }
    refreshSessions();
  };

  const handleSelectSession = (id: string) => {
    const savedChats = refreshSessions();
    if (savedChats[id]) {
      setSessionId(id);
      localStorage.setItem('jeeos_active_chat_session', id);
      setChatHistory(savedChats[id].messages);
      setIsHistoryDrawerOpen(false);
    }
  };

  const handleNewChat = () => {
    setSessionId(null);
    localStorage.removeItem('jeeos_active_chat_session');
    setChatHistory([initialMessage]);
    setIsHistoryDrawerOpen(false);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const savedChatsStr = localStorage.getItem('jeeos_chats');
    if (savedChatsStr) {
      const savedChats: Record<string, ChatSession> = safelyParseJSON<Record<string, ChatSession>>(savedChatsStr, {});
      delete savedChats[id];
      const chatArray = Object.values(savedChats).sort((a, b) => a.updatedAt - b.updatedAt);
      if (chatArray.length > 30) {
        const capped = chatArray.slice(-30);
        for (const key in savedChats) delete savedChats[key];
        capped.forEach(c => savedChats[c.id] = c);
      }
      try {
        localStorage.setItem('jeeos_chats', JSON.stringify(savedChats));
      } catch (e) {
        console.warn('Failed to save chats to local storage', e);
      }
      refreshSessions();
      if (sessionId === id) {
        handleNewChat();
      }
    }
  };

  const handleCopyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgIdx(idx);
    setTimeout(() => setCopiedMsgIdx(null), 2000);
  };

  const handleApplyAction = async (msgIndex: number, actionIndex: number, action: any) => {
    try {
      switch (action.type) {
        case 'ADD_MISSION':
          await actions.addAiMission({
            chapter: action.payload.chapterId || action.payload.title,
            taskName: action.payload.title,
            type: 'Solve PYQs',
            subject: action.payload.subject || 'physics',
            duration: action.payload.duration || 60,
            xp: 25
          });
          break;
        case 'UPDATE_CHAPTER':
          if (action.payload.chapterId && action.payload.status) {
            await actions.updateChapterStatus(action.payload.chapterId, action.payload.status);
          }
          break;
        case 'UPDATE_TARGET':
          await actions.setSettings({
            ...settings,
            targetYear: action.payload.targetYear || settings.targetYear,
            dreamIit: action.payload.targetCollege || settings.dreamIit
          });
          break;
        case 'CLEAR_MISSIONS':
          await actions.clearTodayMissions();
          break;
      }
      
      const newHistory = [...chatHistoryRef.current];
      const msg = { ...newHistory[msgIndex] };
      msg.appliedActionIndices = [...(msg.appliedActionIndices || []), actionIndex];
      newHistory[msgIndex] = msg;

      const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const confMsg = { role: 'coach' as const, text: `Applied action: "${action.payload.title || action.type}" scheduled for today.`, time: timeStr };
      newHistory.push(confMsg);

      setChatHistory(newHistory);
      saveSession(newHistory);
    } catch (err) {
      console.error('Failed to apply AI action:', err);
    }
  };

  const presetSuggestions = [
    { icon: Sparkles, text: 'Analyze high-yield syllabus gaps' },
    { icon: Zap, text: 'Clear active backlog fast' },
    { icon: Target, text: 'Recommend 3 priorities for Physics' },
    { icon: Flame, text: 'Generate 3-day emergency revision drill' }
  ];

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const userMsg = { role: 'user' as const, text: messageText, time: timeStr };

    const newHistoryUser = [...chatHistoryRef.current, userMsg];
    setChatHistory(newHistoryUser);
    saveSession(newHistoryUser);
    
    setCustomInput('');
    setIsLoading(true);

    try {
      const coachEngine = new CoachEngine();
      const output = await coachEngine.getAnalysis({
        question: messageText,
        chapters: chapters.filter((c: any) => c.status !== 'Unstarted' || c.completion > 0).map((c: any) => ({
          name: c.name,
          progress: c.completion,
          status: c.status
        })) as any,
        weakTopics: mistakes.map((m: any) => ({
          topic: m.topicName,
          errorType: m.errorType,
          status: m.revisionStatus
        })) as any,
        mission: todayMissions.map((m: any) => ({ title: m.title, subject: m.subject, completed: m.completed })) as any,
        revisionQueue: chapters.filter((c: any) => c.status === 'Learning' || c.status === 'Theory Complete' || c.status === 'DPP Pending' || c.status === 'PYQ Pending').map((c: any) => c.name) as any,
        plannerDecisions: plannerOutput?.todaysMission || [],
        plannerOutput: undefined,
        targetYear: mentorProfile?.targetYear || settings.targetYear,
        targetCollege: mentorProfile?.targetCollege || settings.dreamIit,
        coachingType: mentorProfile?.coachingType,
        analyticsSummary: analyticsSummary || {
          totalStudyHours: 0,
          studyHoursPastWeek: [0,0,0,0,0,0,0],
          studyVelocity: 0,
          consistencyScore: 0,
          currentStreak: 0,
          subjectBalance: {
            physics: { studyHours: 0, completionPercentage: 0 },
            chemistry: { studyHours: 0, completionPercentage: 0 },
            maths: { studyHours: 0, completionPercentage: 0 }
          },
          overallLectureCompletion: 0,
          questionAccuracy: analytics.accuracy || 85,
          revisionHealth: 0,
          mockPerformance: { averageScore: 0, recentTrend: 0 },
          predictedCompletionDate: null
        }
      });

      const replyTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const newHistoryCoach = [...newHistoryUser, { role: 'coach' as const, text: output.analysis, time: replyTime, actions: output.actions }];
      setChatHistory(newHistoryCoach);
      saveSession(newHistoryCoach);
    } catch (err: any) {
      const replyTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const newHistoryCoach = [...newHistoryUser, { role: 'coach' as const, text: `AI Mentor was unable to complete the request: ${err.message || 'Please try again.'}`, time: replyTime }];
      setChatHistory(newHistoryCoach);
      saveSession(newHistoryCoach);
    } finally {
      setIsLoading(false);
    }
  };

  const isNewChat = chatHistory.length <= 1;

  return (
    <div className="w-full h-[calc(100vh-80px)] flex flex-col justify-between max-w-3xl mx-auto text-left font-sans select-none relative overflow-hidden pb-2 pt-1">
      
      {/* 1. CHAT MESSAGES STREAM (NATURAL CONTRAST, NO SCROLLBAR) */}
      <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <AnimatePresence mode="popLayout">
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
                      {/* Clean Markdown rendering (No raw * or #) */}
                      <MarkdownView content={msg.text} />

                      {/* Actionable Suggested Mission Cards */}
                      {msg.actions && msg.actions.length > 0 && (
                        <div className="mt-4 space-y-2 border-t border-zinc-800 pt-3.5">
                          <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase tracking-widest block mb-1">
                            Recommended Tactical Actions
                          </span>
                          {msg.actions.map((act, aIdx) => {
                            const isApplied = msg.appliedActionIndices?.includes(aIdx);
                            return (
                              <div 
                                key={aIdx} 
                                className={`p-3 rounded-2xl bg-zinc-950/90 border ${isApplied ? 'border-emerald-500/40' : 'border-zinc-800'} flex items-center justify-between gap-3 font-mono text-xs shadow-sm`}
                              >
                                <div>
                                  <span className={`text-[10px] uppercase font-bold block mb-0.5 ${isApplied ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                    {act.type.replace(/_/g, ' ')} {isApplied && '✓'}
                                  </span>
                                  <span className="text-white text-xs font-sans font-semibold block">
                                    {act.payload?.title || JSON.stringify(act.payload)}
                                  </span>
                                </div>
                                
                                <button
                                  onClick={() => handleApplyAction(idx, aIdx, act)}
                                  disabled={isApplied}
                                  className={`px-3 py-1.5 rounded-xl font-mono text-[10px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                                    isApplied 
                                      ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 cursor-default' 
                                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                                  }`}
                                >
                                  <Calendar className="w-3 h-3" />
                                  <span>{isApplied ? 'Applied' : 'Add to Plan'}</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Message Action Footer */}
                    <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs pl-1">
                      <button
                        onClick={() => handleCopyMessage(msg.text, idx)}
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

      {/* 2. NATURAL BOTTOM COMMAND BAR */}
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
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    transition={springs.snappy}
                    onClick={() => handleSendMessage(item.text)}
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
            handleSendMessage(customInput);
          }}
          className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 hover:border-zinc-700 focus-within:border-zinc-600 rounded-full px-5 py-2.5 shadow-2xl flex items-center gap-3 transition-all"
        >
          {/* New Chat Quick Button */}
          {!isNewChat && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={handleNewChat}
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
            onClick={() => setIsRevisionModalOpen(true)}
            className="p-2 rounded-full text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer hidden sm:block"
            title="Launch Revision Sprint"
          >
            <Zap className="w-4 h-4" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={() => {
              refreshSessions();
              setIsHistoryDrawerOpen(true);
            }}
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

      {/* 3. SLIDE-OUT SESSIONS HISTORY DRAWER */}
      <AnimatePresence>
        {isHistoryDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryDrawerOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={springs.fluid}
              className="w-full max-w-sm h-full bg-zinc-950/95 backdrop-blur-2xl border-l border-zinc-800 p-6 shadow-2xl relative z-10 flex flex-col justify-between"
            >
              <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-base font-bold text-white font-display">Session History</h3>
                  </div>
                  <button
                    onClick={() => setIsHistoryDrawerOpen(false)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNewChat}
                  className="w-full py-2.5 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-white font-mono text-xs font-bold flex items-center justify-between shadow-lg"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-indigo-400" />
                    <span>New Strategy Session</span>
                  </div>
                  <span className="text-[10px] text-zinc-400">⌘N</span>
                </motion.button>

                {/* Sessions List */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pt-2 pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {allSessions.length === 0 ? (
                    <p className="text-xs text-zinc-500 font-mono py-4 text-center">
                      No saved strategy sessions yet.
                    </p>
                  ) : (
                    allSessions.map(sess => {
                      const isSelected = sessionId === sess.id;
                      return (
                        <motion.div
                          key={sess.id}
                          whileHover={{ scale: 1.01 }}
                          onClick={() => handleSelectSession(sess.id)}
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
                            onClick={(e) => handleDeleteSession(sess.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-opacity"
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
      </AnimatePresence>

      <AiRevisionPlanModal 
        isOpen={isRevisionModalOpen}
        onClose={() => setIsRevisionModalOpen(false)}
      />

    </div>
  );
}
