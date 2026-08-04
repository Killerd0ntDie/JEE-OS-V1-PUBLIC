import { Chapter } from '@/types/index';
import { Node, Edge } from '@xyflow/react';

export class NeuralGraphEngine {
  /**
   * Generates a deterministic, interconnected graph of chapters for the Neural Link map.
   * Groups chapters by subject and creates a linear logical flow for V1.
   */
  public static generateGraph(chapters: Chapter[], activeSubject: 'physics' | 'chemistry' | 'maths', telemetryMap: Record<string, any> = {}): { nodes: Node[], edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    const subjectColors = {
      physics: { stroke: '#38bdf8', glow: 'rgba(56, 189, 248, 0.4)' }, // Sky
      chemistry: { stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' }, // Emerald
      maths: { stroke: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' }, // Violet
    };

    const X_SPACING = 350;
    const Y_SPACING = 150;
    const START_X = 100;
    const START_Y = 100;

    const subjectChapters = chapters.filter(c => c.subject === activeSubject);

    let prevNodeId: string | null = null;
    let yOffset = START_Y;
    let xOffset = START_X;

    subjectChapters.forEach((chapter, index) => {
      const nodeId = `node-${chapter.id}`;
      const telemetry = telemetryMap[chapter.id];
      
      // Wrap to next line every 5 chapters to keep graph compact
      if (index > 0 && index % 5 === 0) {
        yOffset += Y_SPACING;
        xOffset = START_X;
      } else if (index > 0) {
        xOffset += X_SPACING;
      }

      let uiStatus = 'Not Started';
      const stage = telemetry?.syllabusStage || 'Not Started';
      
      if (stage === 'Mastered') {
        uiStatus = 'Mastered';
      } else if (['Revision', 'Solving PYQs', 'Solving Modules', 'Solving DPPs'].includes(stage)) {
        uiStatus = 'Completed';
      } else if (['Watching Lectures', 'Making Notes', 'Doing Questions'].includes(stage)) {
        uiStatus = 'In Progress';
      }

      const data = {
        label: chapter.name,
        status: uiStatus,
        subject: chapter.subject,
        id: chapter.id,
        masteryScore: telemetry?.masteryScore || 0
      };

      nodes.push({
        id: nodeId,
        position: { x: xOffset, y: yOffset },
        data,
        type: 'topicNode',
      });

      if (prevNodeId) {
        const isActive = uiStatus === 'Mastered' || uiStatus === 'Completed';
        const color = subjectColors[activeSubject];

        edges.push({
          id: `edge-${prevNodeId}-${nodeId}`,
          source: prevNodeId,
          target: nodeId,
          type: 'animatedEnergyEdge',
          animated: true,
          style: { 
            stroke: isActive ? color.stroke : '#27272a',
            strokeWidth: isActive ? 2 : 1,
            opacity: isActive ? 0.8 : 0.2
          },
          data: { isActive, subject: activeSubject }
        });
        }

        prevNodeId = nodeId;
    });

    return { nodes, edges };
  }
}
