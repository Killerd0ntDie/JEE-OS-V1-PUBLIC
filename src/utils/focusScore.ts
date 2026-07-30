export interface FocusScoreInput {
  interruptions: number;
  idleSeconds: number;
  uninterruptedSeconds: number;
}

export const calculateFocusScore = ({ interruptions, idleSeconds, uninterruptedSeconds }: FocusScoreInput) => {
  const interruptionPenalty = interruptions * 7;
  const idlePenalty = Math.floor(idleSeconds / 60) * 2;
  const recoveryBonus = Math.floor(uninterruptedSeconds / 60) * 1;

  const score = Math.round(100 - interruptionPenalty - idlePenalty + recoveryBonus);
  return Math.min(100, Math.max(0, score));
};
