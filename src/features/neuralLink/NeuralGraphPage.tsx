import React, { useMemo, useState, useEffect } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls,
  useNodesState, 
  useEdgesState,
  BackgroundVariant,
  Node
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, Sparkles, Flame, Award, Calendar, 
  X, CheckCircle2, Zap, ArrowRight, BookOpen, Clock, 
  Layers, ChevronRight, Activity, TrendingUp, AlertTriangle
} from 'lucide-react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { NeuralGraphEngine, NeuralGraphMode } from '@jee-os/engines';
import { TopicNode } from './components/TopicNode';
import { AnimatedEnergyEdge } from './components/AnimatedEnergyEdge';
import { springs } from '@/constants/motion';
import { getSubjectTheme } from '@/constants/subjectTheme';

const nodeTypes = {
  topicNode: TopicNode,
};

const edgeTypes = {
  animatedEnergyEdge: AnimatedEnergyEdge,
};

export const NeuralGraphPage = ({ onNavigate }: { onNavigate?: (pageId: import('../../types').PageId) => void }) => {
  const chapters = useStudyBrainStore(s => s.chapters);
  const chapterTelemetryMap = useStudyBrainStore(s => s.chapterTelemetryMap);
  const actions = useStudyBrainStore(s => s.actions);

  const [activeSubject, setActiveSubject] = useState<'physics' | 'chemistry' | 'maths'>('physics');
  const [graphMode, setGraphMode] = useState<NeuralGraphMode>('flow');
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [pinnedSuccess, setPinnedSuccess] = useState<string | null>(null);

  // Compute graph nodes and edges
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    return NeuralGraphEngine.generateGraph(
      chapters, 
      activeSubject, 
      chapterTelemetryMap, 
      graphMode, 
      selectedChapterId
    );
  }, [chapters, activeSubject, chapterTelemetryMap, graphMode, selectedChapterId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync state whenever dependencies change
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = NeuralGraphEngine.generateGraph(
      chapters, 
      activeSubject, 
      chapterTelemetryMap, 
      graphMode, 
      selectedChapterId
    );
    setNodes(newNodes);
    setEdges(newEdges);
  }, [chapters, activeSubject, chapterTelemetryMap, graphMode, selectedChapterId, setNodes, setEdges]);

  // Compute live subject statistics
  const subjectStats = useMemo(() => {
    const subjectChaps = chapters.filter(c => c.subject === activeSubject);
    let mastered = 0;
    let inProgress = 0;
    let decaying = 0;
    let totalMastery = 0;

    subjectChaps.forEach(c => {
      const tel = chapterTelemetryMap?.[c.id];
      const stage = tel?.syllabusStage || (c.completion >= 90 ? 'Mastered' : c.completion > 0 ? 'In Progress' : 'Not Started');
      const score = tel?.masteryScore || c.completion || 0;
      totalMastery += score;

      if (stage === 'Mastered') mastered++;
      else if (stage !== 'Not Started') inProgress++;

      const isDecaying = c.retentionStatus === 'Fading' || c.retentionStatus === 'Forgotten' || (c.lastRevisionDaysAgo > 14 && stage !== 'Not Started');
      if (isDecaying) {
        decaying++;
      }
    });

    const avgMastery = subjectChaps.length > 0 ? Math.round(totalMastery / subjectChaps.length) : 0;
    const masteredPercent = subjectChaps.length > 0 ? Math.round((mastered / subjectChaps.length) * 100) : 0;

    return {
      total: subjectChaps.length,
      mastered,
      inProgress,
      decaying,
      avgMastery,
      masteredPercent
    };
  }, [chapters, activeSubject, chapterTelemetryMap]);

  // Selected chapter telemetry details for drawer
  const selectedChapter = useMemo(() => {
    if (!selectedChapterId) return null;
    const chap = chapters.find(c => c.id === selectedChapterId);
    if (!chap) return null;
    const tel = chapterTelemetryMap?.[chap.id];
    return {
      chapter: chap,
      telemetry: tel
    };
  }, [selectedChapterId, chapters, chapterTelemetryMap]);

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    const chapId = (node.data as any)?.id;
    if (chapId) {
      setSelectedChapterId(chapId);
    }
  };

  const handlePinMission = async () => {
    if (!selectedChapter) return;
    const { chapter, telemetry } = selectedChapter;
    await actions.addCustomMission({
      taskName: `Neural Target: Revise ${chapter.name}`,
      subject: chapter.subject,
      chapter: chapter.name,
      type: (telemetry?.isMastered || chapter.completion >= 90) ? 'Revise Formulas' : 'Review Mistakes',
      duration: 35,
      xp: 50
    });
    setPinnedSuccess(chapter.id);
    setTimeout(() => setPinnedSuccess(null), 3000);
  };

  return (
    <div className="w-full h-[calc(100vh-80px)] relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl select-none font-sans bg-[#050508] text-left">
      
      {/* 1. FULL-PAGE INTERACTIVE REACT FLOW CANVAS */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1, minZoom: 0.65 }}
        minZoom={0.3}
        maxZoom={1.5}
        className="xyflow-dark w-full h-full"
      >
        <Background 
          color="#27272a" 
          variant={BackgroundVariant.Dots} 
          gap={24} 
          size={1.2} 
        />
        
        <Controls 
          className="bg-zinc-950/80 border border-white/10 rounded-xl overflow-hidden fill-zinc-400" 
          position="bottom-left"
        />

        {/* Quick HUD Legend (Floating Bottom Right) */}
        <div className="absolute bottom-4 right-4 p-2.5 rounded-2xl glass-panel bg-zinc-950/80 backdrop-blur-xl border border-white/10 font-mono text-[10px] space-y-1.5 hidden md:block z-10 shadow-xl">
          <span className="text-zinc-400 uppercase font-bold tracking-wider block border-b border-white/5 pb-1">
            Pathfinder Legend
          </span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-zinc-300">Mastered & Active Energy</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <span className="text-zinc-300">In-Flight Syllabus</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span className="text-zinc-300">Memory Decay / Overdue</span>
          </div>
        </div>
      </ReactFlow>

      {/* 2. COMPACT FLOATING GLASS HUD OVERLAY (TOP BAR) */}
      <div className="absolute top-3 inset-x-3 md:inset-x-4 flex items-center justify-between gap-3 pointer-events-none z-30">
        
        {/* Left: Compact Brain Badge & Network Health */}
        <div className="glass-panel bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl px-3.5 py-2 shadow-2xl flex items-center gap-3 pointer-events-auto shrink-0">
          <div className="w-7 h-7 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-md">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-display font-bold text-white tracking-tight">Neural Link</span>
              <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">
                {subjectStats.avgMastery}% Cohesion
              </span>
            </div>
            <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-2">
              <span className="text-emerald-400 font-bold">{subjectStats.mastered}/{subjectStats.total} Mastered</span>
              <span>•</span>
              <span className={subjectStats.decaying > 0 ? 'text-amber-400 font-bold' : 'text-zinc-500'}>
                {subjectStats.decaying} Fading
              </span>
            </div>
          </div>
        </div>

        {/* Center / Right: Compact Subject Switcher + Mode Glider + AI Action */}
        <div className="glass-panel bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl flex items-center gap-2 pointer-events-auto font-mono text-xs overflow-x-auto custom-scrollbar">
          
          {/* Subject Matrix Glider */}
          <div className="flex gap-0.5 bg-black/40 border border-white/5 p-0.5 rounded-xl relative select-none text-[11px]">
            {(['physics', 'chemistry', 'maths'] as const).map(sub => {
              const isActive = activeSubject === sub;
              return (
                <button
                  key={sub}
                  onClick={() => { setActiveSubject(sub); setSelectedChapterId(null); }}
                  className={`relative px-3 py-1 rounded-lg font-bold uppercase transition-colors cursor-pointer select-none z-10 flex items-center gap-1 ${
                    isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="neuralSubjectGlider"
                      className={`absolute inset-0 rounded-lg shadow-sm -z-10 ${
                        sub === 'physics' ? 'bg-sky-600 shadow-sky-600/30' :
                        sub === 'chemistry' ? 'bg-emerald-600 shadow-emerald-600/30' :
                        'bg-violet-600 shadow-violet-600/30'
                      }`}
                      transition={springs.fluid}
                    />
                  )}
                  <span>{sub}</span>
                </button>
              );
            })}
          </div>

          {/* View Mode Switcher Glider */}
          <div className="flex gap-0.5 bg-black/40 border border-white/5 p-0.5 rounded-xl relative select-none text-[10px]">
            <button
              onClick={() => setGraphMode('flow')}
              className={`relative px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer select-none z-10 flex items-center gap-1 ${
                graphMode === 'flow' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Learning Sequence Flow"
            >
              {graphMode === 'flow' && (
                <motion.div
                  layoutId="neuralModeGlider"
                  className="absolute inset-0 bg-indigo-600 rounded-lg shadow-sm -z-10"
                  transition={springs.fluid}
                />
              )}
              <Layers className="w-3 h-3" />
              <span>Flow</span>
            </button>

            <button
              onClick={() => setGraphMode('decay')}
              className={`relative px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer select-none z-10 flex items-center gap-1 ${
                graphMode === 'decay' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Memory Decay"
            >
              {graphMode === 'decay' && (
                <motion.div
                  layoutId="neuralModeGlider"
                  className="absolute inset-0 bg-amber-600 rounded-lg shadow-sm -z-10"
                  transition={springs.fluid}
                />
              )}
              <Flame className="w-3 h-3" />
              <span>Decay</span>
            </button>

            <button
              onClick={() => setGraphMode('weightage')}
              className={`relative px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer select-none z-10 flex items-center gap-1 ${
                graphMode === 'weightage' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="High Yield"
            >
              {graphMode === 'weightage' && (
                <motion.div
                  layoutId="neuralModeGlider"
                  className="absolute inset-0 bg-emerald-600 rounded-lg shadow-sm -z-10"
                  transition={springs.fluid}
                />
              )}
              <Award className="w-3 h-3" />
              <span>Yield</span>
            </button>
          </div>

          {/* AI Audit Button */}
          <button
            onClick={() => {
              const prompt = `Can you analyze my ${activeSubject} syllabus graph? I have ${subjectStats.mastered} mastered chapters, ${subjectStats.inProgress} in progress, and ${subjectStats.decaying} decaying chapters. What prerequisite pathways should I prioritize today?`;
              sessionStorage.setItem('pendingCoachPrompt', prompt);
              onNavigate?.('ai-coach');
            }}
            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30 font-bold transition-colors cursor-pointer text-[11px]"
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span className="hidden sm:inline">AI Audit</span>
          </button>
        </div>

      </div>

      {/* 3. SLIDE-OUT CHAPTER SYNAPTIC INTELLIGENCE DRAWER */}
      <AnimatePresence>
        {selectedChapter && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={springs.fluid}
            className="absolute top-0 right-0 bottom-0 w-full sm:w-96 glass-panel bg-zinc-950/95 backdrop-blur-2xl border-l border-white/10 p-5 space-y-4 shadow-2xl z-50 overflow-y-auto custom-scrollbar text-left flex flex-col justify-between"
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${getSubjectTheme(selectedChapter.chapter.subject).badge}`}>
                      {selectedChapter.chapter.subject}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {selectedChapter.chapter.unit}
                    </span>
                  </div>
                  <h2 className="text-base font-display font-bold text-white">
                    {selectedChapter.chapter.name}
                  </h2>
                </div>

                <button
                  onClick={() => setSelectedChapterId(null)}
                  className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Telemetry Status Cards */}
              <div className="space-y-2.5">
                <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400">Mastery Index:</span>
                    <span className="font-bold text-emerald-400">
                      {selectedChapter.telemetry?.masteryScore || selectedChapter.chapter.completion || 0}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${selectedChapter.telemetry?.masteryScore || selectedChapter.chapter.completion || 0}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                    <span className="text-zinc-500 uppercase text-[9px] block">Stage</span>
                    <span className="font-bold text-indigo-400 truncate block">
                      {selectedChapter.telemetry?.syllabusStage || (selectedChapter.chapter.completion >= 90 ? 'Mastered' : 'In Progress')}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                    <span className="text-zinc-500 uppercase text-[9px] block">Lectures</span>
                    <span className="font-bold text-white">
                      {selectedChapter.telemetry?.currentLecture ?? selectedChapter.chapter.currentLecture ?? 0} / {selectedChapter.telemetry?.totalLectures ?? selectedChapter.chapter.totalLectures ?? 8}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                    <span className="text-zinc-500 uppercase text-[9px] block">Practice</span>
                    <span className="font-bold text-emerald-400">
                      {selectedChapter.telemetry?.pyqsComplete ? '100% Done' : selectedChapter.chapter.pyqsComplete ? 'PYQs Done' : 'In Progress'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                    <span className="text-zinc-500 uppercase text-[9px] block">Retention</span>
                    <span className={`font-bold ${
                      (selectedChapter.chapter.lastRevisionDaysAgo ?? 0) > 14
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}>
                      {selectedChapter.chapter.lastRevisionDaysAgo ? `${selectedChapter.chapter.lastRevisionDaysAgo}d ago` : 'Fresh'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Synaptic Pathway Advice */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-300">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Synaptic Recommendation</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  {selectedChapter.telemetry?.isMastered || selectedChapter.chapter.completion >= 90
                    ? 'Chapter is solidly mastered. Conduct spaced repetition drills every 14 days to prevent synaptic forgetting.'
                    : (selectedChapter.chapter.lastRevisionDaysAgo ?? 0) > 14
                    ? 'High memory decay detected! Solve 15 PYQs or review formula cards to restore neural retention.'
                    : 'Active learning in progress. Complete daily practice problems to cement key derivations.'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-3 border-t border-white/5 font-mono text-xs">
              <button
                onClick={handlePinMission}
                className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/30"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{pinnedSuccess === selectedChapter.chapter.id ? '✓ Pinned to Today!' : 'Pin Mission to Planner'}</span>
              </button>

              <button
                onClick={() => {
                  const prompt = `Let's deep dive into "${selectedChapter.chapter.name}" for ${selectedChapter.chapter.subject}. My current mastery is ${selectedChapter.telemetry?.masteryScore || selectedChapter.chapter.completion || 0}%. Can you give me a rapid concept breakdown and top 3 tricky PYQ traps?`;
                  sessionStorage.setItem('pendingCoachPrompt', prompt);
                  onNavigate?.('ai-coach');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 hover:text-white font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Consult AI Mentor</span>
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Global XYFlow Dark Mode Override */}
      <style>{`
        .xyflow-dark {
          --xy-node-boxshadow-hover: 0 0 25px rgba(99, 102, 241, 0.2);
          --xy-controls-button-bg-hover: #27272a;
        }
        .react-flow__controls-button {
          background: #09090b !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          fill: #a1a1aa !important;
        }
        .react-flow__controls-button:hover {
          background: #18181b !important;
          fill: #ffffff !important;
        }
        .react-flow__attribution {
          display: none !important;
        }
      `}</style>

    </div>
  );
};
