import React from 'react';
import { BaseEdge, getBezierPath, EdgeProps } from '@xyflow/react';

export const AnimatedEnergyEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
}: EdgeProps) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isActive = data?.isActive ?? true;
  const isPrerequisite = data?.isPrerequisite ?? false;
  const subject = (data?.subject as string) || 'physics';

  // Dynamic Neon Subject Color Schemes
  const colorMap: Record<string, { stroke: string; glow: string; pulse: string }> = {
    physics: { stroke: '#0ea5e9', glow: '#38bdf8', pulse: '#ffffff' },
    chemistry: { stroke: '#10b981', glow: '#34d399', pulse: '#ffffff' },
    maths: { stroke: '#a855f7', glow: '#c084fc', pulse: '#ffffff' },
  };

  const colors = colorMap[subject] || colorMap.physics;
  const edgeStroke = isActive ? colors.stroke : '#3f3f46';
  const glowStroke = isActive ? colors.glow : 'transparent';
  const pulseColor = colors.pulse;

  return (
    <>
      {/* 1. Synaptic Ambient Neon Aura Glow (Underlayer) */}
      {isActive && (
        <path
          d={edgePath}
          fill="none"
          stroke={glowStroke}
          strokeWidth={isPrerequisite ? 4 : 2.5}
          strokeOpacity={isPrerequisite ? 0.35 : 0.18}
          strokeLinecap="round"
          className="pointer-events-none"
        />
      )}

      {/* 2. Core Energy Conduit Laser Line */}
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          stroke: edgeStroke,
          strokeWidth: isPrerequisite ? 2 : (isActive ? 1.5 : 1),
          strokeDasharray: isActive ? '6 6' : 'none',
          animation: isActive ? 'synapticConduitFlow 1.2s linear infinite' : 'none',
          opacity: isActive ? 0.9 : 0.3,
        }} 
      />
    </>
  );
};
