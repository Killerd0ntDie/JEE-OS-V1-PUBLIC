import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Icon } from '../../../components/ui/Icon';

import { Chapter, MentorProfile } from '../../../types';

interface WeeklyStrategyWidgetProps {
  chapters: Chapter[];
  mentorProfile?: MentorProfile;
  projectedReadiness: number;
  onNavigate: (page: string) => void;
}

export function WeeklyStrategyWidget({ chapters, mentorProfile, projectedReadiness, onNavigate }: WeeklyStrategyWidgetProps) {
  return (
    <Card className="p-4 border-indigo-900/40 bg-indigo-950/20 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon name="Calendar" className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase tracking-wider">
            Weekly Strategy Focus
          </span>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('planner')}
          className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 font-bold hover:underline cursor-pointer"
        >
          Open Planner →
        </button>
      </div>

      <div className="space-y-1.5 text-xs text-left">
        <div className="flex items-center justify-between font-mono text-[10px] text-zinc-400">
          <span>Monthly Focus:</span>
          <span className="text-white font-bold truncate max-w-[150px]">
            {mentorProfile?.monthlyObjective?.category || 'Finish Mechanics & GOC'}
          </span>
        </div>
        <div className="flex items-center justify-between font-mono text-[10px] text-zinc-400">
          <span>Target Readiness:</span>
          <span className="text-emerald-400 font-bold">{projectedReadiness}% Projected</span>
        </div>
        <div className="flex items-center justify-between font-mono text-[10px] text-zinc-400">
          <span>Self-Study Budget:</span>
          <span className="text-indigo-300 font-bold">{mentorProfile?.dailyAvailableHours || 6.5} hrs/day</span>
        </div>
      </div>
    </Card>
  );
}
