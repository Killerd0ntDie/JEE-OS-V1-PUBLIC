import { collection, doc, getDocs, setDoc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Chapter } from '@/types/index';

/**
 * Recursively removes all undefined values from an object.
 * Firestore throws "Unsupported field value: undefined" if any nested field is undefined.
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned;
  }
  return obj;
}

export const ChapterRepository = {
  // Fetch chapters for a given user
  async getChapters(userId: string): Promise<Chapter[]> {
    const chaptersCol = collection(db, 'users', userId, 'chapters');
    const snapshot = await getDocs(chaptersCol);
    return snapshot.docs.map(doc => doc.data() as Chapter);
  },

  // Save/Update a single chapter document
  async saveChapter(userId: string, chapter: Chapter): Promise<void> {
    const chapDoc = doc(db, 'users', userId, 'chapters', chapter.id);
    await setDoc(chapDoc, sanitizeForFirestore(chapter), { merge: true });
  },

  // Partial update of a chapter document
  async updateChapter(userId: string, chapterId: string, updates: Partial<Chapter>): Promise<void> {
    const chapDoc = doc(db, 'users', userId, 'chapters', chapterId);
    await updateDoc(chapDoc, sanitizeForFirestore(updates));
  },

  // Seed the initial chapter database for a new user using a batch write
  async seedChapters(userId: string, initialChapters: Chapter[]): Promise<void> {
    const CHUNK_SIZE = 450;
    for (let i = 0; i < initialChapters.length; i += CHUNK_SIZE) {
      const chunk = initialChapters.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(chap => {
        const chapDoc = doc(db, 'users', userId, 'chapters', chap.id);
        batch.set(chapDoc, sanitizeForFirestore(chap));
      });
      await batch.commit();
    }
  },

  // Delete a chapter document
  async deleteChapter(userId: string, chapterId: string): Promise<void> {
    const chapDoc = doc(db, 'users', userId, 'chapters', chapterId);
    await deleteDoc(chapDoc);
  }
};
