export interface FocusScoreInput {
  interruptions: number;
  idleSeconds: number;
  uninterruptedSeconds: number;
}

export const calculateFocusScore = ({ interruptions, idleSeconds, uninterruptedSeconds }: FocusScoreInput) => {
  // Focus penalty is based on elapsed pause (idle) time (2 points per min) and explicit interruptions (5 points each).
  const idlePenalty = Math.floor(idleSeconds / 60) * 2;
  const interruptionPenalty = interruptions * 5;
  const recoveryBonus = Math.floor(uninterruptedSeconds / 60) * 1;

  const score = Math.round(100 - idlePenalty - interruptionPenalty + recoveryBonus);
  return Math.min(100, Math.max(0, score));
};
