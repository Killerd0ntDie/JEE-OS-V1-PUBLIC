import { Chapter } from '@/types/index';
import { Node, Edge } from '@xyflow/react';
import { ChapterTelemetry } from '../chapterInfo/types';

export type NeuralGraphMode = 'flow' | 'decay' | 'weightage';

export interface NeuralNodeData extends Record<string, unknown> {
  id: string;
  label: string;
  subject: string;
  unit: string;
  status: 'Mastered' | 'Completed' | 'In Progress' | 'Not Started';
  stage: string;
  masteryScore: number;
  retentionScore: number;
  lastRevisedDaysAgo: number;
  needRevision: boolean;
  isDecaying: boolean;
  isHighWeightage: boolean;
  weightage: number;
  completedLectures: number;
  totalLectures: number;
  dppDone: boolean;
  pyqsDone: boolean;
  accuracyPercent: number;
  graphMode: NeuralGraphMode;
  isSelected?: boolean;
}

export class NeuralGraphEngine {
  /**
   * Generates a balanced, 4-column horizontal learning matrix for the Neural Link map.
   * Matches standard 16:9 aspect ratio screens perfectly so nodes render crisp, large, and readable.
   */
  public static generateGraph(
    chapters: Chapter[], 
    activeSubject: 'physics' | 'chemistry' | 'maths', 
    telemetryMap: Record<string, ChapterTelemetry> = {},
    graphMode: NeuralGraphMode = 'flow',
    selectedChapterId: string | null = null
  ): { nodes: Node[], edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    const subjectColors = {
      physics: { stroke: '#38bdf8', glow: 'rgba(56, 189, 248, 0.4)' }, // Sky
      chemistry: { stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' }, // Emerald
      maths: { stroke: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' }, // Violet
    };

    const subjectChapters = chapters.filter(c => c.subject === activeSubject);

    const COLS = 4;
    const X_SPACING = 310;
    const Y_SPACING = 135;
    const START_X = 50;
    const START_Y = 40;

    let prevNodeId: string | null = null;

    subjectChapters.forEach((chapter, index) => {
      const col = index % COLS;
      const row = Math.floor(index / COLS);

      const x = START_X + col * X_SPACING;
      const y = START_Y + row * Y_SPACING;

      const nodeId = `node-${chapter.id}`;
      const telemetry = telemetryMap[chapter.id];
      
      let uiStatus: 'Mastered' | 'Completed' | 'In Progress' | 'Not Started' = 'Not Started';
      const stage = telemetry?.syllabusStage || 'Not Started';
      
      if (stage === 'Mastered') {
        uiStatus = 'Mastered';
      } else if (stage === 'In Progress' || chapter.status === 'Learning' || chapter.status === 'DPP Pending' || chapter.status === 'PYQ Pending') {
        uiStatus = chapter.completion > 60 ? 'Completed' : 'In Progress';
      }

      const lastRevisedDaysAgo = chapter.lastRevisionDaysAgo ?? 0;
      const needRevision = chapter.retentionStatus === 'Fading' || chapter.retentionStatus === 'Forgotten' || (lastRevisedDaysAgo > 14 && uiStatus !== 'Not Started');
      const isDecaying = needRevision;
      const weightage = chapter.weightage || telemetry?.weightagePercent || 4;
      const isHighWeightage = weightage >= 6;

      const data: NeuralNodeData = {
        id: chapter.id,
        label: chapter.name,
        subject: chapter.subject,
        unit: chapter.unit || 'Core Module',
        status: uiStatus,
        stage,
        masteryScore: telemetry?.masteryScore || chapter.completion || 0,
        retentionScore: chapter.retentionScore || 100,
        lastRevisedDaysAgo,
        needRevision,
        isDecaying,
        isHighWeightage,
        weightage,
        completedLectures: telemetry?.currentLecture ?? chapter.currentLecture ?? 0,
        totalLectures: telemetry?.totalLectures ?? chapter.totalLectures ?? 8,
        dppDone: telemetry?.dppComplete ?? chapter.theoryComplete ?? false,
        pyqsDone: telemetry?.pyqsComplete ?? chapter.pyqsComplete ?? false,
        accuracyPercent: telemetry?.strategyRadar?.dppCompletionPercent || chapter.confidence || 0,
        graphMode,
        isSelected: selectedChapterId === chapter.id
      };

      nodes.push({
        id: nodeId,
        position: { x, y },
        data,
        type: 'topicNode',
      });

      // Connect sequential syllabus progression with glowing energy edges
      if (prevNodeId) {
        const isEnergyActive = uiStatus === 'Mastered' || uiStatus === 'Completed';
        const color = subjectColors[activeSubject];

        edges.push({
          id: `edge-${prevNodeId}-${nodeId}`,
          source: prevNodeId,
          target: nodeId,
          type: 'animatedEnergyEdge',
          animated: isEnergyActive,
          style: { 
            stroke: isEnergyActive ? color.stroke : '#3f3f46',
            strokeWidth: isEnergyActive ? 2 : 1,
            opacity: isEnergyActive ? 0.9 : 0.25
          },
          data: { isActive: isEnergyActive, subject: activeSubject }
        });
      }

      prevNodeId = nodeId;
    });

    return { nodes, edges };
  }
}
