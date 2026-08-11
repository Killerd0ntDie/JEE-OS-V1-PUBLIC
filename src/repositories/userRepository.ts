import { doc, getDoc, setDoc } from 'firebase/firestore';
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
  }
};
