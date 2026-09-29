import React, { useEffect, useMemo } from 'react';
import { StudyBrainRuntime } from '@/runtime/StudyBrainRuntime';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { useAuth } from '@/features/auth';
import { StudyBrainActions } from '@/actions/StudyBrainActions';
import { useStudyBrainSync } from './hooks/useStudyBrainSync';

// Re-export sanitizers for backward compatibility
export { validateAndSanitizeChapters, validateAndSanitizeMistakes } from './sanitizers';

/**
 * Lean StudyBrainProvider orchestrating actions injection and real-time data synchronization.
 */
export const StudyBrainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const runtime = StudyBrainRuntime.getInstance();

  const actions = useMemo(() => new StudyBrainActions(runtime, user?.uid || 'guest'), [runtime, user]);

  useEffect(() => {
    useStudyBrainStore.getState().setActions(actions);
    if (user?.uid) {
      actions.setUserId(user.uid);
    }
  }, [actions, user]);

  useStudyBrainSync({ user, authLoading, runtime, actions });

  return <>{children}</>;
};
