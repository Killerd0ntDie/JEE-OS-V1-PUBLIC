export interface FocusScoreInput {
  interruptions: number;
  idleSeconds: number;
  uninterruptedSeconds: number;
}

export const calculateFocusScore = ({ interruptions, idleSeconds, uninterruptedSeconds }: FocusScoreInput) => {
  // Focus penalty is based purely on elapsed pause (idle) time. 2 points per minute.
  const idlePenalty = Math.floor(idleSeconds / 60) * 2;
  const recoveryBonus = Math.floor(uninterruptedSeconds / 60) * 1;

  const score = Math.round(100 - idlePenalty + recoveryBonus);
  return Math.min(100, Math.max(0, score));
};
