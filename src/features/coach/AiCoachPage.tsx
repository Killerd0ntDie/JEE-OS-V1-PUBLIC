import React, { useState, useEffect, useRef } from 'react';
import { useStudyBrain } from '../../context/StudyBrainContext';
import { Icon } from '../../components/ui/Icon';
import { Badge } from '../../components/ui/Badge';
import { ChapterTelemetry } from '../../engines/chapterInfo';
import { CoachEngine } from '../../engines/coach';
import { CoachAction } from '../../engines/coach/types';
import { PageId } from '../../types';
import { AiRevisionPlanModal } from '../../components/shared/AiRevisionPlanModal';

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

export function AiCoachPage({ onNavigate, isActive }: { onNavigate?: (id: PageId) => void, isActive?: boolean }) {
  const { state, actions } = useStudyBrain();
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);

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
            xp: 15
          });
          break;
        case 'UPDATE_CHAPTER':
          if (action.payload.chapterId && action.payload.status) {
            await actions.updateChapterStatus(action.payload.chapterId, action.payload.status);
          }
          break;
        case 'UPDATE_TARGET':
          await actions.setSettings({
            ...state.settings,
            targetYear: action.payload.targetYear || state.settings.targetYear,
            dreamIit: action.payload.targetCollege || state.settings.dreamIit
          });
          break;
        case 'CLEAR_MISSIONS':
          await actions.clearTodayMissions();
          break;
      }
      
      const newHistory = [...chatHistory];
      const msg = { ...newHistory[msgIndex] };
      msg.appliedActionIndices = [...(msg.appliedActionIndices || []), actionIndex];
      newHistory[msgIndex] = msg;

      // Add a system confirmation message
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const confMsg = { role: 'coach' as const, text: `System: Applied action "${action.type}" successfully.`, time: timeStr };
      newHistory.push(confMsg);

      setChatHistory(newHistory);
      saveSession(newHistory);
    } catch (err) {
      console.error('Failed to apply AI action:', err);
    }
  };

  const renderActionPayload = (type: string, payload: any) => {
    if (type === 'ADD_MISSION') {
      return <span className="text-xs text-zinc-200"><span className="text-indigo-400 font-semibold">{payload.subject}:</span> {payload.title} ({payload.duration}m)</span>;
    }
    if (type === 'UPDATE_CHAPTER') {
      return <span className="text-xs text-zinc-200">Set <span className="text-emerald-400">"{payload.chapterId}"</span> to {payload.status}</span>;
    }
    if (type === 'UPDATE_TARGET') {
      return <span className="text-xs text-zinc-200">Target Year: {payload.targetYear}, College: {payload.targetCollege}</span>;
    }
    if (type === 'CLEAR_MISSIONS') {
      return <span className="text-xs text-zinc-200 text-red-400">Clear all missions for today</span>;
    }
    return <span className="text-xs text-zinc-200">{JSON.stringify(payload)}</span>;
  };
  
  const initialMessage: ChatMessage = {
    role: 'coach',
    text: `Hello Aspirant! I am your dedicated AI Prep Coach for JEE ${state.settings.targetYear}. I have analyzed your 70-chapter telemetry and current daily missions. Ask me anything or select a preset prompt below to begin.`,
    time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  };

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([initialMessage]);
  const [customInput, setCustomInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isLoading]);

  // Load chat session on mount
  useEffect(() => {
    const activeSession = localStorage.getItem('jeeos_active_chat_session');
    if (activeSession) {
      setSessionId(activeSession);
      const savedChatsStr = localStorage.getItem('jeeos_chats');
      if (savedChatsStr) {
        try {
          const savedChats: Record<string, ChatSession> = JSON.parse(savedChatsStr);
          if (savedChats[activeSession] && savedChats[activeSession].messages.length > 0) {
            setChatHistory(savedChats[activeSession].messages);
            return;
          }
        } catch (e) {
          console.error("Failed to parse chats", e);
        }
      }
    }
    setChatHistory([initialMessage]);
  }, []);

  useEffect(() => {
    if (isActive) {
      const pendingPrompt = sessionStorage.getItem('pendingCoachPrompt');
      if (pendingPrompt) {
        sessionStorage.removeItem('pendingCoachPrompt');
        // We must wait for state to settle before sending
        setTimeout(() => {
          handleSendMessage(pendingPrompt);
        }, 500);
      }
    }
  }, [isActive]);

  const saveSession = (messages: ChatMessage[]) => {
    let currentId = sessionId;
    if (!currentId) {
      currentId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      setSessionId(currentId);
      localStorage.setItem('jeeos_active_chat_session', currentId);
    }

    const savedChatsStr = localStorage.getItem('jeeos_chats');
    const savedChats: Record<string, ChatSession> = savedChatsStr ? JSON.parse(savedChatsStr) : {};
    
    // Generate a title based on the first user message if it doesn't exist
    let title = savedChats[currentId]?.title;
    if (!title) {
      const firstUserMsg = messages.find(m => m.role === 'user');
      title = firstUserMsg ? (firstUserMsg.text.length > 40 ? firstUserMsg.text.substring(0, 40) + '...' : firstUserMsg.text) : 'New Chat Session';
    }

    savedChats[currentId] = {
      id: currentId,
      title,
      updatedAt: Date.now(),
      messages
    };

    localStorage.setItem('jeeos_chats', JSON.stringify(savedChats));
  };

  // Telemetry summaries
  const telemetryList = (Object.values(state.chapterTelemetryMap || {}) as ChapterTelemetry[]);
  const bottleneckChaps = telemetryList.filter(t => t.isBottleneck);
  const lowRetentionChaps = telemetryList.filter(t => t.retentionConfidence === 'Low');
  const todayMissions = state.todayMissions || [];
  const pendingMissions = todayMissions.filter(m => !m.completed);

  const presetPrompts = [
    'How to resolve my current Chemistry backlog?',
    'Analyze my Physics weak spots and recommend 3 priorities',
    'Generate a 3-day emergency revision plan for Maths',
    'What is my predicted JEE readiness score?'
  ];

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const userMsg = { role: 'user' as const, text: messageText, time: timeStr };

    const newHistoryUser = [...chatHistory, userMsg];
    setChatHistory(newHistoryUser);
    saveSession(newHistoryUser);
    
    setCustomInput('');
    setIsLoading(true);

    try {
      const coachEngine = new CoachEngine();
      const output = await coachEngine.getAnalysis({
        question: messageText,
        chapters: state.chapters,
        weakTopics: state.mistakes,
        mission: state.todayMissions,
        revisionQueue: state.chapters.filter((c: any) => c.status === 'Learning' || c.status === 'Theory Complete' || c.status === 'DPP Pending' || c.status === 'PYQ Pending'),
        // BUGFIX: PlannerOutput has no `.phases` field, so this was always `[]` and, because
        // an empty array is truthy in JS, it silently discarded the real scheduled tasks.
        // The real field is `todaysMission`.
        plannerDecisions: state.plannerOutput?.todaysMission || [],
        plannerOutput: state.plannerOutput || undefined,
        // BUGFIX: targetYear/targetCollege must come from the student's actual settings,
        // not from PlannerOutput (which never had these fields — they were always undefined,
        // silently defaulting to hardcoded '2026' / 'IIT Bombay').
        targetYear: state.mentorProfile?.targetYear || state.settings.targetYear,
        targetCollege: state.mentorProfile?.targetCollege || state.settings.dreamIit,
        coachingType: state.mentorProfile?.coachingType,
        analyticsSummary: state.analyticsSummary || {
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
          questionAccuracy: state.analytics.accuracy || 85,
          revisionHealth: 0,
          mockPerformance: { averageScore: 0, recentTrend: 0 },
          predictedCompletionDate: null
        }
      });

      const replyTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const newHistoryCoach = [...newHistoryUser, { role: 'coach' as const, text: output.analysis, time: replyTime, actions: output.actions }];
      setChatHistory(newHistoryCoach);
      saveSession(newHistoryCoach);
    } catch (err) {
      const replyTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const newHistoryCoach = [...newHistoryUser, { role: 'coach' as const, text: `AI Coach: Models synchronized. Target vector set for ${state.settings.dreamIit}. Maintain focus!`, time: replyTime }];
      setChatHistory(newHistoryCoach);
      saveSession(newHistoryCoach);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto text-left relative pb-12 font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-850/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-[10px] uppercase font-bold tracking-widest">
            <Icon name="Bot" className="w-3.5 h-3.5" />
            <span>AI Mentor & Strategic Command Console</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight">
            AI Prep Coach Console
          </h1>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            Real-time tactical intelligence powered by <strong className="text-zinc-200">CoachEngine</strong>. Receive personalized daily briefings, backlog resolution advice, and emergency revision strategies.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* Goal Badge */}
          <div className="flex items-center gap-2 bg-indigo-950/40 border border-indigo-900/60 text-indigo-300 text-xs font-mono px-3.5 py-2 rounded-2xl shrink-0">
            <Icon name="Target" className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span>{state.settings.dreamIit} • {state.settings.targetBranch}</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsRevisionModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-colors font-mono text-[10px] uppercase font-bold cursor-pointer"
            >
              <Icon name="Sparkles" className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              AI Revision Sprint
            </button>
            <button 
              onClick={() => onNavigate?.('coach-history')}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-800 transition-colors font-mono text-[10px] uppercase font-bold"
            >
              <Icon name="History" className="w-3.5 h-3.5" />
              Previous Chats
            </button>
            <button 
              onClick={() => {
                setSessionId(null);
                localStorage.removeItem('jeeos_active_chat_session');
                setChatHistory([initialMessage]);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl hover:bg-indigo-500/20 transition-colors font-mono text-[10px] uppercase font-bold"
            >
              <Icon name="Plus" className="w-3.5 h-3.5" />
              New Chat
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CHAT CONSOLE (Centered & Prominent) */}
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* Collapsible Telemetry Profile */}
        <details className="group bg-zinc-950/60 border border-zinc-850/80 rounded-2xl shadow-sm open:pb-5">
          <summary className="flex items-center justify-between p-4 cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <Icon name="Activity" className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-xs font-mono font-bold uppercase text-white tracking-wider group-open:text-indigo-400 transition-colors">
                View Live Coach Briefing & Telemetry
              </span>
            </div>
            <Icon name="ChevronDown" className="w-4 h-4 text-zinc-500 group-open:rotate-180 transition-transform" />
          </summary>
          
          <div className="px-5 space-y-4 text-left pt-2 border-t border-zinc-900/50 mt-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-zinc-500 font-mono uppercase">System Status</span>
              <Badge variant="secondary" className="text-[9px] font-mono bg-emerald-950/40 text-emerald-400 border-emerald-800/60">
                ACTIVE
              </Badge>
            </div>

            {/* Coach Message Summary */}
            <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-900/30 text-xs text-indigo-200 leading-relaxed font-sans space-y-2">
              <p className="font-semibold text-indigo-300">📢 Today's Strategy Overview:</p>
              <p className="text-zinc-300 text-xs">{state.coachMessage || 'Focus on completing your allocated daily missions and resolving active backlog chapters.'}</p>
            </div>

            {/* Tactical Telemetry Metrics */}
            <div className="space-y-2.5 font-mono text-xs pt-1 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex flex-col p-3 rounded-xl bg-zinc-900/40 border border-zinc-850">
                <span className="text-zinc-400 mb-1">Pending Missions</span>
                <span className="font-bold text-amber-400 text-lg">{pendingMissions.length} <span className="text-xs font-normal">Tasks</span></span>
              </div>
              <div className="flex flex-col p-3 rounded-xl bg-zinc-900/40 border border-zinc-850">
                <span className="text-zinc-400 mb-1">Syllabus Bottlenecks</span>
                <span className="font-bold text-red-400 text-lg">{bottleneckChaps.length} <span className="text-xs font-normal">Chapters</span></span>
              </div>
              <div className="flex flex-col p-3 rounded-xl bg-zinc-900/40 border border-zinc-850">
                <span className="text-zinc-400 mb-1">Overdue Retention</span>
                <span className="font-bold text-red-400 text-lg">{lowRetentionChaps.length} <span className="text-xs font-normal">Chapters</span></span>
              </div>
            </div>
          </div>
        </details>

        {/* INTERACTIVE AI CHAT CONSOLE */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-5 md:p-8 flex flex-col justify-between h-[600px] shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
          
          {/* Chat Messages Log */}
          <div className="overflow-y-auto scrollbar space-y-3 pr-2 flex-1 relative z-10">
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-md font-sans'
                      : 'bg-zinc-900/90 border border-zinc-800 text-zinc-200 rounded-bl-none font-sans'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <span className="text-[9px] font-mono opacity-60 block text-right pt-1">
                    {msg.time}
                  </span>
                  
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-zinc-700/50 pt-3">
                      <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase tracking-widest block mb-1">
                        Suggested Actions
                      </span>
                      {msg.actions.map((act, aIdx) => {
                        const isApplied = msg.appliedActionIndices?.includes(aIdx);
                        return (
                          <div key={aIdx} className={`bg-zinc-950/50 border ${isApplied ? 'border-emerald-800/40 opacity-70' : 'border-zinc-800/80'} rounded-xl p-3`}>
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <span className={`text-[10px] font-mono block mb-0.5 ${isApplied ? 'text-emerald-500' : 'text-zinc-400'}`}>
                                  {act.type.replace(/_/g, ' ')} {isApplied && '✓'}
                                </span>
                                {renderActionPayload(act.type, act.payload)}
                              </div>
                              <button
                                onClick={() => handleApplyAction(idx, aIdx, act)}
                                disabled={isApplied}
                                className={`${isApplied ? 'bg-zinc-800 text-zinc-500 border border-zinc-700/50' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'} font-mono text-[10px] font-bold px-4 py-1.5 rounded-lg shrink-0 transition-colors`}
                              >
                                {isApplied ? 'APPLIED' : 'APPLY'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start">
                <div className="bg-zinc-900/90 border border-zinc-800 p-3 rounded-2xl rounded-bl-none text-xs text-indigo-400 font-mono animate-pulse flex items-center gap-2">
                  <Icon name="Bot" className="w-3.5 h-3.5 animate-spin" />
                  <span>AI Coach is evaluating telemetry...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Preset Prompt Pills + Chat Input Form */}
          <div className="space-y-3 pt-3 border-t border-zinc-900 relative z-10">
            {/* Preset Pills */}
            <div className="flex flex-wrap gap-1.5">
              {presetPrompts.map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => handleSendMessage(prompt)}
                  className="text-[10px] font-mono text-indigo-300 bg-indigo-950/30 hover:bg-indigo-950/60 border border-indigo-900/40 px-2.5 py-1 rounded-xl transition-all cursor-pointer truncate max-w-xs"
                >
                  💡 {prompt}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(customInput);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Ask AI Coach a question..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500 font-sans"
              />
              <button
                type="submit"
                disabled={!customInput.trim() || isLoading}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-mono text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 shrink-0"
              >
                <span>Send</span>
                <Icon name="Send" className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

        </div>

      </div>

      <AiRevisionPlanModal 
        isOpen={isRevisionModalOpen}
        onClose={() => setIsRevisionModalOpen(false)}
      />

    </div>
  );
}
