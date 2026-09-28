import { SubjectId } from '@/types';
import { auth } from '@/firebase';
import { decodeSecret } from '@/utils/crypto';
import { PdfTextExtractor } from './PdfTextExtractor';
import { storageAdapter } from '@/services/StorageAdapter';

export interface DppMetadataAnalysis {
  title: string;
  sheetName: string;
  subject: SubjectId;
  chapterName: string;
  recommendedDurationMinutes: number;
  questionCountEstimate: number;
  detectedInstitute?: string;
  confidence: 'high' | 'medium' | 'low';
}

export class DppMetadataAnalyzer {
  /**
   * Reads stored Gemini API key from StorageAdapter, auto-decoding if obfuscated.
   */
  private static getStoredGeminiKey(): string | undefined {
    try {
      const raw = storageAdapter.getGeminiApiKey();
      if (raw) {
        const decoded = decodeSecret(raw);
        if (decoded && decoded.trim().length > 10) {
          return decoded.trim();
        }
        if (raw.trim().length > 10) {
          return raw.trim();
        }
      }
    } catch {
      // Ignore localStorage access errors
    }
    return undefined;
  }

  /**
   * Cleans filename by stripping extensions, trailing/leading 'pdf', and segmenting joined words.
   * e.g. "ATOMICSTRUCTUREpdf.pdf" -> "ATOMIC STRUCTURE"
   */
  static cleanDppFileName(fileName: string): string {
    if (!fileName) return '';
    let name = fileName.replace(/\.[^/.]+$/, ''); // strip .pdf extension
    // Strip trailing or leading standalone/joined 'pdf' (case insensitive)
    name = name.replace(/pdf$/i, '').replace(/^pdf/i, '');
    // Replace underscores, hyphens, dots with spaces
    name = name.replace(/[-_.]+/g, ' ');
    // Split camelCase/PascalCase: "ChemicalBonding" -> "Chemical Bonding"
    name = name.replace(/([a-z])([A-Z])/g, '$1 $2');
    // Split acronyms followed by words: "JEEMain" -> "JEE Main"
    name = name.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
    // Common joined JEE words separation
    const joinedWords = [
      ['atomic', 'structure'],
      ['chemical', 'bonding'],
      ['gaseous', 'state'],
      ['thermodynamics', 'thermochemistry'],
      ['chemical', 'equilibrium'],
      ['ionic', 'equilibrium'],
      ['electro', 'chemistry'],
      ['surface', 'chemistry'],
      ['solid', 'state'],
      ['general', 'organic'],
      ['organic', 'chemistry'],
      ['hydro', 'carbons'],
      ['halo', 'alkanes'],
      ['current', 'electricity'],
      ['magnetic', 'effects'],
      ['electro', 'statics'],
      ['electromagnetic', 'induction'],
      ['ray', 'optics'],
      ['wave', 'optics'],
      ['modern', 'physics'],
      ['simple', 'harmonic'],
      ['rotational', 'motion'],
      ['centre', 'of', 'mass'],
      ['center', 'of', 'mass'],
      ['work', 'power', 'energy'],
      ['straight', 'lines'],
      ['conic', 'sections'],
      ['complex', 'numbers'],
      ['quadratic', 'equations'],
      ['permutations', 'combinations'],
      ['binomial', 'theorem'],
      ['differential', 'calculus'],
      ['integral', 'calculus'],
      ['differential', 'equations']
    ];
    for (const words of joinedWords) {
      const fused = words.join('');
      const spaced = words.join(' ');
      const regex = new RegExp(fused, 'gi');
      name = name.replace(regex, spaced);
    }
    return name.trim().replace(/\s+/g, ' ');
  }

  /**
   * Fast, client-side heuristic analyzer for coaching DPP worksheets.
   */
  static heuristicAnalyzeDppMetadata(
    cleanFileName: string,
    rawText: string,
    availableChapters: { id?: string; name: string; subject?: string }[] = []
  ): DppMetadataAnalysis {
    const textSample = (rawText || '').slice(0, 3000);
    const combinedCorpus = `${cleanFileName} ${textSample}`;

    const norm = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const normFile = norm(cleanFileName);

    // 1. Detect coaching institute
    const institutePatterns: [RegExp, string][] = [
      [/\ballen(?:\s+career\s+institute)?\b/i, 'Allen'],
      [/\bresonance(?:\s+edu)?\b/i, 'Resonance'],
      [/\bfiitjee|fitjee\b/i, 'FIITJEE'],
      [/\bphysics\s*wallah|\bpw\b/i, 'Physics Wallah'],
      [/\bmotion(?:\s+iit)?\b/i, 'Motion'],
      [/\bsri\s*chaitanya\b/i, 'Sri Chaitanya'],
      [/\bnarayana\b/i, 'Narayana'],
      [/\baakash|akash\b/i, 'Aakash'],
      [/\bvmc|vidyamandir\b/i, 'VMC'],
      [/\breliable\b/i, 'Reliable'],
      [/\bunacademy\b/i, 'Unacademy'],
      [/\bvedantu\b/i, 'Vedantu'],
      [/\bcompetishun\b/i, 'Competishun']
    ];
    let detectedInstitute: string | undefined = undefined;
    for (const [pattern, name] of institutePatterns) {
      if (pattern.test(cleanFileName) || pattern.test(textSample)) {
        detectedInstitute = name;
        break;
      }
    }

    // 2. Detect DPP / Sheet Number
    let sheetName = '';
    const sheetMatch = combinedCorpus.match(
      /\b(?:DPP|Worksheet|Assignment|Module|Practice\s*Sheet|Tutorial\s*Sheet|Sheet|DTS)\s*[-#:]?\s*(\d{1,3}[A-Za-z]?|[A-Za-z]\b|\d+)/i
    );
    if (sheetMatch) {
      sheetName = sheetMatch[0].trim().replace(/\s+/g, ' ');
    } else {
      sheetName = 'Daily Practice Problem';
    }

    // 3. PRIORITY A: Check for Chapter Match in Filename FIRST across ALL available chapters
    let bestChapter = 'General Concept Drill';
    let bestScore = 0;
    let detectedSubject: SubjectId = 'physics';
    let subjectMatchedFromChapter = false;

    for (const chap of availableChapters) {
      const normChap = norm(chap.name);
      if (normChap.length >= 4 && (normFile.includes(normChap) || normChap.includes(normFile))) {
        bestChapter = chap.name;
        bestScore = 100;
        if (chap.subject === 'chemistry' || chap.subject === 'physics' || chap.subject === 'maths') {
          detectedSubject = chap.subject as SubjectId;
          subjectMatchedFromChapter = true;
        }
        break;
      }
    }

    // 4. Subject keyword scoring
    if (!subjectMatchedFromChapter) {
      let physScore = 0;
      let chemScore = 0;
      let mathScore = 0;

      if (/\b(atomic\s*structure|structure\s*of\s*atom|chemical|bonding|mole|periodicity|equilibrium|organic|redox|electrochem|acid|base|orbitals?|bohr|quantum|isomerism|coordination)\b/i.test(cleanFileName)) {
        chemScore += 40;
      }
      if (/\b(kinematics|rotation|rotational|torque|gravitation|friction|newton|shm|optics|electrostatics|magnetism|induction|work\s*energy|centre\s*of\s*mass|rectilinear)\b/i.test(cleanFileName)) {
        physScore += 40;
      }
      if (/\b(calculus|integration|integral|derivative|differential|matrix|matrices|determinant|probability|permutation|binomial|progression|trigonometry|straight\s*line|parabola|ellipse|hyperbola)\b/i.test(cleanFileName)) {
        mathScore += 40;
      }

      if (/\bphysics\b/i.test(cleanFileName)) physScore += 30;
      if (/\bchemistry\b/i.test(cleanFileName)) chemScore += 30;
      if (/\bmathematics|maths\b/i.test(cleanFileName)) mathScore += 30;

      if (/\bphysics\b/i.test(textSample.slice(0, 600))) physScore += 15;
      if (/\bchemistry\b/i.test(textSample.slice(0, 600))) chemScore += 15;
      if (/\bmathematics|maths\b/i.test(textSample.slice(0, 600))) mathScore += 15;

      const physMatches = textSample.match(/\b(kinematics|rotation|rotational|mechanics|gravitation|optics|electrostatics|current\s+electricity|magnetism|induction|semiconductor|oscillation|shm|fluid|projectile|friction|capacitor|newton|velocity|acceleration|momentum|torque|lens|mirror|wave)\b/gi) || [];
      physScore += physMatches.length * 2;

      const chemMatches = textSample.match(/\b(organic|inorganic|equilibrium|chemical\s+bonding|periodic|electrochemistry|kinetics|solution|haloalkane|alcohol|aldehyde|carboxylic|amine|biomolecule|polymer|coordination|mole|atomic\s+structure|redox|hybridization|electronegativity|acid|base|naoh|orbitals|hydrocarbon|isomerism)\b/gi) || [];
      chemScore += chemMatches.length * 2;

      const mathMatches = textSample.match(/\b(calculus|limit|continuity|differentiability|derivative|integral|integration|differential\s+equation|matrix|matrices|determinant|vector|geometry|straight\s+line|circle|parabola|ellipse|hyperbola|conic|trigonometry|complex\s+number|quadratic|progression|series|binomial|permutation|combination|probability|function|statistics)\b/gi) || [];
      mathScore += mathMatches.length * 2;

      if (chemScore > physScore && chemScore >= mathScore) {
        detectedSubject = 'chemistry';
      } else if (mathScore > physScore && mathScore > chemScore) {
        detectedSubject = 'maths';
      }
    }

    // 5. Match Chapter Focus Tag
    if (bestScore === 0) {
      const lowerCorpus = combinedCorpus.toLowerCase();
      const subjectChapters = availableChapters.filter(c => !c.subject || c.subject === detectedSubject);
      const chaptersToSearch = subjectChapters.length > 0 ? subjectChapters : availableChapters;

      for (const chap of chaptersToSearch) {
        const chapLower = chap.name.toLowerCase();
        if (cleanFileName.toLowerCase().includes(chapLower)) {
          const score = 40 + chapLower.length;
          if (score > bestScore) {
            bestScore = score;
            bestChapter = chap.name;
          }
          continue;
        }
        if (lowerCorpus.includes(chapLower)) {
          const score = 25 + chapLower.length;
          if (score > bestScore) {
            bestScore = score;
            bestChapter = chap.name;
          }
          continue;
        }
        // Word token overlap (e.g. "Chem Bonding" matching "Chemical Bonding and Molecular Structure")
        const chapWords = chapLower.split(/[\s,–\-]+/).filter(w => w.length >= 4);
        let matchedWords = 0;
        for (const word of chapWords) {
          if (lowerCorpus.includes(word) || normFile.includes(word.slice(0, 4))) matchedWords++;
        }
        if (chapWords.length > 0 && matchedWords > 0) {
          const ratio = matchedWords / chapWords.length;
          if (ratio >= 0.4) {
            const score = 15 + matchedWords * 4;
            if (score > bestScore) {
              bestScore = score;
              bestChapter = chap.name;
            }
          }
        }
      }
    }

    // 6. Estimate question count and duration
    const questionRegex = /(?:^|\n)\s*(?:Q(?:uestion)?\.?\s*\d+|\b\d{1,3}\s*[:.\-\]\)])/g;
    const qMatches = rawText.match(questionRegex) || [];
    const questionCountEstimate = Math.max(qMatches.length, 1);

    let recommendedDurationMinutes = 45;
    if (questionCountEstimate <= 10) {
      recommendedDurationMinutes = 30;
    } else if (questionCountEstimate <= 18) {
      recommendedDurationMinutes = 45;
    } else {
      recommendedDurationMinutes = 60;
    }

    const subjectDisplay = detectedSubject.charAt(0).toUpperCase() + detectedSubject.slice(1);
    const titleParts: string[] = [];
    if (detectedInstitute) titleParts.push(detectedInstitute);
    titleParts.push(subjectDisplay);
    if (sheetName && sheetName !== 'Daily Practice Problem') {
      titleParts.push(sheetName);
    } else {
      titleParts.push('DPP');
    }
    if (bestChapter && bestChapter !== 'General Concept Drill') {
      titleParts.push(`- ${bestChapter}`);
    }
    const title = titleParts.join(' ');

    return {
      title: title || cleanFileName,
      sheetName,
      subject: detectedSubject,
      chapterName: bestChapter,
      recommendedDurationMinutes,
      questionCountEstimate,
      detectedInstitute,
      confidence: bestScore > 0 ? 'high' : 'medium'
    };
  }

  /**
   * Orchestrates DPP metadata analysis (local heuristic + optional server AI).
   */
  static async analyzeDppMetadata(
    file: File,
    availableChapters: { id?: string; name: string; subject?: string }[] = [],
    onProgress?: (status: string) => void,
    preExtractedText?: string
  ): Promise<DppMetadataAnalysis> {
    let rawText = preExtractedText || '';
    if (!rawText) {
      onProgress?.('Extracting text for AI metadata detection...');
      try {
        rawText = await PdfTextExtractor.extractTextFromPDF(file, onProgress);
      } catch (e) {
        console.warn('Text extraction warning during DPP metadata analysis:', e);
      }
    }

    const cleanFileName = this.cleanDppFileName(file.name);

    const hasSufficientText = Boolean(rawText && rawText.trim().length >= 150);
    let pdfBase64: string | undefined;
    // Only encode and transmit multi-megabyte PDF if document lacks selectable text (scanned PDF)
    if (!hasSufficientText) {
      try {
        pdfBase64 = await PdfTextExtractor.fileToBase64(file);
      } catch (e) {
        console.warn('Could not convert PDF to base64 for metadata analysis:', e);
      }
    }

    const localResult = this.heuristicAnalyzeDppMetadata(cleanFileName, rawText, availableChapters);

    if (typeof navigator === 'undefined' || navigator.onLine) {
      let timeoutId: any;
      try {
        let token: string | undefined;
        try {
          token = await auth.currentUser?.getIdToken();
        } catch {
          // guest mode
        }

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const storedKey = this.getStoredGeminiKey();
        if (storedKey) headers['x-gemini-api-key'] = storedKey;

        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 90000);

        onProgress?.('Running AI metadata analysis...');
        const response = await fetch('/api/mocktest/analyze-dpp-metadata', {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: JSON.stringify({
            rawText: (rawText || '').substring(0, 3500),
            fileName: file.name,
            pdfBase64: hasSufficientText ? undefined : pdfBase64,
            chapterNames: availableChapters.map(c => c.name)
          })
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const aiData = await response.json();
          if (aiData && aiData.title) {
            const cleanInstitute = (aiData.detectedInstitute && typeof aiData.detectedInstitute === 'string' && aiData.detectedInstitute !== 'null' && aiData.detectedInstitute !== 'undefined' && aiData.detectedInstitute.trim() !== '')
              ? aiData.detectedInstitute.trim()
              : (localResult.detectedInstitute && localResult.detectedInstitute !== 'null' ? localResult.detectedInstitute : undefined);
            return {
              title: aiData.title || localResult.title,
              sheetName: aiData.sheetName || localResult.sheetName,
              subject: (aiData.subject === 'chemistry' || aiData.subject === 'maths' || aiData.subject === 'physics')
                ? aiData.subject
                : localResult.subject,
              chapterName: aiData.chapterName || localResult.chapterName,
              recommendedDurationMinutes: aiData.recommendedDurationMinutes || localResult.recommendedDurationMinutes,
              questionCountEstimate: aiData.questionCountEstimate || localResult.questionCountEstimate,
              detectedInstitute: cleanInstitute,
              confidence: 'high'
            };
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          console.warn('[DppMetadataAnalyzer] AI metadata analysis timed out, using smart local heuristic.');
        } else {
          console.warn('Server AI metadata extraction unavailable, using smart local heuristic:', err);
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    }

    return localResult;
  }
}
