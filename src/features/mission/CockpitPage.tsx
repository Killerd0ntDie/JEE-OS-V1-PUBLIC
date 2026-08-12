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
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
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
            await actions.completeStudySession({
              duration: Math.round(durationMinutes * 10) / 10, // Round to 1 decimal place
              focusTime: Math.round(durationMinutes * 10) / 10,
              questions: 0,
              correct: 0,
              type: 'Practice',
              subjectId: activeSubject as any,
              idleTime: 0,
              focusInterruptions: 0,
              focusScore: 100
            });
          }
          navigate('/dashboard');
        }}
        onComplete={(stats) => {
          const durationMinutes = Math.max(1, Math.ceil(stats.duration / 60));
          actions.completeStudySession({
            duration: durationMinutes,
            focusTime: durationMinutes,
            questions: stats.questions,
            correct: stats.correct ?? stats.questions,
            type: 'Practice',
            subjectId: activeSubject as any,
            idleTime: stats.idleTime ? Math.ceil(stats.idleTime / 60) : 0,
            focusInterruptions: stats.focusInterruptions,
            focusScore: stats.focusScore
          });
          navigate('/dashboard');
        }}
      />
    </div>
  );
}
