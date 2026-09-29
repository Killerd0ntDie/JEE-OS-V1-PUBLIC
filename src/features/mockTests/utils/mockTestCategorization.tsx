
import { MockTest } from '@/types/mockTest';
import { SubjectId } from '@/types';
import { InlineMath } from 'react-katex';

export type MockTestEngineState = 'LANDING' | 'ARENA' | 'EVALUATING';
export type MockTabMode = 'available' | 'history';
export type MockCategoryShelf = 'all' | 'grand' | 'sprint' | 'dpp';
export type MockNavCategory = 'full_tests' | 'pyq' | 'physics' | 'chemistry' | 'maths' | 'history';

// Categorization helper for test organization
export function getMockTestCategory(test: MockTest): 'grand' | 'sprint' | 'dpp' {
  if (test.category) {
    if (test.category === 'grand' || test.category === 'pyq') return 'grand';
    if (test.category === 'dpp' || test.category === 'chapter') return 'dpp';
    if (test.category === 'sprint') return 'sprint';
  }

  if (test.source === 'dpp' || test.chapterId || test.chapterName) {
    return 'dpp';
  }

  const totalQuestions = test.sections.reduce((acc, s) => acc + s.questions.length, 0);
  const nameLower = (test.name || '').toLowerCase();
  
  // Check if test spans multiple distinct subjects (true multi-subject grand full test)
  const distinctSubjects = new Set(test.sections.map(s => s.subject));
  const isMultiSubject = distinctSubjects.size > 1;

  if (
    isMultiSubject ||
    (totalQuestions >= 70 && test.durationMinutes >= 150) || 
    (test.totalMarks >= 250) ||
    nameLower.includes('grand') || 
    nameLower.includes('all-india') ||
    (nameLower.includes('full') && (isMultiSubject || totalQuestions >= 60)) || 
    (nameLower.includes('shift') && isMultiSubject)
  ) {
    return 'grand';
  }

  if (
    nameLower.includes('dpp') || 
    nameLower.includes('daily') || 
    nameLower.includes('worksheet') || 
    nameLower.includes('chapter') || 
    nameLower.includes('drill') || 
    totalQuestions <= 20
  ) {
    return 'dpp';
  }

  return 'sprint';
}

// Check if a test belongs to a specific chapter (Strictly excludes Grand Full Tests)
export function isTestForChapter(test: MockTest, chapterName: string, subject?: SubjectId, chapterId?: string): boolean {
  if (!chapterName) return false;
  
  // Direct chapterId match
  if (chapterId && test.chapterId && test.chapterId === chapterId) {
    return true;
  }

  // True multi-subject grand full tests are full exam simulations, NOT chapter tests
  const distinctSubjects = new Set(test.sections.map(s => s.subject));
  if (distinctSubjects.size > 1) {
    return false;
  }

  const cat = getMockTestCategory(test);
  if (cat === 'grand') {
    return false;
  }

  const target = chapterName.toLowerCase().trim();
  const testName = (test.name || '').toLowerCase().trim();
  const testChap = (test.chapterName || '').toLowerCase().trim();
  
  // Direct chapter name matches
  if (testChap && (testChap === target || testChap.includes(target) || target.includes(testChap))) {
    return true;
  }

  // Explicit test name match
  if (testName.includes(target)) return true;

  // Significant token fuzzy match (e.g. "Rotational Motion" -> ["rotational", "motion"])
  const cleanTokens = (s: string) => s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3 && !['and', 'the', 'for', 'with', 'chapter', 'test', 'dpp', 'mock', 'drill', 'mastery'].includes(t));

  const targetTokens = cleanTokens(chapterName);
  if (targetTokens.length > 0) {
    const testTokens = cleanTokens(test.name + ' ' + (test.chapterName || ''));
    const matchedCount = targetTokens.filter(tok => testTokens.some(tt => tt.includes(tok) || tok.includes(tt))).length;
    if (matchedCount === targetTokens.length || (targetTokens.length >= 2 && matchedCount >= targetTokens.length - 1)) {
      return true;
    }
  }
  
  // Section questions match
  return test.sections.some(sec => {
    if (subject && sec.subject && sec.subject !== subject) return false;
    return sec.questions.some(q => {
      const qChap = (q.chapter || '').toLowerCase().trim();
      const qTopic = (q.topic || '').toLowerCase().trim();
      if (!qChap && !qTopic) return false;
      if (qChap && (qChap === target || qChap.includes(target) || (qChap.length >= 4 && target.includes(qChap)))) return true;
      if (qTopic && (qTopic === target || qTopic.includes(target) || (qTopic.length >= 4 && target.includes(qTopic)))) return true;
      
      // Token match on question chapter/topic
      if (targetTokens.length > 0) {
        const qTokens = cleanTokens(qChap + ' ' + qTopic);
        const matched = targetTokens.filter(tok => qTokens.some(qt => qt.includes(tok) || tok.includes(qt))).length;
        if (matched === targetTokens.length || (targetTokens.length >= 2 && matched >= targetTokens.length - 1)) {
          return true;
        }
      }
      return false;
    });
  });
}

// Helper to render text with inline math: parses text replacing $math$ with <InlineMath math="math"/>
export const renderMathText = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(\$.*?\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith('$') && part.endsWith('$')) {
      const math = part.slice(1, -1);
      return <InlineMath key={i} math={math} />;
    }
    return <span key={i}>{part}</span>;
  });
};
