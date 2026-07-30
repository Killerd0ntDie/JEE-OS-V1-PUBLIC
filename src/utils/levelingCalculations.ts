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
  const level = Math.floor(Math.sqrt(totalXP / 100)) + 1;
  const xpForCurrentLevel = 100 * Math.pow(level - 1, 2);
  const xpForNextLevel = 100 * Math.pow(level, 2);
  
  const currentLevelXP = totalXP - xpForCurrentLevel;
  const requiredForNextLevel = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = Math.min(100, Math.max(0, (currentLevelXP / requiredForNextLevel) * 100));
  
  return { 
    level, 
    currentLevelXP, 
    nextLevelXP: requiredForNextLevel, 
    progressPercent, 
    xpForCurrentLevel, 
    xpForNextLevel 
  };
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
