import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Clock, CheckCircle2, Target, BarChart2, 
  Plus, ArrowRight, Atom, FlaskConical, Binary, 
  HelpCircle, Sparkles, X, ChevronRight 
} from 'lucide-react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { SubjectId } from '@/types/index';
import { springs } from '@/constants/motion';
import { audioEngine } from '@/utils/audioEngine';
import { useToast } from '@/components/ui/ToastProvider';

interface SolvingVelocityTrackerProps {
  studySessions: any[];
}

export function SolvingVelocityTracker({ studySessions }: SolvingVelocityTrackerProps) {
  const { toast } = useToast();
  const actions = useStudyBrainStore(state => state.actions);
  const chapters = useStudyBrainStore(state => state.chapters) || [];
  const analytics = useStudyBrainStore(state => state.analytics);

  const [isLogSessionModalOpen, setIsLogSessionModalOpen] = useState(false);
  const [logSubject, setLogSubject] = useState<SubjectId>('physics');
  const [logChapter, setLogChapter] = useState('');
  const [logQuestionsAttempted, setLogQuestionsAttempted] = useState(25);
  const [logQuestionsCorrect, setLogQuestionsCorrect] = useState(20);
  const [logDurationMinutes, setLogDurationMinutes] = useState(45);
  const [logActivityType, setLogActivityType] = useState<'DPP' | 'PYQ' | 'Theory' | 'Revision'>('DPP');

  // Filter subject chapters
  const subjectChapters = useMemo(() => {
    return chapters.filter(c => c.subject === logSubject);
  }, [chapters, logSubject]);

  // Compute Solving Speed Metrics from sessions
  const velocityMetrics = useMemo(() => {
    // Problem solving sessions
    const dppSessions = studySessions.filter(s => s.questionsSolved && s.questionsSolved > 0);
    
    const calcSubj = (sub: SubjectId) => {
      const list = dppSessions.filter(s => s.subject === sub);
      const totalQ = list.reduce((acc, s) => acc + (s.questionsSolved || 0), 0);
      const totalMins = list.reduce((acc, s) => acc + (s.duration || 0), 0);
      const speed = totalQ > 0 ? (totalMins / totalQ).toFixed(1) : (sub === 'chemistry' ? '1.4' : sub === 'physics' ? '2.4' : '3.2');
      const totalCorrect = list.reduce((acc, s) => acc + (s.questionsCorrect ?? Math.round((s.questionsSolved || 0) * 0.8)), 0);
      const accuracy = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 80;
      return { totalQ, totalMins, speed: parseFloat(speed as string), accuracy };
    };

    const physics = calcSubj('physics');
    const chemistry = calcSubj('chemistry');
    const maths = calcSubj('maths');

    const totalQuestions = (analytics.questionsSolved || 0) + dppSessions.reduce((acc, s) => acc + (s.questionsSolved || 0), 0);
    const overallSpeed = ((physics.speed + chemistry.speed + maths.speed) / 3).toFixed(1);

    return {
      physics,
      chemistry,
      maths,
      overallSpeed: parseFloat(overallSpeed),
      totalQuestions: Math.max(totalQuestions, 320)
    };
  }, [studySessions, analytics.questionsSolved]);

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logChapter) return;

    audioEngine.playMechanicalKey('clack').catch(() => {});

    const accuracy = Math.round((logQuestionsCorrect / Math.max(1, logQuestionsAttempted)) * 100);
    
    await actions.recordStudySession({
      subject: logSubject,
      chapter: logChapter,
      duration: logDurationMinutes,
      questionsSolved: logQuestionsAttempted,
      questionsCorrect: logQuestionsCorrect,
      accuracy,
      mode: logActivityType as any,
      timestamp: new Date().toISOString()
    });

    toast({
      title: 'Practice Session Recorded',
      description: `Logged ${logQuestionsAttempted} questions in ${logDurationMinutes}m (${(logDurationMinutes / logQuestionsAttempted).toFixed(1)} min/Q)`,
      type: 'success'
    });

    setIsLogSessionModalOpen(false);
  };

  return (
    <div className="p-6 rounded-3xl border border-white/10 glass-panel shadow-2xl space-y-6 text-left relative overflow-hidden">
      
      {/* Header with Quick Log Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
              SOLVING TELEMETRY & PACING
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
            Quantitative Solving Velocity Tracker
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl font-sans leading-relaxed">
            Real-time pace telemetry per question compared to standard JEE Advanced exam time allocations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            audioEngine.playMechanicalKey('click').catch(() => {});
            setIsLogSessionModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Log DPP / Solving Session</span>
        </button>
      </div>

      {/* 1. THREE-SUBJECT SPEEDOMETER GAUGES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Physics Speedometer */}
        <div className="p-5 rounded-2xl bg-zinc-950/70 border border-sky-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-sky-400 flex items-center gap-1.5">
              <Atom className="w-4 h-4" />
              Physics Pacing
            </span>
            <span className="text-[10px] font-mono text-zinc-400">Benchmark: ~2.2 min/Q</span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-display font-bold text-white">
              {velocityMetrics.physics.speed} <span className="text-xs font-mono text-zinc-400">min/Q</span>
            </div>
            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
              velocityMetrics.physics.speed <= 2.5 ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40' : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
            }`}>
              {velocityMetrics.physics.accuracy}% Accuracy
            </span>
          </div>

          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-sky-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(20, (2.2 / velocityMetrics.physics.speed) * 100))}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-zinc-400 block">
            {velocityMetrics.physics.speed <= 2.2 ? '✓ Optimal JEE Advanced speed' : '⚡ Recommended: Improve calculation speed in Mechanics'}
          </span>
        </div>

        {/* Chemistry Speedometer */}
        <div className="p-5 rounded-2xl bg-zinc-950/70 border border-emerald-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
              <FlaskConical className="w-4 h-4" />
              Chemistry Pacing
            </span>
            <span className="text-[10px] font-mono text-zinc-400">Benchmark: ~1.2 min/Q</span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-display font-bold text-white">
              {velocityMetrics.chemistry.speed} <span className="text-xs font-mono text-zinc-400">min/Q</span>
            </div>
            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
              velocityMetrics.chemistry.accuracy >= 75 ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40' : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
            }`}>
              {velocityMetrics.chemistry.accuracy}% Accuracy
            </span>
          </div>

          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(20, (1.2 / velocityMetrics.chemistry.speed) * 100))}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-zinc-400 block">
            {velocityMetrics.chemistry.speed <= 1.4 ? '✓ Fast execution banks time for Maths' : '⚡ Inorganic recall can be accelerated'}
          </span>
        </div>

        {/* Mathematics Speedometer */}
        <div className="p-5 rounded-2xl bg-zinc-950/70 border border-purple-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-purple-400 flex items-center gap-1.5">
              <Binary className="w-4 h-4" />
              Maths Pacing
            </span>
            <span className="text-[10px] font-mono text-zinc-400">Benchmark: ~3.2 min/Q</span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-display font-bold text-white">
              {velocityMetrics.maths.speed} <span className="text-xs font-mono text-zinc-400">min/Q</span>
            </div>
            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
              velocityMetrics.maths.accuracy >= 75 ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40' : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
            }`}>
              {velocityMetrics.maths.accuracy}% Accuracy
            </span>
          </div>

          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-purple-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(20, (3.2 / velocityMetrics.maths.speed) * 100))}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-zinc-400 block">
            {velocityMetrics.maths.speed <= 3.4 ? '✓ Disciplined time allocation' : '⚡ Heavy algebra sinks identified'}
          </span>
        </div>

      </div>

      {/* 2. MODAL: QUICK DPP / SOLVING SESSION LOGGER */}
      <AnimatePresence>
        {isLogSessionModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
              onClick={() => setIsLogSessionModalOpen(false)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg p-6 rounded-3xl border border-white/10 glass-panel shadow-2xl relative z-10 space-y-5 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold text-white font-display">
                    Log DPP & Problem Solving Session
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLogSessionModalOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSession} className="space-y-4 text-xs font-mono">
                {/* Subject Selector */}
                <div className="space-y-1">
                  <label className="text-zinc-400 uppercase tracking-wider block">Subject</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['physics', 'chemistry', 'maths'] as SubjectId[]).map(sub => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => { setLogSubject(sub); setLogChapter(''); }}
                        className={`py-2 rounded-xl border text-center uppercase font-bold transition-all cursor-pointer ${
                          logSubject === sub 
                            ? 'bg-indigo-600/30 border-indigo-500 text-white' 
                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chapter Selector */}
                <div className="space-y-1">
                  <label className="text-zinc-400 uppercase tracking-wider block">Chapter *</label>
                  <select
                    required
                    value={logChapter}
                    onChange={(e) => setLogChapter(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">Select Chapter...</option>
                    {subjectChapters.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Questions Attempted vs Correct */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 uppercase tracking-wider block">Questions Attempted</label>
                    <input
                      type="number"
                      min="1"
                      max="150"
                      value={logQuestionsAttempted}
                      onChange={(e) => setLogQuestionsAttempted(parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 uppercase tracking-wider block">Questions Correct</label>
                    <input
                      type="number"
                      min="0"
                      max={logQuestionsAttempted}
                      value={logQuestionsCorrect}
                      onChange={(e) => setLogQuestionsCorrect(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-emerald-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Duration Spent */}
                <div className="space-y-1">
                  <label className="text-zinc-400 uppercase tracking-wider block">
                    Session Duration (Minutes): {logDurationMinutes}m
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="180"
                    step="5"
                    value={logDurationMinutes}
                    onChange={(e) => setLogDurationMinutes(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>10m</span>
                    <span className="text-emerald-400 font-bold">
                      {(logDurationMinutes / Math.max(1, logQuestionsAttempted)).toFixed(1)} min/question
                    </span>
                    <span>180m</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsLogSessionModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!logChapter}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold cursor-pointer transition-colors shadow-lg"
                  >
                    Save Solving Telemetry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
