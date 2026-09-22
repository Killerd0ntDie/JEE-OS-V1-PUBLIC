import React from 'react';
import { Calendar, Check, Zap, Target, BookOpen } from 'lucide-react';
import { CoachAction } from '@jee-os/engines';

interface CoachActionCardProps {
  action: CoachAction;
  isApplied: boolean;
  onApply: () => void;
}

export const CoachActionCard: React.FC<CoachActionCardProps> = ({
  action,
  isApplied,
  onApply
}) => {
  const getActionIcon = () => {
    switch (action.type) {
      case 'ADD_MISSION':
        return <Calendar className="w-3 h-3" />;
      case 'UPDATE_TARGET':
        return <Target className="w-3 h-3" />;
      case 'UPDATE_CHAPTER':
        return <BookOpen className="w-3 h-3" />;
      default:
        return <Zap className="w-3 h-3" />;
    }
  };

  const actionTitle = action.payload?.title || (typeof action.payload === 'string' ? action.payload : JSON.stringify(action.payload));

  return (
    <div 
      className={`p-3.5 rounded-2xl bg-zinc-950/90 border transition-all flex items-center justify-between gap-3 font-mono text-xs shadow-sm ${
        isApplied ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-zinc-800/90 hover:border-indigo-500/40'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 ${
            isApplied ? 'text-emerald-400' : 'text-indigo-400'
          }`}>
            {getActionIcon()}
            <span>{action.type.replace(/_/g, ' ')}</span>
          </span>
          {isApplied && (
            <span className="px-1.5 py-0.2 rounded bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-mono text-[9px] font-bold">
              ✓ Applied
            </span>
          )}
        </div>
        <span className="text-white text-xs font-sans font-semibold block truncate">
          {actionTitle}
        </span>
        {action.payload?.duration && (
          <span className="text-[10px] font-mono text-zinc-400 block pt-0.5">
            {action.payload.duration} mins • {action.payload.subject || 'All Subjects'}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onApply}
        disabled={isApplied}
        className={`px-3.5 py-2 rounded-xl font-mono text-[10px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
          isApplied 
            ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 cursor-default' 
            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
        }`}
      >
        {isApplied ? (
          <>
            <Check className="w-3 h-3" />
            <span>Applied</span>
          </>
        ) : (
          <>
            <Calendar className="w-3 h-3" />
            <span>Add to Plan</span>
          </>
        )}
      </button>
    </div>
  );
};
