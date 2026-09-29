import { SubjectId } from '../../types/index';

export function normalizeTwoDaySplitConfig(config?: any): [SubjectId[], SubjectId[], SubjectId[]] {
  const defaultTwoDayConfig: [SubjectId[], SubjectId[], SubjectId[]] = [
    ['physics', 'chemistry'],
    ['chemistry', 'maths'],
    ['maths', 'physics']
  ];
  if (!config) return defaultTwoDayConfig;
  const d0 = (Array.isArray(config[0]) ? config[0] : Array.isArray(config['0']) ? config['0'] : defaultTwoDayConfig[0]) as SubjectId[];
  const d1 = (Array.isArray(config[1]) ? config[1] : Array.isArray(config['1']) ? config['1'] : defaultTwoDayConfig[1]) as SubjectId[];
  const d2 = (Array.isArray(config[2]) ? config[2] : Array.isArray(config['2']) ? config['2'] : defaultTwoDayConfig[2]) as SubjectId[];
  return [d0, d1, d2];
}

export function getDayFocusPill(dayIdx: number, splitStrategy: string, twoDaySplitConfig?: any) {
  if (splitStrategy === '1_a_day_alternating') {
    return dayIdx % 3 === 0 ? 'PHYSICS ONLY' : dayIdx % 3 === 1 ? 'CHEMISTRY ONLY' : 'MATHS ONLY';
  } else if (splitStrategy === '2_a_day_alternating') {
    const config = normalizeTwoDaySplitConfig(twoDaySplitConfig);
    const pair = config[dayIdx % 3];
    const formatSubj = (s: SubjectId) => (s === 'physics' ? 'PHY' : s === 'chemistry' ? 'CHEM' : 'MATHS');
    return `${formatSubj(pair[0])} + ${formatSubj(pair[1])}`;
  } else {
    return 'ALL 3 SUBJS';
  }
}

export function getHeaderBadgeText(splitStrategy: string) {
  return splitStrategy === '1_a_day_alternating' 
    ? '1 Subject Focus' 
    : splitStrategy === '2_a_day_alternating' 
      ? '2 Subjects Alternating' 
      : '3 Subjects Daily';
}
