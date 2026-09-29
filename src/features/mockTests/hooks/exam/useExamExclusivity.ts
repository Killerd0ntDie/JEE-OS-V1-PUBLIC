import { useState, useEffect, useRef } from 'react';
import { MockTestAttempt } from '../../../../types/mockTest';
import { storageAdapter } from '@/services/StorageAdapter';

export interface UseExamExclusivityProps {
  userId: string;
  testId: string;
  attempt: MockTestAttempt;
  isExamStarted: boolean;
  isSubmitting: boolean;
  setIsConfirmExitOpen: (open: boolean) => void;
}

export function useExamExclusivity({
  userId,
  testId,
  attempt,
  isExamStarted,
  isSubmitting,
  setIsConfirmExitOpen
}: UseExamExclusivityProps) {
  const [isDuplicateTab, setIsDuplicateTab] = useState(false);
  const tabIdRef = useRef<string>(Math.random().toString(36).substring(2) + '_' + Date.now());

  // Back-button navigation hijack prevention
  useEffect(() => {
    if (!isExamStarted || isSubmitting) return;

    try {
      window.history.pushState({ jeeMockExam: true }, '', window.location.href);
    } catch {}

    const handlePopState = () => {
      if (isSubmitting) return;
      try {
        window.history.pushState({ jeeMockExam: true }, '', window.location.href);
      } catch {}
      setIsConfirmExitOpen(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isExamStarted, isSubmitting, setIsConfirmExitOpen]);

  // Multi-tab exclusivity lock
  useEffect(() => {
    if (!isExamStarted || isSubmitting) return;

    const myTabId = tabIdRef.current;
    const lockStorageKey = `jeeos_active_tab_${userId}_${testId}`;
    const channelName = `jeeos_lock_${userId}_${testId}`;

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel(channelName);
      }
    } catch {}

    const handleBroadcast = (msg: any) => {
      if (!msg || msg.tabId === myTabId) return;

      if (msg.type === 'CLAIM_LOCK') {
        channel?.postMessage({ type: 'LOCK_HELD', tabId: myTabId });
      } else if (msg.type === 'LOCK_HELD') {
        setIsDuplicateTab(true);
      } else if (msg.type === 'FORCE_TAKE_LOCK') {
        setIsDuplicateTab(true);
      }
    };

    if (channel) {
      channel.onmessage = (event) => handleBroadcast(event.data);
      channel.postMessage({ type: 'CLAIM_LOCK', tabId: myTabId });
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === lockStorageKey && e.newValue && e.newValue !== myTabId) {
        setIsDuplicateTab(true);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    try {
      storageAdapter.setItem(lockStorageKey, myTabId);
    } catch {}

    return () => {
      if (channel) {
        channel.postMessage({ type: 'RELEASE_LOCK', tabId: myTabId });
        channel.close();
      }
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isExamStarted, isSubmitting, userId, testId]);

  const handleResumeInThisTab = () => {
    const myTabId = tabIdRef.current;
    const lockStorageKey = `jeeos_active_tab_${userId}_${testId}`;
    const channelName = `jeeos_lock_${userId}_${testId}`;

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const ch = new BroadcastChannel(channelName);
        ch.postMessage({ type: 'FORCE_TAKE_LOCK', tabId: myTabId });
        ch.close();
      }
      storageAdapter.setItem(lockStorageKey, myTabId);
    } catch {}

    setIsDuplicateTab(false);
  };

  // Safety Rail: beforeunload Warning & Synchronous Save Fallback
  useEffect(() => {
    if (!isExamStarted || isSubmitting) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      try {
        storageAdapter.setItem(`jeeos_mock_attempt_${userId}_${testId}`, attempt);
      } catch (err) {
        console.warn('Failed to save synchronous attempt dump on unload:', err);
      }
      e.preventDefault();
      e.returnValue = 'You have an active examination in progress. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isExamStarted, isSubmitting, attempt, userId, testId]);

  return {
    isDuplicateTab,
    setIsDuplicateTab,
    handleResumeInThisTab
  };
}
