import React, { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { MissionMode } from './MissionMode';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';

export function CockpitPage() {
  const navigate = useNavigate();
  const { missionId } = useParams();
  const location = useLocation();
  
  // You can pass initial state via location state when navigating:
  // navigate(`/cockpit/${mission.id}`, { state: { subject: mission.subject, paused: false, seconds: 0 } })
  const locationState = location.state as { subject?: string, paused?: boolean, seconds?: number } | null;

  const actions = useStudyBrainStore(state => state.actions);
  const todayMissions = useStudyBrainStore(state => state.todayMissions);
  
  // Find the target mission
  const activeMission = todayMissions.find(m => m.id === missionId);
  const activeSubject = locationState?.subject || activeMission?.subject || 'physics';

  useEffect(() => {
    // Hide the topbar/sidebar when in cockpit mode to make it fully standalone
  }, [missionId, todayMissions]);

  return (
    <div className="fixed inset-0 z-[60] bg-zinc-950 flex flex-col overflow-hidden">
      <MissionMode 
        activeSubject={activeSubject as any}
        activeMissionId={missionId || undefined}
        initialPaused={locationState?.paused ?? false}
        initialSeconds={locationState?.seconds ?? 0}
        onExit={async (currentSecs = 0) => {
          if (currentSecs >= 30) {
            // Record session of any duration to track elapsed time even if mission isn't completed
            // Record sessions as low as 30 seconds (0.5 minutes) to capture meaningful study time
            const durationMinutes = Math.max(0.5, currentSecs / 60);

            // Read focus metrics from localStorage for partial XP calculation
            let exitFocusScore = 100;
            if (missionId) {
              try {
                const savedState = localStorage.getItem(`jeeos_mission_state_${missionId}`);
                if (savedState) {
                  const parsed = JSON.parse(savedState);
                  exitFocusScore = parsed.focusScore ?? 100;
                }
              } catch { /* ignore parse errors */ }
            }

            await actions.completeStudySession({
              duration: Math.round(durationMinutes * 10) / 10, // Round to 1 decimal place
              focusTime: Math.round(durationMinutes * 10) / 10,
              questions: 0,
              correct: 0,
              type: 'Practice',
              subjectId: activeSubject as any,
              idleTime: 0,
              focusInterruptions: 0,
              focusScore: exitFocusScore
            });

            // Award proportional partial XP for meaningful early exits (>=1 minute)
            if (missionId && currentSecs >= 60) {
              await actions.awardPartialXP(missionId, currentSecs, exitFocusScore);
            }
          }
          navigate('/dashboard');
        }}
        onComplete={(stats) => {
          if (missionId) {
            localStorage.removeItem(`jeeos_mission_state_${missionId}`);
          }
          // The mission completion logic in useMissionState (actions.completeTask)
          // already creates a StudySession and updates XP. We just need to navigate back.
          navigate('/dashboard');
        }}
      />
    </div>
  );
}
