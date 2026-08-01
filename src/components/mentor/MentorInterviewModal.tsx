import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStudyBrain } from '@/context/StudyBrainContext';
import { SubjectId, Chapter } from '@/types/index';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { normalizeTwoDaySplitConfig } from '@/engines/planner/PlannerEngine';
import { 
  Sparkles, CheckCircle, ArrowRight, ShieldCheck, 
  Clock, Target, GraduationCap, X, Check, Search, 
  Layers, Zap, ChevronRight, Award, Building2, Flame, RefreshCw, BookOpen
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose?: () => void;
  isMandatory?: boolean;
}

type ExamOption = 'JEE Main' | 'JEE Advanced' | 'Boards' | 'MHT CET' | 'BITSAT' | 'Others';

export const MentorInterviewModal: React.FC<Props> = ({ isOpen, onClose, isMandatory = false }) => {
  const { state, actions } = useStudyBrain();
  const modalRef = useRef<HTMLDivElement>(null);
  
  useLockBodyScroll(isOpen);
  useFocusTrap(modalRef, isOpen);
  
  const handleClose = () => {
    if (!isMandatory && onClose) onClose();
  };
  
  useEscapeKey(handleClose, isOpen);

  // Step state: 1: Intro, 2: Academic Goals, 3: Class & Coaching, 4: Reality Audit, 5: Roadmap Synthesis
  const [step, setStep] = useState<number>(1);

  // Form states
  const [selectedExams, setSelectedExams] = useState<ExamOption[]>(
    state.mentorProfile?.targetExams || ['JEE Main', 'JEE Advanced']
  );
  const [targetYear, setTargetYear] = useState<string>(
    state.mentorProfile?.targetYear || state.settings.targetYear || '2026'
  );
  const [targetPercentile, setTargetPercentile] = useState<string>(
    state.mentorProfile?.targetPercentile || '99.5+'
  );
  const [targetRank, setTargetRank] = useState<string>(
    state.mentorProfile?.targetRank || 'AIR < 1000'
  );
  const [targetCollege, setTargetCollege] = useState<string>(
    state.mentorProfile?.targetCollege || state.settings.dreamIit || 'IIT Bombay'
  );
  const [targetBranch, setTargetBranch] = useState<string>(
    state.mentorProfile?.targetBranch || state.settings.targetBranch || 'Computer Science & Engineering'
  );
  const [currentClass, setCurrentClass] = useState<'11th' | '12th' | 'Dropper'>(
    state.mentorProfile?.currentClass || '12th'
  );
  const [coachingType, setCoachingType] = useState<'Online Coaching' | 'Offline Coaching' | 'Self Study' | 'School + Coaching'>(
    state.mentorProfile?.coachingType || 'Online Coaching'
  );
  const [coachingName, setCoachingName] = useState<string>(
    state.mentorProfile?.coachingName || ''
  );
  const [dailyHours, setDailyHours] = useState<number>(
    state.mentorProfile?.dailyAvailableHours || 6
  );
  const [subjectSplitStrategy, setSubjectSplitStrategy] = useState<'3_a_day' | '2_a_day_alternating' | '1_a_day_alternating'>(
    state.mentorProfile?.subjectSplitStrategy || '3_a_day'
  );
  const defaultTwoDayConfig: [SubjectId[], SubjectId[], SubjectId[]] = [
    ['physics', 'chemistry'],
    ['chemistry', 'maths'],
    ['maths', 'physics']
  ];
  const [twoDaySplitConfig, setTwoDaySplitConfig] = useState<[SubjectId[], SubjectId[], SubjectId[]]>(
    state.mentorProfile?.twoDaySplitConfig || defaultTwoDayConfig
  );

  // Chapter Reality Audit state: Record<chapterId, 'Not Started' | 'In Progress' | 'Completed'>
  const initialRealityState = () => {
    const map: Record<string, 'Not Started' | 'In Progress' | 'Completed'> = {};
    state.chapters.forEach(c => {
      map[c.id] = 'Not Started';
    });
    return map;
  };
  const [chapterReality, setChapterReality] = useState<Record<string, 'Not Started' | 'In Progress' | 'Completed'>>(initialRealityState);
  const [activeAuditSubject, setActiveAuditSubject] = useState<SubjectId>('physics');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Strictly sort all chapters by numerical suffix (p1..p21, c1..c22, m1..m16)
  const sortedChapters = useMemo(() => {
    return [...state.chapters].sort((a, b) => {
      const aMatch = a.id.match(/(\d+)/);
      const bMatch = b.id.match(/(\d+)/);
      const aNum = aMatch ? parseInt(aMatch[1], 10) : 0;
      const bNum = bMatch ? parseInt(bMatch[1], 10) : 0;
      return aNum - bNum;
    });
  }, [state.chapters]);

  // Chapters filtered by active subject
  const currentSubjectChapters = useMemo(() => {
    return sortedChapters.filter(c => c.subject === activeAuditSubject);
  }, [sortedChapters, activeAuditSubject]);

  // Chapters filtered by search query
  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return currentSubjectChapters;
    const q = searchQuery.toLowerCase();
    return currentSubjectChapters.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.unit.toLowerCase().includes(q)
    );
  }, [currentSubjectChapters, searchQuery]);

  // Group chapters by Unit
  const groupedByUnit = useMemo(() => {
    const groups: { unit: string; chapters: Chapter[] }[] = [];
    filteredChapters.forEach(chap => {
      let grp = groups.find(g => g.unit === chap.unit);
      if (!grp) {
        grp = { unit: chap.unit, chapters: [] };
        groups.push(grp);
      }
      grp.chapters.push(chap);
    });
    return groups;
  }, [filteredChapters]);

  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  const toggleExam = (exam: ExamOption) => {
    if (selectedExams.includes(exam)) {
      if (selectedExams.length > 1) {
        setSelectedExams(selectedExams.filter(e => e !== exam));
      }
    } else {
      setSelectedExams([...selectedExams, exam]);
    }
  };

  const handleRealityChange = (chapterId: string, status: 'Not Started' | 'In Progress' | 'Completed') => {
    setChapterReality(prev => ({ ...prev, [chapterId]: status }));
  };

  const handleFinishInterview = async () => {
    setIsSubmitting(true);
    try {
      const chapterUpdates = Object.entries(chapterReality).map(([id, status]) => ({
        id,
        status,
        confidence: status === 'Completed' ? 85 : status === 'In Progress' ? 50 : 20
      }));

      await actions.completeMentorInterview({
        targetExams: selectedExams,
        targetYear,
        targetPercentile,
        targetRank,
        targetCollege,
        targetBranch,
        currentClass,
        coachingType,
        coachingName: coachingName.trim(),
        dailyAvailableHours: dailyHours,
        subjectSplitStrategy: subjectSplitStrategy,
        twoDaySplitConfig: twoDaySplitConfig,
      }, chapterUpdates);

      if (onClose) onClose();
    } catch (err) {
      console.error("Failed to save mentor interview", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const completedCount = Object.values(chapterReality).filter(s => s === 'Completed').length;
  const inProgressCount = Object.values(chapterReality).filter(s => s === 'In Progress').length;
  const notStartedCount = Object.values(chapterReality).filter(s => s === 'Not Started').length;

  const stepTitles = [
    'Orientation',
    'Academic Targets',
    'Class & Setup',
    'Subject Strategy',
    'Reality Audit',
    'Roadmap Lock'
  ];

  if (!isOpen) return null;

  return (
    <ModalPortal>
    <AnimatePresence>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/85 backdrop-blur-xl"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mentor-interview-modal-title"
        tabIndex={-1}
        className="relative w-full max-w-3xl bg-[#090a0f]/95 border border-indigo-500/25 rounded-3xl shadow-[0_0_80px_rgba(79,70,229,0.2)] overflow-hidden my-6 text-left flex flex-col max-h-[90vh] focus:outline-none"
      >
        
        {/* Modern Glowing Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-zinc-950/40 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.25)]">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  AI MENTOR DIAGNOSTIC
                </span>
                <span className="text-xs font-mono text-zinc-500">Step {step} of 6</span>
              </div>
              <h2 id="mentor-interview-modal-title" className="text-base font-display font-bold text-white tracking-tight mt-0.5">
                Personalized JEE Preparation Roadmap
              </h2>
            </div>
          </div>

          {!isMandatory && onClose && (
            <button 
              onClick={onClose}
              aria-label="Close Diagnostic Modal"
              className="w-9 h-9 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modern Step Progress Indicator */}
        <div className="px-6 py-3 bg-[#06070a] border-b border-zinc-800/60 shrink-0">
          <div className="grid grid-cols-6 gap-2">
            {stepTitles.map((title, idx) => {
              const num = idx + 1;
              const isActive = step === num;
              const isCompleted = step > num;
              return (
                <button
                  key={num}
                  onClick={() => step > num && setStep(num)}
                  disabled={step < num}
                  className={`flex flex-col gap-1 text-left transition-all ${step > num ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center transition-all ${
                      isActive 
                        ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)] scale-110'
                        : isCompleted
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-zinc-900 text-zinc-600 border border-zinc-800'
                    }`}>
                      {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : num}
                    </div>
                    <div className={`h-1 flex-1 rounded-full transition-all ${
                      isCompleted ? 'bg-emerald-500/60' : isActive ? 'bg-indigo-500' : 'bg-zinc-800'
                    }`} />
                  </div>
                  <span className={`text-[10px] font-mono truncate transition-all ${
                    isActive ? 'text-indigo-300 font-bold' : isCompleted ? 'text-zinc-400' : 'text-zinc-600'
                  }`}>
                    {title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* STEP 1: MENTOR ORIENTATION */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-5 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/30 via-zinc-950/50 to-purple-950/20 flex items-start gap-4 shadow-inner">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="space-y-2 text-xs text-zinc-300 leading-relaxed">
                  <h3 className="font-display font-bold text-white text-base">
                    "Welcome to your AI Diagnostic Interview."
                  </h3>
                  <p className="text-zinc-400 leading-relaxed">
                    I build study roadmaps directly from your actual current standing. No template schedules, no assumed progress. Together, we'll calibrate your exact starting line so every daily mission takes you closer to your rank goal.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 space-y-2.5 hover:border-emerald-500/30 transition-all">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white font-display">Zero Assumptions</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Plans are built strictly on what you specify. Unstarted chapters remain unstarted.
                  </p>
                </div>
                <div className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 space-y-2.5 hover:border-indigo-500/30 transition-all">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white font-display">Reality Audit</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    We log your exact available study hours to set achievable daily execution velocity.
                  </p>
                </div>
                <div className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 space-y-2.5 hover:border-purple-500/30 transition-all">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Target className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white font-display">Adaptive Roadmap</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Generates weekly milestones tailored precisely to your target exam year & rank.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  Start Diagnostic Interview
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: ACADEMIC TARGETS */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <h3 className="text-lg font-display font-bold text-white">Target Exams & Ambition Goals</h3>
                <p className="text-xs text-zinc-400">Select your target exams and define your target metrics.</p>
              </div>

              {/* Exam selection */}
              <div className="space-y-2.5">
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block font-semibold">Target Exams</label>
                <div className="flex flex-wrap gap-2.5">
                  {(['JEE Main', 'JEE Advanced', 'Boards', 'MHT CET', 'BITSAT', 'Others'] as ExamOption[]).map(exam => {
                    const isSelected = selectedExams.includes(exam);
                    return (
                      <button
                        key={exam}
                        type="button"
                        onClick={() => toggleExam(exam)}
                        className={`px-4 py-2.5 rounded-xl border text-xs font-mono font-medium transition-all flex items-center gap-2.5 cursor-pointer ${
                          isSelected 
                            ? 'border-indigo-500/60 bg-indigo-950/50 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.15)] font-bold' 
                            : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-zinc-700 bg-zinc-950'}`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span>{exam}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Year */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block font-semibold">Target Exam Year</label>
                <div className="grid grid-cols-4 gap-3">
                  {['2025', '2026', '2027', '2028'].map(yr => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setTargetYear(yr)}
                      className={`py-3 rounded-xl border font-mono text-xs font-bold transition-all cursor-pointer ${
                        targetYear === yr
                          ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                          : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Rank & Chips */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block font-semibold">Target Rank Goal</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {['AIR < 100', 'AIR < 500', 'AIR < 1000', 'AIR < 5000', 'AIR < 10000'].map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setTargetRank(chip)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                        targetRank === chip
                          ? 'border-amber-500/60 bg-amber-500/10 text-amber-300 font-bold'
                          : 'border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={targetRank}
                  onChange={(e) => setTargetRank(e.target.value)}
                  placeholder="Custom target rank, e.g. AIR < 500"
                  className="w-full bg-[#0d0e14] border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 font-mono placeholder:text-zinc-600"
                />
              </div>

              {/* Target College & Branch */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block font-semibold">Target College</label>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {['IIT Bombay', 'IIT Delhi', 'IIT Madras', 'BITS Pilani'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setTargetCollege(c)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-all cursor-pointer ${
                          targetCollege === c
                            ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-300 font-bold'
                            : 'border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={targetCollege}
                    onChange={(e) => setTargetCollege(e.target.value)}
                    placeholder="e.g. IIT Bombay"
                    className="w-full bg-[#0d0e14] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 placeholder:text-zinc-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block font-semibold">Target Branch</label>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {['Computer Science', 'Electrical', 'Mechanical', 'Aerospace'].map(b => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setTargetBranch(b)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-all cursor-pointer ${
                          targetBranch === b
                            ? 'border-purple-500/60 bg-purple-500/10 text-purple-300 font-bold'
                            : 'border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={targetBranch}
                    onChange={(e) => setTargetBranch(e.target.value)}
                    placeholder="e.g. Computer Science & Engineering"
                    className="w-full bg-[#0d0e14] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 text-zinc-400 text-xs font-mono transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer transition-all"
                >
                  Next: Class & Setup
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CLASS & COACHING SETUP */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <h3 className="text-lg font-display font-bold text-white">Class & Learning Environment</h3>
                <p className="text-xs text-zinc-400">Tell us your study setup to calibrate daily workloads accurately.</p>
              </div>

              {/* Current Class */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block font-semibold">Current Academic Standard</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['11th', '12th', 'Dropper'] as const).map(cls => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setCurrentClass(cls)}
                      className={`p-3.5 rounded-xl border text-center font-mono text-xs font-bold transition-all cursor-pointer ${
                        currentClass === cls
                          ? 'border-indigo-500/80 bg-indigo-950/50 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                          : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      Class {cls}
                    </button>
                  ))}
                </div>
              </div>

              {/* Coaching Setup */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block font-semibold">Learning / Coaching Model</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['Online Coaching', 'Offline Coaching', 'Self Study', 'School + Coaching'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setCoachingType(type)}
                      className={`p-3.5 rounded-xl border text-left font-mono text-xs transition-all cursor-pointer ${
                        coachingType === type
                          ? 'border-indigo-500/80 bg-indigo-950/50 text-indigo-300 font-bold shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                          : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Coaching Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block font-semibold">Coaching / Platform Name (Optional)</label>
                <input
                  type="text"
                  value={coachingName}
                  onChange={(e) => setCoachingName(e.target.value)}
                  placeholder="e.g. Allen, Unacademy, PW, FIITJEE, Self"
                  className="w-full bg-[#0d0e14] border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 placeholder:text-zinc-600"
                />
              </div>

              {/* Daily available study hours */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-zinc-900/60 to-indigo-950/20 border border-zinc-800/80 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    Daily Available Self-Study Hours
                  </label>
                  <span className="text-sm font-mono text-indigo-300 font-bold px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                    {dailyHours} Hours / Day
                  </span>
                </div>
                
                <input
                  type="range"
                  min="2"
                  max="14"
                  step="0.5"
                  value={dailyHours}
                  onChange={(e) => setDailyHours(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />

                <div className="flex justify-between gap-2 pt-1">
                  {[4, 6, 8, 10, 12].map(hr => (
                    <button
                      key={hr}
                      type="button"
                      onClick={() => setDailyHours(hr)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                        dailyHours === hr
                          ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                          : 'bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {hr}h
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 text-zinc-400 text-xs font-mono transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer transition-all"
                >
                  Next: Subject Strategy
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SUBJECT STRATEGY */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <h3 className="text-lg font-display font-bold text-white">Subject Split Strategy</h3>
                <p className="text-xs text-zinc-400">Choose how you want to distribute your daily study focus across subjects.</p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block font-semibold">
                  Subject Allocation Preference
                </label>
                <div className="grid grid-cols-1 gap-3.5">
                  {[
                    { 
                      id: '3_a_day', 
                      title: '3 Subjects Daily', 
                      desc: 'Study Physics, Chemistry, and Mathematics every day.' 
                    },
                    { 
                      id: '2_a_day_alternating', 
                      title: '2 Subjects Alternating', 
                      desc: 'Study 2 subjects per day with alternating rotation (Phys+Chem -> Chem+Maths -> Maths+Phys).' 
                    },
                    { 
                      id: '1_a_day_alternating', 
                      title: '1 Subject Focus', 
                      desc: 'Study 1 subject per day with daily rotation (Physics -> Chemistry -> Maths).' 
                    }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSubjectSplitStrategy(opt.id as any)}
                      className={`p-4 rounded-2xl border text-left space-y-1 transition-all cursor-pointer ${
                        subjectSplitStrategy === opt.id
                          ? 'border-indigo-500/80 bg-indigo-950/50 text-indigo-300 font-bold shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                          : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-mono font-bold text-white">{opt.title}</div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          subjectSplitStrategy === opt.id ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-zinc-700 bg-zinc-950'
                        }`}>
                          {subjectSplitStrategy === opt.id && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                      <div className="text-xs font-mono text-zinc-400 leading-relaxed">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 text-zinc-400 text-xs font-mono transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(5)}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer transition-all"
                >
                  Next: Reality Audit
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: CHAPTER REALITY AUDIT */}
          {step === 5 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-indigo-400 font-mono text-2xs uppercase tracking-widest">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Reality Check — Zero Assumptions
                </div>
                <h3 className="text-lg font-display font-bold text-white">Chapter Completion Audit</h3>
                <p className="text-xs text-zinc-400">
                  Chapters are strictly ordered by curriculum. Toggle status for any chapters you've worked on.
                </p>
              </div>

              {/* Status tally pill summary */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0d0e14] border border-zinc-800/80 text-xs font-mono">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <CheckCircle className="w-4 h-4" />
                    <span>{completedCount} Completed</span>
                  </div>
                  <span className="text-zinc-800">•</span>
                  <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
                    <Clock className="w-4 h-4" />
                    <span>{inProgressCount} In Progress</span>
                  </div>
                  <span className="text-zinc-800">•</span>
                  <div className="flex items-center gap-1.5 text-zinc-500">
                    <BookOpen className="w-4 h-4" />
                    <span>{notStartedCount} Not Started</span>
                  </div>
                </div>

                {/* Subject switcher tabs */}
                <div className="flex gap-1.5">
                  {(['physics', 'chemistry', 'maths'] as const).map(subj => (
                    <button
                      key={subj}
                      onClick={() => setActiveAuditSubject(subj)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono uppercase font-bold tracking-wider transition-all cursor-pointer ${
                        activeAuditSubject === subj
                          ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {subj}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeAuditSubject} chapters or units...`}
                  className="w-full bg-[#0d0e14] border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 placeholder:text-zinc-600"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs font-mono"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Grouped Chapter List */}
              <div className="space-y-4 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                {groupedByUnit.length === 0 ? (
                  <div className="text-center py-8 text-xs text-zinc-500 font-mono">
                    No chapters match your search query.
                  </div>
                ) : (
                  groupedByUnit.map(group => (
                    <div key={group.unit} className="space-y-2">
                      <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider px-1">
                        <Layers className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{group.unit}</span>
                        <span className="text-zinc-600 font-normal">({group.chapters.length})</span>
                      </div>
                      
                      <div className="space-y-1.5">
                        {group.chapters.map(chap => {
                          const currentStatus = chapterReality[chap.id] || 'Not Started';
                          return (
                            <div
                              key={chap.id}
                              className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                                currentStatus === 'Completed'
                                  ? 'border-emerald-500/30 bg-emerald-950/10'
                                  : currentStatus === 'In Progress'
                                  ? 'border-indigo-500/30 bg-indigo-950/10'
                                  : 'border-zinc-800/60 bg-zinc-900/20 hover:border-zinc-700'
                              }`}
                            >
                              <div className="space-y-0.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono text-zinc-500 font-bold">{chap.id.toUpperCase()}</span>
                                  <span className="text-xs font-semibold text-white truncate block">{chap.name}</span>
                                </div>
                                <span className="text-[10px] font-mono text-zinc-500 block">
                                  Weightage: {chap.weightage}/10 • Priority {chap.priority}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {(['Not Started', 'In Progress', 'Completed'] as const).map(st => (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleRealityChange(chap.id, st)}
                                    className={`px-3 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                                      currentStatus === st
                                        ? st === 'Completed'
                                          ? 'bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 font-bold'
                                          : st === 'In Progress'
                                          ? 'bg-indigo-500/20 border border-indigo-500/60 text-indigo-300 font-bold'
                                          : 'bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold'
                                        : 'bg-zinc-950/60 text-zinc-500 border border-transparent hover:text-zinc-300'
                                    }`}
                                  >
                                    {st}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setStep(4)}
                  className="px-5 py-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 text-zinc-400 text-xs font-mono transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(6)}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer transition-all"
                >
                  Synthesize Roadmap
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: ROADMAP LOCK & CONFIRMATION */}
          {step === 6 && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-5 rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-zinc-950/50 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs font-bold">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    AI Mentor Analysis Complete
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30 font-bold">
                    Ready to Launch
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-display font-bold text-white">
                    Strategic JEE Master Plan Calibrated
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed mt-1">
                    Targeting <strong className="text-indigo-300">{selectedExams.join(', ')} ({targetYear})</strong> for <strong className="text-indigo-300">{targetCollege}</strong> ({targetBranch}) with goal <strong className="text-indigo-300">{targetRank}</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1 font-mono text-[11px]">
                  <div className="p-3 rounded-xl bg-black/40 border border-zinc-800">
                    <span className="text-[9px] text-zinc-500 uppercase block font-bold">Daily Hours</span>
                    <span className="text-indigo-300 font-bold text-sm">{dailyHours} hrs/day</span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-zinc-800">
                    <span className="text-[9px] text-zinc-500 uppercase block font-bold">Class</span>
                    <span className="text-white font-bold text-sm">{currentClass}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-zinc-800">
                    <span className="text-[9px] text-zinc-500 uppercase block font-bold">Subject Strategy</span>
                    <span className="text-purple-300 font-bold text-sm truncate block">
                      {subjectSplitStrategy === '1_a_day_alternating' ? '1 Focus' : subjectSplitStrategy === '2_a_day_alternating' ? '2 Alternating' : '3 Daily'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-zinc-800">
                    <span className="text-[9px] text-zinc-500 uppercase block font-bold">Completed</span>
                    <span className="text-emerald-400 font-bold text-sm">{completedCount} Chapters</span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-zinc-800">
                    <span className="text-[9px] text-zinc-500 uppercase block font-bold">Pending</span>
                    <span className="text-indigo-400 font-bold text-sm">{inProgressCount + notStartedCount} Chapters</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">Activated Engine Modules</h4>
                <div className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 space-y-2.5 text-xs text-zinc-300">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>User reality profile & targets synchronized to database.</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Dynamic Execution Queue unlocked with personalized micro-missions.</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Continuous AI Mentor study strategy engine active.</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center">
                <button
                  onClick={() => setStep(5)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 text-zinc-400 text-xs font-mono transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleFinishInterview}
                  disabled={isSubmitting}
                  className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(99,102,241,0.35)] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Calibrating Engine...
                    </>
                  ) : (
                    <>
                      Lock Roadmap & Launch
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

      </motion.div>
    </div>
    </AnimatePresence>
    </ModalPortal>
  );
};
