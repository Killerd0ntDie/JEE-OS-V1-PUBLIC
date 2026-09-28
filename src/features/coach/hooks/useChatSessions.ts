import { useState, useEffect, useRef } from 'react';
import { CoachAction } from '@jee-os/engines';
import { storageAdapter } from '@/services/StorageAdapter';
import { loadSavedChats, getCachedChats, persistSavedChats } from '../services/chatStorage';

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
    return storageAdapter.getItem<string>('jeeos_active_chat_session') || null;
  });

  const [allSessions, setAllSessions] = useState<ChatSession[]>(() => {
    const savedChats = getCachedChats();
    return Object.values(savedChats).sort((a, b) => b.updatedAt - a.updatedAt);
  });

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    const savedChats = getCachedChats();
    const activeSession = storageAdapter.getItem<string>('jeeos_active_chat_session');
    if (activeSession && savedChats[activeSession]?.messages?.length > 0) {
      return savedChats[activeSession].messages;
    }
    return [initialMessage];
  });
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Asynchronously synchronize from Tier 2 IndexedDB on initial mount
  useEffect(() => {
    let isMounted = true;
    loadSavedChats().then((savedChats) => {
      if (!isMounted) return;
      const sorted = Object.values(savedChats).sort((a, b) => b.updatedAt - a.updatedAt);
      setAllSessions(sorted);
      const activeSession = storageAdapter.getItem<string>('jeeos_active_chat_session');
      if (activeSession && savedChats[activeSession]?.messages?.length > 0) {
        setChatHistory(savedChats[activeSession].messages);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const refreshSessions = (): Record<string, ChatSession> => {
    const savedChats = getCachedChats();
    const sorted = Object.values(savedChats).sort((a, b) => b.updatedAt - a.updatedAt);
    setAllSessions(sorted);
    return savedChats;
  };

  const saveSession = (messages: ChatMessage[]) => {
    let currentId = sessionIdRef.current;
    if (!currentId) {
      currentId = `chat_${Date.now()}`;
      setSessionId(currentId);
      storageAdapter.setItem('jeeos_active_chat_session', currentId);
    }

    const savedChats = { ...getCachedChats() };
    
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
    
    persistSavedChats(savedChats);
    refreshSessions();
  };

  const handleSelectSession = (id: string, callback?: () => void) => {
    const savedChats = refreshSessions();
    if (savedChats[id]) {
      setSessionId(id);
      storageAdapter.setItem('jeeos_active_chat_session', id);
      setChatHistory(savedChats[id].messages);
      if (callback) callback();
    }
  };

  const handleNewChat = (callback?: () => void) => {
    setSessionId(null);
    storageAdapter.removeItem('jeeos_active_chat_session');
    setChatHistory([initialMessage]);
    if (callback) callback();
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const savedChats = { ...getCachedChats() };
    delete savedChats[id];
    const chatArray = Object.values(savedChats).sort((a, b) => a.updatedAt - b.updatedAt);
    if (chatArray.length > 30) {
      const capped = chatArray.slice(-30);
      for (const key in savedChats) delete savedChats[key];
      capped.forEach(c => savedChats[c.id] = c);
    }
    persistSavedChats(savedChats);
    
    if (sessionIdRef.current === id) {
      handleNewChat();
    } else {
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
