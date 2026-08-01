import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase';
import { Note } from '@/types/index';

export const NoteRepository = {
  // Fetch all notes for a user
  async getNotes(userId: string): Promise<Note[]> {
    const notesCol = collection(db, 'users', userId, 'notes');
    const snapshot = await getDocs(notesCol);
    return snapshot.docs.map(doc => doc.data() as Note);
  },

  // Save a single note
  async saveNote(userId: string, note: Note): Promise<void> {
    const noteDoc = doc(db, 'users', userId, 'notes', note.id);
    await setDoc(noteDoc, note);
  },

  // Delete a note
  async deleteNote(userId: string, noteId: string): Promise<void> {
    const noteDoc = doc(db, 'users', userId, 'notes', noteId);
    await deleteDoc(noteDoc);
  },

  // Seed initial notes for a new user
  async seedNotes(userId: string, initialNotes: Note[]): Promise<void> {
    const batch = writeBatch(db);
    initialNotes.forEach(note => {
      const noteDoc = doc(db, 'users', userId, 'notes', note.id);
      batch.set(noteDoc, note);
    });
    await batch.commit();
  }
};
