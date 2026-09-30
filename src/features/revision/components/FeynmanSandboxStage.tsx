import React from 'react';
import { RevisionCardItem } from '@jee-os/engines';

export interface FeynmanSandboxStageProps {
  cards?: RevisionCardItem[];
  onBackToHub?: () => void;
}

/**
 * @deprecated The Feynman sandbox has been deprecated in favor of streamlined formula speed drills and timed active recall arena.
 */
export const FeynmanSandboxStage: React.FC<FeynmanSandboxStageProps> = () => {
  return null;
};
