import React from 'react';
import { Chapter } from '@/types';
import { motion } from 'motion/react';
import { CheckCircle2, Lock, Flame, Sparkles, BookOpen, Clock } from 'lucide-react';
import { springs } from '@/constants/motion';

interface RpgKnowledgeTreeWidgetProps {
  chapters: Chapter[];
  allChapters: Chapter[];
  subjectId: string;
  onChapterClick?: (id: string) => void;
}

// Fallback dependency map for Physics in case Firebase data is missing 'dependencies' array
const PHYSICS_FALLBACK_TREE: Record<string, string[]> = {
  'p2': ['p1'], // Kinematics needs Units & Measurements
  'p3': ['p2'], // NLM needs Kinematics
  'p4': ['p3'], // WPE needs NLM
  'p5': ['p4', 'p3'], // Rotational needs WPE & NLM
  'p6': ['p3'], // Gravitation needs NLM
  'p14': ['p2', 'p4'], // Electrostatics needs Kinematics & WPE
};

export function RpgKnowledgeTreeWidget({ chapters, allChapters, subjectId, onChapterClick }: RpgKnowledgeTreeWidgetProps) {
  
  const isMastered = (chap: Chapter) => chap.completion >= 100 || chap.status === 'Mastered';

  const getNodeStatus = (chap: Chapter) => {
    if (isMastered(chap)) return 'mastered';
    if (chap.completion > 0) return 'learning';
    
    // Check prerequisites dynamically using chap.dependencies against allChapters
    if (chap.dependencies && chap.dependencies.length > 0) {
      const hasUnmetPrereq = chap.dependencies.some(prereqName => {
        const pChap = allChapters.find(c => c.name.toLowerCase() === prereqName.toLowerCase());
        return pChap ? !isMastered(pChap) : false;
      });
      if (hasUnmetPrereq) return 'locked';
    } else if (subjectId === 'physics' && PHYSICS_FALLBACK_TREE[chap.id]) {
      const prereqs = PHYSICS_FALLBACK_TREE[chap.id];
      const hasUnmetPrereq = prereqs.some(prereqId => {
        const pChap = allChapters.find(c => c.id === prereqId);
        return pChap ? !isMastered(pChap) : false;
      });
      if (hasUnmetPrereq) return 'locked';
    }
    
    return 'unlocked';
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-5 sm:p-6 bg-zinc-950/40 border border-zinc-850/80 rounded-2xl backdrop-blur-xl shadow-2xl">
        {chapters.map((chap, idx) => {
          const status = getNodeStatus(chap);
          
          let statusStyle = "";
          let StatusIcon = Flame;
          let badgeText = "UNLOCKED";
          
          switch (status) {
            case 'mastered':
              statusStyle = "border-emerald-500/40 bg-emerald-950/30 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.12)] hover:border-emerald-400";
              StatusIcon = CheckCircle2;
              badgeText = "MASTERED";
              break;
            case 'learning':
              statusStyle = "border-indigo-500/50 bg-indigo-950/30 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:border-indigo-400";
              StatusIcon = Flame;
              badgeText = "IN PROGRESS";
              break;
            case 'locked':
              statusStyle = "border-zinc-850 bg-zinc-900/20 text-zinc-500 hover:border-zinc-800";
              StatusIcon = Lock;
              badgeText = "LOCKED";
              break;
            default:
              statusStyle = "border-sky-500/30 bg-sky-950/20 text-sky-300 hover:border-sky-400/60 shadow-md";
              StatusIcon = Sparkles;
              badgeText = "READY";
              break;
          }

          const isClickable = status !== 'locked';

          return (
            <motion.div 
              key={chap.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.02, 0.3) }}
              whileHover={isClickable ? { y: -3, scale: 1.02 } : undefined}
              whileTap={isClickable ? { scale: 0.97 } : undefined}
              onClick={() => onChapterClick && onChapterClick(chap.id)}
              className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 relative cursor-pointer select-none transition-all duration-200 ${statusStyle}`}
            >
              {/* Header */}
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-md bg-zinc-950/80 border border-zinc-850">
                  {chap.serialNumber || `CH${(idx + 1).toString().padStart(2, '0')}`}
                </span>
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold">
                  <StatusIcon className="w-3.5 h-3.5" />
                  <span>{badgeText}</span>
                </div>
              </div>

              {/* Title & Unit */}
              <div className="space-y-1">
                <h4 className="font-display font-bold leading-snug text-sm text-white line-clamp-2">
                  {chap.name}
                </h4>
                <span className="text-[10px] font-mono text-zinc-400 block truncate">
                  {chap.unit}
                </span>
              </div>
              
              {/* Progress bar or metrics */}
              {status === 'learning' ? (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] font-mono text-indigo-300">
                    <span>Progress</span>
                    <span>{chap.completion}%</span>
                  </div>
                  <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-indigo-900/40">
                    <div className="bg-indigo-400 h-full rounded-full shadow-[0_0_8px_rgba(129,140,248,0.5)]" style={{ width: `${chap.completion}%` }} />
                  </div>
                </div>
              ) : status === 'mastered' ? (
                <div className="pt-1 text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>100% Mastered</span>
                </div>
              ) : (
                <div className="pt-1 text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Est. {chap.estimatedRemainingTime || 4}h</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
