import { collection, doc, getDocs, setDoc, updateDoc, writeBatch, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase';
import { MockResult } from '@/types/index';

export const MockResultRepository = {
  async getMockResults(userId: string): Promise<MockResult[]> {
    const mockCol = collection(db, 'users', userId, 'mockResults');
    const q = query(mockCol, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as MockResult);
  },

  async saveMockResult(userId: string, result: MockResult): Promise<void> {
    const mockDoc = doc(db, 'users', userId, 'mockResults', result.id);
    await setDoc(mockDoc, result, { merge: true });
  },

  async deleteMockResult(userId: string, resultId: string): Promise<void> {
    const mockDoc = doc(db, 'users', userId, 'mockResults', resultId);
    await deleteDoc(mockDoc);
  },

  async seedMockResults(userId: string, records: MockResult[]): Promise<void> {
    const batch = writeBatch(db);
    records.forEach(record => {
      const mockDoc = doc(db, 'users', userId, 'mockResults', record.id);
      batch.set(mockDoc, record);
    });
    await batch.commit();
  }
};
