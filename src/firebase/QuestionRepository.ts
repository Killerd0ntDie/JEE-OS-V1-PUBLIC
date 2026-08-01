import { collection, doc, getDocs, getDoc, setDoc, query, where, writeBatch } from 'firebase/firestore';
import { db } from './index';
import { Question } from '@/types/curriculum';

export class QuestionRepository {
  private static COLLECTION = 'pyq_bank';

  /**
   * Fetch all questions for a specific chapter (with deduplication)
   */
  static async getQuestionsByChapter(chapterId: string): Promise<Question[]> {
    try {
      const qRef = collection(db, this.COLLECTION);
      const q = query(qRef, where("chapterId", "==", chapterId));
      const snapshot = await getDocs(q);
      
      const questions: Question[] = [];
      const seenIds = new Set<string>();
      
      snapshot.forEach(doc => {
        const docId = doc.id;
        // Prevent duplicate questions
        if (!seenIds.has(docId)) {
          seenIds.add(docId);
          questions.push({ id: docId, ...doc.data() } as Question);
        }
      });
      
      return questions;
    } catch (error) {
      console.error("Error fetching questions:", error);
      return [];
    }
  }

  /**
   * Save a single question to the cloud database
   */
  static async saveQuestion(question: Question): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, question.id);
      await setDoc(docRef, question);
    } catch (error) {
      console.error("Error saving question:", error);
      throw error;
    }
  }

  /**
   * Batch save multiple questions (Useful for the scraper integration)
   */
  static async saveQuestionsBatch(questions: Question[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      questions.forEach(q => {
        const docRef = doc(db, this.COLLECTION, q.id);
        batch.set(docRef, q);
      });
      
      await batch.commit();
    } catch (error) {
      console.error("Error batch saving questions:", error);
      throw error;
    }
  }

  /**
   * INTERNAL USE: Seed initial database if empty for testing
   */
  static async seedInitialDatabase(questions: Question[]): Promise<void> {
    const existing = await getDocs(collection(db, this.COLLECTION));
    if (existing.empty) {
      console.log("Database empty. Seeding Golden Questions to Firestore...");
      await this.saveQuestionsBatch(questions);
      console.log("Seeding complete.");
    }
  }
}
