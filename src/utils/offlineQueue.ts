export interface QueuedMutation {
  id: string;
  url: string;
  method: string;
  body: any;
  headers: Record<string, string>;
  timestamp: number;
}

const QUEUE_KEY = 'jeeos_offline_mutation_queue';

export const OfflineQueue = {
  getQueue(): QueuedMutation[] {
    try {
      const data = localStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to parse offline queue', e);
      return [];
    }
  },

  enqueue(mutation: Omit<QueuedMutation, 'id' | 'timestamp'>) {
    const queue = this.getQueue();
    const newEntry: QueuedMutation = {
      ...mutation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    queue.push(newEntry);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  dequeue(id: string) {
    const queue = this.getQueue();
    const newQueue = queue.filter(q => q.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
  },

  clear() {
    localStorage.removeItem(QUEUE_KEY);
  },

  async flushAll(): Promise<void> {
    const queue = this.getQueue();
    if (queue.length === 0) return;

    console.log(`Flushing ${queue.length} offline mutations...`);
    
    // Sort by timestamp to ensure chronological execution
    queue.sort((a, b) => a.timestamp - b.timestamp);

    for (const mutation of queue) {
      try {
        const res = await fetch(mutation.url, {
          method: mutation.method,
          headers: mutation.headers,
          body: mutation.body ? JSON.stringify(mutation.body) : undefined,
        });
        
        if (res.ok) {
          this.dequeue(mutation.id);
        } else {
          console.warn(`Failed to flush mutation ${mutation.id} (Status: ${res.status})`);
          // Stop flushing on first failure to maintain order and prevent cascaded issues
          break;
        }
      } catch (err) {
        console.error(`Network error flushing mutation ${mutation.id}`, err);
        break; // Stop flushing, wait for next online event
      }
    }
  }
};
