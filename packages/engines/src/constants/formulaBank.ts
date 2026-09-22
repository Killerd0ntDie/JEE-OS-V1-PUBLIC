export interface FormulaEntry {
  title: string;
  concept: string;
  formula: string;
}

export interface ChapterFormulas {
  chapterId: string;
  chapterName: string;
  subject: 'physics' | 'chemistry' | 'maths';
  formulas: FormulaEntry[];
}

export const FORMULA_BANK: ChapterFormulas[] = [
  // ==================== PHYSICS (p1 - p25) ====================
  {
    chapterId: 'p1',
    chapterName: 'Units & Measurements',
    subject: 'physics',
    formulas: [
      { title: 'Dimensional Formula & Error Analysis', concept: 'Error combination rule for product and exponent powers', formula: 'Z = A^x B^y / C^z ⟹ (∆Z/Z) = x(∆A/A) + y(∆B/B) + z(∆C/C)' },
      { title: 'Vernier Caliper & Screw Gauge Least Count', concept: 'Precision measurement calculations', formula: 'LC_vernier = 1 MSD - 1 VSD\nLC_screw = Pitch / Total Circular Divisions' }
    ]
  },
  {
    chapterId: 'p2',
    chapterName: 'Kinematics',
    subject: 'physics',
    formulas: [
      { title: 'Equations of Motion', concept: 'Uniform acceleration relationships for velocity, displacement, and time', formula: 'v = u + at\ns = ut + ½at²\nv² = u² + 2as' },
      { title: 'Projectile Motion (Range & Height)', concept: 'Maximum height and horizontal range on flat ground', formula: 'H_max = (u² sin²θ) / (2g)\nR = (u² sin 2θ) / g\nT_flight = (2u sinθ) / g' },
      { title: 'Relative Velocity in 2D', concept: 'River-swimmer shortest path vs shortest time', formula: 't_min = d / v_m (straight across)\nθ = sin⁻¹(v_r / v_m) for zero drift' }
    ]
  },
  {
    chapterId: 'p3',
    chapterName: 'Laws of Motion',
    subject: 'physics',
    formulas: [
      { title: 'Friction Force & Angle of Repose', concept: 'Static & kinetic friction thresholds', formula: 'f_s(max) = μ_s N\nf_k = μ_k N\ntan θ_repose = μ_s' },
      { title: 'Centripetal Force & Banking', concept: 'Optimum speed on banked curved road without friction', formula: 'v_opt = √(r g tanθ)\nv_max = √[r g (tanθ + μ)/(1 - μ tanθ)]' }
    ]
  },
  {
    chapterId: 'p4',
    chapterName: 'Work Power Energy',
    subject: 'physics',
    formulas: [
      { title: 'Work-Energy Theorem', concept: 'Net work done equals change in kinetic energy', formula: 'W_net = ∆K = K_f - K_i = ∫ F · dr' },
      { title: 'Conservative Force & Potential Energy', concept: 'Negative gradient of potential energy field', formula: 'F = -∇U = -(∂U/∂x î + ∂U/∂y ĵ + ∂U/∂z k̂)\n∆U = -W_cons' },
      { title: 'Collision Coefficient of Restitution', concept: 'Ratio of velocity of separation to velocity of approach', formula: 'e = (v₂ - v₁) / (u₁ - u₂)\ne = 1 (Elastic), 0 < e < 1 (Inelastic), e = 0 (Perfectly Inelastic)' }
    ]
  },
  {
    chapterId: 'p5',
    chapterName: 'Center of Mass & Momentum',
    subject: 'physics',
    formulas: [
      { title: 'Center of Mass Position Vector', concept: 'Weighted average position of mass system', formula: 'R_cm = (∑ m_i r_i) / (∑ m_i)\nX_cm = (1/M) ∫ x dm' }
    ]
  },
  {
    chapterId: 'p6',
    chapterName: 'Rotational Motion',
    subject: 'physics',
    formulas: [
      { title: 'Parallel & Perpendicular Axis Theorems', concept: 'Moments of inertia transformations', formula: 'I = I_cm + Md² (Parallel)\nI_z = I_x + I_y (Perpendicular, 2D planar body)' },
      { title: 'Angular Momentum Conservation', concept: 'Torque-free system angular momentum', formula: 'L = I ω = r × p\nτ_ext = dL/dt = 0 ⟹ I₁ω₁ = I₂ω₂' },
      { title: 'Pure Rolling Motion Condition', concept: 'Velocity & acceleration at contact point with ground', formula: 'v_cm = R ω\na_cm = R α\nK_total = ½ M v_cm² (1 + k²/R²)' }
    ]
  },
  {
    chapterId: 'p7',
    chapterName: 'Gravitation',
    subject: 'physics',
    formulas: [
      { title: 'Gravitational Field & Potential', concept: 'Field and potential outside vs inside solid sphere of radius R', formula: 'V_out = -GM/r,  V_in = -GM(3R² - r²) / (2R³)\nv_escape = √(2GM/R) = √(2gR)' },
      { title: 'Kepler Third Law & Orbital Speed', concept: 'Satellite orbital velocity and period', formula: 'v_orbital = √(GM/r)\nT² = (4π² / GM) r³' }
    ]
  },
  {
    chapterId: 'p8',
    chapterName: 'Mechanical Properties of Solids',
    subject: 'physics',
    formulas: [
      { title: 'Young Modulus & Energy Density', concept: 'Elastic strain energy stored per unit volume', formula: 'Y = (F/A) / (∆L/L)\nu = Energy / Vol = ½ × Stress × Strain = ½ Y (Strain)²' }
    ]
  },
  {
    chapterId: 'p9',
    chapterName: 'Fluid Mechanics',
    subject: 'physics',
    formulas: [
      { title: 'Surface Tension & Excess Pressure', concept: 'Excess pressure inside drop vs bubble', formula: 'P_excess(drop) = 2T / R\nP_excess(bubble) = 4T / R\nh = 2T cosθ / (r ρ g)' },
      { title: 'Stokes Law & Terminal Velocity', concept: 'Viscous drag and equilibrium terminal speed', formula: 'F_viscous = 6π η r v\nv_T = [2 r² (ρ - σ) g] / (9 η)' }
    ]
  },
  {
    chapterId: 'p10',
    chapterName: 'Thermal Properties of Matter',
    subject: 'physics',
    formulas: [
      { title: 'Thermal Expansion & Stefan-Boltzmann Law', concept: 'Linear expansion and radiant energy emission', formula: '∆L = L₀ α ∆T\nP = e σ A T⁴' }
    ]
  },
  {
    chapterId: 'p11',
    chapterName: 'Thermodynamics',
    subject: 'physics',
    formulas: [
      { title: 'First Law & Work in Processes', concept: 'Isothermal, Adiabatic, and Isochoric work', formula: 'dQ = dU + dW\nW_iso = nRT ln(V₂/V₁)\nW_adia = (P₁V₁ - P₂V₂) / (γ - 1)' },
      { title: 'Carnot Engine Efficiency', concept: 'Efficiency of reversible heat engine between T₁ & T₂', formula: 'η = 1 - (Q₂ / Q₁) = 1 - (T₂ / T₁)\nCOP_refrigerator = T₂ / (T₁ - T₂)' }
    ]
  },
  {
    chapterId: 'p12',
    chapterName: 'Kinetic Theory of Gases',
    subject: 'physics',
    formulas: [
      { title: 'RMS, Average & Most Probable Speed', concept: 'Maxwell-Boltzmann speed distribution statistics', formula: 'v_rms = √(3RT/M)\nv_avg = √(8RT/πM)\nv_mp = √(2RT/M)' },
      { title: 'Internal Energy & Degrees of Freedom', concept: 'Equipartition theorem for f degrees of freedom', formula: 'U = (f/2) n R T\nC_v = (f/2) R,  C_p = (f/2 + 1) R,  γ = C_p / C_v = 1 + 2/f' }
    ]
  },
  {
    chapterId: 'p13',
    chapterName: 'Oscillations (SHM)',
    subject: 'physics',
    formulas: [
      { title: 'Simple Harmonic Motion Equation', concept: 'Displacement, velocity, and acceleration in SHM', formula: 'x(t) = A sin(ωt + φ)\nv(t) = ω √(A² - x²)\na(t) = -ω² x' }
    ]
  },
  {
    chapterId: 'p14',
    chapterName: 'Waves & Sound',
    subject: 'physics',
    formulas: [
      { title: 'Doppler Effect in Sound', concept: 'Apparent frequency with moving source and observer', formula: 'f_apparent = f₀ [ (v ± v_o) / (v ∓ v_s) ]' },
      { title: 'Organ Pipes & Standing Waves', concept: 'Harmonics in open vs closed pipes', formula: 'f_open = n (v / 2L),  n = 1, 2, 3...\nf_closed = (2n - 1) (v / 4L),  n = 1, 2, 3...' }
    ]
  },
  {
    chapterId: 'p15',
    chapterName: 'Electrostatics',
    subject: 'physics',
    formulas: [
      { title: 'Coulomb Law & Field of Dipole', concept: 'Axial and equatorial field of electric dipole p', formula: 'E_axial = (2k p) / r³\nE_equatorial = (k p) / r³\nτ = p × E,  U = -p · E' },
      { title: 'Gauss Law & Conductors', concept: 'Flux through closed surface & conductor boundary field', formula: 'Φ = ∮ E · dA = Q_enclosed / ε₀\nE_surface = σ / ε₀' }
    ]
  },
  {
    chapterId: 'p16',
    chapterName: 'Capacitance',
    subject: 'physics',
    formulas: [
      { title: 'Capacitance & Dielectric Insertion', concept: 'Parallel plate capacitor with dielectric constant K', formula: 'C = K ε₀ A / d\nU = ½ C V² = ½ Q² / C' }
    ]
  },
  {
    chapterId: 'p17',
    chapterName: 'Current Electricity',
    subject: 'physics',
    formulas: [
      { title: 'Drift Velocity & Ohm Law Microscopic', concept: 'Electron drift speed and current density', formula: 'I = n A e v_d\nv_d = (e E τ) / m\nJ = σ E = E / ρ' },
      { title: 'Kirchhoff Laws & Wheatstone Bridge', concept: 'Loop rule and balance condition for bridge', formula: '∑ V = 0,  ∑ I = 0\nP/Q = R/S ⟹ V_detector = 0' }
    ]
  },
  {
    chapterId: 'p18',
    chapterName: 'Magnetic Effects of Current',
    subject: 'physics',
    formulas: [
      { title: 'Biot-Savart Law & Circular Coil', concept: 'Magnetic field at center and axis of circular loop', formula: 'B_center = (μ₀ I) / (2 R)\nB_axis = (μ₀ I R²) / [ 2 (R² + x²)³/² ]' }
    ]
  },
  {
    chapterId: 'p19',
    chapterName: 'Magnetism & Matter',
    subject: 'physics',
    formulas: [
      { title: 'Magnetic Dipole & Susceptibility', concept: 'Curie law for paramagnetic materials', formula: 'M = C (B / T)\nχ_m = M / H' }
    ]
  },
  {
    chapterId: 'p20',
    chapterName: 'Electromagnetic Induction',
    subject: 'physics',
    formulas: [
      { title: 'Faraday Law & Self Inductance', concept: 'Induced EMF and stored magnetic energy', formula: 'ε = -dΦ/dt = -L (dI/dt)\nU_magnetic = ½ L I²' }
    ]
  },
  {
    chapterId: 'p21',
    chapterName: 'Alternating Current',
    subject: 'physics',
    formulas: [
      { title: 'Series LCR Circuit & Resonance', concept: 'Impedance and resonant frequency', formula: 'Z = √[ R² + (X_L - X_C)² ]\nω_resonance = 1 / √(L C)\nQ_factor = (ω_r L) / R' }
    ]
  },
  {
    chapterId: 'p22',
    chapterName: 'Electromagnetic Waves',
    subject: 'physics',
    formulas: [
      { title: 'EM Wave Speed & Energy Density', concept: 'Poynting vector and Poynting magnitude', formula: 'c = 1 / √(μ₀ ε₀) = E₀ / B₀\nS_avg = ½ c ε₀ E₀²' }
    ]
  },
  {
    chapterId: 'p23',
    chapterName: 'Ray Optics',
    subject: 'physics',
    formulas: [
      { title: 'Lens Maker Formula & Prism', concept: 'Focal length and prism minimum deviation', formula: '1/f = (μ - 1) (1/R₁ - 1/R₂)\nμ = sin[ (A + δ_m) / 2 ] / sin(A / 2)' }
    ]
  },
  {
    chapterId: 'p24',
    chapterName: 'Wave Optics',
    subject: 'physics',
    formulas: [
      { title: 'Young Double Slit Interference', concept: 'Fringe width and intensity distribution', formula: 'β = (λ D) / d\nI(θ) = 4 I₀ cos²(π d sinθ / λ)' }
    ]
  },
  {
    chapterId: 'p25',
    chapterName: 'Modern Physics & Semiconductors',
    subject: 'physics',
    formulas: [
      { title: 'Photoelectric & Bohr Model', concept: 'Einstein photoelectric & Hydrogen radii', formula: 'K_max = h ν - W₀\nr_n = (0.529 Å) n² / Z\nE_n = (-13.6 eV) Z² / n²' }
    ]
  },

  // ==================== CHEMISTRY (c1 - c27) ====================
  {
    chapterId: 'c1',
    chapterName: 'Some Basic Concepts of Chemistry',
    subject: 'chemistry',
    formulas: [
      { title: 'Molarity, Molality & Mole Fraction', concept: 'Concentration units of solutions', formula: 'Molarity (M) = Moles / Vol (L)\nMolality (m) = Moles / Mass of solvent (kg)' },
      { title: 'Ideal Gas Equation', concept: 'State equation for an ideal gas', formula: 'PV = nRT' },
      { title: 'Dalton\'s Law of Partial Pressures', concept: 'Total pressure of a mixture of non-reacting gases', formula: 'P_total = P_1 + P_2 + ... + P_n' },
      { title: 'Graham\'s Law of Effusion', concept: 'Rate of effusion of a gas', formula: 'Rate ∝ 1/√(Molar Mass)' }
    ]
  },
  {
    chapterId: 'c2',
    chapterName: 'Structure of Atom',
    subject: 'chemistry',
    formulas: [
      { title: 'Rydberg Formula & Uncertainty Principle', concept: 'Wavenumber of spectral lines', formula: '1/λ = R Z² (1/n₁² - 1/n₂²)\n∆x · ∆p ≥ h / (4π)' }
    ]
  },
  {
    chapterId: 'c3',
    chapterName: 'Classification of Elements',
    subject: 'chemistry',
    formulas: [
      { title: 'Effective Nuclear Charge', concept: 'Slater rule for shielding constant', formula: 'Z* = Z - σ' }
    ]
  },
  {
    chapterId: 'c4',
    chapterName: 'Chemical Bonding',
    subject: 'chemistry',
    formulas: [
      { title: 'Bond Order (MO Theory)', concept: 'Diatomic bond stability indicator', formula: 'Bond Order = ½ (N_b - N_a)' }
    ]
  },
  {
    chapterId: 'c5',
    chapterName: 'States of Matter',
    subject: 'chemistry',
    formulas: [
      { title: 'Van der Waals Real Gas Equation', concept: 'Pressure and volume corrections for real gases', formula: '(P + a n² / V²) (V - n b) = n R T' }
    ]
  },
  {
    chapterId: 'c6',
    chapterName: 'Thermodynamics',
    subject: 'chemistry',
    formulas: [
      { title: 'Gibbs Free Energy & Spontaneity', concept: 'Criterion for spontaneous reaction', formula: '∆G = ∆H - T ∆S\n∆G° = -R T ln K_eq' }
    ]
  },
  {
    chapterId: 'c7',
    chapterName: 'Equilibrium',
    subject: 'chemistry',
    formulas: [
      { title: 'pH & Henderson-Hasselbalch Equation', concept: 'Buffer solution pH calculation', formula: 'pH = pK_a + log([Salt] / [Acid])\nK_sp = x^x y^y S^(x+y)' }
    ]
  },
  {
    chapterId: 'c8',
    chapterName: 'Redox Reactions',
    subject: 'chemistry',
    formulas: [
      { title: 'Equivalent Weight & Normality', concept: 'n-factor calculations', formula: 'Normality = Molarity × n-factor' }
    ]
  },
  {
    chapterId: 'c9',
    chapterName: 'Hydrogen',
    subject: 'chemistry',
    formulas: [
      { title: 'Hardness of Water ppm', concept: 'CaCO₃ equivalent calculation for hard water', formula: 'Hardness (ppm) = (Mass of CaCO₃ equiv / Mass of Water) × 10⁶' }
    ]
  },
  {
    chapterId: 'c10',
    chapterName: 's-Block Elements',
    subject: 'chemistry',
    formulas: [
      { title: 'Flame Colors & Lattice Energy', concept: 'Solubility trend of alkali metal salts', formula: 'Lattice Energy ∝ (z⁺ z⁻) / (r⁺ + r⁻)' }
    ]
  },
  {
    chapterId: 'c11',
    chapterName: 'p-Block Elements (Group 13 & 14)',
    subject: 'chemistry',
    formulas: [
      { title: 'Inert Pair Effect & Borax Structure', concept: 'Stability of lower oxidation states', formula: 'Borax: Na₂[B₄O₅(OH)₄] · 8H₂O' }
    ]
  },
  {
    chapterId: 'c12',
    chapterName: 'Organic Chemistry - Basics',
    subject: 'chemistry',
    formulas: [
      { title: 'Degree of Unsaturation', concept: 'Index of hydrogen deficiency', formula: 'DU = C + 1 - H/2 + N/2 - X/2' }
    ]
  },
  {
    chapterId: 'c13',
    chapterName: 'Hydrocarbons',
    subject: 'chemistry',
    formulas: [
      { title: 'Markovnikov Addition Rule', concept: 'Electrophilic addition to unsymmetrical alkene', formula: 'H⁺ adds to carbon with MORE hydrogens' }
    ]
  },
  {
    chapterId: 'c14',
    chapterName: 'Environmental Chemistry',
    subject: 'chemistry',
    formulas: [
      { title: 'BOD (Biochemical Oxygen Demand)', concept: 'Organic pollution indicator in water', formula: 'Clean Water BOD < 5 ppm\nPolluted Water BOD ≥ 17 ppm' }
    ]
  },
  {
    chapterId: 'c15',
    chapterName: 'Solid State',
    subject: 'chemistry',
    formulas: [
      { title: 'Crystal Density & Packing Fraction', concept: 'Unit cell density calculation', formula: 'ρ = (Z × M) / (a³ × N_A)\nPacking Efficiency (FCC) = 74%' }
    ]
  },
  {
    chapterId: 'c16',
    chapterName: 'Solutions',
    subject: 'chemistry',
    formulas: [
      { title: 'Raoult Law & Colligative Properties', concept: 'Relative lowering of vapor pressure and osmotic pressure', formula: '∆P / P° = x_solute\nπ = i C R T' }
    ]
  },
  {
    chapterId: 'c17',
    chapterName: 'Electrochemistry',
    subject: 'chemistry',
    formulas: [
      { title: 'Nernst Equation & Kohlrausch Law', concept: 'Cell EMF and molar conductivity', formula: 'E_cell = E°_cell - (0.0591 / n) log Q' }
    ]
  },
  {
    chapterId: 'c18',
    chapterName: 'Chemical Kinetics',
    subject: 'chemistry',
    formulas: [
      { title: 'First Order Kinetics & Half Life', concept: 'Rate law and Arrhenius equation', formula: 'k = (2.303 / t) log([A]₀ / [A]_t)\nt_½ = 0.693 / k' }
    ]
  },
  {
    chapterId: 'c19',
    chapterName: 'Surface Chemistry',
    subject: 'chemistry',
    formulas: [
      { title: 'Freundlich Adsorption Isotherm', concept: 'Gas adsorption on solid surface', formula: 'x/m = k P^(1/n)' }
    ]
  },
  {
    chapterId: 'c20',
    chapterName: 'Isolation of Elements (Metallurgy)',
    subject: 'chemistry',
    formulas: [
      { title: 'Ellingham Diagram & Reduction Threshold', concept: 'Gibbs energy reduction criterion', formula: '∆G° < 0 for reduction by C/CO at temp T' }
    ]
  },
  {
    chapterId: 'c21',
    chapterName: 'p-Block Elements (Group 15 to 18)',
    subject: 'chemistry',
    formulas: [
      { title: 'Oxyacids of Phosphorus & Xenon Fluorides', concept: 'Basicity and hybridization of XeF₂, XeF₄', formula: 'Basicity of H₃PO₃ = 2\nXeF₄ = sp³d² (Square Planar)' }
    ]
  },
  {
    chapterId: 'c22',
    chapterName: 'd & f Block Elements',
    subject: 'chemistry',
    formulas: [
      { title: 'Spin-Only Magnetic Moment', concept: 'Unpaired electron magnetic moment', formula: 'μ_spin = √[ n (n + 2) ] BM' }
    ]
  },
  {
    chapterId: 'c23',
    chapterName: 'Coordination Compounds',
    subject: 'chemistry',
    formulas: [
      { title: 'Crystal Field Stabilization Energy (CFSE)', concept: 'Octahedral CFSE parameter', formula: 'CFSE_oct = (-0.4 n_t2g + 0.6 n_eg) ∆₀' }
    ]
  },
  {
    chapterId: 'c24',
    chapterName: 'Haloalkanes & Haloarenes',
    subject: 'chemistry',
    formulas: [
      { title: 'SN1 vs SN2 Kinetics', concept: 'Nucleophilic substitution order', formula: 'SN1: Rate = k [R-X]\nSN2: Rate = k [R-X] [Nu⁻]' }
    ]
  },
  {
    chapterId: 'c25',
    chapterName: 'Alcohols Phenols Ethers',
    subject: 'chemistry',
    formulas: [
      { title: 'Lucas Test for Alcohol Classification', concept: 'Turbidity speed with ZnCl₂ + HCl', formula: '3° Alcohol ⟹ Immediate turbidity' }
    ]
  },
  {
    chapterId: 'c26',
    chapterName: 'Aldehydes Ketones & Carboxylic Acids',
    subject: 'chemistry',
    formulas: [
      { title: 'Aldol & HVZ Reactions', concept: 'Enolate formation and α-halogenation', formula: 'Aldol: Requires α-H\nHVZ: R-CH₂-COOH + X₂/P ⟹ R-CH(X)-COOH' }
    ]
  },
  {
    chapterId: 'c27',
    chapterName: 'Amines & Biomolecules',
    subject: 'chemistry',
    formulas: [
      { title: 'Hinsberg Test & Isoelectric Point', concept: 'Amine distinction & zwitterion pI', formula: 'pI = ½ (pK_a1 + pK_a2)' }
    ]
  },

  // ==================== MATHS (m1 - m25) ====================
  {
    chapterId: 'm1',
    chapterName: 'Sets & Relations',
    subject: 'maths',
    formulas: [
      { title: 'Inclusion-Exclusion Principle', concept: 'Cardinality of union of three sets', formula: 'n(A ∪ B ∪ C) = ∑n(A) - ∑n(A ∩ B) + n(A ∩ B ∩ C)' }
    ]
  },
  {
    chapterId: 'm2',
    chapterName: 'Functions',
    subject: 'maths',
    formulas: [
      { title: 'Domain, Range & One-One Functions', concept: 'Injectivity & total functions formula', formula: 'Total Mappings = n(B)^n(A)' }
    ]
  },
  {
    chapterId: 'm3',
    chapterName: 'Complex Numbers',
    subject: 'maths',
    formulas: [
      { title: 'De Moivre & Cube Roots of Unity', concept: 'Powers of complex numbers and properties of ω', formula: '(cos θ + i sin θ)^n = cos(nθ) + i sin(nθ)\n1 + ω + ω² = 0,  ω³ = 1' }
    ]
  },
  {
    chapterId: 'm4',
    chapterName: 'Quadratic Equations',
    subject: 'maths',
    formulas: [
      { title: 'Quadratic Roots', concept: 'Sum and Product of Roots for ax² + bx + c = 0', formula: 'Sum (α+β) = -b/a\nProduct (αβ) = c/a' },
      { title: 'Nature of Roots', concept: 'Discriminant conditions', formula: 'D = b² - 4ac\nD > 0: Real & Distinct\nD = 0: Real & Equal\nD < 0: Imaginary' },
      { title: 'Maximum/Minimum Value', concept: 'Vertex of a parabola', formula: 'y_min/max = -D / 4a at x = -b / 2a' }
    ]
  },
  {
    chapterId: 'm5',
    chapterName: 'Matrices & Determinants',
    subject: 'maths',
    formulas: [
      { title: 'Adjoint & Inverse Properties', concept: 'Determinant of adjoint and matrix inverse formula', formula: '|adj A| = |A|^(n-1)\nA⁻¹ = (1 / |A|) adj A' }
    ]
  },
  {
    chapterId: 'm6',
    chapterName: 'Permutations & Combinations',
    subject: 'maths',
    formulas: [
      { title: 'Pascal Identity & Circular Arrangement', concept: 'Combination identities', formula: 'ⁿC_r + ⁿC_{r-1} = ⁿ⁺¹C_r\nCircular = (n - 1)!' }
    ]
  },
  {
    chapterId: 'm7',
    chapterName: 'Binomial Theorem',
    subject: 'maths',
    formulas: [
      { title: 'General Term in Expansion', concept: '(a + b)^n general term', formula: 'T_{r+1} = ⁿC_r a^(n-r) b^r' }
    ]
  },
  {
    chapterId: 'm8',
    chapterName: 'Sequences & Series',
    subject: 'maths',
    formulas: [
      { title: 'AM-GM Inequality & Infinite GP', concept: 'Fundamental inequality for positive numbers', formula: 'AM ≥ GM ≥ HM\nS_∞ = a / (1 - r)' }
    ]
  },
  {
    chapterId: 'm9',
    chapterName: 'Straight Lines',
    subject: 'maths',
    formulas: [
      { title: 'Perpendicular Distance to Line', concept: 'Distance from point to line', formula: 'd = |A x₁ + B y₁ + C| / √(A² + B²)' }
    ]
  },
  {
    chapterId: 'm10',
    chapterName: 'Circles',
    subject: 'maths',
    formulas: [
      { title: 'General Circle & Tangent Condition', concept: 'Condition for line to be tangent to circle', formula: 'x² + y² + 2gx + 2fy + c = 0\nc = a² (1 + m²)' }
    ]
  },
  {
    chapterId: 'm11',
    chapterName: 'Parabola',
    subject: 'maths',
    formulas: [
      { title: 'Parabola Standard Equations', concept: 'Focus, directrix and tangent in slope form', formula: 'y² = 4ax ⟹ Tangent: y = mx + a/m' }
    ]
  },
  {
    chapterId: 'm12',
    chapterName: 'Ellipse',
    subject: 'maths',
    formulas: [
      { title: 'Ellipse Eccentricity & Latus Rectum', concept: 'Standard ellipse relations', formula: 'b² = a² (1 - e²)\nLatus Rectum = 2b² / a' }
    ]
  },
  {
    chapterId: 'm13',
    chapterName: 'Hyperbola',
    subject: 'maths',
    formulas: [
      { title: 'Hyperbola Eccentricity & Asymptotes', concept: 'Standard hyperbola relations', formula: 'b² = a² (e² - 1)\nAsymptotes: y = ± (b/a) x' }
    ]
  },
  {
    chapterId: 'm14',
    chapterName: 'Limits & Continuity',
    subject: 'maths',
    formulas: [
      { title: 'Standard Limits & L-Hopital Rule', concept: 'Limits of trigonometric and exponential functions', formula: 'lim_{x→0} (sin x)/x = 1\nlim_{x→a} f(x)/g(x) = lim_{x→a} f\'(x)/g\'(x)' }
    ]
  },
  {
    chapterId: 'm15',
    chapterName: 'Differentiation',
    subject: 'maths',
    formulas: [
      { title: 'Logarithmic Differentiation', concept: 'Derivative of f(x)^g(x)', formula: 'y = f(x)^g(x) ⟹ dy/dx = y [ g\'(x) ln f(x) + g(x) f\'(x)/f(x) ]' }
    ]
  },
  {
    chapterId: 'm16',
    chapterName: 'Indefinite Integration',
    subject: 'maths',
    formulas: [
      { title: 'Integration by Parts', concept: 'Product rule for integrals (ILATE rule)', formula: '∫ u v dx = u ∫ v dx - ∫ [ u\' (∫ v dx) ] dx' }
    ]
  },
  {
    chapterId: 'm17',
    chapterName: 'Definite Integration',
    subject: 'maths',
    formulas: [
      { title: 'King Property & Leibniz Rule', concept: 'Definite integral symmetry property', formula: '∫_a^b f(x) dx = ∫_a^b f(a + b - x) dx' }
    ]
  },
  {
    chapterId: 'm18',
    chapterName: 'Area Under Curves',
    subject: 'maths',
    formulas: [
      { title: 'Area Between Curves', concept: 'Integral between bounding curves f(x) and g(x)', formula: 'Area = ∫_a^b |f(x) - g(x)| dx' }
    ]
  },
  {
    chapterId: 'm19',
    chapterName: 'Differential Equations',
    subject: 'maths',
    formulas: [
      { title: 'Linear DE & Integrating Factor', concept: 'First order linear differential equation', formula: 'IF = e^(∫ P dx)\ny (IF) = ∫ Q (IF) dx + C' }
    ]
  },
  {
    chapterId: 'm20',
    chapterName: 'Vector Algebra',
    subject: 'maths',
    formulas: [
      { title: 'Dot, Cross & Triple Product', concept: 'Scalar and vector products', formula: 'a · b = |a||b| cosθ\na × b = |a||b| sinθ n̂\n[a b c] = a · (b × c)' }
    ]
  },
  {
    chapterId: 'm21',
    chapterName: '3D Geometry',
    subject: 'maths',
    formulas: [
      { title: 'Shortest Distance Between Skew Lines', concept: 'Distance formula for non-intersecting lines', formula: 'd = |(a₂ - a₁) · (b₁ × b₂)| / |b₁ × b₂|' }
    ]
  },
  {
    chapterId: 'm22',
    chapterName: 'Probability',
    subject: 'maths',
    formulas: [
      { title: 'Bayes Theorem', concept: 'Posterior probability calculation', formula: 'P(A_i | B) = [ P(A_i) P(B | A_i) ] / [ ∑ P(A_j) P(B | A_j) ]' }
    ]
  },
  {
    chapterId: 'm23',
    chapterName: 'Trigonometric Ratios & Identities',
    subject: 'maths',
    formulas: [
      { title: 'Compound Angle Formulas', concept: 'Sum and difference identities', formula: 'sin(A ± B) = sin A cos B ± cos A sin B' }
    ]
  },
  {
    chapterId: 'm24',
    chapterName: 'Trigonometric Equations',
    subject: 'maths',
    formulas: [
      { title: 'General Solutions of Trig Equations', concept: 'General solutions for sin, cos, tan', formula: 'sin θ = sin α ⟹ θ = nπ + (-1)^n α\ncos θ = cos α ⟹ θ = 2nπ ± α' }
    ]
  },
  {
    chapterId: 'm25',
    chapterName: 'Mathematical Reasoning & Statistics',
    subject: 'maths',
    formulas: [
      { title: 'Variance & Standard Deviation', concept: 'Statistical dispersion formulas', formula: 'σ² = (1/N) ∑ x_i² - (x̄)²\nContrapositive(p ⟹ q) = ~q ⟹ ~p' }
    ]
  }
];
