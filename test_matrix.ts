import { generateWeeklyMatrix } from './packages/engines/src/planner/PlannerEngine.ts';

const chapters = [
  { name: 'Chemical Bonding', id: 'c1' }
];

const todayMissions = [
  { id: '1', chapter: 'Chemical Bonding', completed: true, timeSlot: '01:32 - 02:35', duration: 63, isManualOverride: false },
  { id: '2', chapter: 'Chemical Bonding', completed: false, timeSlot: undefined, duration: 60, isManualOverride: false }
];

const blocks = generateWeeklyMatrix('3_a_day', chapters as any, todayMissions as any, [], 0, null as any, [], {} as any, '07:00', '22:30', {});
console.log(blocks);
