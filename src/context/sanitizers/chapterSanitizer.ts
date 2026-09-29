import { Chapter } from '@/types/index';
import { normalizeChapter } from '@jee-os/engines';

/**
 * Validates and sanitizes raw chapter records received from persistence or remote Firestore.
 * Ensures all required fields, telemetry flags, and numeric properties are properly typed.
 */
export const validateAndSanitizeChapters = (chaps: any[]): Chapter[] => {
  if (!Array.isArray(chaps)) {
    throw new Error("Chapters database corruption: Chapters data is not an array");
  }
  return chaps.map((c, index) => {
    if (!c || typeof c !== 'object') {
      throw new Error(`Chapters database corruption: Chapter entry at index ${index} is invalid`);
    }
    if (!c.id || typeof c.id !== 'string') {
      throw new Error(`Chapters database corruption: Chapter entry at index ${index} is missing a valid string ID`);
    }
    if (!c.name || typeof c.name !== 'string') {
      throw new Error(`Chapters database corruption: Chapter with ID '${c.id}' has an invalid or missing name`);
    }
    
    const rawChap: Chapter = {
      id: c.id,
      subject: c.subject || 'physics',
      unit: c.unit || 'General',
      name: c.name,
      hasTelemetry: !!c.hasTelemetry,
      completion: typeof c.completion === 'number' ? c.completion : 0,
      currentLecture: c.hasTelemetry ? (typeof c.currentLecture === 'number' ? c.currentLecture : 0) : 0,
      totalLectures: c.hasTelemetry ? (typeof c.totalLectures === 'number' ? c.totalLectures : 10) : 0,
      theoryComplete: !!c.theoryComplete,
      dppComplete: !!c.dppComplete,
      pyqsComplete: !!c.pyqsComplete,
      formulaComplete: !!c.formulaComplete,
      revisionCount: typeof c.revisionCount === 'number' ? c.revisionCount : 0,
      difficulty: c.difficulty || 'Medium',
      confidence: typeof c.confidence === 'number' ? c.confidence : 0,
      estimatedRemainingTime: c.hasTelemetry ? (typeof c.estimatedRemainingTime === 'number' ? c.estimatedRemainingTime : 0) : 0,
      priority: (c.priority === 1 || c.priority === 2 || c.priority === 3) ? c.priority : 2,
      dependencies: Array.isArray(c.dependencies) ? c.dependencies : [],
      weightage: (typeof c.weightage === 'number' && c.weightage > 1) ? c.weightage : (typeof c.weightage === 'number' ? c.weightage : 3),
      weaknessScore: typeof c.weaknessScore === 'number' ? c.weaknessScore : 0,
      status: c.status || 'Not Started',
      solvedQuestions: typeof c.solvedQuestions === 'number' ? c.solvedQuestions : 0,
      lastRevisionDaysAgo: typeof c.lastRevisionDaysAgo === 'number' ? c.lastRevisionDaysAgo : 0,
      syllabusStage: c.syllabusStage,
      lectureProgress: c.hasTelemetry ? c.lectureProgress : undefined,
      practiceProgress: c.hasTelemetry ? c.practiceProgress : undefined,
      revisionProgress: c.revisionProgress,
      revisionStage: c.revisionStage || 'Theory Complete',
      healthScore: typeof c.healthScore === 'number' ? c.healthScore : 100,
      retentionScore: typeof c.retentionScore === 'number' ? c.retentionScore : 100,
      retentionStatus: c.retentionStatus || 'Fresh',
      nextRevisionDueAt: c.nextRevisionDueAt || new Date().toISOString(),
      lastRevisedAt: c.lastRevisedAt || new Date().toISOString(),
      serialNumber: c.serialNumber,
      chapterOnHold: !!c.chapterOnHold,
      dppOnHold: !!c.dppOnHold,
      pyqOnHold: !!c.pyqOnHold,
      revisionOnHold: !!c.revisionOnHold,
      isCustom: !!c.isCustom,
    };

    return normalizeChapter(rawChap);
  });
};
