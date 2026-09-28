import fs from 'fs';
import { PdfOfflineParser } from '../src/features/mockTests/services/pdf/PdfOfflineParser.ts';

// Test strings from extracted P-11
const testCases = [
  {
    name: 'Q1 Vector equation and displacement',
    raw: '1. A force F  2 i ˆ  b ˆ j  k ˆ is applied on a particle and it undergoes a displacement i ˆ  2 ˆ j  k ˆ . What will be the value of b, if work done on the particle is zero. [JEE MAIN_220125_S2]',
    expectedKeywords: ['\\hat{i}', '\\hat{j}', '\\hat{k}']
  },
  {
    name: 'Q4 Force with alpha beta and x^2',
    raw: '4. A force F =  +  x 2 acts on an object in the x- direction. The work done by the force is 5 J when the object is displaced by 1 m. If the constant  = 1N then  will be [JEE MAIN_240125{S1}] (1) 12 N/m 2 (2) 1.5 N/m 2 (3) 16 N/m 2 (4) 24 N/m 2',
    expectedKeywords: ['x^2', '12 \\text{N/m}^2']
  },
  {
    name: 'Q7 Force and line segment',
    raw: '7. Consider a force F   x i ˆ  yj ˆ . The work done by this force in moving a particle from point A(1, 0) to B(0, 1) along the line segment is : (All quantities are in SI units) [JEE MAIN 090120_S1]',
    expectedKeywords: ['\\hat{i}', '\\hat{j}']
  },
  {
    name: 'Q9 Velocity on circle with sqrt(2)',
    raw: '9. A body of mkg slides from rest along the curve of vertical circle from point A to B in friction less path. The velocity of the body at B is : [JEE MAIN 040424_S2] (Given, R = 14m, g = 10 m/s 2 and 2 1.4 )',
    expectedKeywords: ['\\sqrt{2} = 1.4']
  },
  {
    name: 'Q10 Rebound velocity with sqrt(gh/2)',
    raw: '(1) 50%, gh/2 (2) 50%, gh (3) 40%, 2gh (4) 50%, 2gh',
    expectedKeywords: ['\\sqrt{']
  },
  {
    name: 'Q12 Masses m/2, m, 2m, 4m',
    raw: '12. Four particles A, B, C, D of mass m/2 , m 2m, 4m, have same momentum',
    expectedKeywords: ['\\frac{m}{2}', 'm, 2m, 4m']
  },
  {
    name: 'Q13 Ratio with sqrt(3)',
    raw: '(1) 1: 3 : 2 (2) 1: 3 : 2 (3) 2 : 3 :1 (4) 3 : 2 :1',
    expectedKeywords: ['\\sqrt{3}']
  },
  {
    name: 'Q14 Subscripts mB:mA and mvB:mvA',
    raw: '(1) v B : v A (2) m : m B A (3) m v B B : m v A A (4) 1 : 1',
    expectedKeywords: ['m_B : m_A', 'm_B v_B : m_A v_A']
  },
  {
    name: 'Q17 Velocity v = alpha sqrt(x)',
    raw: 'according to the equation v x , where  is a constant.',
    expectedKeywords: ['v = \\alpha\\sqrt{x}']
  },
  {
    name: 'Q22 Velocity b x^{5/2}',
    raw: 'velocity  = b x 5/2 . The work done by the net force during its displacement from x = 0 to x = 4 m is : (Take b = 0.25 m –3/2 s –1 ).',
    expectedKeywords: ['x^{5/2}', 'm^{-3/2}']
  },
  {
    name: 'Q28 Velocity 3x^2 + 4',
    raw: 'velocity v = (3x 2 + 4)m/s.',
    expectedKeywords: ['3x^2']
  },
  {
    name: 'Q43 Retardation and (10/x)^{-n}',
    raw: 'Its loss of kinetic energy for above displacement is  10  -n   J . The value of n will  x  be_______ .',
    expectedKeywords: ['\\left(\\frac{10}{x}\\right)^{-n}']
  }
];

console.log('Testing math normalization:');
for (const tc of testCases) {
  const normalized = PdfOfflineParser.normalizeMathToLatex(tc.raw);
  console.log(`\n--- ${tc.name} ---`);
  console.log('OUTPUT:', normalized);
}
