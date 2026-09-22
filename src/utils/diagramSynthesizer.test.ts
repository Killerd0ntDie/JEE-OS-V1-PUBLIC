import { describe, it, expect } from 'vitest';
import {
  createSO3LewisSvg,
  SO3_STRUCTURE_A,
  SO3_STRUCTURE_B,
  SO3_STRUCTURE_C,
  SO3_STRUCTURE_D,
  synthesizeOptionDiagram
} from './diagramSynthesizer';

describe('diagramSynthesizer', () => {
  it('generates valid SVG for SO3 Lewis Structure A (3 double bonds)', () => {
    const svg = SO3_STRUCTURE_A;
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 160 120"');
    expect(svg).toContain('>S<');
    expect(svg).toContain('>O<');
    // 3 double bonds = 6 line tags
    const lineMatches = svg.match(/<line/g) || [];
    expect(lineMatches.length).toBe(6);
    // 3 oxygens * 4 dots each = 12 circle tags
    const circleMatches = svg.match(/<circle/g) || [];
    expect(circleMatches.length).toBe(12);
  });

  it('generates valid SVG for SO3 Lewis Structure B (1 double bond, 2 single bonds)', () => {
    const svg = SO3_STRUCTURE_B;
    // 1 double bond + 2 single bonds = 4 line tags
    const lineMatches = svg.match(/<line/g) || [];
    expect(lineMatches.length).toBe(4);
    // 1 oxygen * 4 dots + 2 oxygens * 6 dots = 16 circle tags
    const circleMatches = svg.match(/<circle/g) || [];
    expect(circleMatches.length).toBe(16);
  });

  it('generates valid SVG for SO3 Lewis Structure C (3 single bonds)', () => {
    const svg = SO3_STRUCTURE_C;
    // 3 single bonds = 3 line tags
    const lineMatches = svg.match(/<line/g) || [];
    expect(lineMatches.length).toBe(3);
    // 3 oxygens * 6 dots = 18 circle tags
    const circleMatches = svg.match(/<circle/g) || [];
    expect(circleMatches.length).toBe(18);
  });

  it('generates valid SVG for SO3 Lewis Structure D (2 double bonds, 1 single bond)', () => {
    const svg = SO3_STRUCTURE_D;
    // 2 double bonds + 1 single bond = 5 line tags
    const lineMatches = svg.match(/<line/g) || [];
    expect(lineMatches.length).toBe(5);
    // 2 oxygens * 4 dots + 1 oxygen * 6 dots = 14 circle tags
    const circleMatches = svg.match(/<circle/g) || [];
    expect(circleMatches.length).toBe(14);
  });

  it('converts textual descriptions of SO3 structures to SVG', () => {
    const q = 'Which of the following structure is the most preferred structure for SO3 ?';

    const optA = synthesizeOptionDiagram('Structure (A): S with three double bonds and 2 lone pairs on each oxygen', 0, q);
    expect(optA).toBe(SO3_STRUCTURE_A);

    const optB = synthesizeOptionDiagram('S with 1 double bond and 2 single bonds', 1, q);
    expect(optB).toBe(SO3_STRUCTURE_B);

    const optC = synthesizeOptionDiagram('Structure with three single bonds', 2, q);
    expect(optC).toBe(SO3_STRUCTURE_C);

    const optD = synthesizeOptionDiagram('S has two double bonds and one single bond', 3, q);
    expect(optD).toBe(SO3_STRUCTURE_D);
  });

  it('synthesizes diagrams for placeholder options when question is preferred structure for SO3', () => {
    const q = 'Which of the following structure is the most preferred structure for SO3 ?';

    expect(synthesizeOptionDiagram('Option (1)', 0, q)).toBe(SO3_STRUCTURE_A);
    expect(synthesizeOptionDiagram('Option (2)', 1, q)).toBe(SO3_STRUCTURE_B);
    expect(synthesizeOptionDiagram('Option (3)', 2, q)).toBe(SO3_STRUCTURE_C);
    expect(synthesizeOptionDiagram('Option (4)', 3, q)).toBe(SO3_STRUCTURE_D);
  });

  it('converts KaTeX matrix of SO3 to corresponding SVG', () => {
    const q = 'Which of the following structure is the most preferred structure for SO3 ?';
    const matrixA = '$$\\begin{matrix} & \\text{:O\\dots:} \\\\ & \\parallel \\\\ \\text{:O\\dots:} = & \\text{S} = \\text{:O\\dots:} \\end{matrix}$$';
    expect(synthesizeOptionDiagram(matrixA, 0, q)).toBe(SO3_STRUCTURE_A);
  });

  it('converts ASCII / KaTeX matrix approximations with ddot or equiv to SO3_STRUCTURE_D', () => {
    const q = 'Which of the following structure is the most preferred structure for SO3 ?';
    const asciiOptD = 'ö:\n/\n:ö:— S ≡ ö:';
    expect(synthesizeOptionDiagram(asciiOptD, 3, q)).toBe(SO3_STRUCTURE_D);
  });

  it('converts real-world AI-generated SO3 descriptions to SVG vector diagrams', () => {
    const qLatex = 'Which of the following structure is the most preferred structure for $\\text{SO}_3$?';

    const optA = synthesizeOptionDiagram('Structure (A): S atom bonded to three oxygen atoms with double bonds and zero formal charges', 0, qLatex);
    expect(optA).toBe(SO3_STRUCTURE_A);

    const optB = synthesizeOptionDiagram('Structure (B): S atom with single and double bonds', 1, qLatex);
    expect(optB).toBe(SO3_STRUCTURE_B);

    const optC = synthesizeOptionDiagram('Structure (C): S atom with single bonds only', 2, qLatex);
    expect(optC).toBe(SO3_STRUCTURE_C);

    const optD = synthesizeOptionDiagram('Structure (D): S atom with alternate coordination', 3, qLatex);
    expect(optD).toBe(SO3_STRUCTURE_D);
  });

  it('converts standalone structure descriptions even without questionContent', () => {
    expect(synthesizeOptionDiagram('Structure (A): S atom bonded to three oxygen atoms with double bonds and zero formal charges', 0)).toBe(SO3_STRUCTURE_A);
    expect(synthesizeOptionDiagram('Structure (B): S atom with single and double bonds', 1)).toBe(SO3_STRUCTURE_B);
    expect(synthesizeOptionDiagram('Structure (C): S atom with single bonds only', 2)).toBe(SO3_STRUCTURE_C);
    expect(synthesizeOptionDiagram('Structure (D): S atom with alternate coordination', 3)).toBe(SO3_STRUCTURE_D);
  });

  it('leaves non-diagram options untouched', () => {
    const q = 'Calculate the energy of photon';
    expect(synthesizeOptionDiagram('$1.54 \\times 10^6\\text{ m/s}$', 0, q)).toBe('$1.54 \\times 10^6\\text{ m/s}$');
    expect(synthesizeOptionDiagram('None of these', 3, q)).toBe('None of these');
  });
});
