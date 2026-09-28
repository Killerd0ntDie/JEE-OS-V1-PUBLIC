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

  it('analyzeDppMetadata omits pdfBase64 when rawText has >= 150 characters to prevent payload bloat and timeouts', async () => {
    let capturedBody: any = null;
    const originalFetch = global.fetch;
    global.fetch = async (url: any, init: any) => {
      if (String(url).includes('/api/mocktest/analyze-dpp-metadata')) {
        capturedBody = JSON.parse(init.body);
        return {
          ok: true,
          json: async () => ({
            title: 'Allen Chemistry DPP - Chemical Bonding',
            sheetName: 'DPP #01',
            subject: 'chemistry',
            chapterName: 'Chemical Bonding',
            recommendedDurationMinutes: 45,
            questionCountEstimate: 15,
            detectedInstitute: 'Allen'
          })
        } as any;
      }
      return originalFetch(url, init);
    };

    try {
      const mockFile = new File(['dummy pdf content'], 'Chemical_Bonding_DPP_01.pdf', { type: 'application/pdf' });
      const longText = 'ALLEN CAREER INSTITUTE KOTA RAJASTHAN\nDPP #01 CHEMICAL BONDING AND MOLECULAR STRUCTURE\n' +
        '1. Which of the following species has maximum number of lone pairs?\n' +
        '2. The bond order of CO molecule is\n' +
        '3. Hybridization of central atom in SF6 is\n';

      const result = await DppMetadataAnalyzer.analyzeDppMetadata(mockFile, [
        { name: 'Chemical Bonding', subject: 'chemistry' }
      ], undefined, longText);

      expect(capturedBody).not.toBeNull();
      // Must omit pdfBase64 to save network latency & tokens!
      expect(capturedBody.pdfBase64).toBeUndefined();
      expect(capturedBody.rawText).toContain('ALLEN CAREER INSTITUTE');
      expect(result.detectedInstitute).toBe('Allen');
      expect(result.subject).toBe('chemistry');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
