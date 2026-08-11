import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase';
import { TimelineBlock } from '@/types/index';
import { sanitizeForFirestore } from '@/utils/firestoreSanitizer';

export const TimelineRepository = {
  // Fetch custom timeline blocks
  async getCustomTimelineBlocks(userId: string): Promise<TimelineBlock[]> {
    const blocksCol = collection(db, 'users', userId, 'customTimelineBlocks');
    const snapshot = await getDocs(blocksCol);
    return snapshot.docs.map(doc => doc.data() as TimelineBlock);
  },

  // Save a block
  async saveTimelineBlock(userId: string, block: TimelineBlock): Promise<void> {
    const blockDoc = doc(db, 'users', userId, 'customTimelineBlocks', block.id);
    await setDoc(blockDoc, sanitizeForFirestore(block));
  },

  // Delete a block
  async deleteTimelineBlock(userId: string, blockId: string): Promise<void> {
    const blockDoc = doc(db, 'users', userId, 'customTimelineBlocks', blockId);
    await deleteDoc(blockDoc);
  },

  // Clear or bulk update
  async seedTimelineBlocks(userId: string, blocks: TimelineBlock[]): Promise<void> {
    const CHUNK_SIZE = 450;
    for (let i = 0; i < blocks.length; i += CHUNK_SIZE) {
      const chunk = blocks.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(block => {
        const blockDoc = doc(db, 'users', userId, 'customTimelineBlocks', block.id);
        batch.set(blockDoc, sanitizeForFirestore(block));
      });
      await batch.commit();
    }
  }
};
