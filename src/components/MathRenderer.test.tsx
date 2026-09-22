import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { RichTextRenderer, ExplanationRenderer, normalizeChemistryAndOrbitals, MathErrorBoundary } from './MathRenderer';

describe('RichTextRenderer', () => {
  it('renders bare numbers in options without stripping them to blank', () => {
    const { container } = render(<RichTextRenderer content="4" />);
    expect(container.textContent).toBe('4');
  });

  it('renders ratio options without stripping the leading number', () => {
    const { container } = render(<RichTextRenderer content="3 : 2" />);
    expect(container.textContent).toBe('3 : 2');
  });

  it('renders scientific notation without mangling leading decimals', () => {
    const { container } = render(<RichTextRenderer content="$1.2 \times 10^{-18}\text{ J}$" />);
    expect(container.textContent).toContain('1.2');
  });

  it('strips stray question markers like ] or Q27] from question content', () => {
    const { container: c1 } = render(<RichTextRenderer content="] If uncertainty in position and momentum" />);
    expect(c1.textContent).toBe('If uncertainty in position and momentum');

    const { container: c2 } = render(<RichTextRenderer content="Q27] What is the velocity" />);
    expect(c2.textContent).toBe('What is the velocity');
  });

  it('does NOT inject steps or modify multi-sentence questions in the test arena', () => {
    const questionText = "If the energy released, is used to dissociate 4 g of H2 molecules, equally into H+ and H*, where H* is excited state of H atoms where the electron travels in orbit whose circumference equal to four times its de Broglie's wavelength.";
    const { container } = render(<RichTextRenderer content={questionText} />);
    expect(container.textContent).not.toContain('STEP 1');
    expect(container.textContent).not.toContain('STEP 2');
    expect(container.textContent).not.toContain('[Math Error]');
    expect(container.textContent).toContain('If the energy released');
  });

  it('unwraps bare \\text{...} from Match List column options without leaking raw \\text', () => {
    const textOption = "\\text{(1) Trigonal bipyramidal and two lone pair of electrons}";
    const { container } = render(<RichTextRenderer content={textOption} />);
    expect(container.textContent).not.toContain('\\text');
    expect(container.textContent).toContain('(1) Trigonal bipyramidal and two lone pair of electrons');
  });

  it('auto-wraps bare complex ions in math mode without leaking raw LaTeX commands', () => {
    const complexIonsText = "{\\left[ TeBr6 \\right]}^{2-},\\ {\\left[ BrF2 \\right]}^{+},\\ SNF3,\\ \\text{and } {\\left[ XeF3 \\right]}^{-}";
    const { container } = render(<RichTextRenderer content={complexIonsText} />);
    expect(container.querySelector('.katex-display, .katex')).not.toBeNull();
    const katexHtml = container.querySelector('.katex-html');
    expect(katexHtml?.textContent).not.toContain('\\left');
    expect(katexHtml?.textContent).not.toContain('\\right');
    expect(katexHtml?.textContent).not.toContain('\\text{and');
    expect(katexHtml?.textContent).toContain('TeBr');
    expect(katexHtml?.textContent).toContain('XeF');
  });
});

describe('ExplanationRenderer', () => {
  it('unflattens compressed linear solutions into distinct vertical steps with display math', () => {
    const squashed = "Total energy difference to n = 2 state = 10.20 + 17.00 = 27.2 eV. Total energy difference to n = 3 state = 4.25 + 5.95 = 10.20 eV. Energy gap E_3 - E_2 = 27.2 - 10.20 = 17.0 eV = 13.6 Z^2 (1/4 - 1/9) = 13.6 Z^2 (5/36) => Z = 3.";
    const { container } = render(<ExplanationRenderer content={squashed} />);

    // Must have converted into multiple distinct steps and badges
    expect(container.textContent).toContain('STEP');
    expect(container.textContent).toContain('STEP 1');
    expect(container.textContent).toContain('STEP 2');
    expect(container.textContent).toContain('STEP 3');
    expect(container.textContent).toContain('RESULT');
    expect(container.textContent).toContain('27.2');
    expect(container.textContent).toContain('Z = 3');

    // Display math cards should be rendered
    const displayMathCards = container.querySelectorAll('.katex-display');
    expect(displayMathCards.length).toBeGreaterThanOrEqual(2);
  });

  it('renders structured step badges and display math cards for multi-line AI solutions', () => {
    const multiLineSolution = `
**Key Concept & Formula**:
$$\\Delta E = 13.6 Z^2 \\left(\\frac{1}{n_1^2} - \\frac{1}{n_2^2}\\right)\\text{ eV}$$

**Step 1: First Transition Calculation**:
Energy difference is given by:
$$10.20 + 17.00 = 27.20\\text{ eV}$$

**Conclusion & Correct Option**:
Hence, the correct atomic number is $Z = 3$.
    `.trim();

    const { container } = render(<ExplanationRenderer content={multiLineSolution} />);
    expect(container.textContent).toContain('Key Concept & Formula');
    expect(container.textContent).toContain('STEP');
    expect(container.textContent).toContain('RESULT');
    expect(container.querySelectorAll('.katex-display').length).toBeGreaterThanOrEqual(2);
  });

  it('renders inline LaTeX properly inside step headers without raw code or uppercase mangling', () => {
    const solutionWithMathInHeader = `
**Step 1: Identify parameters for Paschen series of $\\text{Li}^{2+}$**:
For Paschen series, lower state is $n_1 = 3$ and for $\\text{Li}^{2+}$, atomic number $Z = 3$.

**Conclusion & Correct Option**:
Hence, correct option is (c).
    `.trim();

    const { container } = render(<ExplanationRenderer content={solutionWithMathInHeader} />);
    expect(container.textContent).toContain('STEP 1');
    expect(container.textContent).toContain('Identify parameters for Paschen series of');
    // Should render Li2+ through KaTeX without raw \TEXT or \text
    expect(container.textContent).not.toContain('\\TEXT');
    expect(container.textContent).not.toContain('\\text{LI}');
    expect(container.textContent).toContain('Li');
  });

  it('renders step headers when bolding only surrounds Step number (e.g. **Step 1:** Title)', () => {
    const solution = `
**Step 1:** Determine transition wavelength for $\\text{He}^{+}$
By Rydberg formula:
$$1/\\lambda = R Z^2 (1/n_1^2 - 1/n_2^2)$$

**Conclusion & Correct Option**: The wavelength is $300\\text{ nm}$.
    `.trim();

    const { container } = render(<ExplanationRenderer content={solution} />);
    expect(container.textContent).toContain('STEP 1');
    expect(container.textContent).toContain('Determine transition wavelength for');
    expect(container.querySelector('.katex')).not.toBeNull();
    expect(container.textContent).toContain('He');
  });

  it('renders questions containing LaTeX \\( ... \\) delimiters without displaying literal brackets', () => {
    const questionText = "Light of wavelength (\\(\\lambda\\)) strikes a metal surface with intensity \\(X\\) and the metal emits \\(Y\\) electrons per second of maximum kinetic energy \\(Z\\).";
    const { container } = render(<RichTextRenderer content={questionText} />);
    expect(container.textContent).not.toContain('\\(');
    expect(container.textContent).not.toContain('\\)');
    expect(container.querySelector('.katex')).not.toBeNull();
  });

  it('sorts linear paragraphs titled Key Concept with embedded Step 1 and Step 2 into individual step cards', () => {
    const linearBlob = "• Key Concept\nFor s, p, d, f, g orbitals, azimuthal quantum numbers are $l = 0, 1, 2, 3, 4$ respectively. **Step 1**: Number of orbitals in a subshell is $2l + 1$. **Step 2**: For g-type ($l = 4$), number of orbitals = $2(4) + 1 = 9$. **Conclusion & Correct Option**: Correct Option: (c).";
    const { container } = render(<ExplanationRenderer content={linearBlob} />);

    expect(container.textContent).toContain('Key Concept & Formula');
    expect(container.textContent).toContain('STEP 1');
    expect(container.textContent).toContain('STEP 2');
    expect(container.textContent).toContain('RESULT');
    expect(container.textContent).toContain('Number of orbitals in a subshell is');
    expect(container.textContent).toContain('Correct Option: (c)');
  });

  it('cleanly separates Key Concept, Step 1, and Conclusion into clean cards without raw bold asterisks in math', () => {
    const inlineBlob = "**Key Concept**: The distance of closest approach ($r_0$) is given by $r_0 = \\frac{1}{4\\pi\\epsilon_0} \\frac{2Z e^2}{\\frac{1}{2}m v^2}. Since $e/m$ and speed $v$ are the same. **Step 1**: Both particles experience the same electrostatic repulsion. **Conclusion & Correct Option**: Therefore, the distance of closest approach is the same for both. Correct Option: (a).";
    const { container } = render(<ExplanationRenderer content={inlineBlob} />);

    expect(container.textContent).toContain('Key Concept & Formula');
    expect(container.textContent).toContain('STEP 1');
    expect(container.textContent).toContain('RESULT');
    expect(container.textContent).not.toContain('**Key Concept**');
    expect(container.textContent).not.toContain('**Step 1**');
    expect(container.textContent).not.toContain('**Conclusion');
  });

  it('accurately formats Question 17 with \\pi, :\\n(i), \\quad, and orbital underscores (p_y - p_y, d_xy - d_xy)', () => {
    const rawQ17 = 'Consider y-axis as internuclear axis, how many of following will lead to \\pi bond formation :\\n(i) p_y - p_y \\quad (ii) p_x - p_x \\quad (iii) p_z - p_z \\quad (iv) d_xy - d_xy \\quad (v) d_yz - d_yz \\quad (vi) p_x - d_xy \\quad (vii) d_xy - p_z \\quad (viii) d_xz - d_xz';
    const { container } = render(<RichTextRenderer content={rawQ17} />);
    expect(container.textContent).not.toContain('\\quad');
    expect(container.textContent).not.toContain('\\n(i)');
    expect(container.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(8);
  });

  it('repairs broken arrows like ightarrow and formats orbital bullet lines in explanations', () => {
    const rawExplanation = `**Key Concept & Formula**: When y-axis is internuclear axis, head-on overlap gives \\sigma bonds, lateral overlap gives \\pi bonds.
**Step 1**: Along y-axis:
- p_y - p_y: head-on $ ightarrow \\sigma$
- p_x - p_x: sideways $ ightarrow \\pi$
- d_xy - d_xy: sideways $ ightarrow \\pi$
**Conclusion & Correct Option**: Total valid interactions = 5.`;

    const { container } = render(<ExplanationRenderer content={rawExplanation} />);
    expect(container.textContent).not.toContain('$ ightarrow');
    expect(container.textContent).not.toContain('$ightarrow');
    expect(container.textContent).toContain('STEP 1');
    expect(container.querySelectorAll('.katex').length).toBeGreaterThan(0);
  });

  it('renders authentic chemical structure descriptions and formulas cleanly in options', () => {
    const optDesc = 'Structure (A): S with three double bonds and 2 lone pairs on each oxygen';
    const { container } = render(<RichTextRenderer content={optDesc} optIndex={0} />);
    expect(container.textContent).toContain('Structure (A): S with three double bonds');
  });

  it('renders authentic options with formulas and charges without mangling', () => {
    const q = 'Which of the following structure is the most preferred structure for SO3?';
    const opts = [
      'Structure (A): S atom bonded to three oxygen atoms with double bonds and zero formal charges',
      'Structure (B): S atom with single and double bonds',
      'Structure (C): S atom with single bonds only',
      'Structure (D): S atom with alternate coordination'
    ];

    opts.forEach((opt, idx) => {
      const { container } = render(<RichTextRenderer content={opt} optIndex={idx} questionContent={q} />);
      expect(container.textContent).toContain('Structure');
    });
  });

  it('handles multi-line SVG strings without breaking into plain text', () => {
    const multiLineSvg = `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
      <line x1="77" y1="40" x2="77" y2="70" stroke="#38bdf8"/>
      <text x="80" y="88">S</text>
    </svg>`;
    const { container } = render(<RichTextRenderer content={multiLineSvg} />);
    const svgEl = container.querySelector('svg');
    expect(svgEl).not.toBeNull();
  });

  it('renders chemical resonance chains (e.g. hydrazoic acid Question 6) with KaTeX and preserves longrightarrow', () => {
    const q6Text = "For hydrazoic acid, which of the following resonating structure will be least stable?\n\\text{H}-\\text{N}=\\text{N}^+=\\text{N}^- (\\text{I}) \\longrightarrow \\text{H}-\\text{N}^+-\\text{N}=\\text{N}^{2-} (\\text{II}) \\longrightarrow \\text{H}-\\text{N}^--\\text{N}^+ \\equiv \\text{N} (\\text{III})";
    const { container } = render(<RichTextRenderer content={q6Text} />);
    // Must NOT contain corrupted \longr\rightarrow control sequence
    expect(container.textContent).not.toContain('\\longr\\rightarrow');
    expect(container.textContent).not.toContain('longr\\rightarrow');
    expect(container.textContent).not.toContain('\\longr ');
    // Must render through KaTeX and display arrow glyphs in katex-html
    const katexHtml = container.querySelector('.katex-html');
    expect(katexHtml).not.toBeNull();
    expect(katexHtml?.textContent).toContain('⟶');
    expect(katexHtml?.textContent).not.toContain('\\text{H}');
    expect(katexHtml?.textContent).not.toContain('\\longrightarrow');
  });
  it('renders markdown headings, lists, blockquotes, and inline code properly', () => {
    const aiResponse = `### The Examiner Trap You Fell Into
In this problem, notice the boundary condition:
- **Sign Error**: Forgetting the negative sign in $\\Delta H$
- **Units**: Mixing $\\text{J}$ with $\\text{kJ}$
1. Calculate moles cleanly
2. Check extreme limit as $T \\rightarrow 0$
> Always test the zero limit before selecting an option!
Use \`q = mc\\Delta T\` for heat transfer.`;

    const { container } = render(<RichTextRenderer content={aiResponse} />);
    
    // Check heading rendered as styled heading without raw ###
    const h5 = container.querySelector('h5');
    expect(h5).not.toBeNull();
    expect(h5?.textContent).toContain('The Examiner Trap You Fell Into');
    expect(container.textContent).not.toContain('###');

    // Check bullet items
    expect(container.textContent).toContain('Sign Error');
    expect(container.textContent).toContain('Units');

    // Check numbered items
    expect(container.textContent).toContain('1.');
    expect(container.textContent).toContain('Calculate moles cleanly');
    expect(container.textContent).toContain('2.');
    expect(container.textContent).toContain('Check extreme limit as');

    // Check blockquote
    const quote = container.querySelector('blockquote');
    expect(quote).not.toBeNull();
    expect(quote?.textContent).toContain('Always test the zero limit');

    // Check inline code
    const code = container.querySelector('code');
    expect(code).not.toBeNull();
    expect(code?.textContent).toBe('q = mc\\Delta T');
  });

  it('renders multi-line display math without splitting or failing', () => {
    const multiLineMath = `We derive the equation:
$$
\\int_0^R \\rho(r) 4\\pi r^2 dr = M
$$
This gives total mass.`;

    const { container } = render(<RichTextRenderer content={multiLineMath} />);
    expect(container.textContent).toContain('We derive the equation:');
    expect(container.textContent).toContain('This gives total mass.');
    expect(container.querySelectorAll('.katex-display').length).toBe(1);
  });

  it('renders multi-line bracket math \\[...\\] without raw delimiters', () => {
    const bracketMath = `Using standard formula:
\\[
H_{\\max} = \\frac{u^2 \\sin^2\\theta}{2g}
\\]
which completes derivation.`;

    const { container } = render(<RichTextRenderer content={bracketMath} />);
    expect(container.textContent).not.toContain('\\[');
    expect(container.textContent).not.toContain('\\]');
    expect(container.querySelectorAll('.katex-display').length).toBe(1);
  });

  it('renders bare LaTeX commands in prose through KaTeX', () => {
    const prose = `The projectile reaches height \\frac{v^2}{2g} with speed \\sqrt{2gR} at peak.`;
    const { container } = render(<RichTextRenderer content={prose} />);
    const katexElements = container.querySelectorAll('.katex-html');
    expect(katexElements.length).toBeGreaterThanOrEqual(2);
    // Neither katex-html element should contain raw unparsed slash commands
    katexElements.forEach(el => {
      expect(el.textContent).not.toContain('\\frac');
      expect(el.textContent).not.toContain('\\sqrt');
    });
  });

  it('preserves full question text for questions mentioning SO3 and double bonds', () => {
    const question = 'Which of the following resonance structures of SO3 has three double bonds and minimum formal charge?';
    const { container } = render(<RichTextRenderer content={question} />);
    // Question text must be preserved and fully visible
    expect(container.textContent).toContain('Which of the following resonance structures of');
    expect(container.textContent).toContain('three double bonds and minimum formal charge?');
    // It should NOT replace the entire question with a standalone option SVG
    expect(container.querySelector('.so3-lewis-diagram')).toBeNull();
  });

  it('renders both question text and diagram for questions containing inline SVG', () => {
    const questionWithSvg = `Consider the circuit diagram shown below:
<svg viewBox="0 0 100 100" width="100" height="100">
  <circle cx="50" cy="50" r="40" stroke="green" />
</svg>
Calculate the equivalent resistance between terminals A and B.`;

    const { container } = render(<RichTextRenderer content={questionWithSvg} />);
    expect(container.textContent).toContain('Consider the circuit diagram shown below:');
    expect(container.textContent).toContain('Calculate the equivalent resistance between terminals A and B.');
    const svgEl = container.querySelector('svg');
    expect(svgEl).not.toBeNull();
    expect(container.querySelector('circle')).not.toBeNull();
  });

  it('strips redundant ### hashes from bullet headings in AI Mentor explanations', () => {
    const aiMentorText = `• ### The Core Formula: Energy Conservation
In any distance of closest approach problem, energy is conserved.`;
    const { container } = render(<RichTextRenderer content={aiMentorText} />);
    expect(container.textContent).not.toContain('###');
    expect(container.textContent).toContain('The Core Formula: Energy Conservation');
    expect(container.textContent).toContain('In any distance of closest approach problem');
  });

  it('balances unclosed dollar delimiters and renders Lewis ion formulas cleanly', () => {
    const rawQuestion = `Which of the following Lewis diagram is/are incorrect?
(A) $\\text{Na}^+[\\ddot{\\text{O}}-\\dot{\\text{Cl}}:]^-
(B) \\text{CCl}_4$ structure with 4 chlorine atoms
(C) Ammonium ion structure NH_4^+
(D) Hydrazine structure N_2H_4`;

    const { container } = render(<RichTextRenderer content={rawQuestion} />);
    expect(container.textContent).toContain('Which of the following Lewis diagram is/are incorrect?');
    expect(container.textContent).not.toContain('\\text{CCl}_4$');
    expect(container.textContent).toContain('structure with 4 chlorine atoms');
    // KaTeX should render the math components without throwing syntax errors
    const katexNodes = container.querySelectorAll('.katex');
    expect(katexNodes.length).toBeGreaterThanOrEqual(2);
  });

  it('formats thermodynamic entropy derivations without raw unparsed LaTeX or duplicate step titles', () => {
    const rawEntropy = `Entropy is a state function. $\\Delta S_{\\text{total}} = \\Delta S_{\\text{isothermal}} + \\Delta S_{\\text{isochoric}}
For isothermal expansion of 1 mole of ideal gas: $\\Delta S_1 = nR \\ln\\left(\\frac{V_2}{V_1}\\right) = (1)R \\ln\\left(\\frac{2V_1}{V_1}\\right) = R \\ln 2
For isochoric heating from $T$ to $2T$: $\\Delta S_2 = \\int \\frac{nC_{v,m} dT}{T} = C_{v,m} \\ln\\left(\\frac{2T}{T}\\right) = \\frac{3}{2}R \\ln 2
Total entropy change $\\Delta S_{\\text{total}} = R \\ln 2 + \\frac{3}{2}R \\ln 2 = \\frac{5}{2}R \\ln 2`;

    const { container } = render(<ExplanationRenderer content={rawEntropy} />);

    // Must not contain duplicate "[STEP 1] Step 1"
    expect(container.textContent).not.toMatch(/STEP\s*1\s*Step\s*1/);
    // Must render KaTeX elements properly
    const katexNodes = container.querySelectorAll('.katex');
    expect(katexNodes.length).toBeGreaterThanOrEqual(4);
    // Must not have unparsed dollar formulas or error strings in text
    expect(container.textContent).not.toContain('$\\Delta');
    expect(container.textContent).not.toContain('$\\text');
    // The visual katex-html render must not contain raw LaTeX commands
    const katexHtmls = container.querySelectorAll('.katex-html');
    expect(katexHtmls.length).toBeGreaterThanOrEqual(4);
    katexHtmls.forEach(kh => {
      expect(kh.textContent).not.toContain('\\text');
      expect(kh.textContent).not.toContain('\\ln');
      expect(kh.textContent).not.toContain('\\frac');
    });
  });

  it('renders authentic chemical formulas and descriptions for Question 19 options without mangling', () => {
    const q19Text = 'Which of the following Lewis diagram is/are incorrect? (A) Na+[: Ö - Cl :]^- (B) CCl4 structure (C) Ammonium ion structure (D) N2H4 structure';
    const optA = '\\text{Na}^+\\text{[:\\ddot{O}-\\text{Cl}:]}^-';
    const optB = 'CCl_4\\text{ tetrahedral}';
    const optC = '\\text{Ammonium ion } \\text{NH}_4^+';
    const optD = '\\text{Hydrazine } \\text{N}_2\\text{H}_4';

    const { container: cA } = render(<RichTextRenderer content={optA} optIndex={0} questionContent={q19Text} />);
    expect(cA.textContent).toContain('Na');
    expect(cA.textContent).toContain('Cl');
    // Ensure it renders through KaTeX
    expect(cA.querySelector('.katex')).not.toBeNull();

    const { container: cB } = render(<RichTextRenderer content={optB} optIndex={1} questionContent={q19Text} />);
    expect(cB.textContent).toContain('tetrahedral');

    const { container: cC } = render(<RichTextRenderer content={optC} optIndex={2} questionContent={q19Text} />);
    expect(cC.textContent).toContain('Ammonium ion');

    const { container: cD } = render(<RichTextRenderer content={optD} optIndex={3} questionContent={q19Text} />);
    expect(cD.textContent).toContain('Hydrazine');
  });

  it('unwraps sentence-level \\text{...} wrappers into natural prose with inline math', () => {
    const rawOpt = '\\text{All } d_{\\text{C-O}} \\text{ in } \\text{H}_2\\text{CO}_3 \\text{ are identical.}';
    const { container } = render(<RichTextRenderer content={rawOpt} optIndex={0} />);
    expect(container.textContent).not.toContain('\\text{All }');
    expect(container.textContent).not.toContain('\\text{ are identical.}');
    expect(container.textContent).toContain('All');
    expect(container.textContent).toContain('are identical');
    expect(container.querySelector('.katex')).not.toBeNull();
  });

  it('unwraps full statement \\text{...} with chemical formulas like BF3 and back bonding', () => {
    const rawOpt = '\\text{Bond angles are not affected in } \\text{BF}_3 \\text{ due to back bonding.}';
    const { container } = render(<RichTextRenderer content={rawOpt} optIndex={0} />);
    expect(container.textContent).not.toContain('\\text{Bond angles');
    expect(container.textContent).not.toContain('\\text{ due to');
    expect(container.textContent).toContain('Bond angles are not affected in');
    expect(container.textContent).toContain('due to back bonding');
    expect(container.querySelector('.katex')).not.toBeNull();
  });

  it('unwraps all above statements are incorrect', () => {
    const rawOpt = '\\text{All above statements are incorrect}';
    const { container } = render(<RichTextRenderer content={rawOpt} optIndex={3} />);
    expect(container.textContent).toBe('All above statements are incorrect');
  });

  it('does NOT turn > 120° in options into a blockquote', () => {
    const rawOpt = '> 120^\\circ';
    const { container } = render(<RichTextRenderer content={rawOpt} optIndex={2} />);
    expect(container.querySelector('blockquote')).toBeNull();
    expect(container.textContent).toContain('>');
    expect(container.textContent).toContain('120');
  });

  it('renders \\widehat{...} angle notations cleanly via KaTeX', () => {
    const rawAngle = '\\widehat{\\text{HCH}} (\\text{in } \\text{H}_2\\text{CO}) < \\widehat{\\text{FCF}} (\\text{in } \\text{F}_2\\text{CO})';
    const { container } = render(<RichTextRenderer content={rawAngle} optIndex={2} />);
    const katexHtml = container.querySelector('.katex-html');
    expect(katexHtml).not.toBeNull();
    expect(katexHtml?.textContent).toContain('HCH');
    expect(container.textContent).toContain('HCH');
  });

  it('renders attached diagram imageUrl directly in RichTextRenderer', () => {
    const fakeImg = 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAQAcJaACdLoAAP7/2QAAAA==';
    const { container } = render(
      <RichTextRenderer 
        content="Which of the following statements is correct for SO2Cl2?" 
        imageUrl={fakeImg} 
      />
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe(fakeImg);
    expect(container.textContent).toContain('SO2Cl2');
  });

  it('renders inline SVG diagram with text before and after without ReferenceError', () => {
    const svgLine = 'Consider the following structure: <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /></svg> where radius $r = 40$.';
    const { container } = render(<RichTextRenderer content={svgLine} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(container.textContent).toContain('Consider the following structure:');
    expect(container.textContent).toContain('where radius');
  });

  it('splits inline question sub-items onto distinct lines', () => {
    const wallOfText = 'Consider the following species: i] NO -> NO+ ii] O2- -> O2(2-) iii] N2 -> N2+ Then the magnetic nature of species is';
    const { container } = render(<RichTextRenderer content={wallOfText} />);
    // Should break into multiple lines
    const lineElements = container.querySelectorAll('.space-y-3 > div');
    expect(lineElements.length).toBeGreaterThanOrEqual(4);
    expect(lineElements[1].textContent).toContain('i]');
    expect(lineElements[1].textContent).toContain('NO');
    expect(lineElements[2].textContent).toContain('ii]');
    expect(lineElements[2].textContent).toContain('O2');
    expect(lineElements[3].textContent).toContain('iii]');
    expect(lineElements[3].textContent).toContain('N2');
    expect(lineElements[4].textContent).toContain('Then the magnetic nature');
  });

  it('formats ion charges with braced bases to prevent KaTeX sub/superscript collisions', () => {
    const rawIons = 'Compare bond lengths of $O_2$, $O_2^+$, and $O_2^{2-}$';
    const { container } = render(<RichTextRenderer content={rawIons} />);
    expect(container.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(3);
    // Should render without error
    expect(container.textContent).not.toContain('[Math Error]');
  });

  it('never replaces chemical options like H2SO4 and SO3 with synthetic SVG diagrams', () => {
    const optContent = 'CO2 and SO3';
    const { container } = render(<RichTextRenderer content={optContent} optIndex={2} />);
    expect(container.querySelector('svg')).toBeNull();
    expect(container.textContent).toContain('CO2 and SO3');
  });

  it('splits multi-variable definitions in Question 79 and 85 into distinct bullet points', () => {
    const q79 = 'Calculate the value of (x + y + z) for diatomic molecules Where x = total number of d-orbitals y = total number of non-axial d-orbitals z = total number of planar nodes';
    const { container } = render(<RichTextRenderer content={q79} />);
    expect(container.textContent).toContain('Where:');
    expect(container.textContent).toContain('x = total number of d-orbitals');
    expect(container.textContent).toContain('y = total number of non-axial d-orbitals');
    expect(container.textContent).toContain('z = total number of planar nodes');
    const bullets = container.querySelectorAll('.rounded-full');
    expect(bullets.length).toBeGreaterThanOrEqual(3);
  });

  it('splits multi-variable definitions with where P = ... Q = ... R = ...', () => {
    const q85 = 'Find the value of (R + Q - P) where P = number of bonding pairs Q = number of lone pairs R = total coordination number';
    const { container } = render(<RichTextRenderer content={q85} />);
    expect(container.textContent).toContain('where:');
    expect(container.textContent).toContain('P = number of bonding pairs');
    expect(container.textContent).toContain('Q = number of lone pairs');
    expect(container.textContent).toContain('R = total coordination number');
    const bullets = container.querySelectorAll('.rounded-full');
    expect(bullets.length).toBeGreaterThanOrEqual(3);
  });

  it('safely suppresses cached synthetic Lewis diagram SVGs in options of unrelated questions', () => {
    const leakedSvgOption = '<svg class="so3-lewis-diagram" viewBox="0 0 200 200"><circle cx="100" cy="100" r="50"/></svg>';
    const { container } = render(<RichTextRenderer content={leakedSvgOption} optIndex={1} />);
    // Synthetic diagram should be blocked
    expect(container.querySelector('svg.so3-lewis-diagram')).toBeNull();
    expect(container.textContent).toContain('Option (B)');
  });

  it('unpacks prose trapped inside math delimiters in Q49 preserving natural spaces and bullet points', () => {
    const q49Trapped = `Calculate expression (x + y + z) for diatomic molecules.

Where $x = total number of singly occupied molecular orbital (SOMO) in O2, y = total number of singly occupied molecular orbital (SOMO) in B2, z = total number of singly occupied molecular orbital (SOMO) in NO$`;
    const { container } = render(<RichTextRenderer content={q49Trapped} />);
    // Natural English spaces must be preserved
    expect(container.textContent).toContain('total number of singly occupied molecular orbital');
    expect(container.textContent).not.toContain('totalnumberofsinglyoccupied');
    // Bullet points should separate the definitions
    const bullets = container.querySelectorAll('.rounded-full');
    expect(bullets.length).toBeGreaterThanOrEqual(3);
  });

  it('unpacks prose trapped inside math delimiters in Q55 with oxyanions and bullet points', () => {
    const q55Trapped = `Consider the following oxyanions: PO 4 3- , P 2 O 6 4- , SO 4 2- , MnO 4 - , CrO 4 2- , S 2 O 5 2- , S 2 O 7 2- and find the value of R + Q – P where $P = Number of oxy anions having three equivalent X – O bonds per central atom, Q = Number of oxy anions having two equivalent X – O bonds per central atom, R = Number of oxy anions having four equivalent X – O bonds per central atom$`;
    const { container } = render(<RichTextRenderer content={q55Trapped} />);
    expect(container.textContent).toContain('Number of oxy anions having three equivalent');
    expect(container.textContent).not.toContain('Numberofoxyanionshaving');
    const bullets = container.querySelectorAll('.rounded-full');
    expect(bullets.length).toBeGreaterThanOrEqual(3);
  });

  it('formats oxyanion charges with clean base and thin space to avoid vertical stacking collision in KaTeX', () => {
    const res = normalizeChemistryAndOrbitals('PO4 3-, P2O6 4-, SO4 2-, CrO4 2-, CO3 2-');
    expect(res).toContain('{\\text{PO}_4}^{3-}');
    expect(res).toContain('{\\text{P}_2\\text{O}_6}^{4-}');
    expect(res).toContain('\\text{SO}_4^{\\,2-}');
    expect(res).toContain('{\\text{CrO}_4}^{2-}');
    expect(res).toContain('\\text{CO}_3^{\\,2-}');
  });

  it('prevents orbital regex from corrupting English words like and y into and_{y}', () => {
    const res = normalizeChemistryAndOrbitals('Compound SO3 has x bond pairs and y lone pairs. Calculate value of x + y.');
    expect(res).not.toContain('and_{y}');
    expect(res).toContain('and y');
  });

  it('repairs broken OCR resonance arrows and renders resonance chains cleanly', () => {
    const q6Text = `For hydrazoic acid, which of the following resonating structure will be least stable?
\\text{H} - \\text{N} = \\text{N}^+ = \\text{N}^- (\\text{I}) \\longleftr\\rightarrow \\text{H} - \\text{N}^+ - \\text{N} \\equiv \\text{N}^{2-} (\\text{II}) \\longleftr\\rightarrow \\text{H} - \\text{N}^- - \\text{N}^+ \\equiv \\text{N} (\\text{III})`;

    const { container } = render(<RichTextRenderer content={q6Text} />);
    expect(container.textContent).toContain('For hydrazoic acid');
    expect(container.textContent).not.toContain('\\longleftr\\rightarrow');
    // KaTeX should render the arrows
    expect(container.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(1);
  });

  it('formats hydrazoic acid resonating structures with (I), (II), (III) displayed under formulas without bullet or separated H', () => {
    const messyQ6 = `For hydrazoic acid, which of the following resonating structure will be least stable?
H -
• N = N^+ = N^- <---> H - N^+ - N^+ = N^2- <---> H - N^- - N^+ = N(I)
(II) (III)`;

    const { container } = render(<RichTextRenderer content={messyQ6} />);
    expect(container.textContent).toContain('For hydrazoic acid');
    // Bullet • should NOT be rendered in the question body
    expect(container.textContent).not.toContain('•');
    // KaTeX should render the resonance formulas with \underset in a display card
    expect(container.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(1);
    const blockMath = container.querySelector('.katex-display');
    expect(blockMath).toBeInTheDocument();
  });

  it('normalizes spaced OCR formulas like Cl 2 O 7, sp 3, and O 2 bullet ion cleanly', () => {
    const q11 = normalizeChemistryAndOrbitals('In the molecule of Cl 2 O 7, oxygen atom will be sp 3 hybridized and will have two one pairs on it.');
    expect(q11).toContain('\\text{Cl}_2\\text{O}_7');
    expect(q11).toContain('sp^3');
    expect(q11).toContain('two lone pairs');

    const q12 = normalizeChemistryAndOrbitals('During change of O 2 to O 2 • ion, the electron adds in which one of the following orbitals?');
    expect(q12).toContain('$\\text{O}_2$');
    expect(q12).toContain('\\text{O}_2^-\\text{ ion}');
  });

  it('normalizes molecular orbitals with asterisks and orbital comparison chains', () => {
    const optOrb = normalizeChemistryAndOrbitals('\\sigma * 2p_z orbital and \\pi * 2p_x / \\pi * 2p_y orbital');
    expect(optOrb).toContain('$\\sigma^* 2p_z$');
    expect(optOrb).toContain('$\\pi^* 2p_x$');
    expect(optOrb).toContain('$\\pi^* 2p_y$');

    const q41 = normalizeChemistryAndOrbitals('\\% s-character : sp^3 > sp^2 > sp and all angles in CH2F2 are not identical');
    expect(q41).not.toContain('\\%');
    expect(q41).toContain('% s-character');
    expect(q41).toContain('$sp^3 > sp^2 > sp$');
    expect(q41).toContain('\\text{CH}_2\\text{F}_2');
  });

  it('renders Question 12 seamlessly without purple bullet dot or fragmented sentence lines', () => {
    const rawQ12 = 'During change of O2 to O2\n• ion, the electron adds in which one of the following\norbitals?';
    const { container } = render(<RichTextRenderer content={rawQ12} />);
    
    // There should be NO purple bullet dots rendered
    const bullets = container.querySelectorAll('.rounded-full');
    expect(bullets.length).toBe(0);

    // Sentence should be unified in a single block without fragmented lines
    const lineElements = container.querySelectorAll('.space-y-3 > div');
    expect(lineElements.length).toBe(1);

    // Chemical symbols O2 and O2- ion should be rendered with KaTeX
    expect(container.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(2);
    expect(container.textContent).toContain('During change of');
    expect(container.textContent).toContain('electron adds in which one of the following orbitals?');
  });

  it('heals leading commas in options and renders combination options cleanly in RichTextRenderer', () => {
    // A corrupted option with leading comma: ", (C), (D)"
    const { container: cA } = render(<RichTextRenderer content=", (C), (D)" optIndex={0} />);
    expect(cA.textContent?.startsWith(',')).toBe(false);
    expect(cA.textContent).toContain('(A), (C), (D)');

    const { container: cB } = render(<RichTextRenderer content=", (C)" optIndex={1} />);
    expect(cB.textContent?.startsWith(',')).toBe(false);
    expect(cB.textContent).toContain('(A), (C)');

    const { container: cC } = render(<RichTextRenderer content=", (B), (C)" optIndex={2} />);
    expect(cC.textContent?.startsWith(',')).toBe(false);
    expect(cC.textContent).toContain('(A), (B), (C)');

    // Combination option should render cleanly without leading punctuation
    const { container: cCombo } = render(<RichTextRenderer content="(A), (C), (D)" optIndex={0} />);
    expect(cCombo.textContent).toBe('(A), (C), (D)');
  });

  it('catches corrupted LaTeX rendering crashes gracefully with fallback plain text using MathErrorBoundary', () => {
    const BadComponent = () => {
      throw new Error('Fatal KaTeX parse exception in AST');
    };
    const { container } = render(
      <MathErrorBoundary fallbackText="Corrupted Math Expression">
        <BadComponent />
      </MathErrorBoundary>
    );
    expect(container.textContent).toContain('Corrupted Math Expression');
  });

  it('re-joins isolated Greek and math symbols split across lines by PDF baseline shifts', () => {
    const splitQuestion = "The number of and \\sigma and\n\\pi\nbonds in dicyanogen (CN)_2 are :";
    const normalized = normalizeChemistryAndOrbitals(splitQuestion);
    expect(normalized).not.toContain('\n\\pi\n');
    expect(normalized).toContain('$\\sigma$ and $\\pi$ bonds');

    const { container } = render(<RichTextRenderer content={splitQuestion} />);
    expect(container.textContent).toContain('bonds in dicyanogen');
    // Greek symbols should render through KaTeX
    expect(container.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(2);
  });

  it('formats hydrazoic acid resonance structures with triple bonds in structure (II) into centered display KaTeX', () => {
    const rawResonance = "For hydrazoic acid, which of the following resonating structure will be least stable?\nH - N = N^+ = N^- (I) H - N^+ - N \\equiv \\text{N}^{2-} (II) H - N^- - N^+ \\equiv N (III)";
    const normalized = normalizeChemistryAndOrbitals(rawResonance);
    expect(normalized).toContain('$$\\underset{\\text{(I)}}');
    expect(normalized).toContain('\\text{H}-\\text{N}^+-\\text{N}\\equiv\\text{N}^{2-}');
    expect(normalized).toContain('\\underset{\\text{(III)}}');

    const { container } = render(<RichTextRenderer content={rawResonance} />);
    expect(container.querySelectorAll('.katex-display').length).toBe(1);
    expect(container.textContent).toContain('(I)');
    expect(container.textContent).toContain('(II)');
    expect(container.textContent).toContain('(III)');
  });

  it('auto-wraps bare LaTeX charges with minus signs like \\text{N}^{2-} and \\equiv in math mode', () => {
    const raw = "Structure: \\text{N}^{2-} \\equiv \\text{N}";
    const normalized = normalizeChemistryAndOrbitals(raw);
    expect(normalized).toContain('$\\text{N}^{2-}$');
    expect(normalized).toContain('$\\equiv$');
  });

  it('renders Match-the-Column tables with columns, headers, and formulas into formatted HTML table', () => {
    const q13Content = `Match the overlapping of orbitals with the type of bond formed. (Consider x-axis as internuclear axis.)

\\begin{array}{ll} **Column-I** & **Column-II** \\\\ (P) $2s + 2p_x$ & (1) $\\pi$ bond \\\\ (Q) $2p_y + 2p_y$ & (2) $\\sigma$ bond \\\\ (R) $d_{xy} + p_z$ & (3) $\\delta $ bond \\\\ (S) $d_{yz} + d_{yz}$ & (4) no bond formation \\end{array}`;

    const { container } = render(<RichTextRenderer content={q13Content} />);

    // Table element should be present
    const table = container.querySelector('table');
    expect(table).not.toBeNull();

    // Headers should be present
    const headers = container.querySelectorAll('th');
    expect(headers.length).toBe(2);
    expect(headers[0].textContent).toContain('Column-I');
    expect(headers[1].textContent).toContain('Column-II');

    // Rows should be present
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(4);
    expect(rows[0].textContent).toContain('(P)');
    expect(rows[0].textContent).toContain('(1)');
    expect(rows[0].textContent).toContain('bond');
    expect(rows[3].textContent).toContain('(S)');
    expect(rows[3].textContent).toContain('(4) no bond formation');

    // Raw LaTeX array commands should NOT be visible in text
    expect(container.textContent).not.toContain('\\begin{array}');
    expect(container.textContent).not.toContain('\\end{array}');
  });
});

