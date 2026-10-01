export interface FormulaEntry {
  title: string;
  concept: string;
  formula: string;    // Valid KaTeX LaTeX string
  examNote?: string;  // Familiar JEE shortcuts, conditions, or constraints
}

export interface ChapterFormulas {
  chapterId: string;
  chapterName: string;
  subject: 'physics' | 'chemistry' | 'maths';
  formulas: FormulaEntry[];
}

// ==================== PHYSICS (p1 - p25) ====================
export const PHYSICS_FORMULA_BANK: ChapterFormulas[] = [
  {
    chapterId: 'p1',
    chapterName: 'Units & Measurements',
    subject: 'physics',
    formulas: [
      {
        title: 'Error Propagation for Products & Powers',
        concept: 'Relative and fractional error combination for power formulas',
        formula: 'Z = \\frac{A^a B^b}{C^c} \\implies \\frac{\\Delta Z}{Z} = a\\frac{\\Delta A}{A} + b\\frac{\\Delta B}{B} + c\\frac{\\Delta C}{C}',
        examNote: 'Errors always add, never subtract. Powers always multiply the fractional errors.'
      },
      {
        title: 'Vernier Caliper Least Count',
        concept: 'Precision calculation for vernier scale divisions',
        formula: '\\text{LC} = 1\\text{ MSD} - 1\\text{ VSD} = \\left(1 - \\frac{N-1}{N}\\right)\\text{MSD} = \\frac{1\\text{ MSD}}{N}',
        examNote: 'If N divisions of VSD coincide with (N-1) MSD. Total reading = MSR + (VSR × LC) - Zero Error.'
      },
      {
        title: 'Screw Gauge Least Count & Pitch',
        concept: 'Pitch and circular scale least count calculations',
        formula: '\\text{LC} = \\frac{\\text{Pitch}}{\\text{Total Circular Scale Divisions}},\\quad \\text{Reading} = \\text{MSR} + (\\text{CSR} \\times \\text{LC}) - (\\pm \\text{Zero Error})',
        examNote: 'Positive zero error is subtracted from observed reading; negative zero error is added.'
      },
      {
        title: 'Dimensional Formula of Universal Constants',
        concept: 'High-frequency dimensional formulas in JEE Main/Advanced',
        formula: '[G] = [M^{-1}L^3T^{-2}],\\quad [\\varepsilon_0] = [M^{-1}L^{-3}T^4A^2],\\quad [h] = [ML^2T^{-1}],\\quad [\\mu_0] = [MLT^{-2}A^{-2}]',
        examNote: 'Remember relation c = 1 / \\sqrt{\\mu_0 \\varepsilon_0} \\implies [\\mu_0 \\varepsilon_0] = [L^{-2}T^2].'
      },
      {
        title: 'Combination of Absolute Errors',
        concept: 'Error in sum and difference of measurements',
        formula: 'Z = A \\pm B \\implies \\Delta Z = \\Delta A + \\Delta B',
        examNote: 'In worst-case analysis, absolute errors always add regardless of whether quantities are added or subtracted.'
      }
    ]
  },
  {
    chapterId: 'p2',
    chapterName: 'Kinematics',
    subject: 'physics',
    formulas: [
      {
        title: 'Equations of Motion (Constant Acceleration)',
        concept: 'Uniform acceleration relationships for velocity, displacement, and time',
        formula: 'v = u + at,\\quad s = ut + \\frac{1}{2}at^2,\\quad v^2 = u^2 + 2as,\\quad s_n = u + \\frac{a}{2}(2n - 1)',
        examNote: 'Applies ONLY when acceleration a is strictly constant. For variable a, integrate: v = ds/dt, a = v(dv/ds).'
      },
      {
        title: 'Ground-to-Ground Projectile Motion',
        concept: 'Time of flight, maximum height, and horizontal range',
        formula: 'T = \\frac{2u\\sin\\theta}{g},\\quad H_{\\max} = \\frac{u^2\\sin^2\\theta}{2g},\\quad R = \\frac{u^2\\sin 2\\theta}{g}',
        examNote: 'Complementary angles θ and (90° - θ) yield identical range R. Relation: R \\tan\\theta = 4H_{\\max}.'
      },
      {
        title: 'Trajectory Equation of Projectile',
        concept: 'Path equation in terms of horizontal and vertical coordinates',
        formula: 'y = x\\tan\\theta - \\frac{gx^2}{2u^2\\cos^2\\theta} = x\\tan\\theta\\left(1 - \\frac{x}{R}\\right)',
        examNote: 'y = x\\tanθ(1 - x/R) is the ultimate high-speed shortcut when coordinates and range R are given.'
      },
      {
        title: 'Projectile on Inclined Plane',
        concept: 'Range and time of flight up an inclined plane of inclination β',
        formula: 'T = \\frac{2u\\sin(\\alpha - \\beta)}{g\\cos\\beta},\\quad R_{\\text{up}} = \\frac{u^2}{g\\cos^2\\beta}[\\sin(2\\alpha - \\beta) - \\sin\\beta]',
        examNote: 'Maximum range up the plane occurs at angle α = π/4 + β/2, yielding R_max = u² / [g(1 + sin β)].'
      },
      {
        title: 'Relative Velocity & River-Swimmer Problem',
        concept: 'Shortest path vs shortest time across flowing river',
        formula: 't_{\\min} = \\frac{d}{v_{\\text{mr}}}\\ (\\text{direct across}),\\quad \\sin\\theta = \\frac{v_r}{v_{\\text{mr}}}\\ (\\text{zero drift if } v_{\\text{mr}} > v_r)',
        examNote: 'Drift x = (v_r - v_mr \\sin θ)t. If v_mr < v_r, minimum drift occurs when sin θ = v_mr / v_r.'
      }
    ]
  },
  {
    chapterId: 'p3',
    chapterName: 'Laws of Motion',
    subject: 'physics',
    formulas: [
      {
        title: 'Friction Force & Angle of Repose',
        concept: 'Static threshold, kinetic friction, and inclination for slipping',
        formula: 'f_s \\le \\mu_s N,\\quad f_k = \\mu_k N,\\quad \\tan\\theta_{\\text{repose}} = \\mu_s',
        examNote: 'Static friction is self-adjusting (0 ≤ f_s ≤ μ_s N). It opposes impending relative motion, not actual velocity.'
      },
      {
        title: 'Centripetal Force & Road Banking',
        concept: 'Optimum, maximum, and minimum speeds on banked curved track',
        formula: 'v_{\\text{opt}} = \\sqrt{rg\\tan\\theta},\\quad v_{\\max} = \\sqrt{rg\\left(\\frac{\\tan\\theta + \\mu}{1 - \\mu\\tan\\theta}\\right)},\\quad v_{\\min} = \\sqrt{rg\\left(\\frac{\\tan\\theta - \\mu}{1 + \\mu\\tan\\theta}\\right)}',
        examNote: 'At optimum speed v_opt, no friction is required from tyres. θ is the banking angle with horizontal.'
      },
      {
        title: 'Pseudo Force in Non-Inertial Frames',
        concept: 'Fictitious inertial force experienced in accelerating frame',
        formula: '\\vec{F}_{\\text{pseudo}} = -m\\vec{a}_{\\text{frame}}',
        examNote: 'Pseudo force acts strictly opposite to the frame acceleration vector and passes through the center of mass.'
      },
      {
        title: 'Pulley-Block String Constraint',
        concept: 'Virtual work method for massless inextensible string systems',
        formula: '\\sum \\vec{T}\\cdot\\vec{a} = 0,\\quad \\sum \\vec{T}\\cdot\\vec{v} = 0',
        examNote: 'Internal tension does zero total work. Instant shortcut to find relationship between block accelerations.'
      },
      {
        title: 'Rocket Propulsion & Variable Mass',
        concept: 'Thrust force and terminal rocket velocity',
        formula: 'F_{\\text{thrust}} = v_r\\left(-\\frac{dm}{dt}\\right),\\quad v = v_0 + v_r\\ln\\left(\\frac{m_0}{m}\\right) - gt',
        examNote: 'v_r is the exhaust velocity of burned gases relative to the rocket.'
      }
    ]
  },
  {
    chapterId: 'p4',
    chapterName: 'Work, Energy & Power',
    subject: 'physics',
    formulas: [
      {
        title: 'Work-Energy Theorem',
        concept: 'Net work done by all forces equals change in kinetic energy',
        formula: 'W_{\\text{net}} = \\Delta K = K_f - K_i = \\int \\vec{F}_{\\text{net}}\\cdot d\\vec{r}',
        examNote: 'Universal theorem: holds for conservative, non-conservative, internal, and external forces alike.'
      },
      {
        title: 'Conservative Force & Potential Energy Gradient',
        concept: 'Relation between conservative force field and potential energy',
        formula: '\\vec{F} = -\\nabla U = -\\left(\\frac{\\partial U}{\\partial x}\\hat{i} + \\frac{\\partial U}{\\partial y}\\hat{j} + \\frac{\\partial U}{\\partial z}\\hat{k}\\right)',
        examNote: 'Equilibrium: dU/dx = 0. Stable if d²U/dx² > 0 (potential well); unstable if d²U/dx² < 0.'
      },
      {
        title: 'Vertical Circular Motion Critical Speeds',
        concept: 'Threshold velocities for complete vertical looping on light string',
        formula: 'v_{\\text{bottom}} \\ge \\sqrt{5gR},\\quad v_{\\text{top}} \\ge \\sqrt{gR},\\quad T_{\\text{bottom}} - T_{\\text{top}} = 6mg',
        examNote: 'For a light rigid rod (instead of string), top speed need only be ≥ 0, so v_bottom ≥ \\sqrt{4gR} = 2\\sqrt{gR}.'
      },
      {
        title: 'Coefficient of Restitution & Energy Loss',
        concept: 'Ratio of separation velocity to approach velocity and collision KE loss',
        formula: 'e = \\frac{v_2 - v_1}{u_1 - u_2},\\quad \\Delta K_{\\text{loss}} = \\frac{1}{2}\\frac{m_1 m_2}{m_1 + m_2}(u_1 - u_2)^2(1 - e^2)',
        examNote: 'e = 1 for elastic collision (zero KE loss); e = 0 for perfectly inelastic (maximum KE loss).'
      },
      {
        title: 'Instantaneous & Average Power',
        concept: 'Rate of work delivery by force vector',
        formula: 'P = \\frac{dW}{dt} = \\vec{F}\\cdot\\vec{v},\\quad P_{\\text{avg}} = \\frac{W_{\\text{total}}}{\\Delta t}',
        examNote: 'If constant power P delivers kinetic energy from rest: v \\propto t^{1/2} and displacement s \\propto t^{3/2}.'
      }
    ]
  },
  {
    chapterId: 'p5',
    chapterName: 'Center of Mass & Momentum',
    subject: 'physics',
    formulas: [
      {
        title: 'Center of Mass Coordinates',
        concept: 'Mass-weighted position vector of discrete and continuous systems',
        formula: '\\vec{R}_{\\text{cm}} = \\frac{\\sum m_i\\vec{r}_i}{\\sum m_i} = \\frac{1}{M}\\int \\vec{r}\\,dm',
        examNote: 'If external net force is zero, CM velocity is constant: \\vec{v}_{\\text{cm}} = \\text{const}, \\vec{a}_{\\text{cm}} = 0.'
      },
      {
        title: 'CM of Standard Geometric Bodies',
        concept: 'High-frequency center of mass coordinates from base/center',
        formula: 'y_{\\text{semi-ring}} = \\frac{2R}{\\pi},\\quad y_{\\text{semi-disc}} = \\frac{4R}{3\\pi},\\quad y_{\\text{hemi-shell}} = \\frac{R}{2},\\quad y_{\\text{solid-hemi}} = \\frac{3R}{8}',
        examNote: 'For hollow cone: h/3 from base; solid cone: h/4 from base. Highly repeated in JEE Main.'
      },
      {
        title: 'Conservation of Linear Momentum & Recoil',
        concept: 'Internal interaction on smooth horizontal surface with zero external force',
        formula: 'm_1\\Delta x_1 + m_2\\Delta x_2 = 0 \\implies \\Delta x_{\\text{plank}} = -\\frac{m_{\\text{man}}\\Delta x_{\\text{man/plank}}}{m_{\\text{man}} + M_{\\text{plank}}}',
        examNote: 'Always convert relative displacement to ground frame: x_man = x_rel + x_plank.'
      },
      {
        title: 'Impulse-Momentum Theorem',
        concept: 'Time integral of force equals total change in linear momentum',
        formula: '\\vec{J} = \\int_{t_1}^{t_2} \\vec{F}\\,dt = \\Delta\\vec{p} = m\\vec{v}_f - m\\vec{v}_i',
        examNote: 'Area under force-time (F-t) graph gives total impulse J.'
      }
    ]
  },
  {
    chapterId: 'p6',
    chapterName: 'Rotational Motion',
    subject: 'physics',
    formulas: [
      {
        title: 'Parallel & Perpendicular Axis Theorems',
        concept: 'Moments of inertia transformations across parallel and perpendicular axes',
        formula: 'I = I_{\\text{cm}} + Md^2\\ (\\text{Parallel}),\\quad I_z = I_x + I_y\\ (\\text{Perpendicular, 2D planar body})',
        examNote: 'Perpendicular axis theorem applies strictly to planar 2D laminar objects only.'
      },
      {
        title: 'Standard Moments of Inertia',
        concept: 'Geometric moments of inertia about centroidal symmetry axes',
        formula: 'I_{\\text{ring}} = MR^2,\\quad I_{\\text{disc}} = \\frac{1}{2}MR^2,\\quad I_{\\text{solid sphere}} = \\frac{2}{5}MR^2,\\quad I_{\\text{hollow sphere}} = \\frac{2}{3}MR^2',
        examNote: 'Thin rod about center: ML²/12; about end: ML²/3. Solid cylinder: MR²/2.'
      },
      {
        title: 'Pure Rolling Motion Condition & Kinetic Energy',
        concept: 'Kinematics at instantaneous contact point and total kinetic energy',
        formula: 'v_{\\text{cm}} = R\\omega,\\quad a_{\\text{cm}} = R\\alpha,\\quad K_{\\text{total}} = \\frac{1}{2}Mv_{\\text{cm}}^2\\left(1 + \\frac{k^2}{R^2}\\right)',
        examNote: 'In pure rolling on stationary ground, contact point has v = 0 and friction does zero work.'
      },
      {
        title: 'Acceleration on Rough Inclined Plane',
        concept: 'Linear acceleration of rolling body down an incline of angle θ',
        formula: 'a = \\frac{g\\sin\\theta}{1 + \\frac{k^2}{R^2}},\\quad f = \\frac{mg\\sin\\theta}{1 + \\frac{R^2}{k^2}} \\le \\mu_s mg\\cos\\theta',
        examNote: 'Order of acceleration: Solid sphere (k²/R² = 2/5) > Disc (1/2) > Hollow sphere (2/3) > Ring (1).'
      },
      {
        title: 'Angular Momentum & Torque',
        concept: 'Torque as rate of change of angular momentum and conservation rule',
        formula: '\\vec{\\tau} = \\vec{r}\\times\\vec{F} = I\\vec{\\alpha} = \\frac{d\\vec{L}}{dt},\\quad \\vec{L} = \\vec{r}_{\\text{cm}}\\times M\\vec{v}_{\\text{cm}} + I_{\\text{cm}}\\vec{\\omega}',
        examNote: 'If net external torque is zero about an axis, angular momentum about that axis is conserved: I₁ω₁ = I₂ω₂.'
      }
    ]
  },
  {
    chapterId: 'p7',
    chapterName: 'Gravitation',
    subject: 'physics',
    formulas: [
      {
        title: 'Acceleration Due to Gravity with Altitude & Depth',
        concept: 'Variation of g above and below Earth surface',
        formula: 'g(h) = g\\left(1 - \\frac{2h}{R}\\right)\\ [h \\ll R],\\quad g(d) = g\\left(1 - \\frac{d}{R}\\right)',
        examNote: 'Decrease in g at height h is twice the decrease at depth d (for h = d << R). At Earth center, g = 0.'
      },
      {
        title: 'Gravitational Potential of Solid Sphere',
        concept: 'Field and potential outside and inside uniform solid sphere of radius R',
        formula: 'V_{\\text{out}} = -\\frac{GM}{r},\\quad V_{\\text{in}} = -\\frac{GM(3R^2 - r^2)}{2R^3},\\quad V_{\\text{center}} = -\\frac{3}{2}\\frac{GM}{R}',
        examNote: 'Potential at center is 1.5 times the surface potential: V_center = 1.5 V_surface.'
      },
      {
        title: 'Escape & Orbital Speed',
        concept: 'Minimum escape speed and circular satellite orbital velocity',
        formula: 'v_e = \\sqrt{\\frac{2GM}{R}} = \\sqrt{2gR} \\approx 11.2\\text{ km/s},\\quad v_o = \\sqrt{\\frac{GM}{r}} \\implies v_e = \\sqrt{2}v_o',
        examNote: 'Escape velocity is independent of projection angle (provided no planet collision) and independent of body mass.'
      },
      {
        title: 'Kepler\'s Third Law & Satellite Total Energy',
        concept: 'Harmonic orbital period and total mechanical energy of bound satellite',
        formula: 'T^2 = \\frac{4\\pi^2}{GM}r^3,\\quad E_{\\text{total}} = -\\frac{GMm}{2r} = -K = \\frac{U}{2}',
        examNote: 'For elliptical orbits, replace radius r with semi-major axis a: E = -GMm / (2a).'
      },
      {
        title: 'Effect of Earth Rotation on Gravity',
        concept: 'Latitude dependence of effective gravitational acceleration',
        formula: 'g\' = g - \\omega^2 R\\cos^2\\lambda',
        examNote: 'At equator (λ = 0°): g\' = g - ω²R (minimum); at poles (λ = 90°): g\' = g (maximum).'
      }
    ]
  },
  {
    chapterId: 'p8',
    chapterName: 'Mechanical Properties of Solids',
    subject: 'physics',
    formulas: [
      {
        title: 'Hooke\'s Law & Young\'s Modulus',
        concept: 'Elongation of wire under tensile load',
        formula: 'Y = \\frac{\\text{Stress}}{\\text{Strain}} = \\frac{F/A}{\\Delta L / L} \\implies \\Delta L = \\frac{FL}{AY}',
        examNote: 'Young\'s modulus is an intrinsic material property; it does NOT depend on wire dimensions L or A.'
      },
      {
        title: 'Elastic Potential Energy Density',
        concept: 'Strain energy stored per unit volume in stretched wire',
        formula: 'u = \\frac{U}{\\text{Volume}} = \\frac{1}{2}\\times\\text{Stress}\\times\\text{Strain} = \\frac{1}{2}Y(\\text{Strain})^2 = \\frac{\\text{Stress}^2}{2Y}',
        examNote: 'Total elastic strain energy stored in wire: U = (1/2) F ΔL.'
      },
      {
        title: 'Thermal Stress in Rigidly Fixed Rod',
        concept: 'Compressive force induced when thermal expansion is completely prevented',
        formula: '\\text{Stress} = Y\\alpha\\Delta T,\\quad F_{\\text{thermal}} = YA\\alpha\\Delta T',
        examNote: 'Thermal stress arises ONLY when expansion is constrained. Free expansion produces zero stress.'
      },
      {
        title: 'Bulk Modulus & Compressibility',
        concept: 'Volumetric elasticity under hydrostatic pressure',
        formula: 'B = -\\frac{\\Delta P}{\\Delta V / V},\\quad \\kappa = \\frac{1}{B}',
        examNote: 'For ideal rigid bodies, B → ∞, compressibility κ = 0. For liquids, shear modulus η = 0.'
      },
      {
        title: 'Poisson\'s Ratio & Inter-Moduli Relations',
        concept: 'Lateral contraction to longitudinal elongation ratio',
        formula: '\\sigma = -\\frac{\\Delta d / d}{\\Delta L / L},\\quad Y = 2\\eta(1 + \\sigma) = 3B(1 - 2\\sigma)',
        examNote: 'Theoretical range: -1 ≤ σ ≤ 0.5. Practical engineering materials: 0 ≤ σ ≤ 0.5.'
      }
    ]
  },
  {
    chapterId: 'p9',
    chapterName: 'Mechanical Properties of Fluids',
    subject: 'physics',
    formulas: [
      {
        title: 'Bernoulli\'s Equation & Continuity',
        concept: 'Conservation of energy and mass for steady, ideal incompressible fluid flow',
        formula: 'A_1 v_1 = A_2 v_2,\\quad P + \\frac{1}{2}\\rho v^2 + \\rho gh = \\text{constant}',
        examNote: 'Applies strictly to streamline, incompressible, non-viscous, irrotational fluid flow.'
      },
      {
        title: 'Torricelli\'s Law of Efflux & Range',
        concept: 'Speed of liquid emerging from tank orifice and horizontal landing distance',
        formula: 'v = \\sqrt{2gh},\\quad R = 2\\sqrt{h(H - h)},\\quad R_{\\max} = H\\ (\\text{at } h = H/2)',
        examNote: 'Range is symmetric: orifices at depths h and (H - h) achieve identical horizontal range R.'
      },
      {
        title: 'Surface Tension & Excess Pressure',
        concept: 'Curved liquid-gas interface pressure differentials',
        formula: '\\Delta P_{\\text{drop}} = \\frac{2T}{R},\\quad \\Delta P_{\\text{bubble}} = \\frac{4T}{R},\\quad h_{\\text{capillary}} = \\frac{2T\\cos\\theta_c}{r\\rho g}',
        examNote: 'Soap bubble has two free liquid-air surfaces (4T/R); liquid drop has only one (2T/R).'
      },
      {
        title: 'Stokes\' Law & Terminal Velocity',
        concept: 'Viscous drag on sphere and equilibrium terminal settling velocity',
        formula: 'F_v = 6\\pi\\eta r v,\\quad v_T = \\frac{2}{9}\\frac{r^2(\\rho - \\sigma)g}{\\eta}',
        examNote: 'ρ is density of spherical body; σ is density of fluid medium. If ρ < σ, bubble rises with terminal speed.'
      },
      {
        title: 'Accelerated Liquid Surface Tilt',
        concept: 'Free surface inclination in horizontally accelerating container',
        formula: '\\tan\\theta = \\frac{a}{g},\\quad P_2 - P_1 = -\\rho a_x(x_2 - x_1) - \\rho(g + a_y)(y_2 - y_1)',
        examNote: 'The free liquid surface aligns perpendicular to the effective gravity vector g_eff.'
      }
    ]
  },
  {
    chapterId: 'p10',
    chapterName: 'Thermal Physics',
    subject: 'physics',
    formulas: [
      {
        title: 'Thermal Conduction & Thermal Resistance',
        concept: 'Fourier law of heat conduction through composite conductors',
        formula: '\\frac{dQ}{dt} = \\frac{kA(T_1 - T_2)}{L} = \\frac{\\Delta T}{R_{\\text{th}}},\\quad R_{\\text{th}} = \\frac{L}{kA}',
        examNote: 'In series: R_eq = R₁ + R₂; In parallel: 1/R_eq = 1/R₁ + 1/R₂. Exact electrical analogy with Ohm\'s law.'
      },
      {
        title: 'Stefan-Boltzmann & Prevost\'s Radiation Law',
        concept: 'Radiant energy emitted and net heat exchange with surroundings',
        formula: 'P = e\\sigma A(T^4 - T_0^4),\\quad \\sigma = 5.67\\times 10^{-8}\\text{ W/m}^2\\text{K}^4',
        examNote: 'For a perfect blackbody, emissivity e = 1. Temperatures MUST strictly be in Kelvin (K).'
      },
      {
        title: 'Wien\'s Displacement Law',
        concept: 'Peak blackbody spectral emission wavelength relationship with temperature',
        formula: '\\lambda_{\\max} T = b = 2.898\\times 10^{-3}\\text{ m}\\cdot\\text{K}',
        examNote: 'As temperature increases, peak wavelength λ_max shifts towards shorter wavelengths (higher frequencies).'
      },
      {
        title: 'Newton\'s Law of Cooling',
        concept: 'Approximate rate of temperature drop for small excess temperature',
        formula: '\\frac{dT}{dt} = -K(T - T_0) \\implies \\frac{T_1 - T_2}{t} = K\\left(\\frac{T_1 + T_2}{2} - T_0\\right)',
        examNote: 'Valid only for small excess temperatures (T - T₀ << T₀) primarily cooling via convection and radiation.'
      }
    ]
  },
  {
    chapterId: 'p11',
    chapterName: 'Thermodynamics',
    subject: 'physics',
    formulas: [
      {
        title: 'First Law of Thermodynamics',
        concept: 'Conservation of energy relating heat, internal energy, and work',
        formula: 'dQ = dU + dW,\\quad dU = n C_v dT,\\quad dW = P\\,dV',
        examNote: 'dU is a state function (∮ dU = 0 for cyclic process). dQ and dW are path-dependent functions.'
      },
      {
        title: 'Work in Thermodynamic Processes',
        concept: 'Reversible work formulas for standard ideal gas paths',
        formula: 'W_{\\text{iso}} = nRT\\ln\\left(\\frac{V_2}{V_1}\\right),\\quad W_{\\text{adia}} = \\frac{P_1 V_1 - P_2 V_2}{\\gamma - 1} = \\frac{nR(T_1 - T_2)}{\\gamma - 1}',
        examNote: 'In adiabatic process: PV^γ = const, TV^(γ-1) = const, T^γ P^(1-γ) = const.'
      },
      {
        title: 'Heat Capacities & Mayer\'s Relation',
        concept: 'Molar heat capacities and adiabatic index in terms of degrees of freedom',
        formula: 'C_p - C_v = R,\\quad \\gamma = \\frac{C_p}{C_v} = 1 + \\frac{2}{f},\\quad C_v = \\frac{f}{2}R,\\quad C_p = \\left(\\frac{f}{2} + 1\\right)R',
        examNote: 'Monoatomic: f=3, γ=5/3; Diatomic: f=5, γ=7/5=1.4; Non-linear polyatomic: f=6, γ=4/3.'
      },
      {
        title: 'Carnot Engine Efficiency & Refrigerator COP',
        concept: 'Reversible heat engine efficiency and heat pump coefficient of performance',
        formula: '\\eta = 1 - \\frac{Q_2}{Q_1} = 1 - \\frac{T_2}{T_1},\\quad \\beta = \\text{COP} = \\frac{Q_2}{W} = \\frac{T_2}{T_1 - T_2}',
        examNote: 'Relation between Carnot efficiency and refrigerator COP: β = (1 - η) / η.'
      },
      {
        title: 'Polytropic Process (PV^n = const)',
        concept: 'Molar heat capacity and work in generalized polytropic expansion',
        formula: 'C = C_v + \\frac{R}{1 - n},\\quad W = \\frac{nR(T_1 - T_2)}{n - 1}',
        examNote: 'If n = 1 (isothermal), C → ∞; if n = γ (adiabatic), C = 0.'
      }
    ]
  },
  {
    chapterId: 'p12',
    chapterName: 'Kinetic Theory of Gases',
    subject: 'physics',
    formulas: [
      {
        title: 'Molecular Speeds Distribution',
        concept: 'RMS, average, and most probable molecular velocities',
        formula: 'v_{\\text{rms}} = \\sqrt{\\frac{3RT}{M}},\\quad v_{\\text{avg}} = \\sqrt{\\frac{8RT}{\\pi M}},\\quad v_{\\text{mp}} = \\sqrt{\\frac{2RT}{M}}',
        examNote: 'Ratio v_mp : v_avg : v_rms = \\sqrt{2} : \\sqrt{8/\\pi} : \\sqrt{3} \\approx 1 : 1.128 : 1.224.'
      },
      {
        title: 'Pressure & Kinetic Energy of Ideal Gas',
        concept: 'Microscopic origin of gas pressure and translational energy',
        formula: 'P = \\frac{1}{3}\\rho v_{\\text{rms}}^2 = \\frac{2}{3}E_v,\\quad E_{\\text{trans/molecule}} = \\frac{3}{2}k_B T',
        examNote: 'Translational KE per molecule depends strictly and only on absolute temperature T: (3/2) k_B T.'
      },
      {
        title: 'Mean Free Path of Gas Molecules',
        concept: 'Average distance travelled between successive collisions',
        formula: '\\lambda = \\frac{1}{\\sqrt{2}\\pi d^2 n_v} = \\frac{k_B T}{\\sqrt{2}\\pi d^2 P}',
        examNote: 'λ ∝ T at constant pressure; λ ∝ 1/P at constant temperature. Independent of molecular speed.'
      },
      {
        title: 'Equipartition of Energy & Gas Mixture',
        concept: 'Total internal energy and equivalent specific heat of gas mixture',
        formula: 'U = \\frac{f}{2}nRT,\\quad C_{v,\\text{mix}} = \\frac{n_1 C_{v1} + n_2 C_{v2}}{n_1 + n_2},\\quad \\gamma_{\\text{mix}} = \\frac{n_1 C_{p1} + n_2 C_{p2}}{n_1 C_{v1} + n_2 C_{v2}}',
        examNote: 'Each quadratic degree of freedom contributes (1/2) k_B T energy per molecule.'
      }
    ]
  },
  {
    chapterId: 'p13',
    chapterName: 'Oscillations (SHM)',
    subject: 'physics',
    formulas: [
      {
        title: 'Simple Harmonic Motion Kinematics',
        concept: 'Displacement, velocity, and acceleration in linear SHM',
        formula: 'x(t) = A\\sin(\\omega t + \\phi),\\quad v(t) = \\omega\\sqrt{A^2 - x^2},\\quad a(t) = -\\omega^2 x',
        examNote: 'Maximum velocity at mean position (x = 0): v_max = ωA; maximum acceleration at extremes: a_max = ω²A.'
      },
      {
        title: 'Energy Conservation in SHM',
        concept: 'Kinetic, potential, and total mechanical energy of harmonic oscillator',
        formula: 'K = \\frac{1}{2}m\\omega^2(A^2 - x^2),\\quad U = \\frac{1}{2}m\\omega^2 x^2,\\quad E = K + U = \\frac{1}{2}m\\omega^2 A^2',
        examNote: 'Time average KE = Time average PE = (1/4) mω²A² = (1/2) E_total.'
      },
      {
        title: 'Simple & Physical Pendulum Time Periods',
        concept: 'Small-amplitude oscillation periods of point and distributed masses',
        formula: 'T_{\\text{simple}} = 2\\pi\\sqrt{\\frac{L}{g}},\\quad T_{\\text{physical}} = 2\\pi\\sqrt{\\frac{I}{mg d}}',
        examNote: 'For second\'s pendulum: T = 2 s ⟹ L ≈ 1 m (at Earth surface).'
      },
      {
        title: 'Spring Combinations & Cut Springs',
        concept: 'Equivalent spring constants in series and parallel arrangements',
        formula: 'k_{\\text{series}} = \\frac{k_1 k_2}{k_1 + k_2},\\quad k_{\\text{parallel}} = k_1 + k_2,\\quad k \\times L = \\text{constant}',
        examNote: 'If spring of constant k is cut into ratio m:n, stiffnesses become k₁ = k(m+n)/m and k₂ = k(m+n)/n.'
      },
      {
        title: 'Two-Block Reduced Mass Oscillator',
        concept: 'Two interacting masses coupled by spring of constant k',
        formula: 'T = 2\\pi\\sqrt{\\frac{\\mu}{k}},\\quad \\mu = \\frac{m_1 m_2}{m_1 + m_2}',
        examNote: 'Reduced mass μ converts two-body coupled problem into single equivalent harmonic body.'
      }
    ]
  },
  {
    chapterId: 'p14',
    chapterName: 'Waves & Sound',
    subject: 'physics',
    formulas: [
      {
        title: 'Progressive Wave Equation',
        concept: 'Displacement equation of travelling wave and wave velocity',
        formula: 'y(x,t) = A\\sin(kx \\mp \\omega t + \\phi),\\quad v = \\frac{\\omega}{k} = f\\lambda,\\quad k = \\frac{2\\pi}{\\lambda}',
        examNote: 'Minus sign (kx - ωt) propagates along +x direction; plus sign along -x direction.'
      },
      {
        title: 'Speed of Transverse & Longitudinal Waves',
        concept: 'Wave speeds on stretched string and in gaseous medium (Laplace correction)',
        formula: 'v_{\\text{string}} = \\sqrt{\\frac{T}{\\mu}},\\quad v_{\\text{sound}} = \\sqrt{\\frac{\\gamma P}{\\rho}} = \\sqrt{\\frac{\\gamma RT}{M}}',
        examNote: 'Speed of sound in gas is independent of pressure at constant temperature; v ∝ \\sqrt{T}.'
      },
      {
        title: 'Standing Waves in Organ Pipes',
        concept: 'Resonant harmonic frequencies of open and closed organ pipes',
        formula: 'f_n^{\\text{open}} = n\\left(\\frac{v}{2L}\\right)\\ [n=1,2,3],\\quad f_n^{\\text{closed}} = (2n - 1)\\left(\\frac{v}{4L}\\right)\\ [n=1,2,3]',
        examNote: 'Closed pipe generates ONLY odd harmonics; open pipe generates all integer harmonics.'
      },
      {
        title: 'Beats Frequency',
        concept: 'Periodic variation in intensity due to superposition of near frequencies',
        formula: 'f_{\\text{beat}} = |f_1 - f_2|',
        examNote: 'Loading tuning fork with wax decreases its frequency; filing increases frequency.'
      },
      {
        title: 'Doppler Effect in Sound',
        concept: 'Apparent frequency with moving source and observer along line of sight',
        formula: 'f\' = f_0\\left(\\frac{v \\pm v_o}{v \\mp v_s}\\right)',
        examNote: 'Top signs when approaching; bottom signs when receding. Perpendicular motion gives zero Doppler shift.'
      }
    ]
  },
  {
    chapterId: 'p15',
    chapterName: 'Electrostatics',
    subject: 'physics',
    formulas: [
      {
        title: 'Coulomb\'s Law & Field in Dielectric',
        concept: 'Electrostatic force between point charges in dielectric medium',
        formula: '\\vec{F} = \\frac{1}{4\\pi\\varepsilon_0 K}\\frac{q_1 q_2}{r^2}\\hat{r},\\quad \\frac{1}{4\\pi\\varepsilon_0} = 9\\times 10^9\\text{ N}\\cdot\\text{m}^2/\\text{C}^2',
        examNote: 'In medium of dielectric constant K, electrostatic force reduces by factor K: F_med = F_0 / K.'
      },
      {
        title: 'Electric Dipole Field & Potential',
        concept: 'Short dipole field at axial and equatorial points',
        formula: 'E_{\\text{axial}} = \\frac{2kp}{r^3},\\quad E_{\\text{equatorial}} = \\frac{kp}{r^3},\\quad V(r,\\theta) = \\frac{kp\\cos\\theta}{r^2}',
        examNote: 'Torque \\vec{τ} = \\vec{p} × \\vec{E}; potential energy U = -\\vec{p} · \\vec{E}. Stable at θ = 0°, unstable at 180°.'
      },
      {
        title: 'Gauss\'s Law & Standard Fields',
        concept: 'Electric flux and fields of infinite wire and large planar sheet',
        formula: '\\Phi = \\oint \\vec{E}\\cdot d\\vec{A} = \\frac{q_{\\text{encl}}}{\\varepsilon_0},\\quad E_{\\text{wire}} = \\frac{\\lambda}{2\\pi\\varepsilon_0 r},\\quad E_{\\text{sheet}} = \\frac{\\sigma}{2\\varepsilon_0}',
        examNote: 'Field just outside any conducting surface with local charge density σ is E = σ / ε₀.'
      },
      {
        title: 'Uniform Solid Insulating Sphere Field & Potential',
        concept: 'Internal and external electrostatic field and potential for radius R',
        formula: 'E_{\\text{in}} = \\frac{\\rho r}{3\\varepsilon_0} = \\frac{kQr}{R^3},\\quad V_{\\text{center}} = \\frac{3}{2}\\frac{kQ}{R} = 1.5 V_{\\text{surface}}',
        examNote: 'For conducting/hollow shell: E_in = 0 and V_in = V_surface = kQ/R everywhere inside.'
      },
      {
        title: 'Electrostatic Potential Energy & Energy Density',
        concept: 'Interaction energy of point charges and stored field energy density',
        formula: 'U = \\frac{k q_1 q_2}{r},\\quad u_E = \\frac{1}{2}\\varepsilon_0 E^2,\\quad U_{\\text{self, solid}} = \\frac{3}{5}\\frac{kQ^2}{R}',
        examNote: 'Self-energy of spherical conducting shell is (1/2) kQ² / R.'
      }
    ]
  },
  {
    chapterId: 'p16',
    chapterName: 'Capacitance',
    subject: 'physics',
    formulas: [
      {
        title: 'Parallel Plate Capacitor & Partial Dielectric',
        concept: 'Capacitance with slab of thickness t and dielectric constant K',
        formula: 'C = \\frac{\\varepsilon_0 A}{d - t\\left(1 - \\frac{1}{K}\\right)},\\quad C_0 = \\frac{\\varepsilon_0 A}{d}',
        examNote: 'If slab completely fills gap (t = d): C = K C₀. Dielectric insertion always increases capacitance.'
      },
      {
        title: 'Stored Energy in Capacitor',
        concept: 'Electrostatic energy and battery behavior with/without connection',
        formula: 'U = \\frac{1}{2}C V^2 = \\frac{Q^2}{2C} = \\frac{1}{2}QV',
        examNote: 'Battery connected: V = const ⟹ Q, C, U increase by K. Disconnected: Q = const ⟹ V decreases, U decreases.'
      },
      {
        title: 'Sharing of Charge & Heat Dissipation',
        concept: 'Common potential and energy lost when two charged capacitors are joined',
        formula: 'V_{\\text{common}} = \\frac{C_1 V_1 + C_2 V_2}{C_1 + C_2},\\quad \\Delta H_{\\text{loss}} = \\frac{1}{2}\\frac{C_1 C_2}{C_1 + C_2}(V_1 - V_2)^2',
        examNote: 'Heat loss is completely independent of wire resistance.'
      },
      {
        title: 'Force Between Capacitor Plates',
        concept: 'Mutual electrostatic attractive force between parallel oppositely charged plates',
        formula: 'F = \\frac{Q^2}{2\\varepsilon_0 A} = \\frac{1}{2}QE = \\frac{1}{2}\\varepsilon_0 E^2 A',
        examNote: 'Factor 1/2 arises because one plate resides in the electric field created by the OTHER plate (E/2).'
      }
    ]
  },
  {
    chapterId: 'p17',
    chapterName: 'Current Electricity',
    subject: 'physics',
    formulas: [
      {
        title: 'Drift Velocity & Microscopic Ohm\'s Law',
        concept: 'Electron drift speed, current density, and conductivity',
        formula: 'I = n A e v_d,\\quad v_d = \\frac{eE\\tau}{m},\\quad \\vec{J} = \\sigma\\vec{E} = \\frac{\\vec{E}}{\\rho},\\quad \\rho = \\frac{m}{n e^2\\tau}',
        examNote: 'In metals, heating increases lattice collisions, shortening relaxation time τ ⟹ resistivity increases.'
      },
      {
        title: 'Temperature Dependence of Resistance',
        concept: 'Linear variation of resistance with temperature',
        formula: 'R(T) = R_0(1 + \\alpha\\Delta T),\\quad \\alpha = \\frac{R_2 - R_1}{R_1 T_2 - R_2 T_1}',
        examNote: 'For semiconductors and carbon, α is negative: resistance decreases with heating.'
      },
      {
        title: 'Equivalent EMF & Maximum Power Transfer Theorem',
        concept: 'Parallel cells combination and maximum power delivered to external load',
        formula: '\\mathcal{E}_{\\text{eq}} = \\frac{\\sum \\mathcal{E}_i / r_i}{\\sum 1/r_i},\\quad P_{\\max} = \\frac{\\mathcal{E}^2}{4r}\\ (\\text{when } R_{\\text{load}} = r)',
        examNote: 'At maximum power transfer, efficiency is exactly 50%.'
      },
      {
        title: 'Wheatstone Bridge & Meter Bridge',
        concept: 'Null deflection balance condition and unknown resistance determination',
        formula: '\\frac{P}{Q} = \\frac{R}{S} \\implies I_G = 0,\\quad \\frac{R}{S} = \\frac{l}{100 - l}',
        examNote: 'Sensitivity of meter bridge is maximum when null point lies near the center (l ≈ 50 cm).'
      },
      {
        title: 'Potentiometer Cell Comparison & Internal Resistance',
        concept: 'Measurement of EMF and internal cell resistance without drawing current',
        formula: '\\frac{\\mathcal{E}_1}{\\mathcal{E}_2} = \\frac{l_1}{l_2},\\quad r = R\\left(\\frac{l_1 - l_2}{l_2}\\right)',
        examNote: 'Potentiometer draws zero current at balance, giving ideal voltmeter performance with infinite impedance.'
      }
    ]
  },
  {
    chapterId: 'p18',
    chapterName: 'Magnetic Effects of Current & Magnetism',
    subject: 'physics',
    formulas: [
      {
        title: 'Biot-Savart Law & Circular Coil Field',
        concept: 'Magnetic field at center and along axis of circular current loop',
        formula: 'B_{\\text{center}} = \\frac{\\mu_0 N I}{2R},\\quad B_{\\text{axis}} = \\frac{\\mu_0 N I R^2}{2(R^2 + x^2)^{3/2}}',
        examNote: 'At large distance x >> R: B_axis ≈ (μ₀/4π) · (2M / x³) with magnetic moment M = N I A.'
      },
      {
        title: 'Ampere\'s Circuital Law & Solenoid',
        concept: 'Line integral of magnetic field and field inside ideal solenoid',
        formula: '\\oint \\vec{B}\\cdot d\\vec{l} = \\mu_0 I_{\\text{encl}},\\quad B_{\\text{solenoid}} = \\mu_0 n I,\\quad B_{\\text{end}} = \\frac{1}{2}\\mu_0 n I',
        examNote: 'n = N/L is turns per unit length. Field inside long solenoid is uniform and axial.'
      },
      {
        title: 'Lorentz Force & Helical Motion in Magnetic Field',
        concept: 'Charged particle trajectory and gyroradius in magnetic field',
        formula: '\\vec{F} = q(\\vec{E} + \\vec{v}\\times\\vec{B}),\\quad r = \\frac{mv_\\perp}{qB} = \\frac{\\sqrt{2mK}}{qB},\\quad T = \\frac{2\\pi m}{qB}',
        examNote: 'Magnetic force does zero work on charge (W = 0, ΔK = 0). Period T is independent of particle speed v.'
      },
      {
        title: 'Force Between Parallel Currents',
        concept: 'Mutual magnetic force per unit length between long parallel conductors',
        formula: '\\frac{F}{L} = \\frac{\\mu_0 I_1 I_2}{2\\pi d}',
        examNote: 'Parallel currents attract; anti-parallel currents repel. Basis of definition of Ampere.'
      }
    ]
  },
  {
    chapterId: 'p19',
    chapterName: 'Magnetism & Matter',
    subject: 'physics',
    formulas: [
      {
        title: 'Magnetic Dipole in Uniform Field',
        concept: 'Torque, potential energy, and vibration magnetometer period',
        formula: '\\vec{\\tau} = \\vec{M}\\times\\vec{B},\\quad U = -\\vec{M}\\cdot\\vec{B},\\quad T = 2\\pi\\sqrt{\\frac{I}{M B_H}}',
        examNote: 'Bohr magneton: μ_B = eℏ / (2m_e) = 9.27 × 10⁻²⁴ A·m².'
      },
      {
        title: 'Earth\'s Magnetic Field & Apparent Dip',
        concept: 'Horizontal and vertical components and apparent dip in perpendicular planes',
        formula: 'B_H = B\\cos\\theta,\\quad B_V = B\\sin\\theta,\\quad \\cot^2\\theta\' = \\cot^2\\theta_1 + \\cot^2\\theta_2',
        examNote: 'At magnetic poles: dip θ = 90°, B_H = 0; at equator: dip θ = 0°, B_V = 0.'
      },
      {
        title: 'Magnetic Permeability & Susceptibility',
        concept: 'Relation between magnetic induction, field intensity, and susceptibility',
        formula: '\\vec{B} = \\mu_0(\\vec{H} + \\vec{M}),\\quad \\vec{M} = \\chi_m\\vec{H},\\quad \\mu_r = 1 + \\chi_m',
        examNote: 'Diamagnetic: χ_m < 0 (small, independent of T); Paramagnetic: χ_m > 0 (Curie law: χ_m ∝ 1/T).'
      },
      {
        title: 'Magnetic Field of Short Bar Magnet (Axial & Equatorial)',
        concept: 'Inverse cube magnetic induction formulas along principal axes of dipole',
        formula: 'B_{\\text{axial}} = \\frac{\\mu_0}{4\\pi}\\frac{2M}{r^3},\\quad B_{\\text{equatorial}} = \\frac{\\mu_0}{4\\pi}\\frac{M}{r^3},\\quad B_{\\theta} = \\frac{\\mu_0}{4\\pi}\\frac{M}{r^3}\\sqrt{1 + 3\\cos^2\\theta}',
        examNote: 'At angle θ to dipole axis, deflection angle φ satisfies \\tan\\phi = \\frac{1}{2}\\tan\\theta. Notice factor of 2 between axial and equatorial fields.'
      },
      {
        title: 'Curie Law & Curie-Weiss Temperature Transition',
        concept: 'Thermal susceptibility dependence of paramagnetic and ferromagnetic domains',
        formula: '\\chi_m = \\frac{C}{T}\\ (\\text{Paramagnetic}),\\quad \\chi_m = \\frac{C}{T - T_c}\\ (T > T_c,\\ \\text{Ferromagnetic})',
        examNote: 'Above Curie temperature T_c, ferromagnetic material transitions into ordinary paramagnetic phase. Diamagnetism is temperature-independent.'
      }
    ]
  },
  {
    chapterId: 'p20',
    chapterName: 'Electromagnetic Induction',
    subject: 'physics',
    formulas: [
      {
        title: 'Faraday\'s Law & Induced Charge',
        concept: 'Rate of change of magnetic flux and total charge circulated in circuit',
        formula: '\\mathcal{E} = -\\frac{d\\Phi_B}{dt},\\quad q_{\\text{induced}} = \\frac{\\Delta\\Phi_B}{R}',
        examNote: 'Total induced charge Δq depends strictly on flux change ΔΦ, totally independent of the time interval Δt!'
      },
      {
        title: 'Motional EMF in Moving & Rotating Conductors',
        concept: 'Induced EMF across moving rod and rotating conductor in uniform B',
        formula: '\\mathcal{E}_{\\text{trans}} = B v L_\\perp,\\quad \\mathcal{E}_{\\text{rot}} = \\frac{1}{2}B\\omega L^2',
        examNote: 'Use right-hand rule for (\\vec{v} × \\vec{B}) to determine the higher potential polarity.'
      },
      {
        title: 'Self & Mutual Inductance',
        concept: 'Inductance of solenoid and energy stored in magnetic field',
        formula: 'L = \\frac{N\\Phi}{I} = \\mu_0 n^2 A l,\\quad U_B = \\frac{1}{2}L I^2,\\quad M = k\\sqrt{L_1 L_2}',
        examNote: 'Coupling coefficient k ≤ 1. Magnetic field energy density: u_B = B² / (2μ₀).'
      },
      {
        title: 'Growth & Decay in LR Circuit',
        concept: 'Time constant and current evolution in series inductive circuit',
        formula: 'I(t) = I_0\\left(1 - e^{-t/\\tau_L}\\right),\\quad \\tau_L = \\frac{L}{R},\\quad I_{\\text{decay}}(t) = I_0 e^{-t/\\tau_L}',
        examNote: 'At t = 0⁺, inductor behaves as an open circuit (I = 0). At t → ∞, inductor acts as a plain wire.'
      }
    ]
  },
  {
    chapterId: 'p21',
    chapterName: 'Alternating Current',
    subject: 'physics',
    formulas: [
      {
        title: 'RMS, Peak & Average Values',
        concept: 'Root-mean-square and half-cycle average of sinusoidal AC',
        formula: 'I_{\\text{rms}} = \\frac{I_0}{\\sqrt{2}} \\approx 0.707 I_0,\\quad V_{\\text{rms}} = \\frac{V_0}{\\sqrt{2}},\\quad I_{\\text{avg, half}} = \\frac{2I_0}{\\pi} \\approx 0.637 I_0',
        examNote: 'Standard AC meters (hot-wire ammeter/voltmeter) measure RMS values, not peak values.'
      },
      {
        title: 'Series LCR Circuit Impedance & Phase Angle',
        concept: 'Phasor relationships and impedance triangle in series AC circuit',
        formula: 'Z = \\sqrt{R^2 + (X_L - X_C)^2},\\quad X_L = \\omega L,\\quad X_C = \\frac{1}{\\omega C},\\quad \\tan\\phi = \\frac{X_L - X_C}{R}',
        examNote: 'If X_L > X_C, circuit is inductive (voltage leads current by φ). If X_C > X_L, capacitive.'
      },
      {
        title: 'Resonance in Series LCR & Q-Factor',
        concept: 'Resonance frequency, maximum current condition, and sharpness of tuning',
        formula: '\\omega_0 = \\frac{1}{\\sqrt{LC}},\\quad f_0 = \\frac{1}{2\\pi\\sqrt{LC}},\\quad Q = \\frac{\\omega_0 L}{R} = \\frac{1}{R}\\sqrt{\\frac{L}{C}} = \\frac{\\omega_0}{\\Delta\\omega}',
        examNote: 'At resonance, Z_min = R (purely resistive) and power factor cos φ = 1.'
      },
      {
        title: 'Average Power & Power Factor',
        concept: 'Real power dissipation and wattless current in AC circuits',
        formula: 'P_{\\text{avg}} = V_{\\text{rms}} I_{\\text{rms}} \\cos\\phi,\\quad \\cos\\phi = \\frac{R}{Z},\\quad I_{\\text{wattless}} = I_{\\text{rms}}\\sin\\phi',
        examNote: 'In pure inductor or pure capacitor: φ = π/2 ⟹ cos φ = 0 ⟹ P_avg = 0 (completely wattless).'
      }
    ]
  },
  {
    chapterId: 'p22',
    chapterName: 'Electromagnetic Waves',
    subject: 'physics',
    formulas: [
      {
        title: 'Maxwell\'s Displacement Current',
        concept: 'Time-varying electric flux producing circulating magnetic field',
        formula: 'I_d = \\varepsilon_0 \\frac{d\\Phi_E}{dt},\\quad \\oint \\vec{B}\\cdot d\\vec{l} = \\mu_0\\left(I_c + \\varepsilon_0 \\frac{d\\Phi_E}{dt}\\right)',
        examNote: 'Inside capacitor gap during charging, conduction current I_c = 0, but displacement current I_d = I_c.'
      },
      {
        title: 'Speed of EM Wave & Field Amplitude Ratio',
        concept: 'Fundamental relations between speed of light, permeability, and permittivity',
        formula: 'c = \\frac{1}{\\sqrt{\\mu_0 \\varepsilon_0}} = \\frac{E_0}{B_0} \\approx 3\\times 10^8\\text{ m/s},\\quad v_{\\text{med}} = \\frac{c}{\\sqrt{\\mu_r \\varepsilon_r}} = \\frac{c}{n}',
        examNote: '\\vec{E} and \\vec{B} oscillate in phase and mutually perpendicular to each other and propagation vector: \\hat{k} = \\hat{E} × \\hat{B}.'
      },
      {
        title: 'Poynting Vector & Intensity of EM Waves',
        concept: 'Instantaneous and time-averaged energy flux per unit area',
        formula: '\\vec{S} = \\frac{1}{\\mu_0}(\\vec{E}\\times\\vec{B}),\\quad I = \\langle S \\rangle = \\frac{1}{2}c\\varepsilon_0 E_0^2 = \\frac{E_0 B_0}{2\\mu_0}',
        examNote: 'Energy is equally divided between electric and magnetic fields: u_E = u_B = (1/4) ε₀ E₀².'
      },
      {
        title: 'Radiation Pressure',
        concept: 'Force per unit area exerted by electromagnetic radiation on surface',
        formula: 'P_{\\text{rad}} = \\frac{I}{c}\\ (\\text{Absorption}),\\quad P_{\\text{rad}} = \\frac{2I}{c}\\ (\\text{Reflection})',
        examNote: 'Momentum transferred p = U / c for full absorption; p = 2U / c for total reflection.'
      }
    ]
  },
  {
    chapterId: 'p23',
    chapterName: 'Ray Optics',
    subject: 'physics',
    formulas: [
      {
        title: 'Snell\'s Law & Critical Angle for TIR',
        concept: 'Refraction law and threshold angle for total internal reflection',
        formula: '\\mu_1\\sin i = \\mu_2\\sin r,\\quad \\sin\\theta_c = \\frac{\\mu_2}{\\mu_1}\\ (\\mu_1 > \\mu_2)',
        examNote: 'Total Internal Reflection occurs ONLY when ray travels from denser to rarer medium and angle i > θ_c.'
      },
      {
        title: 'Lens Maker\'s Formula',
        concept: 'Focal length of thin lens in terms of refractive index and radii of curvature',
        formula: '\\frac{1}{f} = (\\mu_{\\text{rel}} - 1)\\left(\\frac{1}{R_1} - \\frac{1}{R_2}\\right),\\quad \\mu_{\\text{rel}} = \\frac{\\mu_{\\text{lens}}}{\\mu_{\\text{medium}}}',
        examNote: 'If immersed in liquid with μ_med > μ_lens, convex lens acts as diverging (concave) lens.'
      },
      {
        title: 'Prism Deviation & Minimum Deviation Condition',
        concept: 'Refractive index of prism material from angle of minimum deviation',
        formula: 'A = r_1 + r_2,\\quad \\delta = i + e - A,\\quad \\mu = \\frac{\\sin\\left(\\frac{A + \\delta_m}{2}\\right)}{\\sin\\left(\\frac{A}{2}\\right)}',
        examNote: 'At minimum deviation δ_m: i = e and r₁ = r₂ = A/2. The refracted ray travels parallel to the base.'
      },
      {
        title: 'Thin Lenses in Contact & Silvering of Lens',
        concept: 'Effective power of lens combination and equivalent silvered mirror',
        formula: 'P = \\frac{1}{f\\text{ (m)}},\\quad \\frac{1}{f_{\\text{eq}}} = \\frac{1}{f_1} + \\frac{1}{f_2},\\quad P_{\\text{silvered}} = 2P_L + P_M = -\\frac{1}{F_{\\text{eq}}}',
        examNote: 'Silvered lens system always acts as an equivalent mirror.'
      },
      {
        title: 'Magnification of Telescope & Microscope',
        concept: 'Angular magnification in normal adjustment and near point',
        formula: 'M_{\\text{tele}} = -\\frac{f_o}{f_e}\\ (\\text{Normal adjustment}),\\quad M_{\\text{micro}} \\approx -\\frac{L}{f_o}\\left(1 + \\frac{D}{f_e}\\right)',
        examNote: 'Tube length for telescope in normal adjustment: L = f_o + f_e.'
      }
    ]
  },
  {
    chapterId: 'p24',
    chapterName: 'Wave Optics',
    subject: 'physics',
    formulas: [
      {
        title: 'Young\'s Double Slit Fringe Width',
        concept: 'Interference fringe spacing and positions of bright/dark bands',
        formula: '\\beta = \\frac{\\lambda D}{d},\\quad y_{\\text{bright}} = n\\frac{\\lambda D}{d},\\quad y_{\\text{dark}} = \\left(n - \\frac{1}{2}\\right)\\frac{\\lambda D}{d}',
        examNote: 'Fringe width β is constant for all orders. Immersed in liquid of index μ: β\' = β / μ.'
      },
      {
        title: 'Interference Intensity & Contrast Ratio',
        concept: 'Resultant intensity from coherent sources with phase difference Δφ',
        formula: 'I = I_1 + I_2 + 2\\sqrt{I_1 I_2}\\cos\\Delta\\phi = 4I_0\\cos^2\\left(\\frac{\\Delta\\phi}{2}\\right)\\ [I_1=I_2=I_0]',
        examNote: 'Ratio I_max / I_min = [(a₁ + a₂) / (a₁ - a₂)]² where a₁, a₂ are wave amplitudes.'
      },
      {
        title: 'Thin Film Fringe Shift in YDSE',
        concept: 'Shift of central fringe on inserting transparent plate of thickness t',
        formula: '\\Delta y = \\frac{(\\mu - 1)t D}{d} = \\frac{(\\mu - 1)t}{\\lambda}\\beta',
        examNote: 'Fringes shift towards the side where transparent sheet of thickness t is introduced.'
      },
      {
        title: 'Single Slit Fraunhofer Diffraction',
        concept: 'Minima positions and width of central diffraction maximum',
        formula: 'a\\sin\\theta = n\\lambda\\ (\\text{Minima}),\\quad \\beta_0 = \\frac{2\\lambda D}{a}\\ (\\text{Central Max Width})',
        examNote: 'Central maximum is TWICE as wide as secondary maxima: β₀ = 2β_secondary.'
      },
      {
        title: 'Brewster\'s Law & Malus\'s Law',
        concept: 'Polarization by reflection and transmitted polarized light intensity',
        formula: '\\tan\\theta_p = \\mu,\\quad \\theta_p + r = 90^\\circ,\\quad I = I_0\\cos^2\\theta',
        examNote: 'At Brewster angle θ_p, reflected ray is completely polarized perpendicular to plane of incidence.'
      }
    ]
  },
  {
    chapterId: 'p25',
    chapterName: 'Modern Physics & Semiconductors',
    subject: 'physics',
    formulas: [
      {
        title: 'Einstein\'s Photoelectric Equation',
        concept: 'Energy balance and stopping potential for emitted photoelectrons',
        formula: 'K_{\\max} = h\\nu - \\Phi = e V_0,\\quad V_0 = \\frac{h}{e}\\nu - \\frac{\\Phi}{e}',
        examNote: 'Stopping potential V₀ depends strictly on light frequency ν, totally independent of light intensity.'
      },
      {
        title: 'de Broglie Wavelength of Electron',
        concept: 'Matter wave wavelength from accelerating potential V',
        formula: '\\lambda = \\frac{h}{p} = \\frac{h}{\\sqrt{2m q V}},\\quad \\lambda_e = \\frac{12.27}{\\sqrt{V}}\\text{ \\AA}',
        examNote: 'For thermal neutron at temperature T: λ = h / \\sqrt{3m k_B T} = 25.1 / \\sqrt{T} \\text{ \\AA}.'
      },
      {
        title: 'Bohr\'s Atom Radius, Velocity & Energy',
        concept: 'Quantized parameters for hydrogen and hydrogen-like single electron ions',
        formula: 'r_n = 0.529\\frac{n^2}{Z}\\text{ \\AA},\\quad v_n = 2.18\\times 10^6\\frac{Z}{n}\\text{ m/s},\\quad E_n = -13.6\\frac{Z^2}{n^2}\\text{ eV}',
        examNote: 'Kinetic energy K = -E_n; Potential energy U = 2E_n. Radius r_n ∝ n² / Z.'
      },
      {
        title: 'Rydberg Formula & Spectral Series',
        concept: 'Wavenumber of spectral emission lines upon electronic de-excitation',
        formula: '\\frac{1}{\\lambda} = R Z^2\\left(\\frac{1}{n_1^2} - \\frac{1}{n_2^2}\\right),\\quad R \\approx 1.097\\times 10^7\\text{ m}^{-1}',
        examNote: 'Lyman (n₁=1, UV), Balmer (n₁=2, Visible), Paschen (n₁=3, IR), Brackett (n₁=4, IR).'
      },
      {
        title: 'Radioactive Decay Law & Mass Defect',
        concept: 'Exponential decay, half-life, and Einstein mass-energy equivalence',
        formula: 'N(t) = N_0 e^{-\\lambda t},\\quad t_{1/2} = \\frac{\\ln 2}{\\lambda} \\approx \\frac{0.693}{\\lambda},\\quad E_{\\text{binding}} = (\\Delta m) c^2',
        examNote: '1 amu mass defect yields 931.5 MeV of nuclear binding energy.'
      }
    ]
  }
];

// ==================== CHEMISTRY (c1 - c30) ====================
export const CHEMISTRY_FORMULA_BANK: ChapterFormulas[] = [
  {
    chapterId: 'c1',
    chapterName: 'Some Basic Concepts of Chemistry',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Molarity, Molality & Mole Fraction',
        concept: 'Fundamental solution concentration expressions',
        formula: 'M = \\frac{n_{\\text{solute}}}{V_{\\text{soln (L)}}},\\quad m = \\frac{n_{\\text{solute}}}{w_{\\text{solvent (kg)}}},\\quad x_A = \\frac{n_A}{n_A + n_B}',
        examNote: 'Molarity is temperature-dependent (volume expands); molality and mole fraction are temperature-independent.'
      },
      {
        title: 'Molality-Molarity Conversion Shortcut',
        concept: 'Instant transformation between molarity and molality via density d',
        formula: 'm = \\frac{1000 M}{1000 d - M M_{\\text{solute}}}',
        examNote: 'd is solution density in g/mL; M_solute is molar mass of solute. High-speed JEE formula.'
      },
      {
        title: 'Law of Chemical Equivalence & Normality',
        concept: 'Equivalent concept relating moles, n-factor, and neutralization',
        formula: 'N = M \\times n\\text{-factor},\\quad N_1 V_1 = N_2 V_2',
        examNote: 'Gram equivalents of reacting substances are always strictly equal at endpoint.'
      },
      {
        title: 'Empirical & Molecular Formula',
        concept: 'Relation between empirical formula mass and true molecular mass',
        formula: '\\text{Molecular Formula} = (\\text{Empirical Formula})_n,\\quad n = \\frac{\\text{Molar Mass}}{\\text{Empirical Mass}} = \\frac{2\\times \\text{Vapour Density}}{\\text{Empirical Mass}}',
        examNote: 'Molar Mass of any gas = 2 × Vapour Density (VD).'
      }
    ]
  },
  {
    chapterId: 'c2',
    chapterName: 'Structure of Atom',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Planck\'s Quantum Energy & Photoelectric Equation',
        concept: 'Photon energy in electron-volts and photoelectric work function',
        formula: 'E = h\\nu = \\frac{hc}{\\lambda},\\quad hc \\approx 12400\\text{ eV}\\cdot\\text{\\AA},\\quad h\\nu = \\Phi_0 + K_{\\max}',
        examNote: 'Use hc ≈ 12400 eV·Å for instant photon energy conversion from wavelength in Angstroms.'
      },
      {
        title: 'Bohr\'s Postulates for Single Electron Ions',
        concept: 'Quantized angular momentum, radii, and energy levels',
        formula: 'm_e v r = \\frac{nh}{2\\pi},\\quad r_n = 0.529\\frac{n^2}{Z}\\text{ \\AA},\\quad E_n = -13.6\\frac{Z^2}{n^2}\\text{ eV}',
        examNote: 'Energy gap decreases as n increases: (E₂ - E₁) > (E₃ - E₂) > (E₄ - E₃).'
      },
      {
        title: 'de Broglie Wavelength & Heisenberg Principle',
        concept: 'Wave-particle duality and position-momentum uncertainty bounds',
        formula: '\\lambda = \\frac{h}{p} = \\frac{h}{mv},\\quad \\Delta x \\cdot \\Delta p \\ge \\frac{h}{4\\pi} = \\frac{\\hbar}{2}',
        examNote: 'Circumference of n-th orbit equals n de Broglie wavelengths: 2π r_n = nλ.'
      },
      {
        title: 'Radial & Angular Nodes Count',
        concept: 'Topological node count of atomic orbital wavefunctions',
        formula: '\\text{Radial Nodes} = n - l - 1,\\quad \\text{Angular Nodes} = l,\\quad \\text{Total Nodes} = n - 1',
        examNote: 'For 3p orbital (n=3, l=1): radial nodes = 1, angular nodes = 1, total nodes = 2.'
      }
    ]
  },
  {
    chapterId: 'c3',
    chapterName: 'Classification of Elements & Periodicity',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Effective Nuclear Charge (Slater\'s Rules)',
        concept: 'Net positive nuclear charge felt by valence electrons after screening',
        formula: 'Z^* = Z - \\sigma',
        examNote: 'Valence ns/np electrons shield 0.35 each; (n-1) shell shields 0.85 each; inner shells shield 1.0.'
      },
      {
        title: 'Ionization Enthalpy Anomalies',
        concept: 'Subshell stability exceptions in IE trends',
        formula: '\\text{IE}_1(\\text{Be}) > \\text{IE}_1(\\text{B}),\\quad \\text{IE}_1(\\text{N}) > \\text{IE}_1(\\text{O})',
        examNote: 'Be (2s² fully-filled) > B (2p¹); N (2p³ half-filled stable) > O (2p⁴ pairing repulsion).'
      },
      {
        title: 'Electron Gain Enthalpy Exceptions',
        concept: 'Inter-electronic repulsion in compact second-period atoms',
        formula: '|\\Delta_{\\text{eg}}H(\\text{Cl})| > |\\Delta_{\\text{eg}}H(\\text{F})|,\\quad |\\Delta_{\\text{eg}}H(\\text{S})| > |\\Delta_{\\text{eg}}H(\\text{O})|',
        examNote: 'Chlorine has the highest electron gain enthalpy in the periodic table due to compact 2p in fluorine.'
      },
      {
        title: 'Electronegativity Scales (Pauling & Mulliken)',
        concept: 'Empirical electronegativity definitions from bond energies and ionization potential',
        formula: '|\\chi_A - \\chi_B| = 0.208\\sqrt{\\Delta}\\ (\\text{kcal/mol}),\\quad \\chi_{\\text{Pauling}} \\approx \\frac{\\chi_{\\text{Mulliken}}}{2.8} = \\frac{\\text{IE} + \\text{EA}}{5.6}\\ (\\text{eV})',
        examNote: 'Fluorine is the most electronegative element (4.0 on Pauling scale).'
      }
    ]
  },
  {
    chapterId: 'c4',
    chapterName: 'Chemical Bonding',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Bond Order (Molecular Orbital Theory)',
        concept: 'Diatomic bond stability indicator from bonding and antibonding occupancy',
        formula: '\\text{Bond Order} = \\frac{N_b - N_a}{2}',
        examNote: 'If electron count ≤ 14, π2p orbitals fill before σ2p_z. Bond order > 0 implies stable molecule.'
      },
      {
        title: 'Dipole Moment & Percentage Ionic Character',
        concept: 'Magnitude of charge separation in polar covalent bonds',
        formula: '\\mu = q \\times d,\\quad \\% \\text{ Ionic Character} = \\frac{\\mu_{\\text{observed}}}{\\mu_{\\text{theoretical}}} \\times 100\\%',
        examNote: '1 Debye (D) = 3.33564 × 10⁻³⁰ C·m. Symmetrical molecules (CO₂, BF₃, CH₄) have net μ = 0.'
      },
      {
        title: 'Steric Number & Hybridization State',
        concept: 'VSEPR geometry prediction from bonding and non-bonding electron pairs',
        formula: '\\text{Steric Number (SN)} = \\sigma\\text{-bonds} + \\text{Lone pairs}',
        examNote: 'SN=2 (sp), SN=3 (sp²), SN=4 (sp³), SN=5 (sp³d, TBP), SN=6 (sp³d², Octahedral).'
      },
      {
        title: 'Formal Charge on Atom in Lewis Structure',
        concept: 'Apparent electronic charge assignment in resonance structures',
        formula: '\\text{FC} = V - L - \\frac{1}{2}S',
        examNote: 'V = valence electrons, L = lone pair electrons, S = shared bonding electrons.'
      },
      {
        title: 'Fajan\'s Rules for Covalent Character',
        concept: 'Polarizing power and polarizability driving covalency in ionic bonds',
        formula: '\\text{Covalency} \\propto \\frac{\\text{Cation Charge}}{\\text{Cation Size}} \\times (\\text{Anion Radius})',
        examNote: 'Small cation, large anion, and pseudo-noble gas configuration (18e⁻ outer shell) maximize covalency.'
      }
    ]
  },
  {
    chapterId: 'c5',
    chapterName: 'States of Matter',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Ideal Gas Equation & Dalton\'s Law',
        concept: 'Equation of state and partial pressure relations for non-reacting gases',
        formula: 'PV = nRT = \\frac{w}{M}RT,\\quad P_A = x_A P_{\\text{total}}',
        examNote: 'Gas constant R = 8.314 J/mol·K = 0.0821 L·atm/mol·K ≈ 25/3 J/mol·K.'
      },
      {
        title: 'Graham\'s Law of Diffusion / Effusion',
        concept: 'Rate of gaseous escape through pinhole aperture',
        formula: '\\frac{r_1}{r_2} = \\sqrt{\\frac{M_2}{M_1}} = \\frac{V_1 / t_1}{V_2 / t_2} = \\frac{P_1}{P_2}\\sqrt{\\frac{M_2}{M_1}}',
        examNote: 'Rate of effusion is inversely proportional to square root of molar mass and directly proportional to pressure.'
      },
      {
        title: 'Van der Waals Equation for Real Gases',
        concept: 'Intermolecular attraction and molecular co-volume corrections',
        formula: '\\left(P + \\frac{a n^2}{V^2}\\right)(V - n b) = n R T',
        examNote: 'Constant a measures intermolecular attraction; constant b measures effective molecular volume (b = 4 N_A v_m).'
      },
      {
        title: 'Compressibility Factor & Critical Constants',
        concept: 'Deviation from ideal behavior and critical liquefaction parameters',
        formula: 'Z = \\frac{PV}{nRT},\\quad T_c = \\frac{8a}{27Rb},\\quad P_c = \\frac{a}{27b^2},\\quad V_c = 3b,\\quad Z_c = \\frac{3}{8} = 0.375',
        examNote: 'Boyle temperature T_b = a / (Rb). Gas cannot be liquefied above T_c no matter how high the pressure.'
      }
    ]
  },
  {
    chapterId: 'c6',
    chapterName: 'Chemical Thermodynamics',
    subject: 'chemistry',
    formulas: [
      {
        title: 'First Law & Enthalpy Relation',
        concept: 'Heat, internal energy, and reaction work under constant volume vs pressure',
        formula: '\\Delta U = q + w,\\quad \\Delta H = \\Delta U + \\Delta n_g RT,\\quad w_{\\text{rev, iso}} = -nRT\\ln\\left(\\frac{V_2}{V_1}\\right)',
        examNote: 'Δn_g = Σ n_g(products) - Σ n_g(reactants). For free expansion (P_ext = 0), work done is zero.'
      },
      {
        title: 'Gibbs Free Energy & Spontaneity Condition',
        concept: 'Criterion for thermodynamic spontaneity and equilibrium constant',
        formula: '\\Delta G = \\Delta H - T\\Delta S,\\quad \\Delta G^\\circ = -RT\\ln K_{\\text{eq}} = -2.303 RT\\log_{10} K_{\\text{eq}}',
        examNote: 'Spontaneous when ΔG < 0. At equilibrium, ΔG = 0. If ΔH < 0 and ΔS > 0, spontaneous at all temperatures.'
      },
      {
        title: 'Entropy Change of Ideal Gas',
        concept: 'State function entropy evolution across temperature and volume',
        formula: '\\Delta S = n C_v \\ln\\left(\\frac{T_2}{T_1}\\right) + nR\\ln\\left(\\frac{V_2}{V_1}\\right)',
        examNote: 'For isolated system (universe): ΔS_total = ΔS_sys + ΔS_surr ≥ 0.'
      },
      {
        title: 'Kirchhoff\'s Thermochemistry Law',
        concept: 'Temperature dependence of reaction enthalpy',
        formula: '\\Delta_r H_{T_2} = \\Delta_r H_{T_1} + \\Delta C_p (T_2 - T_1)',
        examNote: 'ΔC_p = Σ C_p(products) - Σ C_p(reactants).'
      },
      {
        title: 'Bond Enthalpy Method for Reaction Enthalpy',
        concept: 'Calculation of reaction enthalpy from average bond breaking and making energies',
        formula: '\\Delta_r H = \\sum \\text{Bond Energy}_{\\text{reactants}} - \\sum \\text{Bond Energy}_{\\text{products}}',
        examNote: 'Applies strictly only when all reactants and products are in the gaseous phase.'
      }
    ]
  },
  {
    chapterId: 'c7',
    chapterName: 'Equilibrium',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Kp vs Kc Relation',
        concept: 'Conversion between partial pressure and molar concentration equilibrium constants',
        formula: 'K_p = K_c(RT)^{\\Delta n_g}',
        examNote: 'R = 0.0821 L·atm/mol·K. If Δn_g = 0, K_p = K_c and pressure changes have zero effect on equilibrium.'
      },
      {
        title: 'Ostwald\'s Dilution Law & Weak Acid pH',
        concept: 'Degree of dissociation and hydronium concentration for weak acid',
        formula: '\\alpha = \\sqrt{\\frac{K_a}{C}}\\ [\\alpha \\le 0.05],\\quad [\\text{H}^+] = \\sqrt{K_a C} \\implies \\text{pH} = \\frac{1}{2}(\\text{p}K_a - \\log C)',
        examNote: 'If α > 0.05 (5%), quadratic solution is mandatory: K_a = Cα² / (1 - α).'
      },
      {
        title: 'Henderson-Hasselbalch Buffer Equation',
        concept: 'pH calculation for acidic and basic buffer systems',
        formula: '\\text{pH} = \\text{p}K_a + \\log\\left(\\frac{[\\text{Conjugate Base}]}{[\\text{Acid}]}\\right),\\quad \\text{pOH} = \\text{p}K_b + \\log\\left(\\frac{[\\text{Conjugate Acid}]}{[\\text{Base}]}\\right)',
        examNote: 'Maximum buffer capacity occurs when [Salt] = [Acid] ⟹ pH = pK_a.'
      },
      {
        title: 'Salt Hydrolysis pH Formulas',
        concept: 'Hydrolysis of salts of weak acid + strong base, weak base + strong acid',
        formula: '\\text{pH}_{\\text{WA-SB}} = 7 + \\frac{1}{2}(\\text{p}K_a + \\log C),\\quad \\text{pH}_{\\text{SA-WB}} = 7 - \\frac{1}{2}(\\text{p}K_b + \\log C)',
        examNote: 'For salt of weak acid + weak base: pH = 7 + 0.5(pK_a - pK_b), completely independent of concentration C.'
      },
      {
        title: 'Solubility Product & Precipitation',
        concept: 'Equilibrium solubility for sparingly soluble salt A_x B_y',
        formula: 'K_{\\text{sp}} = x^x y^y S^{x+y},\\quad Q_{\\text{sp}} > K_{\\text{sp}} \\implies \\text{Precipitation occurs}',
        examNote: 'Common ion effect strongly suppresses molar solubility S.'
      }
    ]
  },
  {
    chapterId: 'c8',
    chapterName: 'Redox Reactions',
    subject: 'chemistry',
    formulas: [
      {
        title: 'n-Factor in Redox Reactions',
        concept: 'Change in oxidation number per mole of substance',
        formula: 'n\\text{-factor} = |\\text{Change in Oxidation State per mole of compound}|',
        examNote: 'KMnO₄ in acidic medium: n = 5 (Mn⁷⁺ → Mn²⁺); neutral/mildly alkaline: n = 3 (MnO₂); alkaline: n = 1 (MnO₄²⁻).'
      },
      {
        title: 'Equivalent Weight & Normality',
        concept: 'Mass of compound reacting with one mole of electrons or H+',
        formula: '\\text{Equivalent Weight} = \\frac{\\text{Molar Mass}}{n\\text{-factor}},\\quad \\text{Normality} = \\text{Molarity}\\times n\\text{-factor}',
        examNote: 'For K₂Cr₂O₇ in acidic medium: n-factor = 6 ⟹ Eq. Wt. = M / 6.'
      },
      {
        title: 'Disproportionation Equivalent Weight',
        concept: 'Compound acting simultaneously as oxidizing and reducing agent',
        formula: '\\frac{1}{n_{\\text{eq}}} = \\frac{1}{n_1} + \\frac{1}{n_2}',
        examNote: 'Example: Cl₂ + 2OH⁻ → Cl⁻ + ClO⁻ + H₂O. n₁ = 1, n₂ = 1 ⟹ n_eq = 1 / (1 + 1) = 1/2.'
      },
      {
        title: 'Law of Chemical Equivalence in Redox Titrations',
        concept: 'Equivalence of gram equivalents between oxidizing and reducing agents',
        formula: 'N_1 V_1 = N_2 V_2 \\implies n_1 M_1 V_1 = n_2 M_2 V_2',
        examNote: 'Milliequivalents of oxidant = Milliequivalents of reductant. Always calculate n-factor first: n = |\\Delta(\\text{O.N.})\\text{ per molecule}|.'
      },
      {
        title: 'Peroxo & Butterfly Oxidation State Exceptions',
        concept: 'Evaluation of formal oxidation numbers taking peroxo (-O-O-) linkages into account',
        formula: '\\text{H}_2\\text{SO}_5\\ (\\text{Caro\'s: S} = +6),\\quad \\text{H}_2\\text{S}_2\\text{O}_8\\ (\\text{Marshall\'s: S} = +6),\\quad \\text{CrO}_5\\ (\\text{Cr} = +6)',
        examNote: 'Standard formula yields S = +8 or Cr = +10, which exceeds maximum valence electron shell. CrO₅ has butterfly structure with two peroxo linkages (O₂²⁻).'
      }
    ]
  },
  {
    chapterId: 'c9',
    chapterName: 'Hydrogen',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Hardness of Water ppm',
        concept: 'Equivalent CaCO3 hardness quantification in water samples',
        formula: '\\text{Hardness (ppm)} = \\frac{\\text{Mass of }\\text{CaCO}_3\\text{ equivalent}}{\\text{Total Mass of Water}}\\times 10^6',
        examNote: '1 mol Ca²⁺ ≡ 1 mol Mg²⁺ ≡ 100 g CaCO₃ equivalent.'
      },
      {
        title: 'Volume Strength of Hydrogen Peroxide',
        concept: 'Available oxygen volume released per liter of H2O2 at STP',
        formula: '\\text{Volume Strength} = 11.2 \\times \\text{Molarity} = 5.6 \\times \\text{Normality}',
        examNote: '20-volume H₂O₂ means 1 L solution liberates 20 L of O₂ gas at STP. Molarity = 20 / 11.2 ≈ 1.78 M.'
      },
      {
        title: 'Percentage Strength of H2O2',
        concept: 'Weight by volume percentage concentration of peroxide',
        formula: '\\% (w/v) = \\frac{\\text{Volume Strength}\\times 68}{22.4\\times 10} = \\frac{17}{56}\\times \\text{Volume Strength}',
        examNote: 'Direct shortcut in JEE numerical questions.'
      },
      {
        title: 'Removal of Hardness & Calgon Softening Reaction',
        concept: 'Sequestration of divalent calcium and magnesium ions via sodium hexametaphosphate',
        formula: '\\text{Na}_2[\\text{Na}_4(\\text{PO}_3)_6] + 2\\text{Ca}^{2+} \\to \\text{Na}_2[\\text{Ca}_2(\\text{PO}_3)_6] + 4\\text{Na}^+',
        examNote: 'Calgon means "CALcium GONE". Complex anion traps Ca²⁺ and Mg²⁺ so no precipitate forms.'
      },
      {
        title: 'Isotopes of Hydrogen & Heavy Water Anomalies',
        concept: 'Nuclear characteristics and physical constant differences of protium, deuterium, and tritium',
        formula: '{}^1_1\\text{H},\\quad {}^2_1\\text{H (D)},\\quad {}^3_1\\text{H (T, } \\beta^-\\text{ emitter},\\ t_{1/2} = 12.33\\text{ y)},\\quad \\text{b.p.}(\\text{D}_2\\text{O}) = 101.42^\\circ\\text{C} > \\text{H}_2\\text{O}',
        examNote: 'Tritium emits low-energy β⁻ particles (no gamma). D₂O has higher density, boiling point, and viscosity than H₂O, but lower dielectric constant.'
      }
    ]
  },
  {
    chapterId: 'c10',
    chapterName: 's-Block Elements',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Hydration Enthalpy vs Ionic Radii',
        concept: 'Charge-to-size ratio governing aqueous hydration and mobility',
        formula: '\\Delta_{\\text{hyd}}H \\propto \\frac{1}{r_{\\text{ion}}} \\implies \\text{Li}^+ > \\text{Na}^+ > \\text{K}^+ > \\text{Rb}^+ > \\text{Cs}^+',
        examNote: 'Hydrated ionic radius order is reverse of gaseous radius: Li⁺(aq) is largest, lowest ionic mobility.'
      },
      {
        title: 'Thermal Stability of Carbonates',
        concept: 'Polarizing power of cation dictating carbonate decomposition temperature',
        formula: '\\text{Thermal Stability}: \\text{BaCO}_3 > \\text{SrCO}_3 > \\text{CaCO}_3 > \\text{MgCO}_3 > \\text{BeCO}_3',
        examNote: 'Li₂CO₃ is thermally unstable and decomposes to Li₂O + CO₂ due to high polarizing power of Li⁺.'
      },
      {
        title: 'Solubility Trend of Alkaline Earth Sulfates',
        concept: 'Lattice energy vs hydration energy balance for large divalent sulfates',
        formula: '\\text{Solubility}: \\text{BeSO}_4 > \\text{MgSO}_4 \\gg \\text{CaSO}_4 > \\text{SrSO}_4 > \\text{BaSO}_4',
        examNote: 'Hydration energy drops faster down the group than lattice energy for large anions like SO₄²⁻.'
      },
      {
        title: 'Plaster of Paris & Gypsum Setting',
        concept: 'Controlled hydration/dehydration of calcium sulfate hemihydrate',
        formula: '\\text{CaSO}_4\\cdot 2\\text{H}_2\\text{O}\\ (\\text{Gypsum}) \\xrightarrow{393\\text{ K}} \\text{CaSO}_4\\cdot \\frac{1}{2}\\text{H}_2\\text{O}\\ (\\text{POP}) + 1.5\\text{H}_2\\text{O}',
        examNote: 'Heating above 393 K forms dead burnt plaster (anhydrous CaSO₄) which completely loses setting ability.'
      }
    ]
  },
  {
    chapterId: 'c11',
    chapterName: 'p-Block Elements (Groups 13 & 14)',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Inert Pair Effect & Oxidation States',
        concept: 'Reluctance of outer s-electrons to bond due to poor d/f shielding',
        formula: '\\text{Stability of }+1\\text{ state}: \\text{Tl}^+ > \\text{In}^+ > \\text{Ga}^+ > \\text{Al}^+,\\quad +2\\text{ state}: \\text{Pb}^{2+} > \\text{Sn}^{2+} > \\text{Ge}^{2+}',
        examNote: 'Tl⁺ is more stable than Tl³⁺; Pb²⁺ is more stable than Pb⁴⁺ ⟹ Pb⁴⁺ and Tl³⁺ act as powerful oxidizing agents.'
      },
      {
        title: 'Borax Structure & Composition',
        concept: 'Anion structure and borax bead test composition',
        formula: '\\text{Na}_2\\text{B}_4\\text{O}_7\\cdot 10\\text{H}_2\\text{O} \\equiv \\text{Na}_2[\\text{B}_4\\text{O}_5(\\text{OH})_4]\\cdot 8\\text{H}_2\\text{O}',
        examNote: 'Contains two tetrahedral [BO₄] and two planar [BO₃] units with four B-O-B linkages.'
      },
      {
        title: 'Diborane Multi-Center Bonding',
        concept: 'Three-center two-electron bridge bonding in electron-deficient boranes',
        formula: '\\text{B}_2\\text{H}_6: \\text{Two } 3c\\text{-}2e^-\\text{ banana bonds (B-H-B)} + \\text{Four } 2c\\text{-}2e^-\\text{ terminal B-H bonds}',
        examNote: 'Boron is sp³ hybridized in B₂H₆. Terminal B-H bonds are normal 2-center 2-electron bonds.'
      },
      {
        title: 'Silicones Polymerization',
        concept: 'Hydrolysis and condensation of organosilicon chlorides',
        formula: 'R_2\\text{SiCl}_2 \\xrightarrow{\\text{H}_2\\text{O}} R_2\\text{Si(OH)}_2 \\xrightarrow{\\text{polymerize}} \\text{Linear Silicone} \\ [-R_2\\text{Si-O-Si}R_2\\text{-}]_n',
        examNote: 'R₃SiCl acts as chain terminator; RSiCl₃ leads to complex cross-linked 3D silicone networks.'
      }
    ]
  },
  {
    chapterId: 'c12',
    chapterName: 'General Organic Chemistry (GOC)',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Degree of Unsaturation (Double Bond Equivalent)',
        concept: 'Index of hydrogen deficiency in organic structures',
        formula: '\\text{DU} = C + 1 - \\frac{H}{2} - \\frac{X}{2} + \\frac{N}{2}',
        examNote: 'Oxygen and sulfur atoms are ignored. Benzene ring has DU = 4 (3 double bonds + 1 ring).'
      },
      {
        title: 'Hückel\'s Rule of Aromaticity',
        concept: 'Planar cyclic conjugated electron count criteria',
        formula: '(4n + 2)\\pi\\text{ electrons}\\ (\\text{Aromatic}),\\quad 4n\\pi\\text{ electrons}\\ (\\text{Anti-aromatic, planar})',
        examNote: 'Non-planar annulenes (like cyclooctatetraene, COT) pucker into tub shapes to become non-aromatic.'
      },
      {
        title: 'Acidic Strength Order of Organic Compounds',
        concept: 'Conjugate base anion stability driven by resonance, inductive, and mesomeric effects',
        formula: 'K_a \\propto \\text{Stability of Conjugate Base} \\propto -M, -I, \\frac{1}{+M}, \\frac{1}{+I}',
        examNote: 'Carboxylic acids > Phenols > Water > Alcohols > Terminal Alkynes > Ammonia > Alkenes > Alkanes.'
      },
      {
        title: 'Aqueous Basicity of Substituted Amines',
        concept: 'Combined influence of inductive effect, steric hindrance, and hydration',
        formula: '\\text{Methyl substituted}: 2^\\circ > 1^\\circ > 3^\\circ > \\text{NH}_3,\\quad \\text{Ethyl substituted}: 2^\\circ > 3^\\circ > 1^\\circ > \\text{NH}_3',
        examNote: 'In gas phase (no hydration solvent effect), basicity strictly follows inductive effect: 3° > 2° > 1° > NH₃.'
      }
    ]
  },
  {
    chapterId: 'c13',
    chapterName: 'Hydrocarbons',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Markovnikov & Anti-Markovnikov (Peroxide) Addition',
        concept: 'Regioselectivity in electrophilic vs radical addition to alkenes',
        formula: 'R\\text{-CH=CH}_2 + \\text{HBr} \\xrightarrow{\\text{Markovnikov}} R\\text{-CH(Br)-CH}_3,\\quad \\xrightarrow{\\text{Peroxide}} R\\text{-CH}_2\\text{-CH}_2\\text{Br}',
        examNote: 'Peroxide effect (Kharasch effect) operates strictly on HBr, NOT on HCl or HI (due to unfavorable energetics).'
      },
      {
        title: 'Reductive Ozonolysis of Alkenes',
        concept: 'Oxidative cleavage of double bonds to carbonyl fragments',
        formula: 'R_1 R_2\\text{C=CH}R_3 \\xrightarrow[\\text{Zn / H}_2\\text{O}]{\\text{O}_3} R_1 R_2\\text{C=O} + R_3\\text{CHO}',
        examNote: 'Zn or Me₂S prevents aldehyde oxidation; without Zn (oxidative ozonolysis), aldehydes oxidize to carboxylic acids.'
      },
      {
        title: 'Stereoselective Alkyne Reduction',
        concept: 'Selective synthesis of cis-alkenes vs trans-alkenes from alkynes',
        formula: 'R\\text{-C}\\equiv\\text{C-}R\' \\xrightarrow[\\text{BaSO}_4, \\text{quinoline}]{\\text{H}_2 / \\text{Pd}} \\text{cis-alkene},\\quad \\xrightarrow{\\text{Na / liq. NH}_3} \\text{trans-alkene (Birch)}',
        examNote: 'Lindlar\'s catalyst provides syn-addition (cis); Birch reduction provides anti-addition (trans).'
      },
      {
        title: 'Acidity of Terminal Alkynes',
        concept: 'Electronegativity of sp hybridized carbon forming metal acetylides',
        formula: 'R\\text{-C}\\equiv\\text{CH} + \\text{NaNH}_2 \\to R\\text{-C}\\equiv\\text{C}^-\\text{Na}^+ + \\text{NH}_3',
        examNote: 'Terminal alkynes react with ammoniacal AgNO₃ to give white precipitate and with Cu₂Cl₂ to give red precipitate.'
      }
    ]
  },
  {
    chapterId: 'c14',
    chapterName: 'Environmental Chemistry',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Biochemical Oxygen Demand (BOD)',
        concept: 'Measure of organic pollution load in water bodies',
        formula: '\\text{BOD} = (\\text{DO}_i - \\text{DO}_f)\\times \\text{Dilution Factor}',
        examNote: 'Clean drinking water has BOD < 5 ppm; heavily polluted industrial/sewage water has BOD ≥ 17 ppm.'
      },
      {
        title: 'Photochemical Smog Constituents',
        concept: 'Oxidizing smog generated from sunlight acting on hydrocarbons and nitrogen oxides',
        formula: '\\text{NO}_2 \\xrightarrow{h\\nu} \\text{NO} + [\\text{O}],\\quad [\\text{O}] + \\text{O}_2 \\to \\text{O}_3,\\quad \\text{O}_3 + \\text{Hydrocarbons} \\to \\text{PAN}',
        examNote: 'Photochemical smog is oxidizing (O₃, NO₂, PAN); classical smog is reducing (SO₂, smoke, fog).'
      },
      {
        title: 'Permissible Drinking Water Concentration Thresholds',
        concept: 'Critical maximum contaminant limits prescribed by international standards',
        formula: '[\\text{F}^-] \\le 1.5\\text{ ppm},\\quad [\\text{Pb}] \\le 50\\text{ ppb},\\quad [\\text{NO}_3^-] \\le 50\\text{ ppm}',
        examNote: 'Excess fluoride > 2 ppm causes brown tooth mottling; nitrate > 50 ppm causes methemoglobinemia (blue baby syndrome).'
      },
      {
        title: 'Ozone Hole Catalytic Chain Reaction',
        concept: 'Chlorofluorocarbon breakdown generating chlorine radical chain in stratosphere',
        formula: '\\text{CF}_2\\text{Cl}_2 \\xrightarrow{h\\nu} \\dot{\\text{C}}\\text{F}_2\\text{Cl} + \\dot{\\text{C}}\\text{l},\\quad \\dot{\\text{C}}\\text{l} + \\text{O}_3 \\to \\text{Cl}\\dot{\\text{O}} + \\text{O}_2,\\quad \\text{Cl}\\dot{\\text{O}} + [\\text{O}] \\to \\dot{\\text{C}}\\text{l} + \\text{O}_2',
        examNote: 'One chlorine free radical breaks down over 100,000 ozone molecules. Polar stratospheric clouds (PSCs) provide surface for chlorine activation.'
      },
      {
        title: 'Acid Rain Chemical Equations & pH Criterion',
        concept: 'Sulfur and nitrogen oxide atmospheric conversions lowering precipitation pH',
        formula: '\\text{pH} < 5.6,\\quad 2\\text{SO}_2 + \\text{O}_2 + 2\\text{H}_2\\text{O} \\to 2\\text{H}_2\\text{SO}_4,\\quad 4\\text{NO}_2 + \\text{O}_2 + 2\\text{H}_2\\text{O} \\to 4\\text{HNO}_3',
        examNote: 'Normal clean rain has pH ≈ 5.6 due to dissolved atmospheric CO₂ forming weak carbonic acid (H₂CO₃). Acid rain damages marble: CaCO₃ + H₂SO₄ → CaSO₄ + H₂O + CO₂.'
      }
    ]
  },
  {
    chapterId: 'c15',
    chapterName: 'Solid State',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Unit Cell Density Formula',
        concept: 'Theoretical mass density of cubic crystal lattice',
        formula: '\\rho = \\frac{Z \\times M}{a^3 \\times N_A}',
        examNote: 'Z = 1 for Simple Cubic, Z = 2 for BCC, Z = 4 for FCC/CCP. a must be converted into cm (1 Å = 10⁻⁸ cm).'
      },
      {
        title: 'Packing Efficiency & Nearest Neighbor Distances',
        concept: 'Atomic radius to edge length relationships and volume fractions',
        formula: '\\text{FCC}: r = \\frac{a}{2\\sqrt{2}}\\ (74\\%),\\quad \\text{BCC}: r = \\frac{\\sqrt{3}a}{4}\\ (68\\%),\\quad \\text{SC}: r = \\frac{a}{2}\\ (52.4\\%)',
        examNote: 'HCP lattice has packing efficiency identical to FCC (74%) with coordination number 12 and Z = 6.'
      },
      {
        title: 'Limiting Radius Ratio for Coordination Numbers',
        concept: 'Cation to anion radius ratio determining interstitial geometry',
        formula: '0.225 - 0.414\\ (\\text{Tetrahedral, CN}=4),\\quad 0.414 - 0.732\\ (\\text{Octahedral, CN}=6),\\quad 0.732 - 1.0\\ (\\text{Cubic, CN}=8)',
        examNote: 'NaCl has octahedral coordination (CN = 6:6); CsCl has body-centered cubic coordination (CN = 8:8).'
      },
      {
        title: 'Bragg\'s Law of X-Ray Diffraction',
        concept: 'Constructive interference condition for crystal lattice planes',
        formula: '2d\\sin\\theta = n\\lambda,\\quad d_{hkl} = \\frac{a}{\\sqrt{h^2 + k^2 + l^2}}',
        examNote: 'd_hkl is the interplanar spacing for Miller indices (hkl) in cubic unit cells.'
      }
    ]
  },
  {
    chapterId: 'c16',
    chapterName: 'Solutions',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Relative Lowering of Vapour Pressure (RLVP)',
        concept: 'Raoult\'s law for non-volatile solute in volatile solvent',
        formula: '\\frac{P^\\circ - P}{P^\\circ} = i \\cdot x_{\\text{solute}} \\implies \\frac{P^\\circ - P}{P} = i\\frac{n}{N} = i\\frac{m M_{\\text{solvent}}}{1000}',
        examNote: 'Using (P° - P)/P = n/N gives exact results without requiring dilute solution approximations in numerical problems!'
      },
      {
        title: 'Boiling Point Elevation & Freezing Point Depression',
        concept: 'Colligative temperature shifts from molality and van \'t Hoff factor',
        formula: '\\Delta T_b = i K_b m,\\quad \\Delta T_f = i K_f m,\\quad K_b = \\frac{R T_b^2 M_{\\text{solvent}}}{1000 \\Delta_{\\text{vap}}H}',
        examNote: 'K_b and K_f depend ONLY on the solvent, completely independent of the solute.'
      },
      {
        title: 'Osmotic Pressure & Molar Mass',
        concept: 'van \'t Hoff osmotic pressure equation for dilute solutions',
        formula: '\\pi = i C R T = i\\frac{n}{V}RT',
        examNote: 'Best method for molar mass determination of polymers/biomolecules (measurable at room temperature).'
      },
      {
        title: 'Van \'t Hoff Factor (i) & Degree of Dissociation/Association',
        concept: 'Ratio of observed colligative effect to theoretical colligative effect',
        formula: 'i = 1 + (n - 1)\\alpha\\ (\\text{Dissociation}),\\quad i = 1 + \\left(\\frac{1}{n} - 1\\right)\\beta\\ (\\text{Association})',
        examNote: 'For total dissociation: NaCl (i=2), BaCl₂ (i=3), K₄[Fe(CN)₆] (i=5). Acetic acid dimerizing in benzene: n=2, i=1 - β/2.'
      }
    ]
  },
  {
    chapterId: 'c17',
    chapterName: 'Electrochemistry',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Nernst Equation for Cell EMF',
        concept: 'Non-standard cell potential dependence on reaction quotient Q',
        formula: 'E_{\\text{cell}} = E^\\circ_{\\text{cell}} - \\frac{0.0591}{n}\\log_{10} Q\\ (\\text{at } 298\\text{ K})',
        examNote: 'At equilibrium: E_cell = 0 ⟹ E°_cell = (0.0591 / n) log₁₀ K_eq. Watch out for electron transfer count n!'
      },
      {
        title: 'Standard Gibbs Free Energy & Cell Potential',
        concept: 'Thermodynamic work delivered by electrochemical cell',
        formula: '\\Delta G^\\circ = -n F E^\\circ_{\\text{cell}},\\quad F = 96485\\approx 96500\\text{ C/mol}',
        examNote: 'E° is intensive (never multiply with stoichiometric coefficients); ΔG° is extensive and additive.'
      },
      {
        title: 'Faraday\'s Laws of Electrolysis',
        concept: 'Mass deposited at electrode during continuous electrolytic current',
        formula: 'w = Z I t = \\frac{E}{F} I t = \\frac{M}{n F} I t',
        examNote: '1 Faraday (96500 C) deposits 1 gram equivalent of any substance at electrode.'
      },
      {
        title: 'Molar Conductivity & Kohlrausch\'s Law',
        concept: 'Limiting molar conductivity as independent migration sum of ions',
        formula: '\\Lambda_m = \\frac{1000\\kappa}{M},\\quad \\Lambda_m^\\circ(A_x B_y) = x\\lambda_+^\\circ + y\\lambda_-^\\circ',
        examNote: 'Units: κ in S·cm⁻¹, M in mol/L ⟹ Λ_m in S·cm²·mol⁻¹.'
      },
      {
        title: 'Degree of Dissociation from Conductivity',
        concept: 'Evaluating weak electrolyte dissociation from molar conductivity ratio',
        formula: '\\alpha = \\frac{\\Lambda_m}{\\Lambda_m^\\circ},\\quad K_a = \\frac{C\\Lambda_m^2}{\\Lambda_m^\\circ(\\Lambda_m^\\circ - \\Lambda_m)}',
        examNote: 'Ostwald dilution law directly expressed in experimental conductance parameters.'
      }
    ]
  },
  {
    chapterId: 'c18',
    chapterName: 'Chemical Kinetics',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Integrated Rate Laws (Zero & First Order)',
        concept: 'Concentration decay profiles as function of reaction time',
        formula: '\\text{Zero Order: } [A]_t = [A]_0 - kt,\\quad \\text{First Order: } k = \\frac{2.303}{t}\\log_{10}\\left(\\frac{[A]_0}{[A]_t}\\right)',
        examNote: 'Units of k: (mol/L)^(1-n) · s⁻¹ where n is overall order. For first order: s⁻¹.'
      },
      {
        title: 'Half-Life Period of Reactions',
        concept: 'Time required for initial reactant concentration to drop by half',
        formula: 't_{1/2} = \\frac{[A]_0}{2k}\\ (\\text{0-th order}),\\quad t_{1/2} = \\frac{\\ln 2}{k} = \\frac{0.693}{k}\\ (\\text{1st order})',
        examNote: 'For first order: t_1/2 is completely independent of initial concentration [A]₀. t_75% = 2 t_50%, t_99.9% ≈ 10 t_50%.'
      },
      {
        title: 'Arrhenius Equation & Activation Energy',
        concept: 'Temperature sensitivity of rate constant k',
        formula: 'k = A e^{-E_a / RT} \\implies \\log_{10}\\left(\\frac{k_2}{k_1}\\right) = \\frac{E_a}{2.303 R}\\left(\\frac{T_2 - T_1}{T_1 T_2}\\right)',
        examNote: 'Slope of ln k vs 1/T plot is -E_a / R. Catalyst lowers E_a equally for forward and backward reactions.'
      },
      {
        title: 'Consecutive & Parallel Kinetics Shortcuts',
        concept: 'Intermediate concentration peak and branching parallel yields',
        formula: 'A \\xrightarrow{k_1} B \\xrightarrow{k_2} C \\implies t_{\\max} = \\frac{\\ln(k_1/k_2)}{k_1 - k_2},\\quad \\% B_{\\text{parallel}} = \\frac{k_1}{k_1 + k_2}\\times 100\\%',
        examNote: 't_max is the exact time when intermediate B reaches its maximum concentration.'
      }
    ]
  },
  {
    chapterId: 'c19',
    chapterName: 'Surface Chemistry',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Freundlich Adsorption Isotherm',
        concept: 'Empirical relation between mass of gas adsorbed and equilibrium pressure',
        formula: '\\frac{x}{m} = k P^{1/n}\\ (n > 1) \\implies \\log\\left(\\frac{x}{m}\\right) = \\log k + \\frac{1}{n}\\log P',
        examNote: 'Slope of log(x/m) vs log P plot equals 1/n (between 0 and 1). At high P, 1/n = 0 (adsorption saturation).'
      },
      {
        title: 'Hardy-Schulze Rule for Coagulation',
        concept: 'Precipitating power of active coagulating electrolyte ion',
        formula: '\\text{Coagulating Power} \\propto (\\text{Valency of flocculating ion})^4 \\implies \\text{Al}^{3+} > \\text{Ba}^{2+} > \\text{Na}^+',
        examNote: 'Flocculation value is inversely proportional to coagulating power: lower value means stronger coagulant.'
      },
      {
        title: 'Gold Number of Protective Colloid',
        concept: 'Protective efficiency of lyophilic colloid on gold sol',
        formula: '\\text{Protective Power} \\propto \\frac{1}{\\text{Gold Number}}',
        examNote: 'Smaller gold number indicates superior protective power (Gelatin has smallest gold number ≈ 0.005).'
      },
      {
        title: 'Langmuir Adsorption Isotherm',
        concept: 'Monolayer dynamic equilibrium on homogeneous adsorbent surface',
        formula: '\\frac{x}{m} = \\frac{a P}{1 + b P} \\implies \\frac{P}{x/m} = \\frac{1}{a} + \\frac{b}{a}P',
        examNote: 'At low pressure: x/m ∝ P (first order). At high pressure: x/m = a/b = constant (zero order, surface saturation).'
      },
      {
        title: 'Critical Micelle Concentration (CMC) & Kraft Temperature',
        concept: 'Thermodynamics and threshold conditions of colloidal surfactant aggregation',
        formula: 'T \\ge T_k\\ (\\text{Kraft Temp}),\\quad C \\ge \\text{CMC},\\quad \\Delta G^\\circ_{\\text{micellization}} = -R T \\ln(\\text{CMC}) < 0',
        examNote: 'For sodium dodecyl sulfate (SDS): CMC ≈ 8 × 10⁻³ M; for sodium stearate: CMC ≈ 10⁻⁴ to 10⁻³ M. Micelle formation is entropy-driven (ΔS > 0).'
      }
    ]
  },
  {
    chapterId: 'c20',
    chapterName: 'Isolation of Elements (Metallurgy)',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Ellingham Diagram Reduction Threshold',
        concept: 'Standard Gibbs free energy of oxide formation as function of temperature',
        formula: '\\Delta G^\\circ = \\Delta H^\\circ - T\\Delta S^\\circ < 0',
        examNote: 'Any metal whose oxide curve lies LOWER can reduce the oxide of a metal lying HIGHER on the diagram.'
      },
      {
        title: 'Carbon as Reducing Agent (Boudouard Equilibrium)',
        concept: 'C to CO line slope and blast furnace reduction crossover',
        formula: '2\\text{C} + \\text{O}_2 \\to 2\\text{CO}\\ (\\Delta S^\\circ > 0) \\implies \\Delta G^\\circ \\text{ becomes more negative with } T',
        examNote: 'Above 983 K (710°C), C is a better reducing agent than CO; below 983 K, CO is better.'
      },
      {
        title: 'Vapour Phase Refining Principles',
        concept: 'Volatile compound formation and high-temperature thermal decomposition',
        formula: '\\text{Mond (Ni)}: \\text{Ni} + 4\\text{CO} \\xrightarrow{330\\text{ K}} \\text{Ni(CO)}_4 \\xrightarrow{450\\text{ K}} \\text{Ni} + 4\\text{CO}',
        examNote: 'Van Arkel method (Zr, Ti): uses I₂ at 870 K to form volatile ZrI₄, decomposed on tungsten filament at 2075 K.'
      },
      {
        title: 'Hall-Héroult Electrolytic Reduction of Alumina',
        concept: 'Cathode and anode electrode reactions with cryolite-fluorspar flux',
        formula: '\\text{Cathode: } \\text{Al}^{3+} + 3e^- \\to \\text{Al}(l),\\quad \\text{Anode: } \\text{C}(s) + 2\\text{O}^{2-} \\to \\text{CO}_2(g) + 4e^-',
        examNote: 'Electrolyte: Purified Al₂O₃ + Na₃AlF₆ (Cryolite) + CaF₂ (Fluorspar). Lowers melting point from 2323 K to ~1173 K and enhances electrical conductivity. For every 1 kg Al produced, ~0.5 kg carbon anode is consumed.'
      },
      {
        title: 'Cyanide Leaching Process (MacArthur-Forrest)',
        concept: 'Oxidative dissolution of native gold and silver followed by zinc displacement',
        formula: '4\\text{M} + 8\\text{CN}^- + 2\\text{H}_2\\text{O} + \\text{O}_2 \\to 4[\\text{M}(\\text{CN})_2]^- + 4\\text{OH}^-,\\quad 2[\\text{M}(\\text{CN})_2]^- + \\text{Zn} \\to [\\text{Zn}(\\text{CN})_4]^{2-} + 2\\text{M}\\downarrow',
        examNote: 'M = Au or Ag. Oxygen acts as the oxidizing agent. Zinc acts as the reducing/displacing agent.'
      }
    ]
  },
  {
    chapterId: 'c21',
    chapterName: 'p-Block Elements (Groups 15 to 18)',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Oxyacids of Phosphorus Basicity & Reducing Nature',
        concept: 'Structural criteria for ionizable protons and reducing hydridic hydrogens',
        formula: '\\text{H}_3\\text{PO}_2\\ (\\text{Monobasic, } 2\\times\\text{P-H}),\\quad \\text{H}_3\\text{PO}_3\\ (\\text{Dibasic, } 1\\times\\text{P-H}),\\quad \\text{H}_3\\text{PO}_4\\ (\\text{Tribasic, } 0\\times\\text{P-H})',
        examNote: 'Only P-OH hydrogens ionize as protons; P-H bonds do not ionize and act as strong reducing agents.'
      },
      {
        title: 'Group 15 Hydride Bond Angles (Drago\'s Rule)',
        concept: 'Stereochemical consequence of non-hybridized pure p-orbital bonding',
        formula: '\\text{Bond Angle}: \\text{NH}_3 (107.8^\\circ) > \\text{PH}_3 (93.6^\\circ) > \\text{AsH}_3 (91.8^\\circ) > \\text{SbH}_3 (91.3^\\circ)',
        examNote: 'PH₃, AsH₃, SbH₃ do not undergo hybridization (Drago\'s Rule); lone pair resides in almost pure s-orbital.'
      },
      {
        title: 'Halogen Oxoacids Acidic Strength',
        concept: 'Formal oxidation state and resonance stabilization of oxoanion conjugate base',
        formula: '\\text{Acidity}: \\text{HClO}_4 > \\text{HClO}_3 > \\text{HClO}_2 > \\text{HClO}',
        examNote: 'Acid strength increases with oxidation state of central halogen due to increasing resonance stability of conjugate base.'
      },
      {
        title: 'Xenon Fluorides Geometries & Hydrolysis',
        concept: 'VSEPR geometry and redox vs non-redox hydrolysis of noble gas fluorides',
        formula: '\\text{XeF}_2\\ (sp^3d,\\ \\text{Linear}),\\quad \\text{XeF}_4\\ (sp^3d^2,\\ \\text{Square Planar}),\\quad \\text{XeF}_6\\ (sp^3d^3,\\ \\text{Distorted Octahedral})',
        examNote: 'Complete hydrolysis of XeF₆ is non-redox: XeF₆ + 3H₂O → XeO₃ + 6HF. XeF₄ disproportionates.'
      }
    ]
  },
  {
    chapterId: 'c22',
    chapterName: 'd- and f-Block Elements',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Spin-Only Magnetic Moment',
        concept: 'Bohr magnetons from unpaired d-electron count',
        formula: '\\mu_s = \\sqrt{n(n + 2)}\\text{ BM}',
        examNote: 'n=1 (1.73 BM), n=2 (2.83 BM), n=3 (3.87 BM), n=4 (4.90 BM), n=5 (5.92 BM).'
      },
      {
        title: 'Standard Reduction Potentials of 3d Metals',
        concept: 'Enthalpy summation determining M²⁺/M standard reduction potential',
        formula: 'E^\\circ(\\text{M}^{2+}/\\text{M}) = \\Delta_{\\text{sub}}H + \\text{IE}_1 + \\text{IE}_2 + \\Delta_{\\text{hyd}}H',
        examNote: 'Cu has positive E° (+0.34 V) because high enthalpy of atomization + ionization is not compensated by hydration energy.'
      },
      {
        title: 'Potassium Dichromate & Chromate Equilibrium',
        concept: 'pH-dependent interconversion of chromium(VI) oxoanions',
        formula: '\\text{Cr}_2\\text{O}_7^{2-}\\ (\\text{Orange}) + 2\\text{OH}^- \\rightleftharpoons 2\\text{CrO}_4^{2-}\\ (\\text{Yellow}) + \\text{H}_2\\text{O}',
        examNote: 'Orange dichromate predominates at pH < 7; yellow chromate at pH > 7. Oxidation state of Cr is +6 in both.'
      },
      {
        title: 'Lanthanoid Contraction Consequences',
        concept: 'Poor 4f electron shielding creating identical atomic/ionic radii in 4d and 5d metals',
        formula: 'r(\\text{Zr}^{4+}) \\approx r(\\text{Hf}^{4+}),\\quad r(\\text{Nb}^{5+}) \\approx r(\\text{Ta}^{5+})',
        examNote: 'Zr and Hf have nearly identical physical and chemical properties, making separation very difficult.'
      }
    ]
  },
  {
    chapterId: 'c23',
    chapterName: 'Coordination Compounds',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Crystal Field Stabilization Energy (CFSE)',
        concept: 'Octahedral and tetrahedral d-orbital splitting and stabilization',
        formula: '\\text{CFSE}_{\\text{oct}} = \\left(-0.4 n_{t_{2g}} + 0.6 n_{e_g}\\right)\\Delta_o + m P,\\quad \\Delta_t = \\frac{4}{9}\\Delta_o',
        examNote: 'Strong field ligands (CN⁻, CO) give Δ_o > P (pairing occurs ⟹ low spin); weak field give high spin.'
      },
      {
        title: 'Spectrochemical Series Ranking',
        concept: 'Ligand crystal field splitting power in increasing order',
        formula: '\\text{I}^- < \\text{Br}^- < \\text{Cl}^- < \\text{F}^- < \\text{OH}^- < \\text{H}_2\\text{O} < \\text{edta}^{4-} < \\text{NH}_3 < \\text{en} < \\text{NO}_2^- < \\text{CN}^- < \\text{CO}',
        examNote: 'CO is the strongest field ligand due to synergic π-backbonding.'
      },
      {
        title: 'Werner\'s Coordination Theory',
        concept: 'Distinction between primary and secondary valencies',
        formula: '\\text{Primary Valency} = \\text{Oxidation State (ionizable)},\\quad \\text{Secondary Valency} = \\text{Coordination Number (directional)}',
        examNote: 'Moles of AgCl precipitated by AgNO₃ indicate chloride ions outside the square brackets.'
      },
      {
        title: 'Synergic Bonding in Metal Carbonyls',
        concept: 'Mutual strengthening of M-C bond and weakening of C-O bond',
        formula: '\\sigma\\text{-donation}: \\text{CO} \\to M,\\quad \\pi\\text{-backdonation}: d_\\pi(M) \\to \\pi^*(\\text{CO})',
        examNote: 'As negative charge on metal increases, back-donation increases ⟹ M-C bond shortens, C-O stretching frequency drops.'
      }
    ]
  },
  {
    chapterId: 'c24',
    chapterName: 'Haloalkanes & Haloarenes',
    subject: 'chemistry',
    formulas: [
      {
        title: 'SN1 vs SN2 Nucleophilic Substitution',
        concept: 'Kinetics, stereochemistry, and carbocation stability dependence',
        formula: 'S_N1: \\text{Rate} = k[R\\text{-X}]\\ (3^\\circ > 2^\\circ > 1^\\circ,\\ \\text{Racemization});\\quad S_N2: \\text{Rate} = k[R\\text{-X}][\\text{Nu}^-]\\ (1^\\circ > 2^\\circ > 3^\\circ,\\ \\text{Walden Inversion})',
        examNote: 'S_N1 favored by polar protic solvents (H₂O, EtOH); S_N2 favored by polar aprotic solvents (acetone, DMSO, DMF).'
      },
      {
        title: 'Saytzeff vs Hofmann Elimination',
        concept: 'Regioselectivity of dehydrohalogenation with small vs bulky bases',
        formula: '\\text{Saytzeff: More substituted alkene};quad \\text{Hofmann: Less substituted alkene (bulky base like } t\\text{-BuO}^-)',
        examNote: 'Leaving group: poor leaving groups like -F or -N⁺Me₃ strictly yield Hofmann elimination product.'
      },
      {
        title: 'Dow\'s Process & Nucleophilic Aromatic Substitution',
        concept: 'Benzyne mechanism vs addition-elimination in activated haloarenes',
        formula: '\\text{C}_6\\text{H}_5\\text{Cl} + 2\\text{NaOH} \\xrightarrow[300\\text{ atm}]{623\\text{ K}} \\text{C}_6\\text{H}_5\\text{ONa} \\xrightarrow{\\text{H}^+} \\text{C}_6\\text{H}_5\\text{OH}',
        examNote: 'Presence of electron-withdrawing -NO₂ at ortho/para positions drastically accelerates nucleophilic substitution rate.'
      },
      {
        title: 'Wurtz, Fittig & Wurtz-Fittig Reactions',
        concept: 'Organometallic sodium coupling of alkyl and aryl halides',
        formula: '2R\\text{-X} + 2\\text{Na} \\xrightarrow{\\text{dry ether}} R\\text{-}R + 2\\text{NaX},\\quad 2\\text{Ar-X} + 2\\text{Na} \\to \\text{Ar-Ar} + 2\\text{NaX}',
        examNote: 'Cannot synthesize methane by Wurtz reaction. Unsymmetrical cross-coupling gives poor yields due to mixture of products.'
      }
    ]
  },
  {
    chapterId: 'c25',
    chapterName: 'Alcohols, Phenols & Ethers',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Lucas Reagent Alcohol Distinction',
        concept: 'Kinetics of carbocation-mediated chloride substitution with ZnCl2 + HCl',
        formula: 'R\\text{-OH} + \\text{anhydrous ZnCl}_2 + \\text{conc. HCl} \\to R\\text{-Cl}\\downarrow\\ (\\text{turbidity})',
        examNote: '3° alcohol: immediate turbidity; 2°: turbidity in 5 minutes; 1°: no turbidity at room temperature (only on heating).'
      },
      {
        title: 'Reimer-Tiemann & Kolbe Reactions',
        concept: 'Electrophilic formylation and carboxylation of activated phenoxide',
        formula: '\\text{Phenol} + \\text{CHCl}_3 + \\text{KOH} \\to \\text{Salicylaldehyde (R-T)};\\quad \\text{Phenol} + \\text{CO}_2 + \\text{NaOH} \\xrightarrow{\\Delta} \\text{Salicylic acid (Kolbe)}',
        examNote: 'Electrophile in Reimer-Tiemann reaction is dichlorocarbene (:CCl₂).'
      },
      {
        title: 'Williamson Ether Synthesis',
        concept: 'SN2 displacement of alkoxide on primary alkyl halide',
        formula: 'R\\text{-ONa} + R\'\\text{-X} \\to R\\text{-O-}R\' + \\text{NaX}\\ (S_N2\\text{ on } 1^\\circ\\ R\'\\text{-X})',
        examNote: 'If R\' is a 3° alkyl halide, elimination strictly dominates to yield alkene exclusively instead of ether!'
      },
      {
        title: 'Ether Cleavage with Concentrated HI',
        concept: 'Regiochemistry of ether cleavage based on alkyl group carbocation stability',
        formula: 'R\\text{-O-}R\' + \\text{HI} \\to R\\text{-I} + R\'\\text{-OH}',
        examNote: 'With 1°/2° alkyl groups: I⁻ attacks smaller alkyl group (S_N2). If one group is 3° or benzyl: I⁻ attacks 3° carbon (S_N1).'
      }
    ]
  },
  {
    chapterId: 'c26',
    chapterName: 'Aldehydes, Ketones & Carboxylic Acids',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Aldol Condensation & Cross-Aldol',
        concept: 'Enolate addition to carbonyl followed by dehydration to α,β-unsaturated system',
        formula: '2\\text{CH}_3\\text{CHO} \\xrightarrow[\\Delta]{\\text{dil. NaOH}} \\text{CH}_3\\text{-CH=CH-CHO} + \\text{H}_2\\text{O}',
        examNote: 'Requires at least one α-hydrogen atom. Ketones react slower than aldehydes due to steric and electronic factors.'
      },
      {
        title: 'Cannizzaro Disproportionation',
        concept: 'Hydride transfer redox reaction in aldehydes lacking α-hydrogen',
        formula: '2\\text{HCHO} \\xrightarrow{50\\%\\text{ KOH}} \\text{HCOOK} + \\text{CH}_3\\text{OH}',
        examNote: 'Undergone by HCHO, PhCHO, and Me₃C-CHO. Cross-Cannizzaro with HCHO always oxidizes HCHO to formate.'
      },
      {
        title: 'Tollens\' & Fehling\'s Distinction Tests',
        concept: 'Selective mild oxidation of aldehydes over ketones',
        formula: 'R\\text{-CHO} + 2[\\text{Ag(NH}_3)_2]^+ + 3\\text{OH}^- \\to R\\text{-COO}^- + 2\\text{Ag}\\downarrow\\ (\\text{silver mirror}) + 4\\text{NH}_3 + 2\\text{H}_2\\text{O}',
        examNote: 'Benzaldehyde reduces Tollens\' reagent but does NOT reduce Fehling\'s solution. α-hydroxy ketones reduce both.'
      },
      {
        title: 'Hell-Volhard-Zelinsky (HVZ) α-Halogenation',
        concept: 'Selective substitution of α-hydrogen in carboxylic acids via phosphorus halide',
        formula: 'R\\text{-CH}_2\\text{-COOH} + \\text{X}_2 \\xrightarrow{\\text{Red P}} R\\text{-CH(X)-COOH}\\ (\\text{X}=\\text{Cl, Br})',
        examNote: 'Requires at least one α-hydrogen in the carboxylic acid.'
      },
      {
        title: 'Clemmensen vs Wolff-Kishner Carbonyl Reduction',
        concept: 'Deoxygenation of carbonyl groups to methylene units',
        formula: '\\text{Clemmensen: } \\text{Zn-Hg / conc. HCl};\\quad \\text{Wolff-Kishner: } \\text{NH}_2\\text{NH}_2 / \\text{KOH, ethylene glycol}, \\Delta',
        examNote: 'Clemmensen is unsuitable for acid-sensitive groups; Wolff-Kishner is unsuitable for base-sensitive groups.'
      }
    ]
  },
  {
    chapterId: 'c27',
    chapterName: 'Organic Compounds Containing Nitrogen',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Hoffmann Bromamide Degradation',
        concept: 'Conversion of primary amide to primary amine with carbon chain step-down',
        formula: 'R\\text{-CONH}_2 + \\text{Br}_2 + 4\\text{NaOH} \\to R\\text{-NH}_2 + \\text{Na}_2\\text{CO}_3 + 2\\text{NaBr} + 2\\text{H}_2\\text{O}',
        examNote: 'Yields 1° amine with ONE LESS carbon atom than parent amide. Intermediate is alkyl isocyanate (R-N=C=O).'
      },
      {
        title: 'Carbylamine Test (Isocyanide Test)',
        concept: 'Specific diagnostic test for primary aliphatic and aromatic amines',
        formula: 'R\\text{-NH}_2 + \\text{CHCl}_3 + 3\\text{KOH} \\xrightarrow{\\Delta} R\\text{-NC}\\ (\\text{foul smelling}) + 3\\text{KCl} + 3\\text{H}_2\\text{O}',
        examNote: 'Diagnostic test for primary (1°) amines ONLY. Secondary and tertiary amines do not show this test.'
      },
      {
        title: 'Hinsberg\'s Test for Amine Classification',
        concept: 'Separation of primary, secondary, and tertiary amines with benzenesulfonyl chloride',
        formula: '\\text{PhSO}_2\\text{Cl} + 1^\\circ\\text{ amine} \\to \\text{Soluble in KOH};\\quad + 2^\\circ \\to \\text{Insoluble in KOH};\\quad + 3^\\circ \\to \\text{No reaction}',
        examNote: '1° amine product has an acidic N-H hydrogen, rendering it soluble in aqueous potassium hydroxide.'
      },
      {
        title: 'Diazotization & Sandmeyer / Gattermann Reactions',
        concept: 'Generation of benzene diazonium chloride and aryl replacement',
        formula: '\\text{Ar-NH}_2 \\xrightarrow[0-5^\\circ\\text{C}]{\\text{NaNO}_2 + \\text{HCl}} \\text{Ar-N}_2^+\\text{Cl}^- \\xrightarrow{\\text{CuCl / HCl}} \\text{Ar-Cl} + \\text{N}_2\\uparrow',
        examNote: 'Temperature must be kept strictly at 0-5°C (273-278 K) to prevent decomposition into phenol.'
      },
      {
        title: 'Azo Dye Coupling Reactions',
        concept: 'Electrophilic aromatic substitution of diazonium cation with phenols/anilines',
        formula: '\\text{Ar-N}_2^+\\text{Cl}^- + \\text{C}_6\\text{H}_5\\text{OH} \\xrightarrow{\\text{pH } 9-10} p\\text{-hydroxyazobenzene}\\ (\\text{Orange dye})',
        examNote: 'Coupling with phenol occurs in mildly basic medium (pH 9-10); coupling with aniline occurs in mildly acidic medium (pH 4-5).'
      }
    ]
  },
  {
    chapterId: 'c28',
    chapterName: 'Biomolecules',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Mutarotation & Glucose Anomers',
        concept: 'Spontaneous change in specific rotation between α- and β-D-glucopyranose',
        formula: '\\alpha\\text{-D-glucose } (+112^\\circ) \\rightleftharpoons \\text{Equilibrium } (+52.7^\\circ) \\rightleftharpoons \\beta\\text{-D-glucose } (+19^\\circ)',
        examNote: 'Anomers differ in stereochemical configuration strictly at the hemiacetal C-1 carbon.'
      },
      {
        title: 'Invert Sugar & Glycosidic Linkages',
        concept: 'Hydrolysis of dextrorotatory sucrose into levorotatory equimolar mixture',
        formula: '\\text{Sucrose } (+66.5^\\circ) + \\text{H}_2\\text{O} \\xrightarrow{\\text{H}^+} \\text{D-glucose } (+52.7^\\circ) + \\text{D-fructose } (-92.4^\\circ) \\implies \\text{Net Invert Sugar } (-39.9^\\circ)',
        examNote: 'Sucrose is a non-reducing sugar (C-1 of α-glucose linked to C-2 of β-fructose).'
      },
      {
        title: 'Isoelectric Point (pI) of Amino Acids',
        concept: 'pH at which amino acid exists exclusively as dipolar neutral zwitterion',
        formula: '\\text{pI} = \\frac{\\text{p}K_{a1} + \\text{p}K_{a2}}{2}',
        examNote: 'At isoelectric point, amino acid does not migrate in electric field and solubility is minimal.'
      },
      {
        title: 'Chargaff\'s Equivalence Rule in DNA',
        concept: 'Complementary Watson-Crick hydrogen bonding stoichiometric ratio',
        formula: 'A = T\\ (2\\text{ H-bonds}),\\quad G \\equiv C\\ (3\\text{ H-bonds}) \\implies \\frac{A + G}{T + C} = 1',
        examNote: 'Base pairing: Purines (A, G) = Pyrimidines (T, C). RNA contains Uracil (U) in place of Thymine (T).'
      }
    ]
  },
  {
    chapterId: 'c29',
    chapterName: 'Polymers & Chemistry in Everyday Life',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Polydispersity Index (PDI)',
        concept: 'Ratio of weight-average to number-average molecular mass',
        formula: '\\bar{M}_n = \\frac{\\sum N_i M_i}{\\sum N_i},\\quad \\bar{M}_w = \\frac{\\sum N_i M_i^2}{\\sum N_i M_i},\\quad \\text{PDI} = \\frac{\\bar{M}_w}{\\bar{M}_n}',
        examNote: 'For monodisperse natural proteins, PDI = 1. For synthetic polymers, PDI > 1.'
      },
      {
        title: 'Condensation Polymers & Monomers',
        concept: 'Step-growth elimination polymers and their exact starting monomers',
        formula: '\\text{Nylon-6,6: Adipic acid} + \\text{Hexamethylenediamine};\\quad \\text{Dacron (Terylene): Terephthalic acid} + \\text{Ethylene glycol}',
        examNote: 'Nylon-6 is obtained from single monomer caprolactam by heating with water at 533-543 K.'
      },
      {
        title: 'Synthetic Rubbers & Vulcanization',
        concept: 'Addition elastomers derived from 1,3-butadiene copolymers',
        formula: '\\text{Buna-S: 1,3-Butadiene} + \\text{Styrene};\\quad \\text{Buna-N: 1,3-Butadiene} + \\text{Acrylonitrile};\\quad \\text{Neoprene: Chloroprene}',
        examNote: 'Natural rubber is cis-1,4-polyisoprene; gutta-percha is trans-1,4-polyisoprene.'
      },
      {
        title: 'Biodegradable Polymers',
        concept: 'Enzymatically degradable polyesters and polyamides',
        formula: '\\text{PHBV: 3-Hydroxybutanoic acid} + \\text{3-Hydroxypentanoic acid};\\quad \\text{Nylon-2-nylon-6: Glycine} + \\text{Aminocaproic acid}',
        examNote: 'PHBV contains ester linkages; Nylon-2-nylon-6 contains amide (peptide) linkages.'
      }
    ]
  },
  {
    chapterId: 'c30',
    chapterName: 'Practical Chemistry (Qualitative Analysis)',
    subject: 'chemistry',
    formulas: [
      {
        title: 'Systematic Cation Group Separation',
        concept: 'Fractional precipitation reagents based on solubility product Ksp',
        formula: '\\text{Gp I: } \\text{Ag}^+, \\text{Pb}^{2+}\\ (\\text{dil. HCl});\\quad \\text{Gp II: } \\text{Cu}^{2+}, \\text{Pb}^{2+}, \\text{Bi}^{3+}\\ (\\text{H}_2\\text{S in dil. HCl});\\quad \\text{Gp III: } \\text{Fe}^{3+}, \\text{Al}^{3+}\\ (\\text{NH}_4\\text{OH} + \\text{NH}_4\\text{Cl})',
        examNote: 'NH₄Cl suppresses OH⁻ concentration in Gp III via common ion effect so Gp IV hydroxides do not precipitate.'
      },
      {
        title: 'Chromyl Chloride Confirmatory Test',
        concept: 'Volatile red-orange oxychloride generation for chloride detection',
        formula: '4\\text{NaCl} + \\text{K}_2\\text{Cr}_2\\text{O}_7 + 6\\text{H}_2\\text{SO}_4 \\xrightarrow{\\Delta} 2\\text{CrO}_2\\text{Cl}_2\\uparrow\\ (\\text{Red Vapour}) \\xrightarrow{\\text{NaOH}} \\text{Na}_2\\text{CrO}_4\\ (\\text{Yellow})',
        examNote: 'Covalent chlorides (AgCl, HgCl₂, SnCl₂) do not respond to the chromyl chloride test.'
      },
      {
        title: 'Brown Ring Complex for Nitrate',
        concept: 'Coordination complex formation at acid interface in nitrate reduction',
        formula: '[\\text{Fe}(\\text{H}_2\\text{O})_5(\\text{NO})]\\text{SO}_4\\quad (\\text{Brown Ring Complex})',
        examNote: 'High-frequency exam trap: Iron is in +1 oxidation state (d⁷), NO is NO⁺ (nitrosonium), magnetic moment μ = 3.87 BM (3 unpaired electrons).'
      },
      {
        title: 'Borax Bead Test Bead Colors',
        concept: 'Metaborate bead formation in oxidizing vs reducing Bunsen flames',
        formula: '\\text{Cobalt (Co): Deep Blue};\\quad \\text{Copper (Cu): Blue (oxidizing), Red/Opaque (reducing)};\\quad \\text{Chromium (Cr): Green}',
        examNote: 'Blue color of cobalt bead is due to cobalt metaborate Co(BO₂)₂.'
      }
    ]
  }
];

// ==================== MATHS (m1 - m25) ====================
export const MATHS_FORMULA_BANK: ChapterFormulas[] = [
  {
    chapterId: 'm1',
    chapterName: 'Sets, Relations & Functions',
    subject: 'maths',
    formulas: [
      {
        title: 'Principle of Inclusion-Exclusion',
        concept: 'Cardinality of union of three sets',
        formula: 'n(A \\cup B \\cup C) = \\sum n(A) - \\sum n(A \\cap B) + n(A \\cap B \\cap C)',
        examNote: 'n(A \\setminus B) = n(A) - n(A ∩ B). Number of elements in exactly two sets = Σ n(A ∩ B) - 3n(A ∩ B ∩ C).'
      },
      {
        title: 'Counting Relations & Mappings',
        concept: 'Total relations, total functions, and injective functions between finite sets',
        formula: '\\text{Relations} = 2^{mn},\\quad \\text{Total Functions} = n^m,\\quad \\text{One-One (Injective)} = {}^n P_m\\ (n \\ge m)',
        examNote: 'For f: A → B with |A| = m, |B| = n. Number of surjective (onto) functions = Σ (-1)^(n-r) · ⁿC_r · r^m.'
      },
      {
        title: 'Equivalence Relations & Equivalence Classes',
        concept: 'Reflexive, symmetric, and transitive criteria on set A',
        formula: '\\text{Reflexive: } (a,a) \\in R,\\quad \\text{Symmetric: } (a,b)\\in R \\implies (b,a)\\in R,\\quad \\text{Transitive: } (a,b),(b,c)\\in R \\implies (a,c)\\in R',
        examNote: 'Smallest equivalence relation is the identity relation {(a, a)}; largest is the universal relation A × A.'
      },
      {
        title: 'Periodicity of Composite Functions',
        concept: 'Fundamental periods of trigonometric, fractional, and composite functions',
        formula: 'f(x + T) = f(x) \\implies T_{\\sin(ax)} = \\frac{2\\pi}{|a|},\\quad T_{|\\sin x|} = \\pi,\\quad T_{\\{x\\}} = 1',
        examNote: 'Period of f(x) ± g(x) is LCM(T₁, T₂) provided no cross-symmetry reduces the fundamental period.'
      }
    ]
  },
  {
    chapterId: 'm2',
    chapterName: 'Complex Numbers',
    subject: 'maths',
    formulas: [
      {
        title: 'Euler\'s Exponential Form & De Moivre\'s Theorem',
        concept: 'Powers and trigonometric representations of unimodular complex numbers',
        formula: 'z = r e^{i\\theta} = r(\\cos\\theta + i\\sin\\theta),\\quad (\\cos\\theta + i\\sin\\theta)^n = \\cos(n\\theta) + i\\sin(n\\theta)',
        examNote: 'e^(iπ) + 1 = 0. Arg(z₁ z₂) = Arg(z₁) + Arg(z₂) + 2kπ to restrict principal argument to (-π, π].'
      },
      {
        title: 'Cube Roots of Unity (1, ω, ω²)',
        concept: 'Properties of roots of z³ = 1',
        formula: '1 + \\omega + \\omega^2 = 0,\\quad \\omega^3 = 1,\\quad \\omega = \\frac{-1 + i\\sqrt{3}}{2},\\quad \\omega^2 = \\frac{-1 - i\\sqrt{3}}{2}',
        examNote: '1 + ω^r + ω^(2r) = 3 if r is a multiple of 3; otherwise equals 0.'
      },
      {
        title: 'Triangle Inequality & Modulus Bounds',
        concept: 'Upper and lower bounds for sum and difference of complex numbers',
        formula: '||z_1| - |z_2|| \\le |z_1 \\pm z_2| \\le |z_1| + |z_2|',
        examNote: 'Maximum of |z + z₀| given |z| ≤ R is R + |z₀|; minimum is ||z₀| - R|.'
      },
      {
        title: 'Loci in Complex Plane (Circles & Conics)',
        concept: 'Geometric loci defined by modulus constraints',
        formula: '|z - z_1| + |z - z_2| = 2a\\ (\\text{Ellipse if } 2a > |z_1 - z_2|),\\quad ||z - z_1| - |z - z_2|| = 2a\\ (\\text{Hyperbola})',
        examNote: 'If |z - z₁| / |z - z₂| = k ≠ 1, the locus is a Circle of Apollonius. If k = 1, perpendicular bisector.'
      },
      {
        title: 'Equilateral Triangle Condition',
        concept: 'Coordinate relation between vertices of equilateral triangle in Argand plane',
        formula: 'z_1^2 + z_2^2 + z_3^2 = z_1 z_2 + z_2 z_3 + z_3 z_1',
        examNote: 'If origin is the circumcenter/centroid: z₁² + z₂² + z₃² = 0.'
      }
    ]
  },
  {
    chapterId: 'm3',
    chapterName: 'Quadratic Equations',
    subject: 'maths',
    formulas: [
      {
        title: 'Roots & Vieta\'s Relations',
        concept: 'Roots, discriminant, sum and product for ax² + bx + c = 0',
        formula: 'x = \\frac{-b \\pm \\sqrt{D}}{2a},\\quad D = b^2 - 4ac,\\quad \\alpha + \\beta = -\\frac{b}{a},\\quad \\alpha\\beta = \\frac{c}{a}',
        examNote: 'If a, b, c ∈ ℚ and D is not a perfect square, irrational roots occur in conjugate pairs p ± \\sqrt{q}.'
      },
      {
        title: 'Newton\'s Sum Identity (Top Ranker Shortcut)',
        concept: 'Linear recurrence relation for powers of roots S_n = α^n + β^n',
        formula: 'a S_n + b S_{n-1} + c S_{n-2} = 0\\quad \\text{where } S_n = \\alpha^n + \\beta^n',
        examNote: 'The #1 most frequently tested shortcut in JEE Main and Advanced quadratic questions!'
      },
      {
        title: 'Condition for Common Roots',
        concept: 'Eliminant condition for one root or both roots in common',
        formula: '(c_1 a_2 - c_2 a_1)^2 = (a_1 b_2 - a_2 b_1)(b_1 c_2 - b_2 c_1)\\ (\\text{One common root})',
        examNote: 'Both roots common: a₁/a₂ = b₁/b₂ = c₁/c₂.'
      },
      {
        title: 'Location of Roots Conditions',
        concept: 'Conditions for roots relative to real numbers k, k1, k2',
        formula: '\\text{Both roots } > k: D \\ge 0,\\quad -\\frac{b}{2a} > k,\\quad a f(k) > 0',
        examNote: 'If k lies between roots: simply a · f(k) < 0. No condition on discriminant D is required!'
      },
      {
        title: 'Vertex & Range of Quadratic Expression',
        concept: 'Extreme value coordinates of parabola y = ax² + bx + c',
        formula: 'y_{\\min} = -\\frac{D}{4a}\\ (a > 0),\\quad y_{\\max} = -\\frac{D}{4a}\\ (a < 0)\\quad \\text{at } x = -\\frac{b}{2a}',
        examNote: 'Vertex of parabola is strictly at (-b / (2a), -D / (4a)).'
      }
    ]
  },
  {
    chapterId: 'm4',
    chapterName: 'Matrices',
    subject: 'maths',
    formulas: [
      {
        title: 'Matrix Multiplication & Transpose Invariant',
        concept: 'Reversal rule for transposition and inversion',
        formula: '(A B)^T = B^T A^T,\\quad (A B)^{-1} = B^{-1} A^{-1},\\quad A A^{-1} = I',
        examNote: 'Matrix multiplication is generally non-commutative (AB ≠ BA).'
      },
      {
        title: 'Adjoint Matrix Fundamental Properties',
        concept: 'Determinant of adjoint and iterated adjoint matrices of order n',
        formula: 'A(\\text{adj } A) = |A|I,\\quad |\\text{adj } A| = |A|^{n-1},\\quad |\\text{adj}(\\text{adj } A)| = |A|^{(n-1)^2}',
        examNote: 'adj(kA) = k^(n-1) · adj(A). For n = 3: |adj A| = |A|², |adj(adj A)| = |A|⁴.'
      },
      {
        title: 'Symmetric & Skew-Symmetric Decomposition',
        concept: 'Representation of any square matrix as sum of symmetric and skew-symmetric parts',
        formula: 'A = \\frac{1}{2}(A + A^T) + \\frac{1}{2}(A - A^T)',
        examNote: 'For skew-symmetric matrix (A^T = -A), diagonal elements are zero. If order n is odd, |A| = 0.'
      },
      {
        title: 'Orthogonal & Idempotent Matrices',
        concept: 'Special square matrices and their determinant properties',
        formula: '\\text{Orthogonal: } A A^T = I \\implies |A| = \\pm 1;\\quad \\text{Idempotent: } A^2 = A \\implies |A| = 0\\text{ or } 1',
        examNote: 'Involutory: A² = I ⟹ A⁻¹ = A; Nilpotent: A^k = O ⟹ |A| = 0.'
      }
    ]
  },
  {
    chapterId: 'm5',
    chapterName: 'Determinants',
    subject: 'maths',
    formulas: [
      {
        title: 'Determinant Scaling & Multiplicative Property',
        concept: 'Behavior under scalar multiplication and matrix products',
        formula: '|k A| = k^n |A|\\ (\\text{order } n),\\quad |A B| = |A||B|,\\quad |A^T| = |A|',
        examNote: 'Swapping two rows or columns changes the sign of determinant.'
      },
      {
        title: 'Cramer\'s Rule for Linear System',
        concept: 'Consistency and solution classification for system of 3 linear equations',
        formula: 'x = \\frac{\\Delta_x}{\\Delta},\\quad y = \\frac{\\Delta_y}{\\Delta},\\quad z = \\frac{\\Delta_z}{\\Delta}',
        examNote: 'Unique solution: Δ ≠ 0; Infinite solutions: Δ = Δ_x = Δ_y = Δ_z = 0; Inconsistent: Δ = 0 and at least one Δ_i ≠ 0.'
      },
      {
        title: 'Circulant Determinant Factorization',
        concept: 'Standard cyclic determinant expansion',
        formula: '\\begin{vmatrix} a & b & c \\\\ b & c & a \\\\ c & a & b \\end{vmatrix} = -(a^3 + b^3 + c^3 - 3abc) = -\\frac{1}{2}(a+b+c)[(a-b)^2 + (b-c)^2 + (c-a)^2]',
        examNote: 'If a, b, c > 0 and distinct, value is strictly negative. If a + b + c = 0, determinant is zero.'
      },
      {
        title: 'Differentiation of Determinants',
        concept: 'Row-wise differentiation of functional matrix determinants',
        formula: '\\frac{d}{dx}|A(x)| = \\begin{vmatrix} R_1\' \\\\ R_2 \\\\ R_3 \\end{vmatrix} + \\begin{vmatrix} R_1 \\\\ R_2\' \\\\ R_3 \\end{vmatrix} + \\begin{vmatrix} R_1 \\\\ R_2 \\\\ R_3\' \\end{vmatrix}',
        examNote: 'Differentiate one row (or column) at a time while leaving other rows unchanged.'
      }
    ]
  },
  {
    chapterId: 'm6',
    chapterName: 'Permutations & Combinations',
    subject: 'maths',
    formulas: [
      {
        title: 'Combinations & Pascal\'s Identity',
        concept: 'Selection formula and fundamental recurrence relation',
        formula: '{}^n C_r = \\frac{n!}{r!(n - r)!},\\quad {}^n C_r + {}^n C_{r-1} = {}^{n+1} C_r,\\quad {}^n C_r = \\frac{n}{r}{}^{n-1} C_{r-1}',
        examNote: 'Pascal\'s triangle identity is extensively used in series summation of combinations.'
      },
      {
        title: 'Circular Permutations',
        concept: 'Arrangements in circle with distinguishable vs indistinguishable directions',
        formula: '\\text{Distinct directions: } (n - 1)!,\\quad \\text{Necklace / Garland: } \\frac{(n - 1)!}{2}',
        examNote: 'Divide by 2 when clockwise and anticlockwise orientations are physically indistinguishable.'
      },
      {
        title: 'Beggar\'s Method (Stars and Bars)',
        concept: 'Distributing n identical objects among r distinct persons',
        formula: 'x_1 + x_2 + \\dots + x_r = n \\implies {}^{n + r - 1} C_{r - 1}\\ (x_i \\ge 0),\\quad {}^{n - 1} C_{r - 1}\\ (x_i \\ge 1)',
        examNote: 'Non-negative integer solutions: ⁿ⁺ʳ⁻¹C_r-1; positive integer solutions: ⁿ⁻¹C_r-1.'
      },
      {
        title: 'Derangements Formula',
        concept: 'Permutations where no element appears in its original position',
        formula: 'D_n = n!\\left(1 - \\frac{1}{1!} + \\frac{1}{2!} - \\frac{1}{3!} + \\dots + \\frac{(-1)^n}{n!}\\right)',
        examNote: 'D₁ = 0, D₂ = 1, D₃ = 2, D₄ = 9, D₅ = 44. Recurrence: D_n = (n - 1)(D_n-1 + D_n-2).'
      }
    ]
  },
  {
    chapterId: 'm7',
    chapterName: 'Binomial Theorem',
    subject: 'maths',
    formulas: [
      {
        title: 'General Term & Middle Term in Expansion',
        concept: 'General r-th index term in (x + y)^n expansion',
        formula: 'T_{r+1} = {}^n C_r x^{n-r} y^r,\\quad \\text{Middle: } T_{n/2 + 1}\\ (n\\text{ even}),\\quad T_{(n+1)/2},\\ T_{(n+3)/2}\\ (n\\text{ odd})',
        examNote: 'Greatest binomial coefficient is at the middle term: ⁿC_⌊n/2⌋.'
      },
      {
        title: 'Sum of Binomial Coefficients',
        concept: 'Identities obtained by setting x = 1 and x = -1',
        formula: '\\sum_{r=0}^n {}^n C_r = 2^n,\\quad \\sum_{r=0}^n (-1)^r {}^n C_r = 0,\\quad C_0 + C_2 + C_4 + \\dots = 2^{n-1}',
        examNote: 'Differentiating (1 + x)ⁿ gives Σ r · ⁿC_r = n · 2^(n-1).'
      },
      {
        title: 'Numerically Greatest Term (NGT)',
        concept: 'Index of maximum absolute term in expansion of (x + y)^n',
        formula: 'r \\le \\frac{n + 1}{1 + |x/y|}',
        examNote: 'If this expression equals integer k, then T_k = T_k+1 are both numerically greatest. Else take ⌊ · ⌋ + 1.'
      },
      {
        title: 'Multinomial Theorem Term Count',
        concept: 'General expansion and total distinct term count for k variables',
        formula: '(x_1 + x_2 + \\dots + x_k)^n = \\sum \\frac{n!}{r_1! r_2! \\dots r_k!} x_1^{r_1} x_2^{r_2} \\dots x_k^{r_k},\\quad \\text{Total Terms} = {}^{n + k - 1} C_{k - 1}',
        examNote: 'Total terms in expansion of (x + y + z)ⁿ is (n + 1)(n + 2) / 2.'
      }
    ]
  },
  {
    chapterId: 'm8',
    chapterName: 'Sequences & Series',
    subject: 'maths',
    formulas: [
      {
        title: 'Arithmetic Progression (AP) Relations',
        concept: 'General term, sum of first n terms, and equidistant property',
        formula: 'a_n = a + (n - 1)d,\\quad S_n = \\frac{n}{2}[2a + (n - 1)d] = \\frac{n}{2}(a + l),\\quad a_k + a_{n-k+1} = a_1 + a_n',
        examNote: 'If S_n is given as An² + Bn, common difference d = 2A.'
      },
      {
        title: 'Geometric Progression (GP) & Infinite Sum',
        concept: 'General term, finite sum, and convergent infinite sum',
        formula: 'a_n = a r^{n-1},\\quad S_n = \\frac{a(1 - r^n)}{1 - r},\\quad S_\\infty = \\frac{a}{1 - r}\\ (|r| < 1)',
        examNote: 'Infinite sum S_∞ converges strictly only when |r| < 1.'
      },
      {
        title: 'AM-GM-HM Inequality',
        concept: 'Universal inequality for positive real numbers a, b > 0',
        formula: '\\frac{a + b}{2} \\ge \\sqrt{ab} \\ge \\frac{2ab}{a + b} \\implies A \\ge G \\ge H',
        examNote: 'Equality holds if and only if all terms are equal (a = b). Premier tool for extrema of positive expressions!'
      },
      {
        title: 'Sum of First n Natural Powers',
        concept: 'Power summation formulas for n, n², and n³',
        formula: '\\sum n = \\frac{n(n+1)}{2},\\quad \\sum n^2 = \\frac{n(n+1)(2n+1)}{6},\\quad \\sum n^3 = \\left[\\frac{n(n+1)}{2}\\right]^2 = (\\sum n)^2',
        examNote: 'Sum of cubes equals square of sum of first n natural numbers.'
      },
      {
        title: 'Arithmetico-Geometric Progression (AGP)',
        concept: 'Sum of sequence whose terms are products of AP and GP terms',
        formula: 'S_\\infty = \\frac{a}{1 - r} + \\frac{d r}{(1 - r)^2}\\ (|r| < 1)',
        examNote: 'High-speed formula avoiding manual S - rS subtraction in multiple-choice questions.'
      }
    ]
  },
  {
    chapterId: 'm9',
    chapterName: 'Mathematical Induction & Reasoning',
    subject: 'maths',
    formulas: [
      {
        title: 'Conditional Statement Truth Table & Equivalence',
        concept: 'Logical implication representation in disjunctive form',
        formula: 'p \\implies q \\equiv \\sim p \\lor q,\\quad \\sim(p \\implies q) \\equiv p \\land \\sim q',
        examNote: 'p ⟹ q is FALSE only when p is true and q is false. In all other cases, it is true.'
      },
      {
        title: 'Contrapositive & Converse Statements',
        concept: 'Logically equivalent transposition of conditional statements',
        formula: '\\text{Contrapositive}(p \\implies q) \\equiv \\sim q \\implies \\sim p,\\quad \\text{Converse} \\equiv q \\implies p',
        examNote: 'A conditional statement is always logically identical to its contrapositive: (p ⟹ q) ≡ (~q ⟹ ~p).'
      },
      {
        title: 'De Morgan\'s Laws in Mathematical Logic',
        concept: 'Negation of conjunction and disjunction operators',
        formula: '\\sim(p \\land q) \\equiv \\sim p \\lor \\sim q,\\quad \\sim(p \\lor q) \\equiv \\sim p \\land \\sim q',
        examNote: 'Tautology (T) is always true; Contradiction / Fallacy (F) is always false.'
      },
      {
        title: 'Biconditional Statement & Duality',
        concept: 'Equivalence criteria for double implication and dual proposition generation',
        formula: 'p \\iff q \\equiv (p \\implies q) \\land (q \\implies p) \\equiv (p \\land q) \\lor (\\sim p \\land \\sim q)',
        examNote: 'p ⟺ q is TRUE when both p and q have identical truth values (both T or both F). Negation: ~(p ⟺ q) ≡ p ⊕ q (exclusive OR).'
      },
      {
        title: 'Divisibility Identities in Mathematical Induction',
        concept: 'Factorization and modular divisibility rules for powers of integers',
        formula: '(a - b) \\mid (a^n - b^n)\\ (\\forall n \\in \\mathbb{N}),\\quad (a + b) \\mid (a^n + b^n)\\ (\\text{odd } n),\\quad (a + b) \\mid (a^n - b^n)\\ (\\text{even } n)',
        examNote: 'Classic JEE induction shortcut: to prove 7ⁿ - 3ⁿ is divisible by 4, directly apply (a - b) | (aⁿ - bⁿ) with a = 7, b = 3.'
      }
    ]
  },
  {
    chapterId: 'm10',
    chapterName: 'Straight Lines',
    subject: 'maths',
    formulas: [
      {
        title: 'Distance & Parametric Form of Line',
        concept: 'Coordinates of point at distance r along directed slope θ',
        formula: '\\frac{x - x_1}{\\cos\\theta} = \\frac{y - y_1}{\\sin\\theta} = r \\implies (x_1 + r\\cos\\theta,\\ y_1 + r\\sin\\theta)',
        examNote: 'r is positive in one direction and negative in opposite direction along line.'
      },
      {
        title: 'Perpendicular Distance to Line',
        concept: 'Normal distance from point (x1, y1) and distance between parallel lines',
        formula: 'd = \\frac{|A x_1 + B y_1 + C|}{\\sqrt{A^2 + B^2}},\\quad d_{\\text{parallel}} = \\frac{|C_1 - C_2|}{\\sqrt{A^2 + B^2}}',
        examNote: 'Coefficients A and B must be made identical before applying parallel distance formula!'
      },
      {
        title: 'Foot of Perpendicular & Mirror Image',
        concept: 'Coordinates of projection and reflection across line Ax + By + C = 0',
        formula: '\\frac{h - x_1}{A} = \\frac{k - y_1}{B} = -\\frac{A x_1 + B y_1 + C}{A^2 + B^2}\\ (\\text{Foot}),\\quad = -2\\frac{A x_1 + B y_1 + C}{A^2 + B^2}\\ (\\text{Image})',
        examNote: 'Replace -1 with -2 to find reflection / image point across the line in 10 seconds.'
      },
      {
        title: 'Angle Bisector Equations',
        concept: 'Locus of points equidistant from two intersecting lines',
        formula: '\\frac{A_1 x + B_1 y + C_1}{\\sqrt{A_1^2 + B_1^2}} = \\pm \\frac{A_2 x + B_2 y + C_2}{\\sqrt{A_2^2 + B_2^2}}',
        examNote: 'Make C₁, C₂ > 0. If A₁A₂ + B₁B₂ > 0, + sign gives obtuse bisector; - sign gives acute bisector.'
      },
      {
        title: 'Homogeneous Pair of Straight Lines',
        concept: 'Angle between lines passing through origin represented by ax² + 2hxy + by² = 0',
        formula: '\\tan\\theta = \\frac{2\\sqrt{h^2 - ab}}{|a + b|}',
        examNote: 'Lines are perpendicular if a + b = 0; coincident if h² - ab = 0.'
      }
    ]
  },
  {
    chapterId: 'm11',
    chapterName: 'Circles',
    subject: 'maths',
    formulas: [
      {
        title: 'General Circle Equation & Radius',
        concept: 'Standard parameters for x² + y² + 2gx + 2fy + c = 0',
        formula: '\\text{Center } (-g, -f),\\quad R = \\sqrt{g^2 + f^2 - c}',
        examNote: 'Circle is real if g² + f² - c > 0; point circle if = 0; imaginary if < 0.'
      },
      {
        title: 'Tangent in Slope & Point Form',
        concept: 'Condition of tangency and equation of tangent to circle',
        formula: 'y = mx \\pm a\\sqrt{1 + m^2},\\quad c^2 = a^2(1 + m^2),\\quad T = 0 \\implies x x_1 + y y_1 = a^2',
        examNote: 'Slope form gives two parallel tangents with slopes m separated by diameter.'
      },
      {
        title: 'Universal Conic Chord Identities (T=0, SS1=T², T=S1)',
        concept: 'Chord of contact, pair of tangents, and chord with given midpoint',
        formula: '\\text{Chord of Contact: } T = 0,\\quad \\text{Pair of Tangents: } SS_1 = T^2,\\quad \\text{Chord with Midpoint: } T = S_1',
        examNote: 'Universal rule: applies identically to circles, parabolas, ellipses, and hyperbolas!'
      },
      {
        title: 'Director Circle of Circle',
        concept: 'Locus of intersection point of perpendicular tangents',
        formula: 'x^2 + y^2 = 2a^2',
        examNote: 'Director circle is concentric and has radius \\sqrt{2} times the original radius.'
      },
      {
        title: 'Common Tangents Between Two Circles',
        concept: 'Number of common tangents based on center distance d and radii r1, r2',
        formula: 'd > r_1 + r_2\\ (4\\text{ tangents}),\\quad d = r_1 + r_2\\ (3),\\quad |r_1 - r_2| < d < r_1 + r_2\\ (2),\\quad d = |r_1 - r_2|\\ (1)',
        examNote: 'Length of direct common tangent: L_DCT = \\sqrt{d² - (r₁ - r₂)²}; transverse: L_TCT = \\sqrt{d² - (r₁ + r₂)²}.'
      }
    ]
  },
  {
    chapterId: 'm12',
    chapterName: 'Parabola',
    subject: 'maths',
    formulas: [
      {
        title: 'Standard Parabola (y² = 4ax) Elements',
        concept: 'Focus, directrix, latus rectum, and focal distance',
        formula: '\\text{Focus } (a,0),\\quad \\text{Directrix: } x = -a,\\quad \\text{LR} = 4a,\\quad \\text{Focal Distance: } SP = x_1 + a',
        examNote: 'Parametric coordinates of any point on parabola: (at², 2at).'
      },
      {
        title: 'Tangent in Slope Form (Top Ranker Form)',
        concept: 'Condition of tangency and tangent equation in slope m',
        formula: 'y = mx + \\frac{a}{m}\\ (m \\ne 0),\\quad \\text{Point of Contact: } \\left(\\frac{a}{m^2},\\ \\frac{2a}{m}\\right)',
        examNote: 'Condition of tangency for line y = mx + c to parabola y² = 4ax is c = a / m.'
      },
      {
        title: 'Tangent in Parametric Form & Intersection',
        concept: 'Tangent at parameter t and intersection of tangents at t1, t2',
        formula: 't y = x + a t^2,\\quad \\text{Intersection of tangents: } (a t_1 t_2,\\ a(t_1 + t_2))',
        examNote: 'If tangents are perpendicular, t₁ t₂ = -1 ⟹ locus of intersection is directrix x = -a.'
      },
      {
        title: 'Normal to Parabola in Slope & Parametric Form',
        concept: 'Normal equations and concurrency of normals from point',
        formula: 'y = mx - 2am - am^3,\\quad y + tx = 2at + at^3',
        examNote: 'Up to three normals can be drawn from an external point; sum of slopes m₁ + m₂ + m₃ = 0.'
      },
      {
        title: 'Focal Chord Properties',
        concept: 'Parameters at extremities of focal chord and minimum chord length',
        formula: 't_1 t_2 = -1,\\quad \\text{Length of Focal Chord} = a\\left(t + \\frac{1}{t}\\right)^2 \\ge 4a',
        examNote: 'Semi-latus rectum (2a) is harmonic mean of segments of any focal chord: 2a = 2(SP)(S P\') / (SP + S P\').'
      }
    ]
  },
  {
    chapterId: 'm13',
    chapterName: 'Ellipse',
    subject: 'maths',
    formulas: [
      {
        title: 'Standard Ellipse (x²/a² + y²/b² = 1) Elements',
        concept: 'Eccentricity, foci, directrices, and latus rectum for a > b',
        formula: 'b^2 = a^2(1 - e^2),\\quad e = \\sqrt{1 - \\frac{b^2}{a^2}},\\quad \\text{Foci } (\\pm ae, 0),\\quad \\text{LR} = \\frac{2b^2}{a}',
        examNote: 'Focal property: Sum of focal distances to any point on ellipse is constant: SP + S\'P = 2a.'
      },
      {
        title: 'Tangent in Slope Form',
        concept: 'Condition of tangency and slope equation for ellipse',
        formula: 'y = mx \\pm \\sqrt{a^2 m^2 + b^2},\\quad c^2 = a^2 m^2 + b^2',
        examNote: 'Point form of tangent at (x₁, y₁): T = 0 ⟹ (x x₁)/a² + (y y₁)/b² = 1.'
      },
      {
        title: 'Director Circle of Ellipse',
        concept: 'Locus of points from which perpendicular tangents can be drawn',
        formula: 'x^2 + y^2 = a^2 + b^2',
        examNote: 'Concentric circle with radius \\sqrt{a² + b²}.'
      },
      {
        title: 'Auxiliary Circle & Parametric Coordinates',
        concept: 'Eccentric angle definition and parametric representation',
        formula: 'x^2 + y^2 = a^2,\\quad P(\\theta) = (a\\cos\\theta,\\ b\\sin\\theta)',
        examNote: 'Area enclosed by ellipse = π a b.'
      }
    ]
  },
  {
    chapterId: 'm14',
    chapterName: 'Hyperbola',
    subject: 'maths',
    formulas: [
      {
        title: 'Standard Hyperbola (x²/a² - y²/b² = 1) Elements',
        concept: 'Eccentricity, foci, and focal distance difference',
        formula: 'b^2 = a^2(e^2 - 1),\\quad e = \\sqrt{1 + \\frac{b^2}{a^2}} > 1,\\quad \\text{Foci } (\\pm ae, 0),\\quad \\text{LR} = \\frac{2b^2}{a}',
        examNote: 'Focal property: Difference of focal distances to any point is constant: |SP - S\'P| = 2a.'
      },
      {
        title: 'Tangent in Slope Form',
        concept: 'Condition of tangency and equation of tangent',
        formula: 'y = mx \\pm \\sqrt{a^2 m^2 - b^2},\\quad c^2 = a^2 m^2 - b^2',
        examNote: 'Real tangents exist only if |m| > b/a. Tangents cannot be drawn parallel to asymptotes.'
      },
      {
        title: 'Asymptotes of Hyperbola',
        concept: 'Straight lines touching hyperbola at infinity',
        formula: 'y = \\pm \\frac{b}{a}x \\implies \\frac{x^2}{a^2} - \\frac{y^2}{b^2} = 0',
        examNote: 'Angle between asymptotes is 2 \\tan⁻¹(b/a). Hyperbola and its conjugate have identical asymptotes.'
      },
      {
        title: 'Rectangular Hyperbola (xy = c²)',
        concept: 'Hyperbola with perpendicular asymptotes and eccentricity e = √2',
        formula: 'e = \\sqrt{2},\\quad P(t) = \\left(ct,\\ \\frac{c}{t}\\right),\\quad \\text{Tangent: } \\frac{x}{t} + y t = 2c',
        examNote: 'Equation of normal at parameter t: x t³ - y t - c t⁴ + c = 0.'
      },
      {
        title: 'Conjugate Hyperbola Relation',
        concept: 'Eccentricities e1 and e2 of hyperbola and its conjugate hyperbola',
        formula: '\\frac{1}{e_1^2} + \\frac{1}{e_2^2} = 1',
        examNote: 'Classic JEE result: harmonic relation between squared eccentricities.'
      }
    ]
  },
  {
    chapterId: 'm15',
    chapterName: 'Limits, Continuity & Differentiability',
    subject: 'maths',
    formulas: [
      {
        title: 'Fundamental Standard Limits',
        concept: 'Key limits of trigonometric, exponential, and algebraic functions',
        formula: '\\lim_{x\\to 0}\\frac{\\sin x}{x} = 1,\\quad \\lim_{x\\to 0}\\frac{e^x - 1}{x} = 1,\\quad \\lim_{x\\to 0}\\frac{\\ln(1 + x)}{x} = 1,\\quad \\lim_{x\\to a}\\frac{x^n - a^n}{x - a} = n a^{n-1}',
        examNote: 'Angles in trigonometric limits MUST strictly be in radians. lim (1 - cos x)/x² = 1/2.'
      },
      {
        title: '1^∞ Indeterminate Form Shortcut',
        concept: 'Euler conversion formula for functions approaching 1^∞',
        formula: '\\lim_{x\\to a}[f(x)]^{g(x)} = e^{\\lim_{x\\to a} g(x)[f(x) - 1]}\\quad (\\text{when } f(x)\\to 1,\\ g(x)\\to\\infty)',
        examNote: 'The single most repeatedly tested limit indeterminate form in JEE Main!'
      },
      {
        title: 'L\'Hôpital\'s Rule',
        concept: 'Differentiation of numerator and denominator for 0/0 and ∞/∞ forms',
        formula: '\\lim_{x\\to a}\\frac{f(x)}{g(x)} = \\lim_{x\\to a}\\frac{f\'(x)}{g\'(x)}\\quad \\left(\\text{for } \\frac{0}{0}\\text{ or } \\frac{\\infty}{\\infty}\\right)',
        examNote: 'Differentiate numerator and denominator SEPARATELY. Do not apply quotient rule!'
      },
      {
        title: 'Differentiability & Continuity Relation',
        concept: 'Existence of finite left-hand and right-hand derivative',
        formula: 'f\'_-(a) = \\lim_{h\\to 0^-}\\frac{f(a+h) - f(a)}{h} = f\'_+(a) = \\lim_{h\\to 0^+}\\frac{f(a+h) - f(a)}{h}',
        examNote: 'Differentiability implies Continuity, but Continuity does NOT imply Differentiability (e.g. |x| at x = 0).'
      }
    ]
  },
  {
    chapterId: 'm16',
    chapterName: 'Differentiation',
    subject: 'maths',
    formulas: [
      {
        title: 'Product, Quotient & Chain Rules',
        concept: 'Rules of differentiation for products, quotients, and composite functions',
        formula: '(u v)\' = u\' v + u v\',\\quad \\left(\\frac{u}{v}\\right)\' = \\frac{u\' v - u v\'}{v^2},\\quad \\frac{d}{dx}f(g(x)) = f\'(g(x))g\'(x)',
        examNote: 'Denominator is squared in quotient rule; sign in numerator is negative.'
      },
      {
        title: 'Logarithmic Differentiation',
        concept: 'Derivative of variable base raised to variable exponent [u(x)]^v(x)',
        formula: 'y = [u(x)]^{v(x)} \\implies \\frac{dy}{dx} = y\\left[v\'(x)\\ln u(x) + \\frac{v(x) u\'(x)}{u(x)}\\right]',
        examNote: 'Take natural logarithm ln on both sides before differentiating.'
      },
      {
        title: 'Parametric Second Derivative Trap',
        concept: 'Correct computation of d²y/dx² for parametric curves x(t), y(t)',
        formula: '\\frac{dy}{dx} = \\frac{y\'(t)}{x\'(t)},\\quad \\frac{d^2y}{dx^2} = \\frac{\\frac{d}{dt}\\left(\\frac{dy}{dx}\\right)}{x\'(t)}',
        examNote: 'JEE Trap: Never differentiate dy/dt and dx/dt separately! Remember to divide by dx/dt.'
      },
      {
        title: 'Standard Inverse Trigonometric Derivatives',
        concept: 'Derivatives of inverse trigonometric functions with principal domain bounds',
        formula: '\\frac{d}{dx}\\sin^{-1}x = \\frac{1}{\\sqrt{1 - x^2}},\\quad \\frac{d}{dx}\\tan^{-1}x = \\frac{1}{1 + x^2},\\quad \\frac{d}{dx}\\sec^{-1}x = \\frac{1}{|x|\\sqrt{x^2 - 1}}',
        examNote: 'Always verify domain constraints when differentiating composite inverse functions.'
      }
    ]
  },
  {
    chapterId: 'm17',
    chapterName: 'Applications of Derivatives',
    subject: 'maths',
    formulas: [
      {
        title: 'Tangent & Normal Equations',
        concept: 'Equations of tangent and normal at curve point (x1, y1)',
        formula: 'y - y_1 = f\'(x_1)(x - x_1)\\ (\\text{Tangent}),\\quad y - y_1 = -\\frac{1}{f\'(x_1)}(x - x_1)\\ (\\text{Normal})',
        examNote: 'Length of subtangent = |y₁ / m|; length of subnormal = |y₁ · m|.'
      },
      {
        title: 'Monotonicity & Strict Extrema',
        concept: 'First and second derivative tests for local maxima and minima',
        formula: 'f\'(x) \\ge 0\\ (\\text{Increasing}),\\quad f\'(c) = 0\\ \\&\\ f\'\'(c) < 0\\ (\\text{Local Maxima}),\\quad f\'\'(c) > 0\\ (\\text{Local Minima})',
        examNote: 'If f\'\'(c) = 0, test is inconclusive: inspect sign change of f\'(x) across c.'
      },
      {
        title: 'Rolle\'s & Lagrange\'s Mean Value Theorem (LMVT)',
        concept: 'Guaranteed existence of tangent parallel to secant chord',
        formula: 'f\'(c) = \\frac{f(b) - f(a)}{b - a}\\ (c \\in (a, b)),\\quad f\'(c) = 0\\ (\\text{Rolle\'s if } f(a) = f(b))',
        examNote: 'Functions must be continuous on [a, b] and differentiable on open interval (a, b).'
      },
      {
        title: 'Shortest Distance Between Two Curves',
        concept: 'Geometric condition for minimum separation of non-intersecting curves',
        formula: '\\text{Shortest distance lies strictly along their COMMON NORMAL}',
        examNote: 'Equate slopes of tangents m₁ = m₂ to find closest points on both curves.'
      }
    ]
  },
  {
    chapterId: 'm18',
    chapterName: 'Indefinite Integration',
    subject: 'maths',
    formulas: [
      {
        title: 'Standard Quadratic & Radical Integrals',
        concept: 'Integrals leading to inverse trigonometric and logarithmic forms',
        formula: '\\int \\frac{dx}{x^2 + a^2} = \\frac{1}{a}\\tan^{-1}\\left(\\frac{x}{a}\\right) + C,\\quad \\int \\frac{dx}{\\sqrt{a^2 - x^2}} = \\sin^{-1}\\left(\\frac{x}{a}\\right) + C',
        examNote: '∫ dx / \\sqrt{x² ± a²} = \\ln|x + \\sqrt{x² ± a²}| + C.'
      },
      {
        title: 'Integration by Parts (ILATE Rule)',
        concept: 'Integration rule for product of two functions',
        formula: '\\int u v\\,dx = u\\int v\\,dx - \\int\\left(u\'\\int v\\,dx\\right)dx',
        examNote: 'Priority for choosing u: Inverse > Logarithmic > Algebraic > Trigonometric > Exponential.'
      },
      {
        title: 'Classic Exponential Identity',
        concept: 'Exponential shortcut for sum of function and its derivative',
        formula: '\\int e^x [f(x) + f\'(x)]\\,dx = e^x f(x) + C,\\quad \\int e^{kx}[k f(x) + f\'(x)]\\,dx = e^{kx} f(x) + C',
        examNote: 'Extremely popular in JEE Main. Look for forms like e^x [tan x + sec²x] or e^x [(x-1)/(x+1)³].'
      },
      {
        title: 'Special Radical Integrals',
        concept: 'Area-related square root quadratic integrals',
        formula: '\\int \\sqrt{a^2 - x^2}\\,dx = \\frac{x}{2}\\sqrt{a^2 - x^2} + \\frac{a^2}{2}\\sin^{-1}\\left(\\frac{x}{a}\\right) + C',
        examNote: 'For \\sqrt{x² + a²}: replace sin⁻¹ with \\ln|x + \\sqrt{x² + a²}|.'
      }
    ]
  },
  {
    chapterId: 'm19',
    chapterName: 'Definite Integration',
    subject: 'maths',
    formulas: [
      {
        title: 'King\'s Property of Definite Integrals',
        concept: 'Invariance under reflection of domain across midpoint',
        formula: '\\int_a^b f(x)\\,dx = \\int_a^b f(a + b - x)\\,dx,\\quad \\int_0^a f(x)\\,dx = \\int_0^a f(a - x)\\,dx',
        examNote: 'The single most utilized property in JEE! Adding original I and King\'s I eliminates complex denominators.'
      },
      {
        title: 'Even-Odd & Periodic Integral Properties',
        concept: 'Symmetry simplification over symmetric intervals and periodic cycles',
        formula: '\\int_{-a}^a f(x)\\,dx = 2\\int_0^a f(x)\\,dx\\ (f\\text{ even}),\\quad = 0\\ (f\\text{ odd});\\quad \\int_0^{nT} f(x)\\,dx = n\\int_0^T f(x)\\,dx',
        examNote: 'If f(2a - x) = f(x): ∫₀²ᵃ f(x) dx = 2∫₀ᵃ f(x) dx; if f(2a - x) = -f(x), integral equals 0.'
      },
      {
        title: 'Leibniz Integral Rule for Differentiation Under Integral Sign',
        concept: 'Derivative of definite integral with variable limits',
        formula: '\\frac{d}{dx}\\int_{u(x)}^{v(x)} f(t)\\,dt = f(v(x)) v\'(x) - f(u(x)) u\'(x)',
        examNote: 'Indispensable when evaluating 0/0 limits containing definite integrals via L\'Hôpital\'s rule.'
      },
      {
        title: 'Definite Integral as Limit of a Sum',
        concept: 'Riemann sum conversion to definite integral',
        formula: '\\lim_{n\\to\\infty}\\frac{1}{n}\\sum_{r=1}^n f\\left(\\frac{r}{n}\\right) = \\int_0^1 f(x)\\,dx',
        examNote: 'Replace r/n with x, 1/n with dx, and lim Σ with ∫₀¹.'
      }
    ]
  },
  {
    chapterId: 'm20',
    chapterName: 'Area Under Curves',
    subject: 'maths',
    formulas: [
      {
        title: 'Area Between Two Curves',
        concept: 'Definite integral of vertical difference between upper and lower bounding curves',
        formula: 'A = \\int_a^b |f(x) - g(x)|\\,dx',
        examNote: 'Find intersection points f(x) = g(x) first to split into intervals where f(x) ≥ g(x).'
      },
      {
        title: 'Area Between Parabola and Line (Instant Shortcut)',
        concept: 'Area enclosed by y² = 4ax and line y = mx',
        formula: '\\text{Area} = \\frac{8a^2}{3m^3}',
        examNote: 'Instant 5-second formula saving multiple minutes of integration in JEE Main.'
      },
      {
        title: 'Area Between Two Orthogonal Parabolas',
        concept: 'Area bounded by y² = 4ax and x² = 4by',
        formula: '\\text{Area} = \\frac{16 a b}{3}',
        examNote: 'Classic result: for y² = 4x and x² = 4y, Area = 16(1)(1)/3 = 16/3 sq units.'
      },
      {
        title: 'Area of Ellipse',
        concept: 'Total enclosed area of standard ellipse x²/a² + y²/b² = 1',
        formula: '\\text{Area} = \\pi a b',
        examNote: 'Area in a single quadrant is πab / 4.'
      }
    ]
  },
  {
    chapterId: 'm21',
    chapterName: 'Differential Equations',
    subject: 'maths',
    formulas: [
      {
        title: 'First-Order Linear Differential Equation & Integrating Factor',
        concept: 'General solution of dy/dx + P(x)y = Q(x)',
        formula: '\\frac{dy}{dx} + P(x) y = Q(x) \\implies \\text{IF} = e^{\\int P(x)\\,dx},\\quad y(\\text{IF}) = \\int Q(x)(\\text{IF})\\,dx + C',
        examNote: 'For dx/dy + P(y)x = Q(y): IF = e^(∫ P(y) dy) and x(IF) = ∫ Q(y)(IF) dy + C.'
      },
      {
        title: 'Homogeneous Differential Equation Substitution',
        concept: 'Reduction to separable variables via y = vx',
        formula: '\\frac{dy}{dx} = f\\left(\\frac{y}{x}\\right) \\implies y = v x \\implies \\frac{dy}{dx} = v + x\\frac{dv}{dx}',
        examNote: 'Substitute and separate variables in terms of v and x.'
      },
      {
        title: 'Exact Differential Recognitions (High-Speed JEE Shortcuts)',
        concept: 'Total differential groupings for immediate algebraic integration',
        formula: 'x\\,dy + y\\,dx = d(xy),\\quad \\frac{x\\,dy - y\\,dx}{x^2} = d\\left(\\frac{y}{x}\\right),\\quad \\frac{x\\,dy - y\\,dx}{x^2 + y^2} = d\\left(\\tan^{-1}\\frac{y}{x}\\right)',
        examNote: 'Recognizing exact differentials avoids tedious integrating factor integrations.'
      },
      {
        title: 'Order and Degree of Differential Equations',
        concept: 'Definitions and polynomiality constraints on derivatives',
        formula: '\\text{Order: Highest derivative order};\\quad \\text{Degree: Power of highest derivative when free of radicals/fractions}',
        examNote: 'Degree is undefined if equation is non-polynomial in derivatives (e.g. sin(dy/dx) = x).'
      }
    ]
  },
  {
    chapterId: 'm22',
    chapterName: 'Vector Algebra',
    subject: 'maths',
    formulas: [
      {
        title: 'Scalar (Dot) Product & Vector Projection',
        concept: 'Scalar product definition, angle between vectors, and orthogonal projection',
        formula: '\\vec{a}\\cdot\\vec{b} = |\\vec{a}||\\vec{b}|\\cos\\theta,\\quad \\cos\\theta = \\frac{\\vec{a}\\cdot\\vec{b}}{|\\vec{a}||\\vec{b}|},\\quad \\text{Proj}_{\\vec{b}}\\vec{a} = \\frac{\\vec{a}\\cdot\\vec{b}}{|\\vec{b}|}',
        examNote: 'Perpendicular vectors: \\vec{a} · \\vec{b} = 0. \\vec{a} · \\vec{a} = |\\vec{a}|².'
      },
      {
        title: 'Vector (Cross) Product & Triangle Area',
        concept: 'Normal vector definition and geometric area calculation',
        formula: '\\vec{a}\\times\\vec{b} = |\\vec{a}||\\vec{b}|\\sin\\theta\\,\\hat{n},\\quad \\text{Area}_{\\Delta} = \\frac{1}{2}|\\vec{a}\\times\\vec{b}|,\\quad \\text{Area}_{\\text{parallelogram}} = |\\vec{a}\\times\\vec{b}|',
        examNote: 'Collinear vectors: \\vec{a} × \\vec{b} = \\vec{0}. Cross product is anti-commutative: \\vec{a} × \\vec{b} = -(\\vec{b} × \\vec{a}).'
      },
      {
        title: 'Scalar Triple Product (Box Product)',
        concept: 'Volume of parallelepiped and coplanarity criterion',
        formula: '[\\vec{a}\\ \\vec{b}\\ \\vec{c}] = \\vec{a}\\cdot(\\vec{b}\\times\\vec{c}) = \\begin{vmatrix} a_1 & a_2 & a_3 \\\\ b_1 & b_2 & b_3 \\\\ c_1 & c_2 & c_3 \\end{vmatrix}',
        examNote: 'Three vectors are coplanar if and only if [\\vec{a} \\vec{b} \\vec{c}] = 0. Cyclic order invariant: [a b c] = [b c a] = [c a b].'
      },
      {
        title: 'Vector Triple Product (BAC - CAB Rule)',
        concept: 'Expansion of double cross product into planar components',
        formula: '\\vec{a}\\times(\\vec{b}\\times\\vec{c}) = (\\vec{a}\\cdot\\vec{c})\\vec{b} - (\\vec{a}\\cdot\\vec{b})\\vec{c}',
        examNote: 'Remember mnemonic: "BAC minus CAB". Lies in the plane of \\vec{b} and \\vec{c}.'
      },
      {
        title: 'Lagrange\'s Identity',
        concept: 'Relation connecting magnitudes of cross product and dot product',
        formula: '|\\vec{a}\\times\\vec{b}|^2 + (\\vec{a}\\cdot\\vec{b})^2 = |\\vec{a}|^2 |\\vec{b}|^2',
        examNote: 'Directly follows from sin²θ + cos²θ = 1.'
      }
    ]
  },
  {
    chapterId: 'm23',
    chapterName: 'Three Dimensional Geometry',
    subject: 'maths',
    formulas: [
      {
        title: 'Direction Cosines & Direction Ratios',
        concept: 'Direction cosines sum of squares and angle between two lines',
        formula: 'l^2 + m^2 + n^2 = 1,\\quad \\cos\\theta = |l_1 l_2 + m_1 m_2 + n_1 n_2| = \\frac{|a_1 a_2 + b_1 b_2 + c_1 c_2|}{\\sqrt{\\sum a_1^2}\\sqrt{\\sum a_2^2}}',
        examNote: 'Lines are perpendicular if a₁a₂ + b₁b₂ + c₁c₂ = 0; parallel if a₁/a₂ = b₁/b₂ = c₁/c₂.'
      },
      {
        title: 'Equation of Line in 3D & General Point',
        concept: 'Cartesian and vector equation of straight line passing through point along vector',
        formula: '\\frac{x - x_1}{a} = \\frac{y - y_1}{b} = \\frac{z - z_1}{c} = \\lambda \\implies \\vec{r} = \\vec{a} + \\lambda\\vec{b}',
        examNote: 'General point on line: (x₁ + aλ, y₁ + bλ, z₁ + cλ).'
      },
      {
        title: 'Shortest Distance Between Skew Lines',
        concept: 'Shortest distance between non-parallel, non-intersecting lines in space',
        formula: 'd = \\frac{|(\\vec{a}_2 - \\vec{a}_1)\\cdot(\\vec{b}_1 \\times \\vec{b}_2)|}{|\\vec{b}_1 \\times \\vec{b}_2|}',
        examNote: 'Lines intersect if and only if (\\vec{a}₂ - \\vec{a}₁) · (\\vec{b}₁ × \\vec{b}₂) = 0 (coplanar condition).'
      },
      {
        title: 'Distance Between Parallel Lines in 3D',
        concept: 'Shortest distance between lines with parallel direction vectors',
        formula: 'd = \\frac{|(\\vec{a}_2 - \\vec{a}_1)\\times\\vec{b}|}{|\\vec{b}|}',
        examNote: 'Direction vectors of the two lines must be made identical (\\vec{b}).'
      },
      {
        title: 'Distance of Point from Plane',
        concept: 'Perpendicular distance from point (x1, y1, z1) to plane Ax + By + Cz + D = 0',
        formula: 'd = \\frac{|A x_1 + B y_1 + C z_1 + D|}{\\sqrt{A^2 + B^2 + C^2}}',
        examNote: 'Distance between parallel planes Ax + By + Cz + D₁ = 0 and Ax + By + Cz + D₂ = 0 is |D₁ - D₂| / \\sqrt{A² + B² + C²}.'
      }
    ]
  },
  {
    chapterId: 'm24',
    chapterName: 'Probability',
    subject: 'maths',
    formulas: [
      {
        title: 'Conditional Probability & Multiplication Rule',
        concept: 'Probability of event A given that event B has already occurred',
        formula: 'P(A | B) = \\frac{P(A \\cap B)}{P(B)},\\quad P(A \\cap B) = P(B) P(A | B)',
        examNote: 'For independent events: P(A ∩ B) = P(A) · P(B) ⟹ P(A | B) = P(A).'
      },
      {
        title: 'Total Probability Theorem',
        concept: 'Total probability of event A partitioned over mutually exclusive exhaustive events',
        formula: 'P(A) = \\sum_{i=1}^n P(E_i) P(A | E_i)',
        examNote: 'Events E_i must form a complete partition of sample space: Σ P(E_i) = 1, E_i ∩ E_j = ∅.'
      },
      {
        title: 'Bayes\' Theorem for Posterior Probability',
        concept: 'Inverse probability formula evaluating cause E_k given effect A',
        formula: 'P(E_k | A) = \\frac{P(E_k) P(A | E_k)}{\\sum_{i=1}^n P(E_i) P(A | E_i)}',
        examNote: 'The #1 most frequently tested probability question in JEE Main and Advanced!'
      },
      {
        title: 'Binomial Distribution Mean & Variance',
        concept: 'Probability mass function, mean, and variance for n independent Bernoulli trials',
        formula: 'P(X = r) = {}^n C_r p^r q^{n-r},\\quad \\text{Mean } \\mu = n p,\\quad \\text{Variance } \\sigma^2 = n p q',
        examNote: 'q = 1 - p. Note that Variance < Mean always for any binomial distribution.'
      }
    ]
  },
  {
    chapterId: 'm25',
    chapterName: 'Statistics',
    subject: 'maths',
    formulas: [
      {
        title: 'Mean, Variance & Standard Deviation',
        concept: 'Measures of central tendency and dispersion of observations',
        formula: '\\bar{x} = \\frac{\\sum x_i}{N},\\quad \\sigma^2 = \\frac{\\sum x_i^2}{N} - (\\bar{x})^2,\\quad \\sigma = \\sqrt{\\sigma^2}',
        examNote: 'Fast formula: Variance = (Mean of squares) - (Square of mean).'
      },
      {
        title: 'Effect of Linear Transformation on Variance',
        concept: 'Shift and scale change behavior for y_i = a x_i + b',
        formula: 'y_i = a x_i + b \\implies \\bar{y} = a\\bar{x} + b,\\quad \\sigma_y^2 = a^2 \\sigma_x^2,\\quad \\sigma_y = |a|\\sigma_x',
        examNote: 'Adding or subtracting a constant b has ZERO effect on variance or standard deviation!'
      },
      {
        title: 'Combined Mean & Combined Variance',
        concept: 'Pooled mean and variance of two combined groups',
        formula: '\\bar{x}_{12} = \\frac{n_1 \\bar{x}_1 + n_2 \\bar{x}_2}{n_1 + n_2},\\quad \\sigma_{12}^2 = \\frac{n_1(\\sigma_1^2 + d_1^2) + n_2(\\sigma_2^2 + d_2^2)}{n_1 + n_2}',
        examNote: 'd₁ = x̄₁ - x̄₁₂ and d₂ = x̄₂ - x̄₁₂.'
      },
      {
        title: 'Coefficient of Variation (CV)',
        concept: 'Relative dispersion and data consistency comparison',
        formula: '\\text{CV} = \\frac{\\sigma}{\\bar{x}}\\times 100\\%',
        examNote: 'Lower CV indicates higher consistency and reliability of data.'
      }
    ]
  }
];

export const FORMULA_BANK: ChapterFormulas[] = [
  ...PHYSICS_FORMULA_BANK,
  ...CHEMISTRY_FORMULA_BANK,
  ...MATHS_FORMULA_BANK
];
