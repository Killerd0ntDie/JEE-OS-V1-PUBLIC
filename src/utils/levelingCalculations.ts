/**
 * Standalone leveling calculations to avoid circular dependencies
 */

export interface LevelCalculationResult {
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPercent: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
}

/**
 * Calculate level from total XP
 * New scaling formula: XP requirements increase exponentially with level
 * Level 1-10: 500 XP per level
 * Level 11-20: 750 XP per level
 * Level 21-30: 1000 XP per level
 * Level 31-40: 1500 XP per level
 * Level 41-50: 2000 XP per level
 * Level 51+: 2500 XP per level
 */
export function calculateLevelFromXP(totalXP: number): LevelCalculationResult {
  let level = 1;
  let xpForCurrentLevel = 0;
  let xpForNextLevel = 500;
  let accumulatedXP = 0;

  // Calculate level based on tiered XP requirements
  while (accumulatedXP + getXpForLevel(level + 1) <= totalXP) {
    accumulatedXP += getXpForLevel(level);
    level++;
  }

  xpForCurrentLevel = accumulatedXP;
  xpForNextLevel = accumulatedXP + getXpForLevel(level);
  
  const currentLevelXP = totalXP - xpForCurrentLevel;
  const requiredForNextLevel = getXpForLevel(level);
  const progressPercent = Math.min(100, Math.max(0, (currentLevelXP / requiredForNextLevel) * 100));
  
  return { level, currentLevelXP, nextLevelXP: requiredForNextLevel, progressPercent, xpForCurrentLevel, xpForNextLevel };
}

/**
 * Get XP required for a specific level
 */
function getXpForLevel(level: number): number {
  if (level <= 10) return 500;
  if (level <= 20) return 750;
  if (level <= 30) return 1000;
  if (level <= 40) return 1500;
  if (level <= 50) return 2000;
  return 2500;
}

/**
 * Get title and color with increasing gaps between title changes
 * Level 1-3: Aspirant (gap: 3)
 * Level 4-7: Novice (gap: 4)
 * Level 8-12: Initiate (gap: 5)
 * Level 13-18: Scholar (gap: 6)
 * Level 19-25: Adept (gap: 7)
 * Level 26-33: Expert (gap: 8)
 * Level 34-42: Master (gap: 9)
 * Level 43-52: Grandmaster (gap: 10)
 * Level 53+: JEE Legend
 */
export function getTitleAndColor(level: number): { title: string; color: string } {
  if (level < 4) return { title: 'Aspirant', color: 'text-zinc-400' };
  if (level < 8) return { title: 'Novice', color: 'text-zinc-300' };
  if (level < 13) return { title: 'Initiate', color: 'text-zinc-200' };
  if (level < 19) return { title: 'Scholar', color: 'text-indigo-400' };
  if (level < 26) return { title: 'Adept', color: 'text-indigo-300' };
  if (level < 34) return { title: 'Expert', color: 'text-indigo-200' };
  if (level < 43) return { title: 'Master', color: 'text-amber-400' };
  if (level < 53) return { title: 'Grandmaster', color: 'text-amber-300' };
  return { title: 'JEE Legend', color: 'text-amber-200 font-bold' };
}
