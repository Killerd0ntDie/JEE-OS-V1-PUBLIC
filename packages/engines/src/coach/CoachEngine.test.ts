import { describe, it, expect } from 'vitest';
import { CoachEngine } from './CoachEngine';

describe('CoachEngine (BUG-13: Chapter ID & Subject Integrity in Recommended Missions)', () => {
  const engine = new CoachEngine();

  it('correctly sets chapterId as the chapter id (not string name) and subject from the chapter object', async () => {
    const output = await engine.getAnalysis({
      question: 'Give me a physics syllabus plan',
      chapters: [
        {
          id: 'p-thermo-101',
          name: 'Thermodynamics & Heat Transfer',
          subject: 'physics',
          status: 'Learning',
          completion: 45
        }
      ] as any
    });

    expect(output.actions).toBeDefined();
    expect(output.actions.length).toBeGreaterThan(0);

    const missionAction = output.actions.find(a => a.type === 'ADD_MISSION');
    expect(missionAction).toBeDefined();
    expect(missionAction?.payload?.chapterId).toBe('p-thermo-101');
    expect(missionAction?.payload?.subject).toBe('physics');
    expect(missionAction?.payload?.title).toContain('Thermodynamics & Heat Transfer');
  }, 15000);
});
