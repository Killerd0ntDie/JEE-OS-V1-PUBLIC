import React, { useMemo, useCallback } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls,
  MiniMap,
  useNodesState, 
  useEdgesState,
  Panel,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStudyBrain } from '@/context/StudyBrainContext';
import { NeuralGraphEngine } from '@/engines/graph/NeuralGraphEngine';
import { TopicNode } from './components/TopicNode';
import { AnimatedEnergyEdge } from './components/AnimatedEnergyEdge';
import { BrainCircuit, Info } from 'lucide-react';
import { motion } from 'motion/react';

const nodeTypes = {
  topicNode: TopicNode,
};

const edgeTypes = {
  animatedEnergyEdge: AnimatedEnergyEdge,
};

export const NeuralGraphPage = () => {
  const { state } = useStudyBrain();
  const [activeSubject, setActiveSubject] = React.useState<'physics' | 'chemistry' | 'maths'>('physics');

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    return NeuralGraphEngine.generateGraph(state.chapters, activeSubject, state.chapterTelemetryMap);
  }, [state.chapters, activeSubject, state.chapterTelemetryMap]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes if chapters change (e.g. from completion)
  React.useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = NeuralGraphEngine.generateGraph(state.chapters, activeSubject, state.chapterTelemetryMap);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [state.chapters, activeSubject, state.chapterTelemetryMap, setNodes, setEdges]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full h-[calc(100vh-80px)] rounded-3xl overflow-hidden border border-zinc-800/50 shadow-2xl relative bg-[#030303]"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.5 }}
        minZoom={0.1}
        maxZoom={1.5}
        className="xyflow-dark"
      >
        <Background 
          color="#27272a" 
          variant={BackgroundVariant.Dots} 
          gap={30} 
          size={1.5} 
        />
        
        <Controls 
          className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden fill-zinc-400" 
          position="bottom-right"
        />

        <Panel position="top-center" className="m-4">
          <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/50 p-1.5 rounded-full shadow-2xl flex items-center gap-1 relative z-50">
            {(['physics', 'chemistry', 'maths'] as const).map(subject => (
              <button
                key={subject}
                onClick={() => setActiveSubject(subject)}
                className={`px-6 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all duration-300 ${
                  activeSubject === subject 
                    ? subject === 'physics' ? 'bg-sky-500/20 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)]'
                    : subject === 'chemistry' ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'bg-violet-500/20 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                }`}
              >
                {subject} Matrix
              </button>
            ))}
          </div>
        </Panel>

        <style>{`
          .xyflow-dark {
            --xy-node-boxshadow-hover: 0 0 20px rgba(255, 255, 255, 0.1);
            --xy-controls-button-bg-hover: #27272a;
          }
          .react-flow__controls-button {
            background: #18181b;
            border-bottom: 1px solid #27272a;
            fill: #a1a1aa;
          }
          .react-flow__controls-button:hover {
            background: #27272a;
          }
        `}</style>
      </ReactFlow>
    </motion.div>
  );
};
