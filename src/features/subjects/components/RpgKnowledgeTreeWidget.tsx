import React, { useMemo } from 'react';
import { Chapter } from '@/types';
import { motion } from 'motion/react';
import { CheckCircle2, Lock, Flame } from 'lucide-react';

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
        // Find the prerequisite chapter by name
        const pChap = allChapters.find(c => c.name.toLowerCase() === prereqName.toLowerCase());
        return pChap ? !isMastered(pChap) : false; // If not found, assume it's not locking it
      });
      if (hasUnmetPrereq) return 'locked';
    } else if (subjectId === 'physics' && PHYSICS_FALLBACK_TREE[chap.id]) {
      // Fallback for old Firebase data missing the dependencies field
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
    <div className="w-full overflow-x-auto overflow-y-hidden pb-8 scrollbar mt-4">
      <div className="min-w-[800px] flex flex-wrap gap-6 p-8 bg-[#0a0a0c] border border-zinc-900 rounded-3xl relative shadow-inner">
        {chapters.map((chap, idx) => {
          const status = getNodeStatus(chap);
          
          let statusStyle = "";
          let Icon = Flame;
          
          switch (status) {
            case 'mastered':
              statusStyle = "border-emerald-500/50 bg-emerald-950/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]";
              Icon = CheckCircle2;
              break;
            case 'learning':
              statusStyle = "border-amber-500/50 bg-amber-950/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]";
              break;
            case 'locked':
              statusStyle = "border-red-900/30 bg-red-950/10 text-red-500/40 grayscale";
              Icon = Lock;
              break;
            default:
              statusStyle = "border-sky-500/30 bg-sky-950/20 text-sky-300 hover:border-sky-400/50 cursor-pointer transition-colors shadow-lg";
              break;
          }

          return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={chap.id} 
              onClick={() => onChapterClick && onChapterClick(chap.id)}
              className={`w-[250px] p-5 rounded-2xl border flex flex-col gap-3 relative cursor-pointer ${statusStyle}`}
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase opacity-70">
                  {chap.serialNumber || `CH-${idx+1}`}
                </span>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-display font-bold leading-tight line-clamp-2 text-sm">{chap.name}</h4>
                <div className="text-[9px] font-mono mt-1.5 opacity-60 uppercase">{status}</div>
              </div>
              
              {status === 'learning' && (
                <div className="w-full bg-black/50 h-1.5 rounded-full overflow-hidden mt-2 border border-amber-900/30">
                  <div className="bg-amber-400 h-full shadow-[0_0_10px_rgba(251,191,36,0.5)]" style={{ width: `${chap.completion}%` }} />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
