import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase';
import { UserProfile } from '@/types/index';
import { sanitizeForFirestore } from '@/utils/firestoreSanitizer';

export const UserRepository = {
  // Fetch user profile document
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const userDoc = doc(db, 'users', userId);
    const snapshot = await getDoc(userDoc);
    if (snapshot.exists()) {
      return snapshot.data() as UserProfile;
    }
    return null;
  },

  // Save/Set complete user profile document
  async saveUserProfile(userId: string, profile: UserProfile): Promise<void> {
    const userDoc = doc(db, 'users', userId);
    await setDoc(userDoc, sanitizeForFirestore(profile), { merge: true });
  },

  // Partial update of the user profile document (uses setDoc merge for resilience)
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const userDoc = doc(db, 'users', userId);
    await setDoc(userDoc, sanitizeForFirestore(updates), { merge: true });
  },

  // Chunked batch deletion of user subcollections within repository boundary
  async resetAllUserData(userId: string, subcollections: string[]): Promise<void> {
    for (const colName of subcollections) {
      try {
        const colRef = collection(db, 'users', userId, colName);
        const snapshot = await getDocs(colRef);
        if (snapshot.size > 0) {
          const CHUNK_SIZE = 450;
          const docs = snapshot.docs;
          for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
            const chunk = docs.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(db);
            chunk.forEach(docSnap => {
              batch.delete(docSnap.ref);
            });
            await batch.commit();
          }
        }
      } catch (err) {
        console.error(`Error deleting collection ${colName}:`, err);
      }
    }
  },

  // Delete user profile document
  async deleteUser(userId: string): Promise<void> {
    const userDoc = doc(db, 'users', userId);
    await deleteDoc(userDoc);
  }
};
