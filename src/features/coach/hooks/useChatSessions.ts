import { useState, useEffect, useRef } from 'react';
import { safelyParseJSON } from '@/utils/jsonParser';
import { CoachAction } from '@jee-os/engines';

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

export function useChatSessions(initialMessage: ChatMessage) {
  const [sessionId, setSessionId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('jeeos_active_chat_session') || null;
    } catch {
      return null;
    }
  });

  const [allSessions, setAllSessions] = useState<ChatSession[]>(() => {
    try {
      const savedChatsStr = localStorage.getItem('jeeos_chats');
      if (savedChatsStr) {
        const savedChats = safelyParseJSON<Record<string, ChatSession>>(savedChatsStr, {});
        return Object.values(savedChats).sort((a, b) => b.updatedAt - a.updatedAt);
      }
    } catch {}
    return [];
  });

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    try {
      const savedChatsStr = localStorage.getItem('jeeos_chats');
      const activeSession = localStorage.getItem('jeeos_active_chat_session');
      if (savedChatsStr && activeSession) {
        const savedChats = safelyParseJSON<Record<string, ChatSession>>(savedChatsStr, {});
        if (savedChats[activeSession] && savedChats[activeSession].messages?.length > 0) {
          return savedChats[activeSession].messages;
        }
      }
    } catch {}
    return [initialMessage];
  });
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const refreshSessions = () => {
    const savedChatsStr = localStorage.getItem('jeeos_chats');
    if (savedChatsStr) {
      try {
        const savedChats = safelyParseJSON<Record<string, ChatSession>>(savedChatsStr, {});
        const sorted = Object.values(savedChats).sort((a, b) => b.updatedAt - a.updatedAt);
        setAllSessions(sorted);
        return savedChats;
      } catch (e) {
        console.error("Failed to parse chats", e);
      }
    }
    return {};
  };

  const saveSession = (messages: ChatMessage[]) => {
    let currentId = sessionIdRef.current;
    if (!currentId) {
      currentId = `chat_${Date.now()}`;
      setSessionId(currentId);
      localStorage.setItem('jeeos_active_chat_session', currentId);
    }

    const savedChatsStr = localStorage.getItem('jeeos_chats');
    const savedChats = safelyParseJSON<Record<string, ChatSession>>(savedChatsStr, {});
    
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

  const handleSelectSession = (id: string, callback?: () => void) => {
    const savedChats = refreshSessions();
    if (savedChats[id]) {
      setSessionId(id);
      localStorage.setItem('jeeos_active_chat_session', id);
      setChatHistory(savedChats[id].messages);
      if (callback) callback();
    }
  };

  const handleNewChat = (callback?: () => void) => {
    setSessionId(null);
    localStorage.removeItem('jeeos_active_chat_session');
    setChatHistory([initialMessage]);
    if (callback) callback();
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const savedChatsStr = localStorage.getItem('jeeos_chats');
    if (savedChatsStr) {
      const savedChats = safelyParseJSON<Record<string, ChatSession>>(savedChatsStr, {});
      delete savedChats[id];
      const chatArray = Object.values(savedChats).sort((a, b) => a.updatedAt - b.updatedAt);
      if (chatArray.length > 30) {
        const capped = chatArray.slice(-30);
        for (const key in savedChats) delete savedChats[key];
        capped.forEach(c => savedChats[c.id] = c);
      }
      try {
        localStorage.setItem('jeeos_chats', JSON.stringify(savedChats));
      } catch (e) {}
      
      if (sessionIdRef.current === id) {
        handleNewChat();
      }
      refreshSessions();
    }
  };

  return {
    chatHistory,
    setChatHistory,
    allSessions,
    sessionId,
    saveSession,
    handleSelectSession,
    handleNewChat,
    handleDeleteSession,
    refreshSessions
  };
}
