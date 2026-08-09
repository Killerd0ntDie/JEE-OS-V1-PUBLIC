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
        onExit={(currentSecs) => {
          navigate('/dashboard');
        }}
        onComplete={async (stats) => {
          const durationMinutes = Math.max(1, Math.ceil(stats.duration / 60));
          await actions.completeStudySession({
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
