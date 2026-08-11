import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase';
import { Mistake } from '@/types/index';
import { sanitizeForFirestore } from '@/utils/firestoreSanitizer';

export const MistakeRepository = {
  // Fetch all mistakes for a user
  async getMistakes(userId: string): Promise<Mistake[]> {
    const mistakesCol = collection(db, 'users', userId, 'mistakes');
    const snapshot = await getDocs(mistakesCol);
    return snapshot.docs.map(doc => doc.data() as Mistake);
  },

  // Save/Update a single mistake
  async saveMistake(userId: string, mistake: Mistake): Promise<void> {
    const mistakeDoc = doc(db, 'users', userId, 'mistakes', mistake.id);
    await setDoc(mistakeDoc, sanitizeForFirestore(mistake), { merge: true });
  },

  // Partial update of a mistake
  async updateMistake(userId: string, mistakeId: string, updates: Partial<Mistake>): Promise<void> {
    const mistakeDoc = doc(db, 'users', userId, 'mistakes', mistakeId);
    await updateDoc(mistakeDoc, sanitizeForFirestore(updates));
  },

  // Delete a mistake
  async deleteMistake(userId: string, mistakeId: string): Promise<void> {
    const mistakeDoc = doc(db, 'users', userId, 'mistakes', mistakeId);
    await deleteDoc(mistakeDoc);
  },

  // Seed initial mistakes
  async seedMistakes(userId: string, initialMistakes: Mistake[]): Promise<void> {
    const CHUNK_SIZE = 450;
    for (let i = 0; i < initialMistakes.length; i += CHUNK_SIZE) {
      const chunk = initialMistakes.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(mistake => {
        const mistakeDoc = doc(db, 'users', userId, 'mistakes', mistake.id);
        batch.set(mistakeDoc, sanitizeForFirestore(mistake));
      });
      await batch.commit();
    }
  }
};
