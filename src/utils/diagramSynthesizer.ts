/**
 * Diagram & Chemical Structure Synthesizer
 * Converts text-based descriptions, KaTeX matrices, or placeholder labels of chemical
 * structures into crisp, authentic, high-contrast inline vector SVG diagrams.
 */

export interface SO3StructureOptions {
  topBond: 1 | 2;
  blBond: 1 | 2;
  brBond: 1 | 2;
  topDots?: number;
  blDots?: number;
  brDots?: number;
  formalCharges?: { s?: string; top?: string; bl?: string; br?: string };
}

/**
 * Generates an authentic chemical Lewis structure SVG for SO3
 */
export function createSO3LewisSvg(options: SO3StructureOptions): string {
  const { topBond, blBond, brBond, topDots = 4, blDots = 4, brDots = 4, formalCharges } = options;
  const dotColor = '#93c5fd';
  const bondColor = '#38bdf8';
  const textColor = '#f8fafc';
  const r = 2.0;

  // Exact trigonal planar geometry (120 deg symmetry)
  // Center S at (80, 72)
  // Top O at (80, 24)
  // Bottom-Left O at (38, 96)
  // Bottom-Right O at (122, 96)
  let bondsSvg = '';

  // Top bond (vertical)
  if (topBond === 2) {
    bondsSvg += `<line x1="77.5" y1="36" x2="77.5" y2="58" stroke="${bondColor}" stroke-width="2" stroke-linecap="round"/>`;
    bondsSvg += `<line x1="82.5" y1="36" x2="82.5" y2="58" stroke="${bondColor}" stroke-width="2" stroke-linecap="round"/>`;
  } else {
    bondsSvg += `<line x1="80" y1="36" x2="80" y2="58" stroke="${bondColor}" stroke-width="2" stroke-linecap="round"/>`;
  }

  // Bottom-left bond (210 deg, normal offset ~5px for double bonds)
  if (blBond === 2) {
    bondsSvg += `<line x1="49.6" y1="92.2" x2="70.8" y2="80.1" stroke="${bondColor}" stroke-width="2" stroke-linecap="round"/>`;
    bondsSvg += `<line x1="47.2" y1="87.9" x2="68.4" y2="75.8" stroke="${bondColor}" stroke-width="2" stroke-linecap="round"/>`;
  } else {
    bondsSvg += `<line x1="48.4" y1="90.1" x2="69.6" y2="78.0" stroke="${bondColor}" stroke-width="2" stroke-linecap="round"/>`;
  }

  // Bottom-right bond (330 deg, normal offset ~5px for double bonds)
  if (brBond === 2) {
    bondsSvg += `<line x1="89.2" y1="80.1" x2="110.4" y2="92.2" stroke="${bondColor}" stroke-width="2" stroke-linecap="round"/>`;
    bondsSvg += `<line x1="91.6" y1="75.8" x2="112.8" y2="87.9" stroke="${bondColor}" stroke-width="2" stroke-linecap="round"/>`;
  } else {
    bondsSvg += `<line x1="90.4" y1="78.0" x2="111.6" y2="90.1" stroke="${bondColor}" stroke-width="2" stroke-linecap="round"/>`;
  }

  let dotsSvg = '';
  // Top O dots
  if (topDots === 4) {
    dotsSvg += `<circle cx="77.5" cy="14" r="${r}" fill="${dotColor}"/>`;
    dotsSvg += `<circle cx="82.5" cy="14" r="${r}" fill="${dotColor}"/>`;
    dotsSvg += `<circle cx="70" cy="24" r="${r}" fill="${dotColor}"/>`;
    dotsSvg += `<circle cx="90" cy="24" r="${r}" fill="${dotColor}"/>`;
  } else if (topDots === 6) {
    dotsSvg += `<circle cx="77.5" cy="14" r="${r}" fill="${dotColor}"/>`;
    dotsSvg += `<circle cx="82.5" cy="14" r="${r}" fill="${dotColor}"/>`;
    dotsSvg += `<circle cx="70" cy="21.5" r="${r}" fill="${dotColor}"/>`;
    dotsSvg += `<circle cx="70" cy="26.5" r="${r}" fill="${dotColor}"/>`;
    dotsSvg += `<circle cx="90" cy="21.5" r="${r}" fill="${dotColor}"/>`;
    dotsSvg += `<circle cx="90" cy="26.5" r="${r}" fill="${dotColor}"/>`;
  }

  // BL O dots
  if (blDots === 4) {
    dotsSvg += `<circle cx="28" cy="93.5" r="${r}" fill="${dotColor}"/>`;
    dotsSvg += `<circle cx="28" cy="98.5" r="${r}" fill="${dotColor}"/>`;
    dotsSvg += `<circle cx="35.5" cy="106" r="${r}" fill="${dotColor}"/>`;
    dotsSvg += `<circle cx="40.5" cy="106" r="${r}" fill="${dotColor}"/>`;
  } else if (blDots === 6) {
    dotsSvg += `<circle cx="28" cy="93.5" r="${r}" fill="${dotColor}"/>`;
    dotsSvg += `<circle cx="28" cy="98.5" r="${r}" fill="${dotColor}"/>`;
    dotsSvg += `<circle cx="35.5" cy="106" r="${r}" fill="${dotColor}"/>`;
    dotsSvg += `<circle cx="40.5" cy="106" r="${r}" fill="${dotColor}"/>`;
    dotsSvg += `<circle cx="35.5" cy="86" r="${r}" fill="${dotColor}"/>`;
    dotsSvg += `<circle cx="40.5" cy="86" r="${r}" fill="${dotColor}"/>`;
  }

  // BR O dots
  if (brDots === 4) {
    dotsSvg += `<circle cx="132" cy="93.5" r="${r}" fill="${dotColor}"/>`;
    dotsSvg += `<circle cx="132" cy="98.5" r="${r}" fill="${dotColor}"/>`;
    dotsSvg += `<circle cx="119.5" cy="106" r="${r}" fill="${dotColor}"/>`;
    dotsSvg += `<circle cx="124.5" cy="106" r="${r}" fill="${dotColor}"/>`;
  } else if (brDots === 6) {
    dotsSvg += `<circle cx="132" cy="93.5" r="${r}" fill="${dotColor}"/>`;
    dotsSvg += `<circle cx="132" cy="98.5" r="${r}" fill="${dotColor}"/>`;
    dotsSvg += `<circle cx="119.5" cy="106" r="${r}" fill="${dotColor}"/>`;
    dotsSvg += `<circle cx="124.5" cy="106" r="${r}" fill="${dotColor}"/>`;
    dotsSvg += `<circle cx="119.5" cy="86" r="${r}" fill="${dotColor}"/>`;
    dotsSvg += `<circle cx="124.5" cy="86" r="${r}" fill="${dotColor}"/>`;
  }

  let chargesSvg = '';
  if (formalCharges) {
    if (formalCharges.s) {
      chargesSvg += `<text x="90" y="62" fill="#f43f5e" font-size="10" font-weight="bold" font-family="system-ui, sans-serif">${formalCharges.s}</text>`;
    }
    if (formalCharges.top) {
      chargesSvg += `<text x="90" y="16" fill="#f43f5e" font-size="10" font-weight="bold" font-family="system-ui, sans-serif">${formalCharges.top}</text>`;
    }
    if (formalCharges.bl) {
      chargesSvg += `<text x="22" y="88" fill="#f43f5e" font-size="10" font-weight="bold" font-family="system-ui, sans-serif">${formalCharges.bl}</text>`;
    }
    if (formalCharges.br) {
      chargesSvg += `<text class="diagram-charge" x="132" y="88" fill="#f43f5e" font-size="10" font-weight="bold" font-family="system-ui, sans-serif">${formalCharges.br}</text>`;
    }
  }

  return `<svg viewBox="0 0 160 120" width="130" height="105" xmlns="http://www.w3.org/2000/svg" class="so3-lewis-diagram mx-auto select-none">` +
    bondsSvg +
    dotsSvg +
    `<text class="diagram-atom" x="80" y="72" fill="${textColor}" font-size="18" font-weight="bold" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="central">S</text>` +
    `<text class="diagram-atom" x="80" y="24" fill="${textColor}" font-size="18" font-weight="bold" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="central">O</text>` +
    `<text class="diagram-atom" x="38" y="96" fill="${textColor}" font-size="18" font-weight="bold" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="central">O</text>` +
    `<text class="diagram-atom" x="122" y="96" fill="${textColor}" font-size="18" font-weight="bold" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="central">O</text>` +
    chargesSvg +
    `</svg>`;
}

export const SO3_STRUCTURE_A = createSO3LewisSvg({ topBond: 2, blBond: 2, brBond: 2, topDots: 4, blDots: 4, brDots: 4 });
export const SO3_STRUCTURE_B = createSO3LewisSvg({ topBond: 2, blBond: 1, brBond: 1, topDots: 4, blDots: 6, brDots: 6 });
export const SO3_STRUCTURE_C = createSO3LewisSvg({ topBond: 1, blBond: 1, brBond: 1, topDots: 6, blDots: 6, brDots: 6 });
export const SO3_STRUCTURE_D = createSO3LewisSvg({ topBond: 1, blBond: 2, brBond: 2, topDots: 6, blDots: 4, brDots: 4 });

/**
 * Generates an authentic chemical Lewis structure SVG for Sodium Hypochlorite: Na+ [:Ö - Cl:]-
 */
export function createNaOClLewisSvg(): string {
  const dotColor = '#93c5fd';
  const bondColor = '#38bdf8';
  const textColor = '#f8fafc';
  const bracketColor = '#94a3b8';
  const r = 2.0;

  return `<svg viewBox="0 0 170 95" width="150" height="85" xmlns="http://www.w3.org/2000/svg" class="lewis-diagram mx-auto select-none">` +
    // Na+ on the left
    `<text x="25" y="52" fill="${textColor}" font-size="16" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Na</text>` +
    `<text x="39" y="42" fill="#38bdf8" font-size="11" font-weight="bold" font-family="system-ui, sans-serif">+</text>` +
    // Left bracket [
    `<path d="M 60,25 L 52,25 L 52,75 L 60,75" fill="none" stroke="${bracketColor}" stroke-width="2" stroke-linecap="round"/>` +
    // Oxygen
    `<text x="80" y="54" fill="${textColor}" font-size="16" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">O</text>` +
    // Lone pairs on O (top pair :Ö)
    `<circle cx="77.5" cy="38" r="${r}" fill="${dotColor}"/>` +
    `<circle cx="82.5" cy="38" r="${r}" fill="${dotColor}"/>` +
    // Left dots on O
    `<circle cx="68" cy="50" r="${r}" fill="${dotColor}"/>` +
    `<circle cx="68" cy="54" r="${r}" fill="${dotColor}"/>` +
    // Single bond O - Cl
    `<line x1="90" y1="50" x2="114" y2="50" stroke="${bondColor}" stroke-width="2" stroke-linecap="round"/>` +
    // Chlorine
    `<text x="126" y="54" fill="${textColor}" font-size="16" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Cl</text>` +
    // Right bracket ]
    `<path d="M 138,25 L 146,25 L 146,75 L 138,75" fill="none" stroke="${bracketColor}" stroke-width="2" stroke-linecap="round"/>` +
    // Negative charge -
    `<text x="150" y="32" fill="#f43f5e" font-size="13" font-weight="bold" font-family="system-ui, sans-serif">−</text>` +
    `</svg>`;
}

/**
 * Generates an authentic tetrahedral Lewis structure SVG for CCl4
 */
export function createCCl4LewisSvg(): string {
  const dotColor = '#93c5fd';
  const bondColor = '#38bdf8';
  const textColor = '#f8fafc';
  const r = 1.8;

  return `<svg viewBox="0 0 160 120" width="140" height="105" xmlns="http://www.w3.org/2000/svg" class="lewis-diagram mx-auto select-none">` +
    // Center Carbon
    `<text x="80" y="65" fill="${textColor}" font-size="16" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">C</text>` +
    // 4 bonds
    `<line x1="80" y1="52" x2="80" y2="34" stroke="${bondColor}" stroke-width="2"/>` +
    `<line x1="80" y1="72" x2="80" y2="90" stroke="${bondColor}" stroke-width="2"/>` +
    `<line x1="70" y1="62" x2="48" y2="62" stroke="${bondColor}" stroke-width="2"/>` +
    `<line x1="90" y1="62" x2="112" y2="62" stroke="${bondColor}" stroke-width="2"/>` +
    // Top Cl + dots
    `<text x="80" y="28" fill="${textColor}" font-size="14" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Cl</text>` +
    `<circle cx="76" cy="15" r="${r}" fill="${dotColor}"/><circle cx="84" cy="15" r="${r}" fill="${dotColor}"/>` +
    `<circle cx="68" cy="26" r="${r}" fill="${dotColor}"/><circle cx="68" cy="30" r="${r}" fill="${dotColor}"/>` +
    `<circle cx="92" cy="26" r="${r}" fill="${dotColor}"/><circle cx="92" cy="30" r="${r}" fill="${dotColor}"/>` +
    // Bottom Cl + dots
    `<text x="80" y="104" fill="${textColor}" font-size="14" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Cl</text>` +
    `<circle cx="76" cy="113" r="${r}" fill="${dotColor}"/><circle cx="84" cy="113" r="${r}" fill="${dotColor}"/>` +
    `<circle cx="68" cy="100" r="${r}" fill="${dotColor}"/><circle cx="68" cy="104" r="${r}" fill="${dotColor}"/>` +
    `<circle cx="92" cy="100" r="${r}" fill="${dotColor}"/><circle cx="92" cy="104" r="${r}" fill="${dotColor}"/>` +
    // Left Cl + dots
    `<text x="36" y="66" fill="${textColor}" font-size="14" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Cl</text>` +
    `<circle cx="24" cy="62" r="${r}" fill="${dotColor}"/><circle cx="24" cy="66" r="${r}" fill="${dotColor}"/>` +
    `<circle cx="34" cy="52" r="${r}" fill="${dotColor}"/><circle cx="38" cy="52" r="${r}" fill="${dotColor}"/>` +
    `<circle cx="34" cy="74" r="${r}" fill="${dotColor}"/><circle cx="38" cy="74" r="${r}" fill="${dotColor}"/>` +
    // Right Cl + dots
    `<text x="124" y="66" fill="${textColor}" font-size="14" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Cl</text>` +
    `<circle cx="136" cy="62" r="${r}" fill="${dotColor}"/><circle cx="136" cy="66" r="${r}" fill="${dotColor}"/>` +
    `<circle cx="122" cy="52" r="${r}" fill="${dotColor}"/><circle cx="126" cy="52" r="${r}" fill="${dotColor}"/>` +
    `<circle cx="122" cy="74" r="${r}" fill="${dotColor}"/><circle cx="126" cy="74" r="${r}" fill="${dotColor}"/>` +
    `</svg>`;
}

/**
 * Generates an authentic Lewis structure SVG for Ammonium ion [NH4]+
 */
export function createNH4LewisSvg(): string {
  const bondColor = '#38bdf8';
  const textColor = '#f8fafc';
  const bracketColor = '#94a3b8';

  return `<svg viewBox="0 0 160 120" width="140" height="105" xmlns="http://www.w3.org/2000/svg" class="lewis-diagram mx-auto select-none">` +
    // Bracket [
    `<path d="M 38,20 L 30,20 L 30,100 L 38,100" fill="none" stroke="${bracketColor}" stroke-width="2" stroke-linecap="round"/>` +
    // Center Nitrogen
    `<text x="80" y="65" fill="${textColor}" font-size="17" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">N</text>` +
    // 4 bonds
    `<line x1="80" y1="51" x2="80" y2="36" stroke="${bondColor}" stroke-width="2"/>` +
    `<line x1="80" y1="71" x2="80" y2="86" stroke="${bondColor}" stroke-width="2"/>` +
    `<line x1="69" y1="61" x2="52" y2="61" stroke="${bondColor}" stroke-width="2"/>` +
    `<line x1="91" y1="61" x2="108" y2="61" stroke="${bondColor}" stroke-width="2"/>` +
    // 4 Hydrogens
    `<text x="80" y="32" fill="${textColor}" font-size="14" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">H</text>` +
    `<text x="80" y="100" fill="${textColor}" font-size="14" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">H</text>` +
    `<text x="44" y="65" fill="${textColor}" font-size="14" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">H</text>` +
    `<text x="116" y="65" fill="${textColor}" font-size="14" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">H</text>` +
    // Bracket ]
    `<path d="M 122,20 L 130,20 L 130,100 L 122,100" fill="none" stroke="${bracketColor}" stroke-width="2" stroke-linecap="round"/>` +
    // Charge +
    `<text x="135" y="28" fill="#38bdf8" font-size="14" font-weight="bold" font-family="system-ui, sans-serif">+</text>` +
    `</svg>`;
}

/**
 * Generates an authentic Lewis structure SVG for Hydrazine N2H4 (H2N-NH2)
 */
export function createN2H4LewisSvg(): string {
  const dotColor = '#93c5fd';
  const bondColor = '#38bdf8';
  const textColor = '#f8fafc';
  const r = 1.8;

  return `<svg viewBox="0 0 170 110" width="150" height="95" xmlns="http://www.w3.org/2000/svg" class="lewis-diagram mx-auto select-none">` +
    // Left N
    `<text x="65" y="60" fill="${textColor}" font-size="16" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">N</text>` +
    // Lone pair on left N (top)
    `<circle cx="62.5" cy="46" r="${r}" fill="${dotColor}"/><circle cx="67.5" cy="46" r="${r}" fill="${dotColor}"/>` +
    // N - N bond
    `<line x1="75" y1="56" x2="95" y2="56" stroke="${bondColor}" stroke-width="2"/>` +
    // Right N
    `<text x="105" y="60" fill="${textColor}" font-size="16" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">N</text>` +
    // Lone pair on right N (top)
    `<circle cx="102.5" cy="46" r="${r}" fill="${dotColor}"/><circle cx="107.5" cy="46" r="${r}" fill="${dotColor}"/>` +
    // Bonds to H (Left N)
    `<line x1="56" y1="50" x2="42" y2="38" stroke="${bondColor}" stroke-width="2"/>` +
    `<line x1="56" y1="64" x2="42" y2="78" stroke="${bondColor}" stroke-width="2"/>` +
    `<text x="34" y="38" fill="${textColor}" font-size="14" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">H</text>` +
    `<text x="34" y="86" fill="${textColor}" font-size="14" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">H</text>` +
    // Bonds to H (Right N)
    `<line x1="114" y1="50" x2="128" y2="38" stroke="${bondColor}" stroke-width="2"/>` +
    `<line x1="114" y1="64" x2="128" y2="78" stroke="${bondColor}" stroke-width="2"/>` +
    `<text x="136" y="38" fill="${textColor}" font-size="14" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">H</text>` +
    `<text x="136" y="86" fill="${textColor}" font-size="14" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">H</text>` +
    `</svg>`;
}

/**
 * Generates radial probability distribution function 4*pi*r^2*R^2(r) plots
 */
export function createRadialDistributionSvg(nodes: number, label?: string): string {
  const w = 150, h = 90;
  let pathD = '';
  if (nodes === 0) {
    // Single smooth peak starting at 0, reaching max at ~0.35, declining to ~0
    pathD = 'M 20,75 C 30,75 40,25 65,25 C 90,25 115,70 140,75';
  } else if (nodes === 1) {
    // 1 node: smaller initial peak, touches 0 at node x=65, larger second peak
    pathD = 'M 20,75 C 28,75 32,55 42,55 C 52,55 58,75 68,75 C 78,75 88,25 105,25 C 122,25 132,70 140,75';
  } else {
    // 2 nodes: 3 peaks
    pathD = 'M 20,75 C 25,75 28,65 35,65 C 42,65 46,75 52,75 C 58,75 65,45 75,45 C 85,45 90,75 98,75 C 105,75 115,25 125,25 C 132,25 136,70 140,75';
  }

  return `<svg viewBox="0 0 160 100" width="140" height="90" xmlns="http://www.w3.org/2000/svg" class="mx-auto select-none">` +
    // Axes
    `<line x1="20" y1="75" x2="145" y2="75" stroke="#71717a" stroke-width="1.5" stroke-linecap="round"/>` +
    `<line x1="20" y1="75" x2="20" y2="15" stroke="#71717a" stroke-width="1.5" stroke-linecap="round"/>` +
    // Arrowheads
    `<polygon points="147,75 142,72 142,78" fill="#71717a"/>` +
    `<polygon points="20,13 17,18 23,18" fill="#71717a"/>` +
    // Axis labels
    `<text x="145" y="86" fill="#a1a1aa" font-size="9" font-family="system-ui, sans-serif">r</text>` +
    `<text x="10" y="16" fill="#a1a1aa" font-size="8" font-family="system-ui, sans-serif">4πr²R²</text>` +
    // Curve
    `<path d="${pathD}" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>` +
    (label ? `<text x="80" y="93" fill="#38bdf8" font-size="10" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">${label}</text>` : '') +
    `</svg>`;
}

/**
 * Checks if a string contains or describes a chemical Lewis structure or diagram,
 * and if so, converts it into the corresponding vector SVG diagram.
 */
export function synthesizeOptionDiagram(
  rawOptionText: string,
  optIndex?: number,
  questionContent?: string
): string {
  if (!rawOptionText && rawOptionText !== '') return rawOptionText;
  // Guard: NEVER synthesize or replace diagrams if optIndex is undefined (i.e. for question statements)
  if (optIndex === undefined) return rawOptionText;
  const text = String(rawOptionText).trim();

  // If already contains inline SVG, preserve it
  if (text.includes('<svg') && text.includes('</svg>')) {
    return text;
  }

  // Extract effective option index from text if present (e.g. "Structure (A):", "(A)", "[B]", "C.", "4)", "(1)", "Option (A)")
  let effectiveOptIdx = optIndex;
  const labelMatch = text.match(/(?:^\s*(?:structure|option|fig(?:ure)?|diagram)?\s*[\(\[]?([a-dA-D1-4])[\)\]\:\.]|^\s*[\(\[]?([a-dA-D1-4])[\)\]\:\.])/i);
  if (labelMatch) {
    const rawLabel = (labelMatch[1] || labelMatch[2]).toUpperCase();
    const map: Record<string, number> = { 'A': 0, '1': 0, 'B': 1, '2': 1, 'C': 2, '3': 2, 'D': 3, '4': 3 };
    if (map[rawLabel] !== undefined) {
      effectiveOptIdx = map[rawLabel];
    }
  }

  const qStr = String(questionContent || '').toLowerCase();
  const lower = text.toLowerCase();

  // Clean qStr to inspect without LaTeX syntax ($ \text{} \mathrm{} _ ^ etc.)
  const cleanQ = qStr
    .replace(/\\(?:text|mathrm|mathbf)\s*\{([^}]+)\}/gi, '$1')
    .replace(/[\$\{\}\\\_\^\s]/g, '')
    .replace(/\u2083/g, '3');

  // CRITICAL GUARD: Only synthesize diagrams if explicitly tagged or if the option explicitly describes a Lewis diagram in words,
  // or contains Lewis ASCII/Unicode glyphs, or is a placeholder option in a genuine SO3 preferred structure question.
  // NEVER replace genuine chemical formulas, statements, values, or options (e.g. "H2SO4 and SO3", "Na2SO3", "T F T F", numbers, pairs).
  const isExplicitSyntheticTag = /\[synthetic:(?:so3|diagram|lewis)\]/i.test(text) || /\[synthetic:(?:so3|diagram|lewis)\]/i.test(qStr);
  const isExplicitStructureDescription =
    /^structure\s*\([a-d1-4]\)\s*:\s*(?:s\s+atom|s\s+with|three\s+double|single\s+and\s+double|alternate)/i.test(lower) ||
    /^(?:s\s+(?:with|has|bonded)\s+(?:1|2|3|one|two|three)\s+double|structure\s+with\s+(?:three|3)\s+single)/i.test(lower) ||
    (/s\s+atom/i.test(lower) && /oxygen/i.test(lower) && /bond/i.test(lower));
  const hasLewisGlyphs = /\\ddot\{o\}|ö\s*[:\.]|:\s*ö|\\equiv|≡|\b[sS]\s*[=\-≡—]|\\begin\{matrix\}|\\begin\{array\}/i.test(text);
  const isPlaceholderOption = /^(?:option|structure)?\s*[\(\[]?[a-d1-4][\)\]]?\.?$/i.test(text.trim());
  
  const isGenuineSO3 = /(?:^|[^a-z0-9])so[\s_\{\$\\\^]*3(?![0-9a-z])/i.test(qStr) && !/(?:na|h|k|ca)\s*2?\s*so/i.test(qStr);
  const isPreferredSO3Question = (qStr.includes('preferred structure') || qStr.includes('lewis structure')) &&
    (isGenuineSO3 || /sulfur\s+trioxide|sulphur\s+trioxide/i.test(qStr));

  if (!isExplicitSyntheticTag && !isExplicitStructureDescription && !hasLewisGlyphs && !(isPreferredSO3Question && isPlaceholderOption)) {
    return rawOptionText;
  }

  // 1. SO3 Lewis Structure detection
  const isSO3Question =
    isPreferredSO3Question ||
    isExplicitSyntheticTag ||
    isExplicitStructureDescription ||
    hasLewisGlyphs;

  if (isSO3Question) {
    // Check for ASCII, Unicode, or KaTeX approximations of Lewis structures
    const hasLewisGlyphs = /\\ddot\{o\}|ö\s*[:\.]|:\s*ö|\\equiv|≡|\b[sS]\s*[=\-≡—]|\\begin\{matrix\}|\\begin\{array\}/i.test(text);

    // Match specific structure descriptions
    const is3Double = /(?:3|three).*double|all.*double|double.*zero.*formal|zero.*formal|s\s*\(?=\s*o\)?\s*3|three\s+oxygen\s+atoms\s+with\s+double\s+bonds/i.test(lower);
    const is1Double2Single = /(?:1|one).*double.*(?:2|two).*single|(?:2|two).*single.*(?:1|one).*double|single\s+and\s+double\s+bonds|one\s+double.*single|single.*one\s+double/i.test(lower);
    const is3Single = /(?:3|three).*single|all.*single|single\s+bonds?\s+only|only\s+single\s+bonds?|single\s+bonds?\s+exclusively/i.test(lower);
    const is2Double1Single = /(?:2|two).*double.*(?:1|one).*single|(?:1|one).*single.*(?:2|two).*double|two\s+double|alternate\s+coordination|coordinate\s+bonds?|alternate/i.test(lower);

    if (is3Double) return SO3_STRUCTURE_A;
    if (is1Double2Single) return SO3_STRUCTURE_B;
    if (is3Single) return SO3_STRUCTURE_C;
    if (is2Double1Single) return SO3_STRUCTURE_D;

    // Check for KaTeX / ASCII matrices of SO3
    if (hasLewisGlyphs) {
      if (text.includes('\\equiv') || text.includes('≡')) {
        return SO3_STRUCTURE_D;
      }
      const parallelCount = (text.match(/\\parallel|=|==/g) || []).length;
      const singleCount = (text.match(/\||-|--|—|\/|\\/g) || []).length;
      if (parallelCount >= 3) return SO3_STRUCTURE_A;
      if (parallelCount === 1 || (parallelCount > 0 && singleCount >= 2)) return SO3_STRUCTURE_B;
      if (parallelCount === 0 && singleCount >= 3) return SO3_STRUCTURE_C;
      if (parallelCount === 2) return SO3_STRUCTURE_D;

      // Fallback by option index if specific count was ambiguous
      if (effectiveOptIdx === 0) return SO3_STRUCTURE_A;
      if (effectiveOptIdx === 1) return SO3_STRUCTURE_B;
      if (effectiveOptIdx === 2) return SO3_STRUCTURE_C;
      if (effectiveOptIdx === 3) return SO3_STRUCTURE_D;
    }

    // Default resolution for SO3 preferred structure questions:
    // Placeholders, structure labels, or any option in an SO3 question
    if (effectiveOptIdx === 0 || /\bstructure\s*\(?a\)?/i.test(lower) || /^(?:option\s*\(?1\)?|\(?a\)?)/i.test(lower)) return SO3_STRUCTURE_A;
    if (effectiveOptIdx === 1 || /\bstructure\s*\(?b\)?/i.test(lower) || /^(?:option\s*\(?2\)?|\(?b\)?)/i.test(lower)) return SO3_STRUCTURE_B;
    if (effectiveOptIdx === 2 || /\bstructure\s*\(?c\)?/i.test(lower) || /^(?:option\s*\(?3\)?|\(?c\)?)/i.test(lower)) return SO3_STRUCTURE_C;
    if (effectiveOptIdx === 3 || /\bstructure\s*\(?d\)?/i.test(lower) || /^(?:option\s*\(?4\)?|\(?d\)?)/i.test(lower)) return SO3_STRUCTURE_D;
  }

  // 2. Radial probability distribution function of 3d / 2p / 3s electron
  if (qStr.includes('radial probability') || qStr.includes('radial node') || (qStr.includes('graph') && qStr.includes('electron'))) {
    if (qStr.includes('3d') || qStr.includes('2p')) {
      // 3d has 0 radial nodes
      const isPlaceholder = /^(?:graph|plot|curve|figure|option)?\s*[\(\[]?(?:[a-d1-4])?[\)\]]?\s*(?:\[refer to pdf\])?$/i.test(lower) || text.length <= 4;
      if (isPlaceholder) {
        // Standard JEE distribution: (1) = 0 nodes (correct for 3d), (2) = 1 node, (3) = 2 nodes, (4) = inverted
        if (effectiveOptIdx === 0) return createRadialDistributionSvg(0);
        if (effectiveOptIdx === 1) return createRadialDistributionSvg(1);
        if (effectiveOptIdx === 2) return createRadialDistributionSvg(2);
      }
    }
  }

  // 3. Standalone structure descriptions (e.g. "Structure (A): S atom bonded to three oxygen atoms...", "S with 1 double bond and 2 single bonds")
  if (/^structure\s*\([a-d1-4]\)\s*:\s*/i.test(lower) || /^s\s+(?:atom|with|has|bonded)/i.test(lower) || (/s\s+atom/i.test(lower) && /oxygen/i.test(lower))) {
    if (/(?:3|three).*double|all.*double|double.*zero.*formal|zero.*formal/i.test(lower)) return SO3_STRUCTURE_A;
    if (/(?:1|one).*double.*(?:2|two).*single|(?:2|two).*single.*(?:1|one).*double|single\s+and\s+double/i.test(lower)) return SO3_STRUCTURE_B;
    if (/(?:3|three).*single|all.*single|single\s+bonds?\s+only|only\s+single/i.test(lower)) return SO3_STRUCTURE_C;
    if (/(?:2|two).*double.*(?:1|one).*single|(?:1|one).*single.*(?:2|two).*double|two\s+double|alternate|coordinat/i.test(lower)) return SO3_STRUCTURE_D;

    if (effectiveOptIdx === 0 || /\bstructure\s*\(?a\)?/i.test(lower)) return SO3_STRUCTURE_A;
    if (effectiveOptIdx === 1 || /\bstructure\s*\(?b\)?/i.test(lower)) return SO3_STRUCTURE_B;
    if (effectiveOptIdx === 2 || /\bstructure\s*\(?c\)?/i.test(lower)) return SO3_STRUCTURE_C;
    if (effectiveOptIdx === 3 || /\bstructure\s*\(?d\)?/i.test(lower)) return SO3_STRUCTURE_D;
  }

  // 4. Lewis diagram question detection (e.g. Question 19: Na+[:O-Cl:]^-, CCl4, Ammonium [NH4]+, Hydrazine N2H4)
  const isLewisDiagramQuestion =
    (cleanQ.includes('lewis') && (cleanQ.includes('diagram') || cleanQ.includes('structure') || cleanQ.includes('incorrect'))) ||
    cleanQ.includes('na+') ||
    (cleanQ.includes('ccl4') && (cleanQ.includes('ammonium') || cleanQ.includes('n2h4') || cleanQ.includes('lewis')));

  if (isLewisDiagramQuestion) {
    if (lower.includes('na') || lower.includes('ddot') || (lower.includes('cl') && lower.includes(':')) || (effectiveOptIdx === 0 && lower.includes('diagram'))) {
      return createNaOClLewisSvg();
    }
    if (lower.includes('ccl4') || lower.includes('tetrahedral') || (effectiveOptIdx === 1 && lower.includes('diagram'))) {
      return createCCl4LewisSvg();
    }
    if (lower.includes('ammonium') || lower.includes('bracket') || lower.includes('nh4') || (effectiveOptIdx === 2 && lower.includes('diagram'))) {
      return createNH4LewisSvg();
    }
    if (lower.includes('hydrazine') || lower.includes('n2h4') || (effectiveOptIdx === 3 && lower.includes('diagram'))) {
      return createN2H4LewisSvg();
    }
  }

  // 5. Standalone option checks for Lewis structure diagrams (even without full question context)
  if (/\\text\{na\}\^|na\^?\+|\[:?\\ddot/i.test(text) || (lower.includes('na') && lower.includes('diagram') && (lower.includes('cl') || lower.includes('ddot')))) {
    return createNaOClLewisSvg();
  }
  if (/ccl_?4.*(?:diagram|tetrahedral)|tetrahedral.*diagram/i.test(lower)) {
    return createCCl4LewisSvg();
  }
  if (/ammonium.*(?:diagram|bracket)|nh_?4.*diagram/i.test(lower)) {
    return createNH4LewisSvg();
  }
  if (/hydrazine.*(?:diagram|structure)|n_?2h_?4.*diagram/i.test(lower)) {
    return createN2H4LewisSvg();
  }

  return rawOptionText;
}
