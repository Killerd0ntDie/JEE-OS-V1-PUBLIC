import { MockQuestion, MockTest, MockTestSection, QuestionType } from '@/types/mockTest';
import { SubjectId } from '@/types/index';

export const OFFLINE_BANK_VERSION = '1.3.0';

/**
 * Validates the schema integrity, non-emptiness, and uniqueness of question definitions.
 */
export function validateQuestionBankIntegrity(questions: MockQuestion[] = OFFLINE_QUESTIONS): {
  isValid: boolean;
  questionCount: number;
  errors: string[];
} {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.id) errors.push(`Question at index ${i} has missing id`);
    else if (seenIds.has(q.id)) errors.push(`Duplicate id detected: ${q.id}`);
    else seenIds.add(q.id);

    if (!q.content || q.content.trim().length === 0) {
      errors.push(`Question ${q.id} has empty content`);
    }

    if (q.type === 'MCQ' && (!Array.isArray(q.options) || q.options.length < 2)) {
      errors.push(`Question ${q.id} of type MCQ has invalid options`);
    }

    if (!q.marks || typeof q.marks.correct !== 'number') {
      errors.push(`Question ${q.id} has invalid marks structure`);
    }
  }

  return {
    isValid: errors.length === 0,
    questionCount: questions.length,
    errors
  };
}

// High-Yield Seed Questions across JEE Physics, Chemistry, and Mathematics
export const OFFLINE_QUESTIONS: MockQuestion[] = [
  // --- PHYSICS MCQs ---
  {
    id: 'off_p_1',
    subject: 'physics',
    type: 'MCQ',
    chapter: 'Kinematics',
    topic: 'Projectile Motion',
    difficulty: 'Medium',
    content: 'A projectile is fired at an angle $\\theta = 45^\\circ$ with initial kinetic energy $K_0$. What is its kinetic energy at the apex of its trajectory?',
    options: ['$K_0$', '$K_0 / 2$', '$K_0 / \\sqrt{2}$', '$K_0 / 4$'],
    correctAnswer: '1',
    marks: { correct: 4, incorrect: -1 },
    explanation: 'At the apex, vertical velocity $v_y = 0$, while horizontal velocity $v_x = u\\cos 45^\\circ = u / \\sqrt{2}$. Therefore, $K = \\frac{1}{2}m v_x^2 = \\frac{1}{2}m \\frac{u^2}{2} = \\frac{K_0}{2}$.'
  },
  {
    id: 'off_p_2',
    subject: 'physics',
    type: 'MCQ',
    chapter: 'Laws of Motion',
    topic: 'Friction and Inclined Planes',
    difficulty: 'Medium',
    content: 'A block of mass $m$ rests on an inclined plane of angle $\\theta = 30^\\circ$. The coefficient of static friction is $\\mu_s = 0.8$. The frictional force acting on the block is:',
    options: ['$mg \\sin 30^\\circ$', '$\\mu_s mg \\cos 30^\\circ$', '$mg \\cos 30^\\circ$', '$\\mu_s mg \\sin 30^\\circ$'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: 'The maximum static friction is $f_{max} = \\mu_s mg \\cos 30^\\circ \\approx 0.8 \\times 0.866 mg = 0.69 mg$. The driving force is $mg \\sin 30^\\circ = 0.5 mg$. Since driving force $< f_{max}$, the block does not slip and static friction equals the driving force $mg \\sin 30^\\circ$.'
  },
  {
    id: 'off_p_3',
    subject: 'physics',
    type: 'MCQ',
    chapter: 'Rotational Motion',
    topic: 'Moment of Inertia & Rolling',
    difficulty: 'Hard',
    content: 'A solid cylinder, a solid sphere, and a thin ring of equal mass and radius roll down an incline without slipping from rest. Which reaches the bottom with the highest translational speed?',
    options: ['Solid sphere', 'Solid cylinder', 'Thin ring', 'All reach simultaneously'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: 'Translational acceleration for pure rolling is $a = \\frac{g \\sin \\theta}{1 + I / (mR^2)}$. For solid sphere, $I/(mR^2) = 2/5 = 0.4$. Cylinder is $0.5$, ring is $1.0$. Smaller inertia ratio yields highest acceleration, so the solid sphere reaches first.'
  },
  {
    id: 'off_p_4',
    subject: 'physics',
    type: 'MCQ',
    chapter: 'Work, Energy & Power',
    topic: 'Conservative Forces',
    difficulty: 'Medium',
    content: 'A potential energy function is given by $U(x) = ax^2 - bx$. The equilibrium position $x_0$ and its stability are:',
    options: ['$x_0 = b/(2a)$, stable', '$x_0 = b/a$, stable', '$x_0 = b/(2a)$, unstable', '$x_0 = 2a/b$, unstable'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: 'For equilibrium, $F = -dU/dx = -(2ax - b) = 0 \\implies x_0 = b/(2a)$. The second derivative $d^2U/dx^2 = 2a > 0$ (for positive $a$), signifying a local minimum and stable equilibrium.'
  },
  {
    id: 'off_p_5',
    subject: 'physics',
    type: 'MCQ',
    chapter: 'Electrostatics',
    topic: 'Gauss Law & Electric Dipoles',
    difficulty: 'Medium',
    content: 'An electric dipole of dipole moment $p$ is placed in a uniform electric field $E$ at an angle of $90^\\circ$. The work done in rotating it to $180^\\circ$ against the field is:',
    options: ['$pE$', '$-pE$', '$2pE$', '$0$'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: '$W = -pE(\\cos 180^\\circ - \\cos 90^\\circ) = -pE(-1 - 0) = pE$.'
  },
  {
    id: 'off_p_6',
    subject: 'physics',
    type: 'MCQ',
    chapter: 'Current Electricity',
    topic: 'Kirchhoff Laws & Potentiometer',
    difficulty: 'Medium',
    content: 'Twelve identical wires each of resistance $R$ form a skeleton cube. The equivalent resistance across diagonally opposite corners of the cube is:',
    options: ['$\\frac{5}{6} R$', '$\\frac{3}{4} R$', '$\\frac{7}{12} R$', '$R$'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: 'By symmetry of current branching across corners: $V = I(R/3 + R/6 + R/3) = \\frac{5}{6} I R \\implies R_{eq} = \\frac{5}{6} R$.'
  },
  {
    id: 'off_p_7',
    subject: 'physics',
    type: 'MCQ',
    chapter: 'Magnetic Effects of Current',
    topic: 'Biot-Savart Law',
    difficulty: 'Medium',
    content: 'A long straight wire carries current $I$. The magnetic field at distance $r$ from the axis is $B$. At distance $2r$, the magnetic field is:',
    options: ['$B/2$', '$B/4$', '$2B$', '$B$'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: '$B = \\frac{\\mu_0 I}{2\\pi r}$. Doubling $r$ halves the magnetic field: $B\' = B/2$.'
  },
  {
    id: 'off_p_8',
    subject: 'physics',
    type: 'MCQ',
    chapter: 'Electromagnetic Induction',
    topic: 'Faraday Law & Lenz Law',
    difficulty: 'Hard',
    content: 'A conducting loop of radius $R$ is placed in a perpendicular magnetic field $B(t) = B_0 + \\alpha t$. The induced electric field $E$ at the periphery is:',
    options: ['$\\frac{\\alpha R}{2}$', '$\\alpha R$', '$\\frac{\\alpha R^2}{2}$', '$\\frac{\\alpha}{2R}$'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: '$\\oint E \\cdot dl = -\\frac{d\\Phi}{dt} \\implies E(2\\pi R) = \\pi R^2 \\frac{dB}{dt} = \\pi R^2 \\alpha \\implies E = \\frac{\\alpha R}{2}$.'
  },
  {
    id: 'off_p_9',
    subject: 'physics',
    type: 'MCQ',
    chapter: 'Optics',
    topic: 'Wave Optics & Interference',
    difficulty: 'Medium',
    content: 'In Young\'s double-slit experiment, if the entire apparatus is immersed in water of refractive index $4/3$, the fringe width $\\beta$:',
    options: ['Decreases by factor $3/4$', 'Increases by factor $4/3$', 'Remains unchanged', 'Doubles'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: '$\\beta = \\frac{\\lambda D}{d}$. In a medium of refractive index $\\mu$, $\\lambda\' = \\lambda / \\mu = \\frac{3}{4} \\lambda$. Thus $\\beta\' = \\frac{3}{4} \\beta$.'
  },
  {
    id: 'off_p_10',
    subject: 'physics',
    type: 'MCQ',
    chapter: 'Modern Physics',
    topic: 'Photoelectric Effect',
    difficulty: 'Easy',
    content: 'If the frequency of light incident on a photosensitive surface is doubled, the stopping potential $V_0$:',
    options: ['Becomes more than double', 'Doubles', 'Becomes less than double', 'Remains unchanged'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: '$eV_0 = h\\nu - \\phi \\implies V_0 = \\frac{h\\nu}{e} - \\frac{\\phi}{e}$. When $\\nu$ doubles, $V_0\' = \\frac{2h\\nu}{e} - \\frac{\\phi}{e} = 2V_0 + \\frac{\\phi}{e} > 2V_0$.'
  },

  // --- PHYSICS NUMERICALS ---
  {
    id: 'off_p_num_1',
    subject: 'physics',
    type: 'NUMERICAL',
    chapter: 'Current Electricity',
    topic: 'Resistance and Stretching',
    difficulty: 'Easy',
    content: 'A cylindrical wire of resistance $15\\;\\Omega$ is uniformly stretched so that its length increases by $100\\%$. If volume remains constant, what is the new resistance in ohms?',
    correctAnswer: '60',
    marks: { correct: 4, incorrect: 0 },
    explanation: 'When length doubles ($l\' = 2l$) at constant volume, cross-sectional area halves ($A\' = A/2$). $R\' = \\rho l\' / A\' = 4 \\rho l / A = 4R = 4 \\times 15 = 60\\;\\Omega$.'
  },
  {
    id: 'off_p_num_2',
    subject: 'physics',
    type: 'NUMERICAL',
    chapter: 'Oscillations & SHM',
    topic: 'Spring Mass System',
    difficulty: 'Medium',
    content: 'A spring of stiffness $k = 400\\text{ N/m}$ has a mass $m = 4\\text{ kg}$ attached to it. What is its angular frequency of oscillation $\\omega$ in rad/s?',
    correctAnswer: '10',
    marks: { correct: 4, incorrect: 0 },
    explanation: '$\\omega = \\sqrt{k/m} = \\sqrt{400 / 4} = \\sqrt{100} = 10\\text{ rad/s}$.'
  },
  {
    id: 'off_p_num_3',
    subject: 'physics',
    type: 'NUMERICAL',
    chapter: 'Thermodynamics',
    topic: 'Carnot Engine',
    difficulty: 'Medium',
    content: 'A Carnot engine operates between $500\\text{ K}$ and $300\\text{ K}$. If it absorbs $1000\\text{ J}$ of heat from the reservoir, calculate the work output in Joules.',
    correctAnswer: '400',
    marks: { correct: 4, incorrect: 0 },
    explanation: 'Efficiency $\\eta = 1 - T_C / T_H = 1 - 300/500 = 0.40$. Work $W = \\eta Q_H = 0.40 \\times 1000 = 400\\text{ J}$.'
  },
  {
    id: 'off_p_num_4',
    subject: 'physics',
    type: 'NUMERICAL',
    chapter: 'Gravitation',
    topic: 'Escape Velocity',
    difficulty: 'Medium',
    content: 'If the radius of the Earth shrinks by $75\\%$ while its mass remains constant, the escape velocity increases by a factor of:',
    correctAnswer: '2',
    marks: { correct: 4, incorrect: 0 },
    explanation: '$v_e = \\sqrt{2GM/R}$. If $R\' = 0.25R = R/4$, then $v_e\' = \\sqrt{2GM / (R/4)} = 2 v_e$. Factor is 2.'
  },
  {
    id: 'off_p_num_5',
    subject: 'physics',
    type: 'NUMERICAL',
    chapter: 'Modern Physics',
    topic: 'de Broglie Wavelength',
    difficulty: 'Easy',
    content: 'An electron is accelerated through a potential difference of $150\\text{ V}$. Find its de Broglie wavelength in Angstroms ($\\text{\\AA}$). Take $\\lambda = \\sqrt{150/V}\\text{ \\AA}$.',
    correctAnswer: '1',
    marks: { correct: 4, incorrect: 0 },
    explanation: '$\\lambda = \\sqrt{150/150} = 1\\text{ \\AA}$.'
  },

  // --- CHEMISTRY MCQs ---
  {
    id: 'off_c_1',
    subject: 'chemistry',
    type: 'MCQ',
    chapter: 'Chemical Bonding',
    topic: 'VSEPR Theory & Molecular Geometry',
    difficulty: 'Easy',
    content: 'The molecular geometry and hybridization of $\\text{XeF}_4$ are:',
    options: ['Square planar, $sp^3d^2$', 'Tetrahedral, $sp^3$', 'See-saw, $sp^3d$', 'Octahedral, $sp^3d^2$'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: '$\\text{XeF}_4$ has 8 valence electrons from Xe + 4 from F = 12 electrons, forming 4 bond pairs and 2 lone pairs. Steric number = 6 $\\implies sp^3d^2$, with lone pairs trans $\\implies$ square planar geometry.'
  },
  {
    id: 'off_c_2',
    subject: 'chemistry',
    type: 'MCQ',
    chapter: 'Coordination Compounds',
    topic: 'Crystal Field Theory',
    difficulty: 'Medium',
    content: 'Which of the following complex ions is diamagnetic?',
    options: ['$[\\text{Co}(\\text{NH}_3)_6]^{3+}$', '$[\\text{FeF}_6]^{3-}$', '$[\\text{MnCl}_4]^{2-}$', '$[\\text{Cr}(\\text{H}_2\\text{O})_6]^{3+}$'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: '$\\text{Co}^{3+}$ has $d^6$ configuration. $\\text{NH}_3$ acts as a strong field ligand causing complete pairing ($t_{2g}^6 e_g^0$), leaving zero unpaired electrons, hence diamagnetic.'
  },
  {
    id: 'off_c_3',
    subject: 'chemistry',
    type: 'MCQ',
    chapter: 'Organic Chemistry',
    topic: 'Aldehydes & Ketones (Aldol / Cannizzaro)',
    difficulty: 'Medium',
    content: 'Which aldehyde undergoes Cannizzaro reaction on treatment with $50\\%\\text{ NaOH}$?',
    options: ['Benzaldehyde', 'Acetaldehyde', 'Propionaldehyde', 'Acetone'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: 'Cannizzaro reaction occurs in aldehydes lacking $\\alpha$-hydrogen atoms. Benzaldehyde ($\\text{C}_6\\text{H}_5\\text{CHO}$) lacks $\\alpha$-hydrogens and disproportions into benzyl alcohol and sodium benzoate.'
  },
  {
    id: 'off_c_4',
    subject: 'chemistry',
    type: 'MCQ',
    chapter: 'Electrochemistry',
    topic: 'Nernst Equation',
    difficulty: 'Hard',
    content: 'For the cell $\\text{Zn} | \\text{Zn}^{2+}(0.1\\text{M}) || \\text{Cu}^{2+}(0.01\\text{M}) | \\text{Cu}$, the cell potential increases if:',
    options: ['Concentration of $\\text{Cu}^{2+}$ is increased', 'Concentration of $\\text{Zn}^{2+}$ is increased', 'Mass of Zn electrode is increased', 'Mass of Cu electrode is decreased'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: 'By Nernst equation: $E_{cell} = E^\\circ - \\frac{0.0591}{2}\\log\\left(\\frac{[\\text{Zn}^{2+}]}{[\\text{Cu}^{2+}]}\\right)$. Increasing $[\\text{Cu}^{2+}]$ decreases the logarithmic ratio, increasing $E_{cell}$.'
  },
  {
    id: 'off_c_5',
    subject: 'chemistry',
    type: 'MCQ',
    chapter: 'Chemical Kinetics',
    topic: 'Order of Reaction & Half-Life',
    difficulty: 'Easy',
    content: 'For a first-order reaction, the time required for $99.9\\%$ completion is approximately how many half-lives ($t_{1/2}$)?',
    options: ['$10\\; t_{1/2}$', '$3\\; t_{1/2}$', '$5\\; t_{1/2}$', '$7\\; t_{1/2}$'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: '$[A] = [A]_0 (1/2)^n$. At $99.9\\%$ completion, remaining fraction is $0.1\\% = 1/1000 \\approx (1/2)^{10}$, since $2^{10} = 1024$. Thus $n \\approx 10$.'
  },
  {
    id: 'off_c_6',
    subject: 'chemistry',
    type: 'MCQ',
    chapter: 'Thermodynamics',
    topic: 'Gibbs Free Energy & Spontaneity',
    difficulty: 'Medium',
    content: 'A reaction has $\\Delta H > 0$ and $\\Delta S > 0$. The reaction will be spontaneous at:',
    options: ['High temperatures only', 'Low temperatures only', 'All temperatures', 'No temperature'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: '$\\Delta G = \\Delta H - T\\Delta S$. When both $\\Delta H$ and $\\Delta S$ are positive, $\\Delta G < 0$ occurs when $T\\Delta S > \\Delta H$, which requires sufficiently high temperature ($T > \\Delta H / \\Delta S$).'
  },
  {
    id: 'off_c_7',
    subject: 'chemistry',
    type: 'MCQ',
    chapter: 'p-Block Elements',
    topic: 'Nitrogen & Phosphorus Oxoacids',
    difficulty: 'Medium',
    content: 'The basicity of orthophosphoric acid ($\\text{H}_3\\text{PO}_4$) and orthophosphorous acid ($\\text{H}_3\\text{PO}_3$) are respectively:',
    options: ['3 and 2', '3 and 3', '2 and 3', '3 and 1'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: '$\\text{H}_3\\text{PO}_4$ has 3 ionizable P-OH bonds (tribasic), while $\\text{H}_3\\text{PO}_3$ has 2 P-OH bonds and 1 P-H bond (dibasic).'
  },
  {
    id: 'off_c_8',
    subject: 'chemistry',
    type: 'MCQ',
    chapter: 'Organic Chemistry',
    topic: 'Aromatic Hydrocarbons (Electrophilic Substitution)',
    difficulty: 'Medium',
    content: 'In electrophilic aromatic nitration of benzene, the active attacking electrophile is:',
    options: ['$\\text{NO}_2^+$', '$\\text{NO}_2^-$', '$\\text{NO}_3^-$', '$\\text{NO}^+$'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: 'In the nitrating mixture of $\\text{HNO}_3 + \\text{H}_2\\text{SO}_4$, the nitronium ion $\\text{NO}_2^+$ is generated as the active linear electrophile.'
  },
  {
    id: 'off_c_9',
    subject: 'chemistry',
    type: 'MCQ',
    chapter: 'Solutions',
    topic: 'Colligative Properties & Van\'t Hoff Factor',
    difficulty: 'Medium',
    content: 'Which aqueous solution exhibits the highest boiling point elevation?',
    options: ['$0.1\\text{ M } \\text{Al}_2(\\text{SO}_4)_3$', '$0.1\\text{ M } \\text{NaCl}$', '$0.1\\text{ M } \\text{BaCl}_2$', '$0.1\\text{ M Glucose}$'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: '$\\Delta T_b = i K_b m$. For $\\text{Al}_2(\\text{SO}_4)_3$, $i = 5$, giving the highest effective particle concentration $0.5\\text{ M}$, yielding the greatest boiling point elevation.'
  },
  {
    id: 'off_c_10',
    subject: 'chemistry',
    type: 'MCQ',
    chapter: 'Equilibrium',
    topic: 'Le Chatelier Principle',
    difficulty: 'Easy',
    content: 'For $\\text{N}_2(g) + 3\\text{H}_2(g) \\rightleftharpoons 2\\text{NH}_3(g)$ with $\\Delta H = -92\\text{ kJ}$, yield of $\\text{NH}_3$ increases by:',
    options: ['Increasing pressure and decreasing temperature', 'Decreasing pressure and increasing temperature', 'Adding inert gas at constant pressure', 'Increasing temperature only'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: 'Exothermic reaction (favored by lower $T$) with volume contraction $\\Delta n_g = 2 - 4 = -2 < 0$ (favored by higher $P$).'
  },

  // --- CHEMISTRY NUMERICALS ---
  {
    id: 'off_c_num_1',
    subject: 'chemistry',
    type: 'NUMERICAL',
    chapter: 'Solutions',
    topic: 'Molarity Calculation',
    difficulty: 'Easy',
    content: 'Calculate the molarity (mol/L) of a solution containing $8\\text{ g}$ of $\\text{NaOH}$ dissolved in $500\\text{ mL}$ of water. (Molar mass of $\\text{NaOH} = 40\\text{ g/mol}$)',
    correctAnswer: '0.4',
    marks: { correct: 4, incorrect: 0 },
    explanation: 'Moles of $\\text{NaOH} = 8 / 40 = 0.2\\text{ mol}$. Volume = $0.5\\text{ L}$. Molarity = $0.2 / 0.5 = 0.4\\text{ M}$.'
  },
  {
    id: 'off_c_num_2',
    subject: 'chemistry',
    type: 'NUMERICAL',
    chapter: 'Equilibrium',
    topic: 'pH of Weak Acid',
    difficulty: 'Medium',
    content: 'The $\\text{pH}$ of a $0.01\\text{ M}$ monoprotic strong acid $\\text{HCl}$ solution is:',
    correctAnswer: '2',
    marks: { correct: 4, incorrect: 0 },
    explanation: '$\\text{pH} = -\\log[\\text{H}^+] = -\\log(10^{-2}) = 2$.'
  },
  {
    id: 'off_c_num_3',
    subject: 'chemistry',
    type: 'NUMERICAL',
    chapter: 'Solid State',
    topic: 'FCC Unit Cell Atoms',
    difficulty: 'Easy',
    content: 'How many effective atoms are present per unit cell in a Face-Centered Cubic (FCC) lattice?',
    correctAnswer: '4',
    marks: { correct: 4, incorrect: 0 },
    explanation: '$Z = 8 \\times (1/8) + 6 \\times (1/2) = 1 + 3 = 4$ atoms.'
  },
  {
    id: 'off_c_num_4',
    subject: 'chemistry',
    type: 'NUMERICAL',
    chapter: 'Chemical Kinetics',
    topic: 'Rate Constant & Half-life',
    difficulty: 'Medium',
    content: 'A first order reaction has half-life $t_{1/2} = 69.3\\text{ seconds}$. What is the rate constant $k$ in $10^{-3}\\text{ s}^{-1}$? (Take $\\ln 2 = 0.693$)',
    correctAnswer: '10',
    marks: { correct: 4, incorrect: 0 },
    explanation: '$k = 0.693 / 69.3 = 0.01\\text{ s}^{-1} = 10 \\times 10^{-3}\\text{ s}^{-1}$.'
  },
  {
    id: 'off_c_num_5',
    subject: 'chemistry',
    type: 'NUMERICAL',
    chapter: 'Atomic Structure',
    topic: 'Bohr Orbit Radii',
    difficulty: 'Medium',
    content: 'The radius of the first Bohr orbit of Hydrogen is $0.53\\text{ \\AA}$. The radius of the second orbit ($n=2$) in $\\text{\\AA}$ is:',
    correctAnswer: '2.12',
    marks: { correct: 4, incorrect: 0 },
    explanation: '$r_n = r_1 \\times n^2 = 0.53 \\times 2^2 = 0.53 \\times 4 = 2.12\\text{ \\AA}$.'
  },

  // --- MATHEMATICS MCQs ---
  {
    id: 'off_m_1',
    subject: 'maths',
    type: 'MCQ',
    chapter: 'Calculus',
    topic: 'Definite Integrals (King\'s Property)',
    difficulty: 'Medium',
    content: 'The value of the definite integral $I = \\int_{0}^{\\pi/2} \\frac{\\sqrt{\\sin x}}{\\sqrt{\\sin x} + \\sqrt{\\cos x}}\\,dx$ is:',
    options: ['$\\pi/4$', '$\\pi/2$', '$\\pi$', '$0$'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: 'Applying King\'s property $I = \\int_0^a f(a-x)\\,dx$: $I = \\int_0^{\\pi/2} \\frac{\\sqrt{\\cos x}}{\\sqrt{\\cos x} + \\sqrt{\\sin x}}\\,dx$. Adding both equations: $2I = \\int_0^{\\pi/2} 1\\,dx = \\pi/2 \\implies I = \\pi/4$.'
  },
  {
    id: 'off_m_2',
    subject: 'maths',
    type: 'MCQ',
    chapter: 'Matrices & Determinants',
    topic: 'Determinant Properties',
    difficulty: 'Medium',
    content: 'If $A$ is an invertible $3 \\times 3$ matrix such that $|A| = 4$, then the value of $|\\text{adj}(A)|$ is:',
    options: ['16', '64', '4', '8'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: 'For an $n \\times n$ matrix, $|\\text{adj}(A)| = |A|^{n-1}$. Here $n = 3$, so $|\\text{adj}(A)| = 4^{3-1} = 4^2 = 16$.'
  },
  {
    id: 'off_m_3',
    subject: 'maths',
    type: 'MCQ',
    chapter: 'Vectors & 3D Geometry',
    topic: 'Shortest Distance Between Skew Lines',
    difficulty: 'Hard',
    content: 'The condition for two non-parallel lines $\\vec{r} = \\vec{a}_1 + \\lambda \\vec{b}_1$ and $\\vec{r} = \\vec{a}_2 + \\mu \\vec{b}_2$ to be coplanar is:',
    options: ['$(\\vec{a}_2 - \\vec{a}_1) \\cdot (\\vec{b}_1 \\times \\vec{b}_2) = 0$', '$(\\vec{b}_1 \\cdot \\vec{b}_2) = 0$', '$(\\vec{a}_1 \\times \\vec{a}_2) = 0$', '$|\\vec{b}_1| = |\\vec{b}_2|$'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: 'Shortest distance between two lines is $d = \\frac{|(\\vec{a}_2 - \\vec{a}_1) \\cdot (\\vec{b}_1 \\times \\vec{b}_2)|}{|\\vec{b}_1 \\times \\vec{b}_2|}$. If lines are coplanar, shortest distance is 0 $\\implies (\\vec{a}_2 - \\vec{a}_1) \\cdot (\\vec{b}_1 \\times \\vec{b}_2) = 0$.'
  },
  {
    id: 'off_m_4',
    subject: 'maths',
    type: 'MCQ',
    chapter: 'Differential Equations',
    topic: 'Linear Differential Equation',
    difficulty: 'Medium',
    content: 'The integrating factor of the differential equation $\\frac{dy}{dx} + \\frac{2}{x}y = x^2$ is:',
    options: ['$x^2$', '$\\ln x$', '$x$', '$1/x^2$'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: 'Integrating factor $I.F. = e^{\\int P\\,dx} = e^{\\int (2/x)\\,dx} = e^{2\\ln x} = e^{\\ln x^2} = x^2$.'
  },
  {
    id: 'off_m_5',
    subject: 'maths',
    type: 'MCQ',
    chapter: 'Complex Numbers',
    topic: 'Roots of Unity',
    difficulty: 'Medium',
    content: 'If $\\omega$ is an imaginary cube root of unity, then the value of $(1 - \\omega + \\omega^2)(1 + \\omega - \\omega^2)$ is:',
    options: ['4', '1', '2', '0'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: 'Since $1 + \\omega + \\omega^2 = 0$, $1 + \\omega^2 = -\\omega$ and $1 + \\omega = -\\omega^2$. Thus: $(-\\omega - \\omega)(-\\omega^2 - \\omega^2) = (-2\\omega)(-2\\omega^2) = 4\\omega^3 = 4(1) = 4$.'
  },
  {
    id: 'off_m_6',
    subject: 'maths',
    type: 'MCQ',
    chapter: 'Probability',
    topic: 'Bayes Theorem',
    difficulty: 'Medium',
    content: 'Two fair six-sided dice are tossed. Given that the sum of the numbers is greater than 8, the probability that the first die shows 6 is:',
    options: ['$\\frac{4}{10} = \\frac{2}{5}$', '$\\frac{1}{6}$', '$\\frac{3}{10}$', '$\\frac{1}{2}$'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: 'Pairs summing $> 8$: (3,6), (4,5), (4,6), (5,4), (5,5), (5,6), (6,3), (6,4), (6,5), (6,6) $\\implies 10$ pairs. Out of these, first die is 6 in 4 pairs: (6,3), (6,4), (6,5), (6,6). $P = 4/10 = 2/5$.'
  },
  {
    id: 'off_m_7',
    subject: 'maths',
    type: 'MCQ',
    chapter: 'Coordinate Geometry',
    topic: 'Conic Sections - Parabola',
    difficulty: 'Medium',
    content: 'The length of the latus rectum of the parabola $y^2 = 8x$ is:',
    options: ['8', '4', '2', '16'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: 'Standard equation is $y^2 = 4ax$. Here $4a = 8 \\implies$ length of latus rectum $= 4a = 8$.'
  },
  {
    id: 'off_m_8',
    subject: 'maths',
    type: 'MCQ',
    chapter: 'Functions & Limits',
    topic: 'L\'Hopital & Standard Limits',
    difficulty: 'Easy',
    content: 'The value of $\\lim_{x \\to 0} \\frac{e^{3x} - 1}{\\sin 2x}$ is:',
    options: ['$3/2$', '$2/3$', '$1$', '$0$'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: '$\\lim_{x \\to 0} \\frac{(e^{3x}-1)/(3x) \\cdot 3x}{(\\sin 2x)/(2x) \\cdot 2x} = \\frac{1 \\cdot 3}{1 \\cdot 2} = 3/2$.'
  },
  {
    id: 'off_m_9',
    subject: 'maths',
    type: 'MCQ',
    chapter: 'Binomial Theorem',
    topic: 'General Term',
    difficulty: 'Medium',
    content: 'The total number of terms in the expansion of $(x + a)^{50} + (x - a)^{50}$ after simplification is:',
    options: ['26', '51', '25', '50'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: 'Odd terms cancel out, leaving even index terms $T_1, T_3, \\dots, T_{51}$. Total terms $= (50/2) + 1 = 26$.'
  },
  {
    id: 'off_m_10',
    subject: 'maths',
    type: 'MCQ',
    chapter: 'Sequences & Series',
    topic: 'Infinite Geometric Progression',
    difficulty: 'Easy',
    content: 'The sum of the infinite geometric series $1 + \\frac{1}{3} + \\frac{1}{9} + \\frac{1}{27} + \\dots$ is:',
    options: ['$\\frac{3}{2}$', '$\\frac{4}{3}$', '$2$', '$\\frac{5}{3}$'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: '$S_\\infty = \\frac{a}{1 - r} = \\frac{1}{1 - 1/3} = \\frac{1}{2/3} = \\frac{3}{2}$.'
  },

  // --- MATHEMATICS NUMERICALS ---
  {
    id: 'off_m_num_1',
    subject: 'maths',
    type: 'NUMERICAL',
    chapter: 'Matrices & Determinants',
    topic: 'Scalar Multiplication Determinant',
    difficulty: 'Medium',
    content: 'If $A$ is a $3 \\times 3$ matrix with determinant $|A| = 5$, find the value of $|2A|$.',
    correctAnswer: '40',
    marks: { correct: 4, incorrect: 0 },
    explanation: '$|kA| = k^n |A|$ where $n=3$. $|2A| = 2^3 \\times 5 = 8 \\times 5 = 40$.'
  },
  {
    id: 'off_m_num_2',
    subject: 'maths',
    type: 'NUMERICAL',
    chapter: 'Permutations & Combinations',
    topic: 'Selection of Handshakes',
    difficulty: 'Easy',
    content: 'In a room of 10 people, each person shakes hands with every other person exactly once. What is the total number of handshakes?',
    correctAnswer: '45',
    marks: { correct: 4, incorrect: 0 },
    explanation: 'Total handshakes $= \\binom{10}{2} = \\frac{10 \\times 9}{2} = 45$.'
  },
  {
    id: 'off_m_num_3',
    subject: 'maths',
    type: 'NUMERICAL',
    chapter: 'Calculus',
    topic: 'Slope of Tangent',
    difficulty: 'Easy',
    content: 'Find the slope of the tangent to the curve $y = 3x^2 - 4x + 7$ at $x = 2$.',
    correctAnswer: '8',
    marks: { correct: 4, incorrect: 0 },
    explanation: '$dy/dx = 6x - 4$. At $x=2$: $dy/dx = 6(2) - 4 = 12 - 4 = 8$.'
  },
  {
    id: 'off_m_num_4',
    subject: 'maths',
    type: 'NUMERICAL',
    chapter: 'Vectors & 3D Geometry',
    topic: 'Dot Product',
    difficulty: 'Easy',
    content: 'If vectors $\\vec{a} = 2\\hat{i} + \\lambda \\hat{j} + \\hat{k}$ and $\\vec{b} = 4\\hat{i} - 2\\hat{j} - 2\\hat{k}$ are perpendicular, find $\\lambda$.',
    correctAnswer: '3',
    marks: { correct: 4, incorrect: 0 },
    explanation: '$\\vec{a} \\cdot \\vec{b} = 2(4) + \\lambda(-2) + 1(-2) = 8 - 2\\lambda - 2 = 6 - 2\\lambda = 0 \\implies \\lambda = 3$.'
  },
  {
    id: 'off_m_num_5',
    subject: 'maths',
    type: 'NUMERICAL',
    chapter: 'Complex Numbers',
    topic: 'Modulus Value',
    difficulty: 'Easy',
    content: 'What is the absolute value (modulus) of the complex number $z = 6 + 8i$?',
    correctAnswer: '10',
    marks: { correct: 4, incorrect: 0 },
    explanation: '$|z| = \\sqrt{6^2 + 8^2} = \\sqrt{36 + 64} = \\sqrt{100} = 10$.'
  }
];

// Helper functions to generate mock tests from the curated offline bank
export const OfflineMockBank = {
  getQuestionsForSubject(subject: SubjectId, type?: QuestionType): MockQuestion[] {
    return OFFLINE_QUESTIONS.filter(q => q.subject === subject && (!type || q.type === type));
  },

  getQuestionsForChapter(subject: SubjectId, chapter: string, type?: QuestionType): MockQuestion[] {
    const qLower = chapter.toLowerCase();
    const matches = OFFLINE_QUESTIONS.filter(q => 
      q.subject === subject && 
      (q.chapter.toLowerCase().includes(qLower) || qLower.includes(q.chapter.toLowerCase())) &&
      (!type || q.type === type)
    );
    if (matches.length > 0) return matches;
    // Fallback to subject pool if specific chapter has limited offline seeds
    return this.getQuestionsForSubject(subject, type);
  },

  synthesizeChapterMock(subject: SubjectId, chapterName: string, requestedCount: number = 10, difficulty: string = 'JEE_MAIN'): MockTest {
    const questionsPool = this.getQuestionsForChapter(subject, chapterName);
    const selected: MockQuestion[] = [];
    
    // Cycle through questions to meet requestedCount with unique IDs
    for (let i = 0; i < requestedCount; i++) {
      const base = questionsPool[i % questionsPool.length];
      selected.push({
        ...base,
        id: `offline_chap_${Date.now()}_${i}`,
        chapter: chapterName,
        difficulty: (difficulty.includes('ADVANCED') ? 'Hard' : base.difficulty) as any
      });
    }

    const durationMinutes = requestedCount <= 10 ? 30 : requestedCount <= 15 ? 45 : 60;

    return {
      id: `offline_mock_chapter_${Date.now()}`,
      name: `Chapter Mastery: ${chapterName}`,
      durationMinutes,
      totalMarks: selected.reduce((acc, q) => acc + (q.marks?.correct ?? 4), 0),
      sections: [
        {
          subject,
          questions: selected
        }
      ]
    };
  },

  synthesizeSubjectMock(subject: SubjectId, requestedCount: number = 25, difficulty: string = 'JEE_MAIN'): MockTest {
    const mcqPool = this.getQuestionsForSubject(subject, 'MCQ');
    const numPool = this.getQuestionsForSubject(subject, 'NUMERICAL');
    
    // In standard JEE Main pattern: 20 MCQs + 5 Numericals
    const numCount = Math.min(5, Math.floor(requestedCount * 0.2));
    const mcqCount = requestedCount - numCount;

    const selected: MockQuestion[] = [];

    // Add MCQs � cap at pool size to prevent duplicate questions
    const actualMcqCount = Math.min(mcqCount, mcqPool.length);
    if (actualMcqCount < mcqCount) {
      console.warn(`[OfflineMockBank] Only ${mcqPool.length} MCQs available for ${subject}, requested ${mcqCount}. Capping to prevent duplicates.`);
    }
    for (let i = 0; i < actualMcqCount; i++) {
      const base = mcqPool[i];
      selected.push({
        ...base,
        id: `offline_subj_mcq_${Date.now()}_${i}`
      });
    }

    // Add Numericals � cap at pool size to prevent duplicate questions
    const actualNumCount = Math.min(numCount, numPool.length);
    if (actualNumCount < numCount) {
      console.warn(`[OfflineMockBank] Only ${numPool.length} Numericals available for ${subject}, requested ${numCount}. Capping to prevent duplicates.`);
    }
    for (let i = 0; i < actualNumCount; i++) {
      const base = numPool[i];
      selected.push({
        ...base,
        id: `offline_subj_num_${Date.now()}_${i}`
      });
    }

    const durationMinutes = requestedCount <= 15 ? 35 : 60;

    const subjectLabel = subject.charAt(0).toUpperCase() + subject.slice(1);
    return {
      id: `offline_mock_subject_${Date.now()}`,
      name: `${subjectLabel} Full Sprint Mock (${requestedCount} Qs)`,
      durationMinutes,
      totalMarks: selected.reduce((acc, q) => acc + (q.marks?.correct ?? 4), 0),
      sections: [
        {
          subject,
          questions: selected
        }
      ]
    };
  },

  synthesizeFullJeeMock(isMini: boolean = false): MockTest {
    const subjects: SubjectId[] = ['physics', 'chemistry', 'maths'];
    const perSubjectCount = isMini ? 10 : 25;
    const durationMinutes = isMini ? 60 : 180;

    const sections: MockTestSection[] = subjects.map(subject => {
      const subMock = this.synthesizeSubjectMock(subject, perSubjectCount);
      return subMock.sections[0];
    });

    const totalQuestions = perSubjectCount * 3;
    const totalMarks = totalQuestions * 4;

    return {
      id: `offline_mock_full_jee_${Date.now()}`,
      name: isMini 
        ? `JEE Main Express Mini-Mock (${totalQuestions} Qs)` 
        : `JEE Main Grand 3-Subject Simulation (${totalQuestions} Qs)`,
      durationMinutes,
      totalMarks,
      sections
    };
  }
};
