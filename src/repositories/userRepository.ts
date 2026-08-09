import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { UserProfile } from '@/types/index';

function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'number' && Number.isNaN(obj)) return 0;
  if (Array.isArray(obj)) {
    const hasNestedArray = obj.some(item => Array.isArray(item));
    if (hasNestedArray) {
      const objRepresentation: Record<string, any> = {};
      obj.forEach((item, index) => {
        objRepresentation[index.toString()] = sanitizeForFirestore(item);
      });
      return objRepresentation;
    }
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
