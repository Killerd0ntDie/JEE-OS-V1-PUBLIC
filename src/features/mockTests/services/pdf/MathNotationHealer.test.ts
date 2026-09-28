import { describe, it, expect } from 'vitest';
import { MathNotationHealer } from './MathNotationHealer';

describe('MathNotationHealer', () => {
  it('heals Q1 vectors in force and displacement', () => {
    const raw = '1. A force F  2 i ˆ  b ˆ j  k ˆ is applied on a particle and it undergoes a displacement i ˆ  2 ˆ j  k ˆ . What will be the value of b, if work done on the particle is zero. [JEE MAIN_220125_S2]';
    const healed = MathNotationHealer.healMathText(raw);
    expect(healed).toContain('2\\hat{i}');
    expect(healed).toContain('b\\hat{j}');
    expect(healed).toContain('\\hat{k}');
    expect(healed).toContain('2\\hat{j}');
    expect(healed).toContain('\\vec{F}');
  });

  it('heals Q4 alpha, beta, x^2, and units', () => {
    const raw = '4. A force F =  +  x 2 acts on an object in the x- direction. The work done by the force is 5 J when the object is displaced by 1 m. If the constant  = 1N then  will be [JEE MAIN_240125{S1}] (1) 12 N/m 2 (2) 1.5 N/m 2 (3) 16 N/m 2 (4) 24 N/m 2';
    const healed = MathNotationHealer.healMathText(raw);
    expect(healed).toContain('x^2');
    expect(healed).toContain('\\text{N/m}^2');
    expect(healed).toContain('\\alpha');
    expect(healed).toContain('\\beta');
  });

  it('heals Q7 force components', () => {
    const raw = '7. Consider a force F   x i ˆ  yj ˆ . The work done by this force in moving a particle from point A(1, 0) to B(0, 1) along the line segment is : (All quantities are in SI units) [JEE MAIN 090120_S1]';
    const healed = MathNotationHealer.healMathText(raw);
    expect(healed).toContain('x\\hat{i}');
    expect(healed).toContain('y\\hat{j}');
  });

  it('heals Q9 sqrt(2) = 1.4', () => {
    const raw = '9. A body of mkg slides from rest along the curve of vertical circle from point A to B in friction less path. The velocity of the body at B is : [JEE MAIN 040424_S2] (Given, R = 14m, g = 10 m/s 2 and 2 1.4 )';
    const healed = MathNotationHealer.healMathText(raw);
    expect(healed).toContain('\\sqrt{2} = 1.4');
    expect(healed).toContain('\\text{m/s}^2');
  });

  it('heals Q10 options with square roots', () => {
    const raw = '(1) 50%, gh/2 (2) 50%, gh (3) 40%, 2gh (4) 50%, 2gh';
    const healed = MathNotationHealer.healMathText(raw);
    expect(healed).toContain('\\sqrt{\\frac{gh}{2}}');
    expect(healed).toContain('\\sqrt{2gh}');
    expect(healed).toContain('\\sqrt{gh}');
  });

  it('heals Q12 masses list', () => {
    const raw = '12. Four particles A, B, C, D of mass m/2 , m 2m, 4m, have same momentum';
    const healed = MathNotationHealer.healMathText(raw);
    expect(healed).toContain('\\frac{m}{2}');
    expect(healed).toContain('$2m$');
    expect(healed).toContain('$4m$');
  });

  it('heals Q13 option ratio square root of 3', () => {
    const raw = '(1) 1: 3 : 2 (2) 1: 3 : 2 (3) 2 : 3 :1 (4) 3 : 2 :1';
    const healed = MathNotationHealer.healMathText(raw);
    expect(healed).toContain('1 : \\sqrt{3} : 2');
    expect(healed).toContain('2 : \\sqrt{3} : 1');
    expect(healed).toContain('\\sqrt{3} : 2 : 1');
  });

  it('heals Q14 subscript options', () => {
    const raw = '(1) v B : v A (2) m : m B A (3) m v B B : m v A A (4) 1 : 1';
    const healed = MathNotationHealer.healMathText(raw);
    expect(healed).toContain('m_B : m_A');
    expect(healed).toContain('m_B v_B : m_A v_A');
    expect(healed).toContain('v_B : v_A');
  });

  it('heals Q17 velocity equation', () => {
    const raw = 'according to the equation v x , where  is a constant.';
    const healed = MathNotationHealer.healMathText(raw);
    expect(healed).toContain('v = \\alpha\\sqrt{x}');
  });

  it('heals Q22 velocity and units', () => {
    const raw = 'velocity  = b x 5/2 . The work done by the net force during its displacement from x = 0 to x = 4 m is : (Take b = 0.25 m –3/2 s –1 ).';
    const healed = MathNotationHealer.healMathText(raw);
    expect(healed).toContain('x^{5/2}');
    expect(healed).toContain('\\text{m}^{-3/2}');
    expect(healed).toContain('\\text{s}^{-1}');
  });

  it('heals Q28 velocity equation', () => {
    const raw = 'velocity v = (3x 2 + 4)m/s.';
    const healed = MathNotationHealer.healMathText(raw);
    expect(healed).toContain('3x^2');
  });

  it('heals Q43 retardation and MathType brackets', () => {
    const raw = 'Its loss of kinetic energy for above displacement is  10  -n   J . The value of n will  x  be_______ .';
    const healed = MathNotationHealer.healMathText(raw);
    expect(healed).toContain('\\left(\\frac{10}{x}\\right)^{-n}');
  });

  it('heals i cap, j cap, k cap, unicode circumflex, and wraps vector expressions into LaTeX', () => {
    const raw1 = 'A force F = 2 i cap + b j cap + k cap is applied on a particle and it undergoes a displacement i cap - 2 j cap - k cap.';
    const healed1 = MathNotationHealer.healMathText(raw1);
    expect(healed1).toContain('$\\vec{F} = 2\\hat{i} + b\\hat{j} + \\hat{k}$');
    expect(healed1).toContain('$\\hat{i} - 2\\hat{j} - \\hat{k}$');

    const raw2 = 'where i cap, j cap and k cap are unit vectors along axes.';
    const healed2 = MathNotationHealer.healMathText(raw2);
    expect(healed2).toContain('$\\hat{i}$');
    expect(healed2).toContain('$\\hat{j}$');
    expect(healed2).toContain('$\\hat{k}$');

    const raw3 = 'Vector displacement î - 2ĵ - k̂ with option 3 i-cap + 4 j-cap.';
    const healed3 = MathNotationHealer.healMathText(raw3);
    expect(healed3).toContain('$\\hat{i} - 2\\hat{j} - \\hat{k}$');
    expect(healed3).toContain('$3\\hat{i} + 4\\hat{j}$');
  });

  it('heals Q31, Q33, Q35, Q36, Q38 numerical questions and normalizes exam tags', () => {
    const raw31 = 'A small particle moves to position 5 - 2 + from its initial position^2 + 3 - 4 under the action of force 5 + 2 + 7k N ^ . The value of work done will be ________J. [JEE MAIN_010223_S2]';
    const healed31 = MathNotationHealer.healMathText(raw31);
    expect(healed31).toContain('5\\hat{i} - 2\\hat{j} + \\hat{k}');
    expect(healed31).toContain('2\\hat{i} + 3\\hat{j} - 4\\hat{k}');
    expect(healed31).toContain('5\\hat{i} + 2\\hat{j} + 7\\hat{k}');
    expect(healed31).toContain('[JEE MAIN 010223 S2]');

    const raw33 = 'A force f = xy 2 ^{∧} + y 2 ^{∧} acts on a particle in a plane x + y = 10. The work done by this force during a displacement from (0, 0) to (4m, 2m) is _______ Joule';
    const healed33 = MathNotationHealer.healMathText(raw33);
    expect(healed33).toContain('\\vec{F} = (x^2y\\hat{i} + y^2\\hat{j})');

    const raw36 = 'A force F = (2 + 3x) {∧} acts on a particle in the x direction where F is in newton';
    const healed36 = MathNotationHealer.healMathText(raw36);
    expect(healed36).toContain('$\\vec{F} = (2 + 3x)\\hat{i}\\text{ N}$');

    const raw38 = 'A force of F (5y 20) jN ^{∧} acts on a particle. The workdone by this force when the particle is moved';
    const healed38 = MathNotationHealer.healMathText(raw38);
    expect(healed38).toContain('$\\vec{F} = (5y + 20)\\hat{j}\\text{ N}$');
  });

  it('heals all 14 targeted math, vector, and typo issues from user feedback', () => {
    // Q.1: F = 2\hat{t} + b\hat{j} + \hat{k}
    const q1 = MathNotationHealer.healMathText('A force F = 2\\hat{t} + b\\hat{j} + \\hat{k} acts on a particle');
    expect(q1).toContain('$\\vec{F} = 2\\hat{i} + b\\hat{j} + \\hat{k}$');

    // Q.4: If the constant a = 1N then will be
    const q4 = MathNotationHealer.healMathText('If the constant a = 1N then will be');
    expect(q4).toContain('If the constant $\\alpha = 1\\text{ N}$, then $\\beta$ will be');

    // Q.7: F = -\hat{xi} + y\hat{J}
    const q7 = MathNotationHealer.healMathText('Consider a force F = -\\hat{xi} + y\\hat{J}. The work done');
    expect(q7).toContain('$\\vec{F} = -x\\hat{i} + y\\hat{j}$');

    // Q.16: md_{2}/2a_{2} -> \frac{md^2}{2\alpha^2}
    const q16 = MathNotationHealer.healMathText('Option: \\frac{md_{2}}{2a_{2}}');
    expect(q16).toContain('\\frac{md^2}{2\\alpha^2}');

    // Q.21: \text{m}^{\{-3/2\}}_{s-1} -> \text{m}^{-3/2}\text{s}^{-1}
    const q21 = MathNotationHealer.healMathText('(Take b = 0.25\\text{m}^{\\{-3/2\\}}_{s-1})');
    expect(q21).toContain('\\text{m}^{-3/2}\\text{s}^{-1}');

    // Q.22: F (4 x 3y 27) -> \vec{F} = (4x\hat{i} + 3y^2\hat{j})
    const q22 = MathNotationHealer.healMathText('under force F (4 x 3y 27)');
    expect(q22).toContain('$\\vec{F} = (4x\\hat{i} + 3y^2\\hat{j})$');

    // Q.23: 1/2mg_{y_2}0 -> \frac{1}{2}mgy_0^2
    const q23 = MathNotationHealer.healMathText('energy is $1/2mg_{y_2}0$');
    expect(q23).toContain('\\frac{1}{2}mgy_0^2');

    // Q.29: 5\backslash hat{i}$-2$\backslash hat{j}$+$\backslash hat{k}$
    const q29 = MathNotationHealer.healMathText('5\\backslash hat{i}$-2$\\backslash hat{j}$+$\\backslash hat{k}$');
    expect(q29).toContain('$5\\hat{i} - 2\\hat{j} + \\hat{k}$');

    // Q.31: f = xy\hat{i}^{2\wedge}(n) + y\hat{j}^2\wedge{\Lambda}
    const q31 = MathNotationHealer.healMathText('A force f = xy\\hat{i}^{2\\wedge}(n) + y\\hat{j}^2\\wedge{\\Lambda}');
    expect(q31).toContain('$\\vec{F} = x^2y\\hat{i} + y^2\\hat{j}$');

    // Q.34: F = (2+3x)\hat{t}N
    const q34 = MathNotationHealer.healMathText('F = (2+3x)\\hat{t}N');
    expect(q34).toContain('(2 + 3x)\\hat{i}\\text{ N}');

    // Q.36: F = (5y+20)\hat{y}N
    const q36 = MathNotationHealer.healMathText('F = (5y+20)\\hat{y}N');
    expect(q36).toContain('(5y + 20)\\hat{j}\\text{ N}');

    // Q.41: (10) -n () J. The value of n will (x) be
    const q41 = MathNotationHealer.healMathText('(10) -n () J. The value of n will (x) be');
    expect(q41).toContain('\\left(\\frac{10}{x}\\right)^{-n}\\text{ J}');

    // Q.47: will be 4/1, so the value of A
    const q47 = MathNotationHealer.healMathText('will be 4/1, so the value of A');
    expect(q47).toContain('will be $\\frac{A}{1}$, so the value of $A$');
  });
});
