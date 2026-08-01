import { Question, PYQBank } from '@/types/curriculum';

export class PyqEngine {
  private static pyqDatabase: Question[] | null = null;
  private static isFetching = false;
  private static fetchPromise: Promise<void> | null = null;

  private static async loadDatabase(): Promise<void> {
    if (this.pyqDatabase) return;
    if (this.fetchPromise) return this.fetchPromise;

    this.isFetching = true;
    this.fetchPromise = (async () => {
      try {
        const res = await fetch('/data/pyqs.json');
        if (!res.ok) {
          throw new Error(`Failed to fetch pyqs.json: ${res.statusText}`);
        }
        const data: PYQBank = await res.json();
        this.pyqDatabase = data.questions || [];
      } catch (e) {
        console.error("Error loading PYQ database:", e);
        this.pyqDatabase = [];
      } finally {
        this.isFetching = false;
      }
    })();

    return this.fetchPromise;
  }

  /**
   * Fetches real PYQs for a given chapter and subject.
   * Shuffles and returns up to `count` questions.
   */
  static async getQuestions(chapterId: string, subject: string, count: number): Promise<Question[]> {
    await this.loadDatabase();

    if (!this.pyqDatabase) return [];

    // Filter by chapterId. We might also filter by subject just to be safe.
    const eligibleQuestions = this.pyqDatabase.filter(
      q => q.chapterId === chapterId && q.subject === subject
    );

    // Shuffle
    const shuffled = [...eligibleQuestions].sort(() => 0.5 - Math.random());

    return shuffled.slice(0, count);
  }
}
