import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Calendar, Clock, Check, Loader2, X, ArrowRight, Zap, Target } from 'lucide-react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { ChapterTelemetry } from '@jee-os/engines';
import { Modal } from '@/components/ui/Modal';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

interface AiRevisionPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AiRevisionPlanModal({ isOpen, onClose }: AiRevisionPlanModalProps) {
  useLockBodyScroll(isOpen || false);

  const actions = useStudyBrainStore(state => state.actions);
  const chapterTelemetryMap = useStudyBrainStore(state => state.chapterTelemetryMap);
  const mentorProfile = useStudyBrainStore(state => state.mentorProfile);
  const settings = useStudyBrainStore(state => state.settings);
  const [selectedDays, setSelectedDays] = useState<3 | 7>(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [importedTaskIds, setImportedTaskIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const telemetryList = (Object.values(chapterTelemetryMap || {}) as ChapterTelemetry[]);
  const bottlenecks = telemetryList.filter(t => t.isBottleneck).map(t => t.chapterName);
  const lowRetention = telemetryList.filter(t => t.retentionConfidence === 'Low').map(t => t.chapterName);
  const dailyHours = mentorProfile?.dailyAvailableHours || 6.5;

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    setGeneratedPlan(null);
    setImportedTaskIds([]);

    try {
      const userStr = localStorage.getItem('auth_user');
      const token = userStr ? JSON.parse(userStr).token : '';

      const res = await fetch('/api/planner/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          days: selectedDays,
          dailyAvailableHours: dailyHours,
          bottlenecks,
          lowRetentionChapters: lowRetention,
          targetCollege: settings.dreamIit,
          targetYear: settings.targetYear
        })
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        throw new Error(res.ok ? 'Received invalid response from server' : `Server Error (${res.status}): ${responseText.substring(0, 100)}`);
      }

      if (!res.ok) {
        throw new Error(data.error || `Failed to generate revision plan (Status ${res.status}).`);
      }

      setGeneratedPlan(data.plan);
    } catch (err: any) {
      console.error("AI Plan generation error:", err);
      setErrorMsg(err.message || 'Failed to connect to AI plan generator.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImportDayTasks = async (day: any) => {
    const tasksToImport = day.tasks || [];
    for (const t of tasksToImport) {
      const taskId = `mission-ai-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await actions.addAiMission({
        chapter: t.chapter || t.title,
        taskName: t.title,
        type: (t.type as any) || 'Solve PYQs',
        subject: (t.subject as any) || 'physics',
        duration: t.durationMinutes || 60,
        xp: 20
      });
      setImportedTaskIds(prev => [...prev, `${day.dayNumber}-${t.title}`]);
    }
  };

  return (
    
      <Modal isOpen={isOpen} onClose={onClose} zIndex={100} backdropClassName="p-4 bg-black/80 backdrop-blur-md animate-fade-in" className="w-full max-w-3xl glass-panel border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-display text-white tracking-tight">AI Deep Revision Sprint Generator</h3>
                <p className="text-xs text-zinc-400 font-mono">Telemetry-Grounded Custom Study Timetable</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Setup / Config Stage */}
          {!generatedPlan && !isGenerating && (
            <div className="space-y-6 flex-1 overflow-y-auto pr-1">
              <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-5 space-y-3">
                <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-4 h-4" />
                  Target Objective
                </span>
                <p className="text-sm text-zinc-200 font-sans leading-relaxed">
                  Generates an aggressive, balanced multi-day revision schedule targeting <strong className="text-white">{settings.dreamIit}</strong> ({settings.targetYear}).
                </p>
              </div>

              {/* Telemetry Inputs Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                  <span className="text-zinc-500 block mb-1">Daily Capacity</span>
                  <span className="text-lg font-bold text-emerald-400">{dailyHours} hrs/day</span>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                  <span className="text-zinc-500 block mb-1">Active Bottlenecks</span>
                  <span className="text-lg font-bold text-amber-400">{bottlenecks.length} Chapters</span>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                  <span className="text-zinc-500 block mb-1">Overdue Retention</span>
                  <span className="text-lg font-bold text-rose-400">{lowRetention.length} Chapters</span>
                </div>
              </div>

              {/* Select Duration */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">Select Sprint Duration:</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setSelectedDays(3)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedDays === 3 
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10' 
                        : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm">3-Day Emergency Sprint</span>
                      <Calendar className="w-4 h-4 text-indigo-400" />
                    </div>
                    <p className="text-xs text-zinc-400 font-mono">High-yield fix for urgent bottlenecks</p>
                  </button>

                  <button
                    onClick={() => setSelectedDays(7)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedDays === 7 
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10' 
                        : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm">7-Day Master Plan</span>
                      <Calendar className="w-4 h-4 text-indigo-400" />
                    </div>
                    <p className="text-xs text-zinc-400 font-mono">Full-syllabus revision & balance</p>
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono">
                  {errorMsg}
                </div>
              )}

              <button
                onClick={handleGeneratePlan}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold font-mono text-sm tracking-wide uppercase shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Synthesize {selectedDays}-Day AI Timetable
              </button>
            </div>
          )}

          {/* Loading State */}
          {isGenerating && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4">
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
              <h4 className="text-lg font-bold text-white font-display">Synthesizing {selectedDays}-Day Revision Sprint</h4>
              <p className="text-xs font-mono text-zinc-400">Evaluating 70-chapter telemetry & scheduling tasks...</p>
            </div>
          )}

          {/* Generated Plan Stage */}
          {generatedPlan && !isGenerating && (
            <div className="space-y-6 flex-1 overflow-y-auto pr-1">
              <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-4">
                <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider block mb-1">Sprint Overview</span>
                <p className="text-xs text-zinc-200 font-sans leading-relaxed">{generatedPlan.summary}</p>
              </div>

              <div className="space-y-4">
                {generatedPlan.days?.map((day: any) => (
                  <div key={day.dayNumber} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-bold">
                          Day {day.dayNumber}
                        </span>
                        <h4 className="text-sm font-bold text-white font-display">{day.title}</h4>
                      </div>
                      <button
                        onClick={() => handleImportDayTasks(day)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Import Tasks ({day.tasks?.length || 0})
                      </button>
                    </div>

                    <div className="space-y-2">
                      {day.tasks?.map((t: any, idx: number) => {
                        const isImported = importedTaskIds.includes(`${day.dayNumber}-${t.title}`);
                        return (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-850/80 text-xs">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-950/40 text-indigo-300 border border-indigo-900/40">
                                  {t.subject}
                                </span>
                                <span className="font-semibold text-white">{t.title}</span>
                              </div>
                              <span className="text-[10px] text-zinc-500 font-mono">{t.chapter} • {t.type}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-zinc-500" />
                                {t.durationMinutes}m
                              </span>
                              {isImported && (
                                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                                  Imported ✓
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setGeneratedPlan(null)}
                  className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-2xl font-mono text-xs font-bold uppercase transition-colors"
                >
                  Re-configure
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-mono text-xs font-bold uppercase shadow-lg shadow-indigo-600/30 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </Modal>

  );
}
