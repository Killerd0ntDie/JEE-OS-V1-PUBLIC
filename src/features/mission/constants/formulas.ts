export interface Formula {
  name: string;
  formula: string;
  description: string;
}

export const FORMULAS: Record<string, Formula[]> = {
  physics: [
    { name: 'Moment of Inertia', formula: 'I = ∑ m_i r_i^2', description: 'Measure of rotational inertia of a rigid body relative to an axis.' },
    { name: 'Torque', formula: 'τ = r × F = I α', description: 'Rotational analog of force, causing angular acceleration.' },
    { name: 'Angular Momentum', formula: 'L = r × p = I ω', description: 'Quantity of rotation, conserved in absence of external torque.' },
    { name: 'Rotational Kinetic Energy', formula: 'K = 1/2 I ω^2', description: 'Kinetic energy of a body rotating around a fixed axis.' },
    { name: 'Parallel Axis Theorem', formula: 'I = I_cm + M d^2', description: 'Calculates moment of inertia about an axis parallel to a centroidal one.' },
    { name: 'Perpendicular Axis Theorem', formula: 'I_z = I_x + I_y', description: 'Applicable for 2D laminar bodies in a flat plane.' }
  ],
  chemistry: [
    { name: 'Nucleophilic Addition', formula: 'Nu⁻ + C=O ➔ Nu-C-O⁻', description: 'Carbonyl carbon is highly electrophilic and susceptible to attack.' },
    { name: 'Grignard Reaction', formula: 'R-MgX + R\'CHO ➔ Sec. Alcohol', description: 'Strong carbanion nucleophile attacks the carbonyl group.' },
    { name: 'Tollens\' Oxidation', formula: 'R-CHO + 2Ag(NH3)2⁺ ➔ R-COO⁻ + 2Ag↓', description: 'Aldehydes reduce Tollens reagent to give a bright silver mirror.' },
    { name: 'Fehling\'s Reaction', formula: 'RCHO + 2Cu²⁺ + 5OH⁻ ➔ RCOO⁻ + Cu2O↓', description: 'Aliphatic aldehydes reduce Cu²⁺ to a red cuprous oxide precipitate.' },
    { name: 'Aldol Condensation', formula: '2 R-CH2-CHO ➔ β-hydroxyaldehyde', description: 'Base-catalyzed reaction requiring α-hydrogen on the carbonyl.' }
  ],
  maths: [
    { name: 'Sine Reduction Formula', formula: 'I_n = - (sin^(n-1)x cos x)/n + (n-1)/n I_(n-2)', description: 'Simplifies integration of higher trigonometric power factors.' },
    { name: 'Wallis\' Formula', formula: '∫₀^π/2 sinⁿx dx = (n-1)/n * (n-3)/(n-2) ...', description: 'Extremely efficient evaluation of definite integrals over quarter-period.' },
    { name: 'Leibniz Integral Rule', formula: 'd/dx ∫_u(x)^v(x) f(t) dt = f(v)v\' - f(u)u\'', description: 'Differentiating an integral under the integral sign.' },
    { name: 'Integration by Parts', formula: '∫ u dv = u v - ∫ v du', description: 'Fundamental method for integrating product of two functions.' },
    { name: 'King\'s Property', formula: '∫_a^b f(x) dx = ∫_a^b f(a+b-x) dx', description: 'Crucial identity for symmetry-based definite integrations.' }
  ]
};

export const LECTURE_SPEEDS = [1.0, 1.25, 1.5, 1.75, 2.0];
