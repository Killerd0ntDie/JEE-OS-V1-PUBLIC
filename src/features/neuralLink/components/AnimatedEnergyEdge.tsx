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
          strokeWidth={isPrerequisite ? 5 : 3.5}
          strokeOpacity={isPrerequisite ? 0.35 : 0.22}
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
          strokeDasharray: isActive ? '4 4' : 'none',
          animation: isActive ? 'synapticConduitFlow 1.5s linear infinite' : 'none',
          opacity: isActive ? 0.9 : 0.3,
        }} 
      />

      {/* 3. Live Streaming Glowing Energy Pulses (Travelling Photons) */}
      {isActive && (
        <g className="pointer-events-none">
          {/* Primary Lead Pulse */}
          <circle r={isPrerequisite ? 3.5 : 2.8} fill={pulseColor} style={{ filter: `drop-shadow(0 0 6px ${glowStroke})` }}>
            <animateMotion
              dur={isPrerequisite ? '1.8s' : '2.4s'}
              repeatCount="indefinite"
              path={edgePath}
            />
            <animate
              attributeName="opacity"
              values="0.4;1;0.9;0.4"
              dur={isPrerequisite ? '1.8s' : '2.4s'}
              repeatCount="indefinite"
            />
          </circle>

          {/* Secondary Trailing Energy Sparkle */}
          <circle r={isPrerequisite ? 2.2 : 1.8} fill={glowStroke} style={{ filter: `drop-shadow(0 0 8px ${glowStroke})` }}>
            <animateMotion
              dur={isPrerequisite ? '1.8s' : '2.4s'}
              begin={isPrerequisite ? '0.9s' : '1.2s'}
              repeatCount="indefinite"
              path={edgePath}
            />
            <animate
              attributeName="opacity"
              values="0.2;0.8;0.2"
              dur={isPrerequisite ? '1.8s' : '2.4s'}
              repeatCount="indefinite"
            />
          </circle>
        </g>
      )}

      {isActive && (
        <style>
          {`
            @keyframes synapticConduitFlow {
              from {
                stroke-dashoffset: 16;
              }
              to {
                stroke-dashoffset: 0;
              }
            }
          `}
        </style>
      )}
    </>
  );
};
