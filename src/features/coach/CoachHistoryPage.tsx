import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/ui/Icon';
import { ChatSession } from './AiCoachPage';
import { PageId } from '../../types';
import { ConfirmDeleteModal } from '../../components/ui/ConfirmDeleteModal';

export function CoachHistoryPage({ onNavigate }: { onNavigate?: (id: PageId) => void }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    const savedChatsStr = localStorage.getItem('jeeos_chats');
    if (savedChatsStr) {
      try {
        const savedChats: Record<string, ChatSession> = JSON.parse(savedChatsStr);
        // Sort by updatedAt descending
        const sortedSessions = Object.values(savedChats).sort((a, b) => b.updatedAt - a.updatedAt);
        setSessions(sortedSessions);
      } catch (e) {
        console.error("Failed to parse chats", e);
      }
    }
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const savedChatsStr = localStorage.getItem('jeeos_chats');
    if (savedChatsStr) {
      const savedChats: Record<string, ChatSession> = JSON.parse(savedChatsStr);
      delete savedChats[id];
      localStorage.setItem('jeeos_chats', JSON.stringify(savedChats));
      setSessions(prev => prev.filter(s => s.id !== id));
      
      if (localStorage.getItem('jeeos_active_chat_session') === id) {
        localStorage.removeItem('jeeos_active_chat_session');
      }
    }
  };

  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);

  const handleClearAll = () => {
    localStorage.removeItem('jeeos_chats');
    localStorage.removeItem('jeeos_active_chat_session');
    setSessions([]);
    setIsClearAllModalOpen(false);
  };

  const handleResumeChat = (id: string) => {
    localStorage.setItem('jeeos_active_chat_session', id);
    onNavigate?.('ai-coach');
  };

  const handleNewChat = () => {
    localStorage.removeItem('jeeos_active_chat_session');
    onNavigate?.('ai-coach');
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto text-left relative pb-12 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-850/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-[10px] uppercase font-bold tracking-widest">
            <Icon name="History" className="w-3.5 h-3.5" />
            <span>AI Mentor & Strategic Command Console</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight">
            Chat History
          </h1>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            Review your past mentorship sessions, tactical briefings, and strategic advice.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sessions.length > 0 && (
            <button 
              onClick={() => setIsClearAllModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors font-mono text-[10px] uppercase font-bold"
            >
              <Icon name="Trash" className="w-3.5 h-3.5" />
              Clear All
            </button>
          )}
          <button 
            onClick={handleNewChat}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl hover:bg-indigo-500/20 transition-colors font-mono text-[10px] uppercase font-bold"
          >
            <Icon name="Plus" className="w-3.5 h-3.5" />
            New Chat
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {sessions.length === 0 ? (
          <div className="text-center py-16 border border-zinc-800 border-dashed rounded-2xl bg-zinc-900/30">
            <Icon name="MessageSquare" className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm font-mono text-zinc-400">No previous chat sessions found.</p>
          </div>
        ) : (
          sessions.map(session => (
            <div 
              key={session.id}
              onClick={() => handleResumeChat(session.id)}
              className="group flex items-center justify-between p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-indigo-500/30 hover:bg-zinc-800/50 transition-all cursor-pointer"
            >
              <div className="space-y-1 overflow-hidden">
                <h3 className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                  {session.title}
                </h3>
                <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Icon name="Calendar" className="w-3 h-3" />
                    {new Date(session.updatedAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="Clock" className="w-3 h-3" />
                    {new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Icon name="MessageSquare" className="w-3 h-3" />
                    {session.messages.length} messages
                  </span>
                </div>
              </div>
              <button 
                onClick={(e) => handleDelete(session.id, e)}
                className="opacity-0 group-hover:opacity-100 p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
              >
                <Icon name="Trash" className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
      {/* Clear All Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isClearAllModalOpen}
        title="Delete All AI Chat History?"
        message="Are you sure you want to delete all saved conversations with your AI Mentor? This action cannot be undone."
        confirmLabel="Delete History"
        onConfirm={handleClearAll}
        onClose={() => setIsClearAllModalOpen(false)}
      />
    </div>
  );
}
