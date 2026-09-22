import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Compass, Atom, ArrowRight, Layers, Orbit, Sparkles, Plus, Calendar, Zap } from 'lucide-react';
import { springs } from '@/constants/motion';
import { Chapter, SubjectId } from '@/types/index';
import { WeeklyBlock } from '@jee-os/engines';
import { audioEngine } from '@/utils/audioEngine';
import { useToast } from '@/components/ui/ToastProvider';

export interface EmptyOrbitStandbyProps {
  chapters: Chapter[];
  weeklySchedule?: WeeklyBlock[];
  onEngageChapter: (chapterId: string, chapterName: string) => void;
  onAdvanceScheduleTask?: (task: WeeklyBlock) => void;
  onOpenCustomMission?: () => void;
}

export const EmptyOrbitStandby = React.memo(function EmptyOrbitStandby({
  chapters = [],
  weeklySchedule = [],
  onEngageChapter,
  onAdvanceScheduleTask,
  onOpenCustomMission
}: EmptyOrbitStandbyProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleEngage = (chapter: Chapter | null, fallbackName: string) => {
    audioEngine.playMechanicalKey('clack').catch(() => {});
    audioEngine.playTacticalBeep(1200).catch(() => {});
    if (chapter) {
      onEngageChapter(chapter.id, chapter.name);
    } else {
      toast({
        title: `Module Selected`,
        description: `Please select a chapter from your syllabus.`,
        type: 'info'
      });
    }
  };

  // 1. DYNAMIC ACTIVE CHAPTERS PER SUBJECT (Instead of hardcoded GOC/Sets/Units)
  const getSubjectCardData = (subj: SubjectId) => {
    // Priority A: Candidate is actively studying this chapter (Learning or lectures watched)
    const inProgress = chapters.find(c => 
      c.subject === subj && 
      !c.chapterOnHold &&
      (c.status === 'Learning' || 
       (typeof c.currentLecture === 'number' && c.currentLecture > 0) || 
       (typeof c.completion === 'number' && c.completion > 0 && c.completion < 100))
    );

    if (inProgress) {
      const lectureStr = inProgress.currentLecture && inProgress.totalLectures
        ? `LEC ${inProgress.currentLecture}/${inProgress.totalLectures}`
        : inProgress.currentLecture
        ? `LEC ${inProgress.currentLecture}`
        : `${inProgress.completion || 0}% DONE`;

      return {
        chapter: inProgress,
        tag: lectureStr,
        tagSubtitle: 'IN PROGRESS',
        title: inProgress.name,
        description: inProgress.unit ? `${inProgress.unit} · High priority module` : 'Active syllabus target.',
        actionLabel: `Engage ${inProgress.name.split(/[:–-]/)[0].trim()}`,
        isPrereq: false
      };
    }

    // Priority B: Highest priority uncompleted chapter in syllabus
    const nextUp = chapters
      .filter(c => c.subject === subj && !c.chapterOnHold && (c.completion ?? 0) < 100)
      .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))[0];

    if (nextUp) {
      return {
        chapter: nextUp,
        tag: nextUp.weightage ? `${nextUp.weightage}% JEE` : 'HIGH YIELD',
        tagSubtitle: 'PRIORITY',
        title: nextUp.name,
        description: nextUp.unit ? `${nextUp.unit} · Recommended next` : 'Recommended core chapter.',
        actionLabel: `Start ${nextUp.name.split(/[:–-]/)[0].trim()}`,
        isPrereq: false
      };
    }

    // Priority C: Foundational Prerequisite Fallback
    const fallback = chapters.find(c => {
      const n = c.name.toLowerCase();
      if (subj === 'chemistry') return n.includes('organic') || n.includes('goc') || n.includes('bonding');
      if (subj === 'maths') return n.includes('set') || n.includes('function') || n.includes('relation');
      return n.includes('unit') || n.includes('vector') || n.includes('kinematics');
    }) || null;

    if (subj === 'chemistry') {
      return {
        chapter: fallback,
        tag: 'CORE PREREQ',
        tagSubtitle: 'FOUNDATION',
        title: fallback ? fallback.name : 'General Organic Chemistry',
        description: 'Foundational IUPAC, electronic effects & reaction mechanisms.',
        actionLabel: 'Engage GOC',
        isPrereq: true
      };
    }

    if (subj === 'maths') {
      return {
        chapter: fallback,
        tag: 'CALCULUS BASE',
        tagSubtitle: 'FOUNDATION',
        title: fallback ? fallback.name : 'Sets, Relations & Functions',
        description: 'Mappings, domain/range & foundational modern algebra.',
        actionLabel: 'Engage Sets',
        isPrereq: true
      };
    }

    return {
      chapter: fallback,
      tag: 'MECHANICS CORE',
      tagSubtitle: 'FOUNDATION',
      title: fallback ? fallback.name : 'Units, Dimensions & Vectors',
      description: 'Dimensional analysis, error estimation & vector algebra.',
      actionLabel: 'Engage Physics',
      isPrereq: true
    };
  };

  const chemData = useMemo(() => getSubjectCardData('chemistry'), [chapters]);
  const mathData = useMemo(() => getSubjectCardData('maths'), [chapters]);
  const physData = useMemo(() => getSubjectCardData('physics'), [chapters]);

  // 2. INCORPORATE UPCOMING TASKS FROM MASTER SCHEDULE / PLANNER TAB (Deduplicated by Chapter)
  const scheduledTasks = useMemo(() => {
    if (!weeklySchedule || weeklySchedule.length === 0) return [];
    const today = new Date();
    const currentDayOfWeek = (today.getDay() + 6) % 7; // Mon = 0

    const tasks: WeeklyBlock[] = [];
    const seenKeys = new Set<string>();

    // Scan upcoming days starting from tomorrow up to a full week
    for (let offset = 0; offset < 7; offset++) {
      const dayIdx = (currentDayOfWeek + 1 + offset) % 7;
      const dayBlocks = weeklySchedule.filter(b => 
        b.dayIndex === dayIdx &&
        !b.completed &&
        b.taskType !== 'Break' &&
        b.subject !== 'break' &&
        b.subject !== 'Break'
      );

      for (const block of dayBlocks) {
        const key = (block.chapterName || block.activity || '').toLowerCase().trim();
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          tasks.push(block);
        }
        if (tasks.length >= 3) break;
      }
      if (tasks.length >= 3) break;
    }

    // Fallback: If fewer than 3, scan today's uncompleted blocks
    if (tasks.length < 3) {
      const todayBlocks = weeklySchedule.filter(b => 
        b.dayIndex === currentDayOfWeek &&
        !b.completed &&
        b.taskType !== 'Break' &&
        b.subject !== 'break' &&
        b.subject !== 'Break'
      );
      for (const block of todayBlocks) {
        const key = (block.chapterName || block.activity || '').toLowerCase().trim();
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          tasks.push(block);
        }
        if (tasks.length >= 3) break;
      }
    }

    return tasks;
  }, [weeklySchedule]);

  const getSubjBadge = (subj: string) => {
    switch (subj) {
      case 'physics':
        return 'bg-sky-950/60 text-sky-400 border-sky-500/30';
      case 'chemistry':
        return 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30';
      case 'maths':
        return 'bg-purple-950/60 text-purple-400 border-purple-500/30';
      default:
        return 'bg-indigo-950/60 text-indigo-400 border-indigo-500/30';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="p-6 sm:p-8 flex flex-col items-center text-center rounded-3xl border border-white/10 glass-panel shadow-2xl relative overflow-hidden space-y-6"
    >
      {/* Ambient Glows */}
      <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />

      {/* Radar Icon & Telemetry Header */}
      <div className="flex flex-col items-center space-y-2 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_25px_rgba(99,102,241,0.3)] mb-1">
          <Compass className="w-6 h-6 animate-pulse" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-950/50 border border-indigo-500/30 text-indigo-300 text-[10px] font-mono font-bold uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
          <span>作戦待機 // EXECUTION QUEUE STANDBY</span>
        </div>
        <h3 className="text-lg sm:text-xl font-display font-bold text-white tracking-tight">
          No Missions in Active Orbit
        </h3>
        <p className="text-xs text-zinc-400 max-w-md font-sans leading-relaxed">
          Your daily execution queue is clear. Select an active syllabus module below or advance upcoming scheduled tasks from your master plan.
        </p>
      </div>

      {/* 3 Interactive Dynamic Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 w-full relative z-10">
        
        {/* Card 1: Chemistry */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={springs.snappy}
          onClick={() => handleEngage(chemData.chapter, chemData.title)}
          className="group p-4.5 rounded-2xl border border-emerald-500/20 bg-emerald-950/15 hover:bg-emerald-950/35 hover:border-emerald-500/50 transition-all cursor-pointer text-left flex flex-col justify-between shadow-lg shadow-emerald-950/20 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Atom className="w-3 h-3" />
                Chemistry
              </span>
              <span className="text-[9px] font-mono text-emerald-400/80 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/20">
                {chemData.tag}
              </span>
            </div>
            <div>
              <h4 className="text-sm font-bold font-display text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                {chemData.title}
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug line-clamp-2">
                {chemData.description}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-emerald-500/15 text-xs font-mono font-semibold text-emerald-400 group-hover:text-emerald-300">
            <span className="truncate pr-2">{chemData.actionLabel}</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

        {/* Card 2: Mathematics */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={springs.snappy}
          onClick={() => handleEngage(mathData.chapter, mathData.title)}
          className="group p-4.5 rounded-2xl border border-purple-500/20 bg-purple-950/15 hover:bg-purple-950/35 hover:border-purple-500/50 transition-all cursor-pointer text-left flex flex-col justify-between shadow-lg shadow-purple-950/20 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-2xl rounded-full pointer-events-none group-hover:bg-purple-500/10 transition-colors" />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Layers className="w-3 h-3" />
                Maths
              </span>
              <span className="text-[9px] font-mono text-purple-400/80 bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-500/20">
                {mathData.tag}
              </span>
            </div>
            <div>
              <h4 className="text-sm font-bold font-display text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                {mathData.title}
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug line-clamp-2">
                {mathData.description}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-purple-500/15 text-xs font-mono font-semibold text-purple-400 group-hover:text-purple-300">
            <span className="truncate pr-2">{mathData.actionLabel}</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

        {/* Card 3: Physics */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={springs.snappy}
          onClick={() => handleEngage(physData.chapter, physData.title)}
          className="group p-4.5 rounded-2xl border border-sky-500/20 bg-sky-950/15 hover:bg-sky-950/35 hover:border-sky-500/50 transition-all cursor-pointer text-left flex flex-col justify-between shadow-lg shadow-sky-950/20 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 blur-2xl rounded-full pointer-events-none group-hover:bg-sky-500/10 transition-colors" />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400 bg-sky-950/60 border border-sky-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Orbit className="w-3 h-3" />
                Physics
              </span>
              <span className="text-[9px] font-mono text-sky-400/80 bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-500/20">
                {physData.tag}
              </span>
            </div>
            <div>
              <h4 className="text-sm font-bold font-display text-white group-hover:text-sky-300 transition-colors line-clamp-1">
                {physData.title}
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug line-clamp-2">
                {physData.description}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-sky-500/15 text-xs font-mono font-semibold text-sky-400 group-hover:text-sky-300">
            <span className="truncate pr-2">{physData.actionLabel}</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

      </div>

      {/* 3. INCORPORATE QUEUED TASKS FROM MASTER SCHEDULE (Passes / Planner Schedule Tab) */}
      {scheduledTasks.length > 0 && (
        <div className="w-full space-y-3 pt-2 relative z-10">
          <div className="flex items-center justify-between w-full border-t border-white/10 pt-4 text-left font-mono">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">Queued in Master Schedule</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                {scheduledTasks.length} {scheduledTasks.length === 1 ? 'task' : 'tasks'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/planner')}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left font-mono">
            {scheduledTasks.map((task) => (
              <div 
                key={task.id} 
                className="p-3.5 rounded-2xl border border-white/10 bg-zinc-950/70 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-2.5 shadow-md shadow-black/40 group"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className={`font-bold uppercase px-2 py-0.5 rounded-md border ${getSubjBadge(task.subject)}`}>
                      {task.subject}
                    </span>
                    <span className="text-zinc-400 font-medium">
                      {task.dayName} · {task.durationMinutes}m
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white mt-2 truncate group-hover:text-indigo-300 transition-colors" title={task.chapterName}>
                    {task.chapterName}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                    {task.activity}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onAdvanceScheduleTask && onAdvanceScheduleTask(task)}
                  className="w-full py-1.5 px-2 bg-indigo-600/25 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Advance to Today</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Quick Links / Alternative Sprints */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2 relative z-10 border-t border-white/5 w-full">
        <button
          type="button"
          onClick={() => {
            audioEngine.playMechanicalKey('click').catch(() => {});
            navigate('/planner');
          }}
          className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-indigo-500/40 text-zinc-300 hover:text-white text-xs font-mono transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Open Master Schedule</span>
        </button>

        {onOpenCustomMission && (
          <button
            type="button"
            onClick={() => {
              audioEngine.playMechanicalKey('click').catch(() => {});
              onOpenCustomMission();
            }}
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-zinc-400 text-zinc-400 hover:text-zinc-200 text-xs font-mono transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Custom Mission</span>
          </button>
        )}
      </div>
    </motion.div>
  );
});
