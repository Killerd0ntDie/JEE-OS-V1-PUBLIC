import { describe, it, expect } from 'vitest';
import { DppMetadataAnalyzer } from './DppMetadataAnalyzer';

describe('DppMetadataAnalyzer', () => {
  it('cleanDppFileName segments joined JEE words and strips pdf extensions', () => {
    expect(DppMetadataAnalyzer.cleanDppFileName('ATOMICSTRUCTUREpdf.pdf')).toBe('atomic structure');
    expect(DppMetadataAnalyzer.cleanDppFileName('ChemicalBonding_DPP_01.pdf')).toBe('Chemical Bonding DPP 01');
    expect(DppMetadataAnalyzer.cleanDppFileName('WorkPowerEnergy_Exercise.pdf')).toBe('Work Power Energy Exercise');
  });

  it('heuristicAnalyzeDppMetadata detects coaching institute and subject', () => {
    const raw = 'ALLEN CAREER INSTITUTE KOTA RAJASTHAN\nEXERCISE-01 CHECK YOUR GRASP\n1. The centre of mass...';
    const res = DppMetadataAnalyzer.heuristicAnalyzeDppMetadata('Physics_DPP_1.pdf', raw, [
      { name: 'Centre of Mass', subject: 'physics' }
    ]);

    expect(res.detectedInstitute).toBe('Allen');
    expect(res.subject).toBe('physics');
    expect(res.chapterName).toBe('Centre of Mass');
  });
});
