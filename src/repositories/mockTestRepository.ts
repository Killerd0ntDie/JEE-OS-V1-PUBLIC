import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { MockTest } from '@/types/mockTest';
import { sanitizeForFirestore } from '@/utils/firestoreSanitizer';

export const MockTestRepository = {
  async getCustomMockTests(userId: string): Promise<MockTest[]> {
    const mockCol = collection(db, 'users', userId, 'customMockTests');
    const snapshot = await getDocs(mockCol);
    return snapshot.docs.map(doc => doc.data() as MockTest);
  },

  async saveCustomMockTest(userId: string, test: MockTest): Promise<void> {
    const mockDoc = doc(db, 'users', userId, 'customMockTests', test.id);
    const sanitized = sanitizeForFirestore(test);
    await setDoc(mockDoc, sanitized, { merge: true });
  },

  async deleteCustomMockTest(userId: string, testId: string): Promise<void> {
    const mockDoc = doc(db, 'users', userId, 'customMockTests', testId);
    await deleteDoc(mockDoc);
  }
};
