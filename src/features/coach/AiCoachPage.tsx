import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { CoachEngine, CoachAction } from '@jee-os/engines';
import { AiRevisionPlanModal } from '@/components/shared/AiRevisionPlanModal';
import { useChatSessions, ChatMessage } from './hooks/useChatSessions';
import { CoachVitalsSidebar } from './components/CoachVitalsSidebar';
import { CoachChatStream } from './components/CoachChatStream';
import { CoachPromptBar } from './components/CoachPromptBar';
import { CoachSessionHistoryDrawer } from './components/CoachSessionHistoryDrawer';
import { Bot, Activity } from 'lucide-react';
import { storageAdapter } from '@/services/StorageAdapter';

export function AiCoachPage({ isActive }: { isActive?: boolean }) {
  const actions = useStudyBrainStore(state => state.actions);
  const settings = useStudyBrainStore(state => state.settings);
  const chapters = useStudyBrainStore(state => state.chapters);
  const mistakes = useStudyBrainStore(state => state.mistakes);
  const todayMissions = useStudyBrainStore(state => state.todayMissions) || [];
  const plannerOutput = useStudyBrainStore(state => state.plannerOutput);
  const mentorProfile = useStudyBrainStore(state => state.mentorProfile);
  const analyticsSummary = useStudyBrainStore(state => state.analyticsSummary);
  const analytics = useStudyBrainStore(state => state.analytics);
  const revisionTelemetry = useStudyBrainStore(state => state.revisionTelemetry);

  const [mobileActiveTab, setMobileActiveTab] = useState<'chat' | 'vitals'>('chat');
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const initialMessage: ChatMessage = useMemo(() => ({
    role: 'coach',
    text: `### Tactical Syllabus Strategy\n\n• **Immediate Priority:** Focus on your active in-flight modules and solve 15 high-yield PYQs.\n• **Backlog Resolution:** Use the 70/30 split rule (70% scheduled missions, 30% backlog clearance).\n• **Memory Retention:** Conduct a 15-minute formula recall drill before starting new lectures.`,
    time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }), []);

  const {
    chatHistory,
    setChatHistory,
    allSessions,
    sessionId,
    saveSession,
    handleSelectSession,
    handleNewChat,
    handleDeleteSession,
    refreshSessions
  } = useChatSessions(initialMessage);

  const chatHistoryRef = useRef(chatHistory);
  useEffect(() => {
    chatHistoryRef.current = chatHistory;
  }, [chatHistory]);

  // Read pending coach prompts when navigated with intent
  useEffect(() => {
    if (isActive) {
      const pendingPrompt = storageAdapter.getSession<string>('jeeos_pending_coach_prompt');
      if (pendingPrompt) {
        storageAdapter.removeSession('jeeos_pending_coach_prompt');
        setTimeout(() => {
          handleSendMessage(pendingPrompt);
        }, 300);
      }
    }
  }, [isActive]);

  const handleCopyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgIdx(idx);
    setTimeout(() => setCopiedMsgIdx(null), 2000);
  };

  const handleApplyAction = async (msgIndex: number, actionIndex: number, action: CoachAction) => {
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
      const confMsg: ChatMessage = { 
        role: 'coach', 
        text: `Applied action: "${action.payload.title || action.type}" scheduled for today.`, 
        time: timeStr 
      };
      newHistory.push(confMsg);

      setChatHistory(newHistory);
      saveSession(newHistory);
    } catch (err) {
      console.error('Failed to apply AI action:', err);
    }
  };

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const userMsg: ChatMessage = { role: 'user', text: messageText, time: timeStr };

    const newHistoryUser = [...chatHistoryRef.current, userMsg];
    setChatHistory(newHistoryUser);
    saveSession(newHistoryUser);
    
    setCustomInput('');
    setIsLoading(true);

    try {
      const coachEngine = new CoachEngine();
      const output = await coachEngine.getAnalysis({
        question: messageText,
        chapters: chapters.filter(c => c.status !== 'Not Started' || c.completion > 0),
        weakTopics: mistakes,
        mission: todayMissions,
        revisionQueue: chapters.filter(c => c.status === 'Learning' || c.status === 'Theory Complete' || c.status === 'DPP Pending' || c.status === 'PYQ Pending'),
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
          questionAccuracy: analytics?.accuracy || 85,
          revisionHealth: 0,
          mockPerformance: { averageScore: 0, recentTrend: 0 },
          predictedCompletionDate: null
        }
      });

      const replyTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const newHistoryCoach: ChatMessage[] = [
        ...newHistoryUser, 
        { role: 'coach', text: output.analysis, time: replyTime, actions: output.actions }
      ];
      setChatHistory(newHistoryCoach);
      saveSession(newHistoryCoach);
    } catch (err: any) {
      const replyTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const newHistoryCoach: ChatMessage[] = [
        ...newHistoryUser, 
        { role: 'coach', text: `AI Mentor was unable to complete the request: ${err.message || 'Please try again.'}`, time: replyTime }
      ];
      setChatHistory(newHistoryCoach);
      saveSession(newHistoryCoach);
    } finally {
      setIsLoading(false);
    }
  };

  const isNewChat = chatHistory.length <= 1;
  const overdueChapters = revisionTelemetry?.overdueChapters || [];
  const unresolvedMistakes = mistakes.filter(m => m.revisionStatus !== 'Mastered');

  return (
    <div className="w-full h-full max-w-7xl mx-auto text-left font-sans select-none relative overflow-hidden p-0 flex flex-col">
      
      {/* Mobile Tab Switcher (Chat vs Vitals) */}
      <div className="flex lg:hidden items-center justify-center gap-2 pb-2 px-3 shrink-0">
        <button
          type="button"
          onClick={() => setMobileActiveTab('chat')}
          className={`flex-1 py-2 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
            mobileActiveTab === 'chat'
              ? 'bg-indigo-600/30 border-indigo-500/50 text-white'
              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Strategic Mentor</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileActiveTab('vitals')}
          className={`flex-1 py-2 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
            mobileActiveTab === 'vitals'
              ? 'bg-indigo-600/30 border-indigo-500/50 text-white'
              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Candidate Vitals</span>
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 px-1 sm:px-2 pt-0 h-full">
        
        {/* LEFT COLUMN: Candidate Vitals Sidebar (4 Cols on Desktop) */}
        <div className={`lg:col-span-4 h-full overflow-hidden ${
          mobileActiveTab === 'vitals' ? 'block' : 'hidden lg:block'
        }`}>
          <CoachVitalsSidebar
            targetCollege={settings.dreamIit}
            targetYear={settings.targetYear}
            targetBranch={settings.targetBranch}
            accuracy={analytics?.accuracy || 85}
            mockAverageScore={analyticsSummary?.mockPerformance?.averageScore || 0}
            mockTrend={analyticsSummary?.mockPerformance?.recentTrend || 0}
            overdueChapters={overdueChapters}
            unresolvedMistakes={unresolvedMistakes}
            onSelectPrompt={(prompt) => {
              if (mobileActiveTab === 'vitals') setMobileActiveTab('chat');
              handleSendMessage(prompt);
            }}
          />
        </div>

        {/* RIGHT COLUMN: Conversational Mentor Studio (8 Cols on Desktop) */}
        <div className={`lg:col-span-8 h-full flex flex-col justify-between overflow-hidden ${
          mobileActiveTab === 'chat' ? 'flex' : 'hidden lg:flex'
        }`}>
          
          {/* Chat Stream */}
          <CoachChatStream
            chatHistory={chatHistory}
            sessionId={sessionId}
            isLoading={isLoading}
            copiedMsgIdx={copiedMsgIdx}
            onCopyMessage={handleCopyMessage}
            onApplyAction={handleApplyAction}
          />

          {/* Bottom Command & Prompt Bar */}
          <CoachPromptBar
            customInput={customInput}
            setCustomInput={setCustomInput}
            onSubmit={handleSendMessage}
            isLoading={isLoading}
            isNewChat={isNewChat}
            onNewChat={() => handleNewChat(() => setIsHistoryDrawerOpen(false))}
            onOpenRevisionModal={() => setIsRevisionModalOpen(true)}
            onOpenHistoryDrawer={() => {
              refreshSessions();
              setIsHistoryDrawerOpen(true);
            }}
          />

        </div>

      </div>

      {/* Slide-out Session History Drawer */}
      <CoachSessionHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        sessionId={sessionId}
        allSessions={allSessions}
        onClose={() => setIsHistoryDrawerOpen(false)}
        onNewChat={() => handleNewChat(() => setIsHistoryDrawerOpen(false))}
        onSelectSession={(id) => handleSelectSession(id, () => setIsHistoryDrawerOpen(false))}
        onDeleteSession={handleDeleteSession}
      />

      {/* AI Revision Plan Modal */}
      <AiRevisionPlanModal 
        isOpen={isRevisionModalOpen}
        onClose={() => setIsRevisionModalOpen(false)}
      />

    </div>
  );
}
