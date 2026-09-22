import { describe, it, expect } from 'vitest';
import { NeuralGraphEngine } from './NeuralGraphEngine';
import { Chapter } from '../types/index';

describe('NeuralGraphEngine (BUG-12: DPP Fallback & Accuracy Mapping)', () => {
  it('correctly maps dppDone to chapter.dppComplete when telemetry is missing, NOT theoryComplete', () => {
    const chapterTheoryOnly: Chapter = {
      id: 'p-wave-optics',
      name: 'Wave Optics',
      subject: 'physics',
      status: 'Learning',
      completion: 40,
      totalLectures: 6,
      currentLecture: 6,
      theoryComplete: true, // Theory completed
      dppComplete: false,   // DPP NOT done
      pyqsComplete: false,
      confidence: 50
    } as any;

    const { nodes } = NeuralGraphEngine.generateGraph(
      [chapterTheoryOnly],
      'physics',
      {},
      'flow',
      null
    );

    expect(nodes.length).toBe(1);
    const nodeData = nodes[0].data;

    // Must be false because dppComplete is false (previously bug was falling back to theoryComplete which was true)
    expect(nodeData.dppDone).toBe(false);
  });

  it('correctly assigns accuracyPercent from actual accuracy/confidence instead of DPP completion %', () => {
    const chapterWithQuizAccuracy: Chapter = {
      id: 'p-modern-physics',
      name: 'Modern Physics',
      subject: 'physics',
      status: 'Learning',
      completion: 80,
      totalLectures: 8,
      currentLecture: 8,
      theoryComplete: true,
      dppComplete: true,
      pyqsComplete: true,
      confidence: 40,
      practiceProgress: {
        accuracyPercent: 72,
        dppPercent: 100,
        pyqPercent: 100
      } as any
    } as any;

    const { nodes } = NeuralGraphEngine.generateGraph(
      [chapterWithQuizAccuracy],
      'physics',
      {},
      'flow',
      null
    );

    expect(nodes.length).toBe(1);
    const nodeData = nodes[0].data;

    // Must reflect the student's actual accuracy (72), not 100% DPP progress
    expect(nodeData.accuracyPercent).toBe(72);
  });
});
