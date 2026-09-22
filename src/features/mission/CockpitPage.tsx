import React, { useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { MissionMode } from './MissionMode';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { SubjectId } from '@/types';

export function CockpitPage() {
  const navigate = useNavigate();
  const { missionId } = useParams();
  const location = useLocation();
  
  // You can pass initial state via location state when navigating:
  // navigate(`/cockpit/${mission.id}`, { state: { subject: mission.subject, paused: false, seconds: 0 } })
  const locationState = location.state as { subject?: string; paused?: boolean; seconds?: number } | null;

  const actions = useStudyBrainStore(state => state.actions);
  const todayMissions = useStudyBrainStore(state => state.todayMissions);
  
  // Find the target mission: explicit missionId from URL, or fallback to first incomplete mission
  const activeMission = missionId
    ? todayMissions.find(m => m.id === missionId)
    : todayMissions.find(m => !m.completed && !m.dismissed);
  const effectiveMissionId = missionId || activeMission?.id;
  const rawSubject = locationState?.subject || activeMission?.subject || 'physics';
  const activeSubject: SubjectId = rawSubject === 'chemistry' || rawSubject === 'maths' ? rawSubject : 'physics';

  const handleExit = useCallback(async (currentSecs = 0) => {
    try {
      if (effectiveMissionId && currentSecs >= 60) {
        // Read focus metrics from localStorage for partial XP calculation
        let exitFocusScore = 100;
        try {
          const savedState = localStorage.getItem(`jeeos_mission_state_${effectiveMissionId}`);
          if (savedState) {
            const parsed = JSON.parse(savedState);
            exitFocusScore = parsed.focusScore ?? 100;
          }
        } catch { /* ignore parse errors */ }

        // Award proportional partial XP for meaningful early exits (>=1 minute)
        await actions.awardPartialXP(effectiveMissionId, currentSecs, exitFocusScore);
      }
    } catch (err) {
      console.error('[CockpitPage] Failed to award partial XP on exit:', err);
    } finally {
      navigate('/dashboard');
    }
  }, [effectiveMissionId, actions, navigate]);

  const handleComplete = useCallback(() => {
    if (effectiveMissionId) {
      localStorage.removeItem(`jeeos_mission_state_${effectiveMissionId}`);
    }
    // The mission completion logic in useMissionState (actions.completeTask)
    // already creates a StudySession and updates XP. We just need to navigate back.
    navigate('/dashboard');
  }, [effectiveMissionId, navigate]);

  return (
    <div className="fixed inset-0 z-[60] bg-zinc-950 flex flex-col overflow-hidden">
      <MissionMode 
        activeSubject={activeSubject}
        activeMissionId={effectiveMissionId || undefined}
        initialPaused={locationState?.paused ?? false}
        initialSeconds={locationState?.seconds ?? 0}
        onExit={handleExit}
        onComplete={handleComplete}
      />
    </div>
  );
}
