import { collection, doc, getDocs, getDocsFromCache, setDoc, updateDoc, writeBatch, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase';
import { StudySession } from '@/types/index';
import { sanitizeForFirestore } from '@/utils/firestoreSanitizer';

export const StudySessionRepository = {
  // Fetch study sessions for a user
  async getStudySessions(userId: string, limitCount?: number): Promise<StudySession[]> {
    const sessionsCol = collection(db, 'users', userId, 'studySessions');
    let q = query(sessionsCol, orderBy('startTime', 'desc'));
    
    // Apply a default limit to prevent unbounded queries
    q = query(q, limit(limitCount || 50));
    
    let snapshot;
    try {
      snapshot = await getDocsFromCache(q);
      if (snapshot.empty) throw new Error("Cache miss");
    } catch (error) {
      snapshot = await getDocs(q);
    }
    return snapshot.docs.map(doc => doc.data() as StudySession);
  },

  // Save/Update a study session
  async saveStudySession(userId: string, session: StudySession): Promise<void> {
    const sessionDoc = doc(db, 'users', userId, 'studySessions', session.id);
    await setDoc(sessionDoc, sanitizeForFirestore(session), { merge: true });
  },

  // Partial update of a study session
  async updateStudySession(userId: string, sessionId: string, updates: Partial<StudySession>): Promise<void> {
    const sessionDoc = doc(db, 'users', userId, 'studySessions', sessionId);
    await updateDoc(sessionDoc, sanitizeForFirestore(updates));
  },

  // Delete a study session
  async deleteStudySession(userId: string, sessionId: string): Promise<void> {
    const sessionDoc = doc(db, 'users', userId, 'studySessions', sessionId);
    await deleteDoc(sessionDoc);
  },

  // Batch insert study sessions
  async seedStudySessions(userId: string, sessions: StudySession[]): Promise<void> {
    const CHUNK_SIZE = 450;
    for (let i = 0; i < sessions.length; i += CHUNK_SIZE) {
      const chunk = sessions.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(session => {
        const sessionDoc = doc(db, 'users', userId, 'studySessions', session.id);
        batch.set(sessionDoc, sanitizeForFirestore(session));
      });
      await batch.commit();
    }
  }
};
