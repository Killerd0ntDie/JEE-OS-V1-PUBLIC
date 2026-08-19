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
  Layers, ChevronRight, Activity, TrendingUp, AlertTriangle,
  Copy, Check, Target, Hash
} from 'lucide-react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { NeuralGraphEngine, NeuralGraphMode } from '@jee-os/engines';
import { TopicNode } from './components/TopicNode';
import { AnimatedEnergyEdge } from './components/AnimatedEnergyEdge';
import { springs } from '@/constants/motion';
import { getSubjectTheme } from '@/constants/subjectTheme';
import { FORMULA_BANK } from '@/constants/formulaBank';

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
  const [copiedFormulaIndex, setCopiedFormulaIndex] = useState<number | null>(null);

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

    // Find linked formulas in Formula Bank
    const chapterFormulas = FORMULA_BANK.find(
      f => f.chapterId === chap.id || 
           f.chapterName.toLowerCase() === chap.name.toLowerCase() ||
           chap.name.toLowerCase().includes(f.chapterName.toLowerCase()) ||
           f.chapterName.toLowerCase().includes(chap.name.toLowerCase())
    );

    // Compute Chapter Number string for Japanese Stamp
    const serialMatch = (chap.id || '').match(/\d+/);
    const chapterNumber = serialMatch ? serialMatch[0].padStart(2, '0') : '01';

    // Estimate PYQ Density based on weightage
    const weightage = chap.weightage || tel?.weightagePercent || 4;
    const pyqDensityTier = weightage >= 7 ? 'VERY HIGH (3-4 Qs/Paper)' : weightage >= 5 ? 'HIGH YIELD (2-3 Qs/Paper)' : 'MODERATE (1-2 Qs/Paper)';

    return {
      chapter: chap,
      telemetry: tel,
      formulas: chapterFormulas?.formulas || [],
      chapterNumber,
      weightage,
      pyqDensityTier
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

  const handleCopyFormula = (formulaText: string, index: number) => {
    navigator.clipboard.writeText(formulaText);
    setCopiedFormulaIndex(index);
    setTimeout(() => setCopiedFormulaIndex(null), 2000);
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
        fitViewOptions={{ padding: 0.28, maxZoom: 0.95, minZoom: 0.4 }}
        minZoom={0.25}
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
        <div 
          style={{
            background: 'rgba(10, 14, 23, 0.88)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            borderTop: '1.5px solid rgba(255, 255, 255, 0.25)'
          }}
          className="absolute bottom-4 right-4 p-3 rounded-2xl font-mono text-[10px] space-y-1.5 hidden md:block z-10 shadow-2xl"
        >
          <span className="text-indigo-400 uppercase font-bold tracking-widest block border-b border-white/10 pb-1 flex items-center gap-1.5">
            <Activity className="w-3 h-3" />
            SYNAPTIC ENERGY LEGEND
          </span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            <span className="text-zinc-300">Mastered & Active Energy Stream</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
            <span className="text-zinc-300">In-Flight Syllabus Synapse</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span>
            <span className="text-zinc-300">Memory Decay Alert</span>
          </div>
        </div>
      </ReactFlow>

      {/* 2. COMPACT FLOATING GLASS HUD OVERLAY (TOP BAR) */}
      <div className="absolute top-3 inset-x-3 md:inset-x-4 flex items-center justify-between gap-3 pointer-events-none z-30">
        
        {/* Left: Compact Brain Badge & Network Health */}
        <div 
          style={{
            background: 'rgba(10, 14, 23, 0.88)',
            backdropFilter: 'blur(24px) saturate(190%)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            borderTop: '1.5px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6)'
          }}
          className="rounded-2xl px-3.5 py-2 flex items-center gap-3 pointer-events-auto shrink-0 relative overflow-hidden"
        >
          {/* Top Hazard Accent */}
          <div 
            className="absolute top-0 inset-x-0 h-0.5 opacity-80 pointer-events-none"
            style={{
              background: 'repeating-linear-gradient(-45deg, #6366f1 0px, #6366f1 8px, transparent 8px, transparent 16px)'
            }}
          />

          <div className="w-7 h-7 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-md">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-tactical font-black text-white tracking-tight uppercase">MAGI-01 // NEURAL LINK</span>
              <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">
                {subjectStats.avgMastery}% COHESION
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
        <div 
          style={{
            background: 'rgba(10, 14, 23, 0.88)',
            backdropFilter: 'blur(24px) saturate(190%)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            borderTop: '1.5px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6)'
          }}
          className="rounded-2xl p-1.5 flex items-center gap-2 pointer-events-auto font-mono text-xs overflow-x-auto custom-scrollbar"
        >
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
                        'bg-purple-600 shadow-purple-600/30'
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
              className={`relative px-2 py-1 rounded-lg font-bold uppercase transition-colors cursor-pointer select-none z-10 flex items-center gap-1 ${
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
              <span>FLOW</span>
            </button>

            <button
              onClick={() => setGraphMode('decay')}
              className={`relative px-2 py-1 rounded-lg font-bold uppercase transition-colors cursor-pointer select-none z-10 flex items-center gap-1 ${
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
              <span>DECAY</span>
            </button>

            <button
              onClick={() => setGraphMode('weightage')}
              className={`relative px-2 py-1 rounded-lg font-bold uppercase transition-colors cursor-pointer select-none z-10 flex items-center gap-1 ${
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
              <span>YIELD</span>
            </button>
          </div>

          {/* AI Audit Button */}
          <button
            onClick={() => {
              const prompt = `Can you analyze my ${activeSubject} syllabus graph? I have ${subjectStats.mastered} mastered chapters, ${subjectStats.inProgress} in progress, and ${subjectStats.decaying} decaying chapters. What prerequisite pathways should I prioritize today?`;
              sessionStorage.setItem('pendingCoachPrompt', prompt);
              onNavigate?.('ai-coach');
            }}
            className="flex items-center gap-1 px-3 py-1 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 rounded-xl border border-indigo-500/40 font-mono font-bold uppercase transition-all cursor-pointer text-[11px] shadow-sm active:scale-95"
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span className="hidden sm:inline">AI AUDIT</span>
          </button>
        </div>

      </div>

      {/* 3. SLIDE-OUT CHAPTER NODE INSPECTION TERMINAL (MAGI SPECIFICATION) */}
      <AnimatePresence>
        {selectedChapter && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={springs.fluid}
            style={{
              background: 'rgba(10, 14, 23, 0.95)',
              backdropFilter: 'blur(32px) saturate(200%)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '-20px 0 60px rgba(0, 0, 0, 0.85)'
            }}
            className="absolute top-0 right-0 bottom-0 w-full sm:w-[440px] p-5 md:p-6 space-y-4 z-50 overflow-y-auto custom-scrollbar text-left flex flex-col justify-between"
          >
            {/* Top Subject Hazard Caution Stripes Ribbon */}
            <div 
              className="absolute top-0 inset-x-0 h-1 opacity-85 pointer-events-none"
              style={{
                background: selectedChapter.chapter.subject === 'maths'
                  ? 'repeating-linear-gradient(-45deg, #a855f7 0px, #a855f7 8px, transparent 8px, transparent 16px)'
                  : selectedChapter.chapter.subject === 'physics'
                  ? 'repeating-linear-gradient(-45deg, #0ea5e9 0px, #0ea5e9 8px, transparent 8px, transparent 16px)'
                  : 'repeating-linear-gradient(-45deg, #10b981 0px, #10b981 8px, transparent 8px, transparent 16px)'
              }}
            />

            {/* Caliper Crosshairs */}
            <span className="absolute top-2.5 left-2.5 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>
            <span className="absolute top-2.5 right-2.5 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>
            <span className="absolute bottom-2.5 left-2.5 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>
            <span className="absolute bottom-2.5 right-2.5 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>

            <div className="space-y-4 pt-1">
              {/* Header with Japanese Stamped Badge */}
              <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Official MAGI Stamped Badge */}
                    <span className="px-2.5 py-0.5 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-300 font-tactical font-black text-[11px] uppercase tracking-widest shadow-[0_0_12px_rgba(244,63,94,0.25)]">
                      <span className="eva-japanese-badge">第{selectedChapter.chapterNumber}章 // </span>NODE TELEMETRY
                    </span>
                    <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${getSubjectTheme(selectedChapter.chapter.subject).badge}`}>
                      {selectedChapter.chapter.subject}
                    </span>
                  </div>
                  <h2 className="text-lg font-tactical font-black text-white uppercase tracking-tight leading-snug">
                    {selectedChapter.chapter.name}
                  </h2>
                  <p className="text-[11px] font-mono text-zinc-400 uppercase">
                    UNIT: <strong className="text-zinc-200">{selectedChapter.chapter.unit || 'Core Module'}</strong>
                  </p>
                </div>

                <button
                  onClick={() => setSelectedChapterId(null)}
                  className="p-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition-colors cursor-pointer shrink-0 shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mastery & Core Telemetry Display Block */}
              <div 
                style={{
                  background: 'rgba(12, 16, 26, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderTop: '1.5px solid rgba(255, 255, 255, 0.20)'
                }}
                className="p-3.5 rounded-2xl space-y-2.5 shadow-inner"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">Mastery Index</span>
                  <span className="font-hud font-black text-xl text-emerald-400">
                    {selectedChapter.telemetry?.masteryScore || selectedChapter.chapter.completion || 0}%
                  </span>
                </div>
                
                <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-white/10 p-0.25">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    style={{ width: `${selectedChapter.telemetry?.masteryScore || selectedChapter.chapter.completion || 0}%` }}
                  />
                </div>

                {/* 4 Telemetry Micro-Cards */}
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                    <span className="text-zinc-500 uppercase text-[9px] block">SYLLABUS STAGE</span>
                    <span className="font-bold text-indigo-400 truncate block uppercase">
                      {selectedChapter.telemetry?.syllabusStage || (selectedChapter.chapter.completion >= 90 ? 'Mastered' : 'In Progress')}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                    <span className="text-zinc-500 uppercase text-[9px] block">LECTURES COMPLETE</span>
                    <span className="font-hud font-bold text-white">
                      {selectedChapter.telemetry?.currentLecture ?? selectedChapter.chapter.currentLecture ?? 0} / {selectedChapter.telemetry?.totalLectures ?? selectedChapter.chapter.totalLectures ?? 8}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                    <span className="text-zinc-500 uppercase text-[9px] block">PRACTICE STATUS</span>
                    <span className="font-bold text-emerald-400 uppercase">
                      {selectedChapter.telemetry?.pyqsComplete ? '100% Done' : selectedChapter.chapter.pyqsComplete ? 'PYQs Done' : 'In Progress'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                    <span className="text-zinc-500 uppercase text-[9px] block">SYNAPTIC RETENTION</span>
                    <span className={`font-bold uppercase ${
                      (selectedChapter.chapter.lastRevisionDaysAgo ?? 0) > 14
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}>
                      {selectedChapter.chapter.lastRevisionDaysAgo ? `${selectedChapter.chapter.lastRevisionDaysAgo}d ago` : 'Fresh'}
                    </span>
                  </div>
                </div>
              </div>

              {/* PYQ Density & Exam Weightage Block */}
              <div 
                style={{
                  background: 'rgba(12, 16, 26, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderTop: '1.5px solid rgba(255, 255, 255, 0.20)'
                }}
                className="p-3.5 rounded-2xl space-y-2 font-mono"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-bold uppercase tracking-wider">
                    <Target className="w-3.5 h-3.5 text-amber-400" />
                    <span>PYQ Density & Weightage</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                    {selectedChapter.weightage}% WEIGHTAGE
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400 bg-black/40 p-2.5 rounded-xl border border-white/5">
                  <span>EXAM YIELD:</span>
                  <strong className="text-zinc-200 font-bold uppercase">{selectedChapter.pyqDensityTier}</strong>
                </div>
              </div>

              {/* Formula Bank Direct Links Block */}
              <div 
                style={{
                  background: 'rgba(12, 16, 26, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderTop: '1.5px solid rgba(255, 255, 255, 0.20)'
                }}
                className="p-3.5 rounded-2xl space-y-2.5 font-mono"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-bold uppercase tracking-wider">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                    <span>FORMULA VAULT ({selectedChapter.formulas.length} AVAILABLE)</span>
                  </div>
                </div>

                {selectedChapter.formulas.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {selectedChapter.formulas.slice(0, 3).map((f, idx) => (
                      <div 
                        key={idx}
                        className="bg-black/50 border border-white/10 rounded-xl p-2.5 space-y-1 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-tactical font-bold text-white uppercase tracking-tight line-clamp-1">
                            {f.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyFormula(f.formula, idx)}
                            className="text-zinc-500 hover:text-emerald-400 transition-colors p-1 cursor-pointer"
                            title="Copy formula"
                          >
                            {copiedFormulaIndex === idx ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <pre className="text-[10.5px] font-mono text-emerald-300 bg-zinc-950/80 p-1.5 rounded-lg border border-white/5 overflow-x-auto whitespace-pre-wrap">
                          {f.formula}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10.5px] text-zinc-500 italic p-2 bg-black/30 rounded-xl">
                    Formulas for this unit are being calibrated in the Formula Bank.
                  </p>
                )}
              </div>

              {/* Synaptic Pathway Advice */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-300 uppercase tracking-wider">
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

            {/* Tactical Action Buttons */}
            <div className="space-y-2 pt-3 border-t border-white/10 font-mono text-xs">
              <button
                onClick={handlePinMission}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 active:scale-95"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{pinnedSuccess === selectedChapter.chapter.id ? '✓ PINNED TO TODAY!' : 'PIN MISSION TO PLANNER'}</span>
              </button>

              <button
                onClick={() => {
                  const prompt = `Let's deep dive into "${selectedChapter.chapter.name}" for ${selectedChapter.chapter.subject}. My current mastery is ${selectedChapter.telemetry?.masteryScore || selectedChapter.chapter.completion || 0}%. Can you give me a rapid concept breakdown and top 3 tricky PYQ traps?`;
                  sessionStorage.setItem('pendingCoachPrompt', prompt);
                  onNavigate?.('ai-coach');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-zinc-200 hover:text-white font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>CONSULT AI MENTOR</span>
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
