import { BaseActions } from './BaseActions';
import { Note, SubjectId } from '@/types/index';
import { NoteRepository } from '@/repositories/noteRepository';

/**
 * Dedicated domain actions for managing Notes and Cockpit Memory Deck reflections.
 */
export class NoteActions extends BaseActions {
  async addNote(noteData: Omit<Note, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) {
    this.checkWriteBlock();
    const id = noteData.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
    const timestamp = noteData.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const newNote: Note = {
      ...noteData,
      id,
      timestamp,
      category: noteData.category || 'Quick Notes',
      subject: noteData.subject,
      chapter: noteData.chapter,
      chapterId: noteData.chapterId,
      tags: noteData.tags || []
    };

    const originalSnapshot = {
      notes: this.state.notes
    };

    const updatedNotes = [newNote, ...this.state.notes];
    this.runtime.updateStateOptimistic({ notes: updatedNotes });

    try {
      if (!this.isGuestUser()) {
        await NoteRepository.saveNote(this.userId, newNote);
      }
      await this.runtime.refresh('SESSION_UPDATE', { notes: updatedNotes, lastSyncError: null });
      return newNote;
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'addNote');
    }
  }

  async addProofOfWorkNote(params: {
    text: string;
    subject: SubjectId;
    chapter: string;
    chapterId?: string;
    missionId?: string;
    xpWager?: number;
  }) {
    const note = await this.addNote({
      text: params.text,
      category: 'Proof of Work',
      subject: params.subject,
      chapter: params.chapter,
      chapterId: params.chapterId,
      tags: ['ProofOfWork', 'Casino', params.subject]
    });

    const rewardText = params.xpWager ? ` (${Math.round(params.xpWager * 2.5)} XP Payout Verified)` : '';
    this.triggerToast('Proof of Work Saved', `Reflection saved to Cockpit Memory Deck${rewardText}`, 'success');
    return note;
  }

  async deleteNote(noteId: string) {
    this.checkWriteBlock();
    const originalSnapshot = {
      notes: this.state.notes
    };

    const updatedNotes = this.state.notes.filter(n => n.id !== noteId);
    this.runtime.updateStateOptimistic({ notes: updatedNotes });

    try {
      if (!this.isGuestUser()) {
        await NoteRepository.deleteNote(this.userId, noteId);
      }
      await this.runtime.refresh('SESSION_UPDATE', { notes: updatedNotes, lastSyncError: null });
      this.triggerToast('Note Deleted', 'Note removed from session memory deck', 'info');
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'deleteNote');
    }
  }
}
