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

  const isActive = data?.isActive;

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          strokeDasharray: isActive ? '5 5' : 'none',
          animation: isActive ? 'flowAnimation 1s linear infinite' : 'none',
        }} 
      />
      {isActive && (
        <style>
          {`
            @keyframes flowAnimation {
              from {
                stroke-dashoffset: 10;
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
