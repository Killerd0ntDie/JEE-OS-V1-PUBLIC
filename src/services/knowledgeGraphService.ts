import { SubjectId } from '../types/index';
import { JEE_KNOWLEDGE_GRAPH, KnowledgeNode } from '../data/knowledgeGraph';

export const KnowledgeGraphService = {
  /**
   * Returns all nodes in the knowledge graph.
   */
  getAllNodes(): KnowledgeNode[] {
    return JEE_KNOWLEDGE_GRAPH;
  },

  /**
   * Returns a specific node by its ID.
   */
  getNode(id: string): KnowledgeNode | undefined {
    return JEE_KNOWLEDGE_GRAPH.find(node => node.id === id);
  },

  /**
   * Returns all nodes for a specific subject.
   */
  getSubjectNodes(subject: SubjectId): KnowledgeNode[] {
    return JEE_KNOWLEDGE_GRAPH.filter(node => node.subject === subject);
  },

  /**
   * Evaluates which nodes are unlocked given a list of completed node IDs.
   * A node is unlocked if ALL its prerequisites are in the completed list.
   */
  getUnlockedNodes(completedNodeIds: string[]): KnowledgeNode[] {
    const completedSet = new Set(completedNodeIds);
    return JEE_KNOWLEDGE_GRAPH.filter(node => 
      node.prerequisites.every(prereqId => completedSet.has(prereqId))
    );
  },

  /**
   * Gets the immediate next chapters that the user can study, 
   * which are unlocked but NOT yet completed.
   */
  getImmediateNextNodes(completedNodeIds: string[]): KnowledgeNode[] {
    const completedSet = new Set(completedNodeIds);
    const unlocked = this.getUnlockedNodes(completedNodeIds);
    return unlocked.filter(node => !completedSet.has(node.id));
  },

  /**
   * Topological sort of the knowledge graph (or a specific subject).
   * Useful for linear rendering or syllabus sequence ordering.
   */
  getTopologicalSort(subject?: SubjectId): KnowledgeNode[] {
    const nodes = subject ? this.getSubjectNodes(subject) : this.getAllNodes();
    
    const inDegree: Record<string, number> = {};
    const adjList: Record<string, string[]> = {};
    const nodeMap: Record<string, KnowledgeNode> = {};

    // Initialize structures
    nodes.forEach(node => {
      inDegree[node.id] = 0;
      adjList[node.id] = [];
      nodeMap[node.id] = node;
    });

    // Build graph
    nodes.forEach(node => {
      node.prerequisites.forEach(prereqId => {
        // Only consider prereqs that are in the filtered nodes
        if (nodeMap[prereqId]) {
          adjList[prereqId].push(node.id);
          inDegree[node.id]++;
        }
      });
    });

    // Kahn's Algorithm
    const queue: string[] = [];
    Object.keys(inDegree).forEach(id => {
      if (inDegree[id] === 0) queue.push(id);
    });

    const sorted: KnowledgeNode[] = [];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      sorted.push(nodeMap[currentId]);

      adjList[currentId].forEach(neighbor => {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) {
          queue.push(neighbor);
        }
      });
    }

    return sorted;
  },

  /**
   * Retrieves a path of recommended study from a given node.
   */
  getUnlockPath(startNodeId: string): KnowledgeNode[] {
    const path: KnowledgeNode[] = [];
    const visited = new Set<string>();
    
    const dfs = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const node = this.getNode(nodeId);
      if (node) {
        path.push(node);
        node.unlocks.forEach(dfs);
      }
    };
    
    dfs(startNodeId);
    return path;
  }
};
