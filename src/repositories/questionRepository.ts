import { collection, doc, getDocs, getDocsFromCache, setDoc, query, where, writeBatch, limit } from 'firebase/firestore';
import { db } from '@/firebase';
import { Question } from '@/types/curriculum';

const COLLECTION = 'pyq_bank';

export const QuestionRepository = {
  COLLECTION,

  /**
   * Fetch all questions for a specific chapter (with deduplication)
   */
  async getQuestionsByChapter(chapterId: string, userId?: string): Promise<Question[]> {
    try {
      const qRef = collection(db, COLLECTION);
      const q = query(qRef, where("chapterId", "==", chapterId), limit(100)); // Hard limit for safety
      
      let snapshot;
      try {
        snapshot = await getDocsFromCache(q);
        if (snapshot.empty) throw new Error("Cache miss");
      } catch (error) {
        snapshot = await getDocs(q);
      }
      
      const questions: Question[] = [];
      const seenIds = new Set<string>();
      
      snapshot.forEach(docSnap => {
        const docId = docSnap.id;
        // Prevent duplicate questions
        if (!seenIds.has(docId)) {
          seenIds.add(docId);
          questions.push({ id: docId, ...docSnap.data() } as Question);
        }
      });

      // Also merge user's customQuestions if userId is present
      if (userId && userId !== 'guest') {
        try {
          const userQRef = collection(db, 'users', userId, 'customQuestions');
          const userQQuery = query(userQRef, where("chapterId", "==", chapterId), limit(100));
          const userSnap = await getDocs(userQQuery);
          userSnap.forEach(docSnap => {
            const docId = docSnap.id;
            if (!seenIds.has(docId)) {
              seenIds.add(docId);
              questions.push({ id: docId, ...docSnap.data() } as Question);
            }
          });
        } catch (e) {
          console.warn("[QuestionRepository] Could not fetch user custom questions:", e);
        }
      }
      
      return questions;
    } catch (error) {
      console.error("Error fetching questions:", error);
      return [];
    }
  },

  /**
   * Save a single question to the cloud database
   */
  async saveQuestion(question: Question, userId?: string): Promise<void> {
    try {
      const docRef = (userId && userId !== 'guest')
        ? doc(db, 'users', userId, 'customQuestions', question.id)
        : doc(db, COLLECTION, question.id);
      await setDoc(docRef, question);
    } catch (error) {
      console.error("Error saving question:", error);
      throw error;
    }
  },

  /**
   * Batch save multiple questions (Useful for scraper or AI practice integration)
   */
  async saveQuestionsBatch(questions: Question[], userId?: string): Promise<void> {
    try {
      const CHUNK_SIZE = 450;
      for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
        const chunk = questions.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        
        chunk.forEach(q => {
          const docRef = (userId && userId !== 'guest')
            ? doc(db, 'users', userId, 'customQuestions', q.id)
            : doc(db, COLLECTION, q.id);
          batch.set(docRef, q);
        });
        
        await batch.commit();
      }
    } catch (error) {
      console.error("Error batch saving questions:", error);
      throw error;
    }
  },

  /**
   * Seed initial database if empty for testing (non-fatal if permissions restrict client write)
   */
  async seedInitialDatabase(questions: Question[]): Promise<void> {
    try {
      const qRef = collection(db, COLLECTION);
      const existing = await getDocs(query(qRef, limit(1)));
      if (existing.empty) {
        console.log("Database empty. Seeding Golden Questions to Firestore...");
        await this.saveQuestionsBatch(questions);
        console.log("Seeding complete.");
      }
    } catch (e) {
      console.warn("[QuestionRepository] seedInitialDatabase skipped (expected when client writes to pyq_bank are restricted):", e);
    }
  }
};
