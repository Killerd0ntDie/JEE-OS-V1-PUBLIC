import { BaseActions } from './BaseActions';
import { TimelineBlock } from '@/types/index';
import { TimelineRepository } from '@/repositories/timelineRepository';
import { UserRepository } from '@/repositories/userRepository';

export class TimelineActions extends BaseActions {
  public onCompleteTask?: (taskId: string) => Promise<void>;

  async toggleTimelineBlockComplete(blockId: string) {
    this.checkWriteBlock();
    if (blockId.startsWith('mission-')) {
      const taskId = blockId.replace('mission-', '');
      if (this.onCompleteTask) {
        await this.onCompleteTask(taskId);
      }
      return;
    }
    const block = this.state.timeline.find(b => b.id === blockId);
    if (!block) return;
    const updatedBlock = { ...block, completed: !block.completed };
    const originalSnapshot = {
      timeline: this.state.timeline
    };
    const updatedBlocks = this.state.timeline.map(b => b.id === blockId ? updatedBlock : b);
    this.runtime.updateStateOptimistic({ timeline: updatedBlocks });
    try {
      await TimelineRepository.saveTimelineBlock(this.userId, updatedBlock);
      await this.runtime.refresh('SESSION_UPDATE', { timeline: updatedBlocks, lastSyncError: null });
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'toggleTimelineBlockComplete');
    }
  }

  async addCustomTimelineBlock(block: Omit<TimelineBlock, 'id'>): Promise<void>;
  async addCustomTimelineBlock(subject: string, chapter: string, activity: string, time: string): Promise<void>;
  async addCustomTimelineBlock(blockOrSubject: string | Omit<TimelineBlock, 'id'>, arg1?: string, arg2?: string, arg3?: string) {
    this.checkWriteBlock();
    let newBlock: TimelineBlock;
    if (typeof blockOrSubject === 'string') {
      const validSubjects: TimelineBlock['subject'][] = ['physics', 'chemistry', 'maths', 'general', 'break'];
      const lowerSub = blockOrSubject.toLowerCase();
      const normalizedSub: TimelineBlock['subject'] = (lowerSub === 'mathematics' || lowerSub === 'math')
        ? 'maths'
        : (validSubjects.find(s => s === lowerSub) || 'general');

      newBlock = {
        id: `user-custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        subject: normalizedSub,
        chapter: (arg1 || '').trim().substring(0, 80),
        activity: (arg2 || '').trim().substring(0, 150),
        time: (arg3 || '').trim().substring(0, 25),
        completed: false
      };
    } else {
      const blockObj = blockOrSubject as Omit<TimelineBlock, 'id'>;
      newBlock = {
        ...blockObj,
        id: `user-custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        chapter: (blockObj.chapter || '').trim().substring(0, 80),
        activity: (blockObj.activity || '').trim().substring(0, 150),
        time: (blockObj.time || '').trim().substring(0, 25),
      };
    }

    if (!newBlock.time || !newBlock.chapter || !newBlock.activity) {
      throw new Error("Validation Error: Custom timeline block fields cannot be empty.");
    }

    const originalSnapshot = {
      timeline: this.state.timeline
    };
    const updatedBlocks = [...this.state.timeline, newBlock];
    this.runtime.updateStateOptimistic({ timeline: updatedBlocks });

    try {
      await TimelineRepository.saveTimelineBlock(this.userId, newBlock);
      await this.runtime.refresh('SESSION_UPDATE', { timeline: updatedBlocks, lastSyncError: null });
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'addCustomTimelineBlock');
    }
  }

  async updateCustomTimelineBlock(id: string, updates: Partial<TimelineBlock>) {
    this.checkWriteBlock();
    const block = this.state.timeline.find(b => b.id === id);
    if (!block) return;

    const sanitizedUpdates: Partial<TimelineBlock> = { ...updates };
    if (updates.chapter !== undefined) sanitizedUpdates.chapter = (updates.chapter || '').trim().substring(0, 80);
    if (updates.activity !== undefined) sanitizedUpdates.activity = (updates.activity || '').trim().substring(0, 150);
    if (updates.time !== undefined) sanitizedUpdates.time = (updates.time || '').trim().substring(0, 25);

    const updatedBlock = { ...block, ...sanitizedUpdates };
    if (!updatedBlock.time || !updatedBlock.chapter || !updatedBlock.activity) {
      throw new Error("Validation Error: Custom timeline block fields cannot be empty.");
    }

    const originalSnapshot = {
      timeline: this.state.timeline
    };
    const updatedBlocks = this.state.timeline.map(b => b.id === id ? updatedBlock : b);
    this.runtime.updateStateOptimistic({ timeline: updatedBlocks });

    try {
      await TimelineRepository.saveTimelineBlock(this.userId, updatedBlock);
      await this.runtime.refresh('SESSION_UPDATE', { timeline: updatedBlocks, lastSyncError: null });
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'updateCustomTimelineBlock');
    }
  }

  async deleteCustomTimelineBlock(id: string) {
    this.checkWriteBlock();
    const originalSnapshot = {
      timeline: this.state.timeline
    };
    const updatedBlocks = this.state.timeline.filter(b => b.id !== id);
    this.runtime.updateStateOptimistic({ timeline: updatedBlocks });

    try {
      await TimelineRepository.deleteTimelineBlock(this.userId, id);
      await this.runtime.refresh('SESSION_UPDATE', { timeline: updatedBlocks, lastSyncError: null });
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'deleteCustomTimelineBlock');
    }
  }

  async updateWeeklyGoals(weeklyGoals: { weekIndex: number; title: string; focus: string; status: 'Completed' | 'Active' | 'Upcoming' }[]) {
    this.checkWriteBlock();
    const originalSnapshot = {
      weeklyGoals: this.state.weeklyGoals
    };
    this.runtime.updateStateOptimistic({ weeklyGoals });
    try {
      await UserRepository.updateUserProfile(this.userId, { weeklyGoals });
      await this.runtime.refresh('SETTINGS_UPDATE', { 
        settings: { ...this.state.settings },
        weeklyGoals,
        lastSyncError: null 
      });
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'updateWeeklyGoals');
    }
  }

  async updateScheduleBlock(id: string, updates: { dayIndex?: number; timeSlot?: string; scheduledDate?: string; scheduledTime?: string }) {
    this.checkWriteBlock();
    
    // Support saving overrides for planner grid
    const overrides = { ...(this.state.scheduleOverrides || {}) };
    const baseId = id.replace('today-', '').replace('plan-', '');
    overrides[baseId] = {
      ...(overrides[baseId] || {}),
      ...updates
    };

    const updatedBlocks = (this.state.timeline || []).map(b => 
      (b.id === id || b.id === `mission-${baseId}`) ? { ...b, time: updates.timeSlot || b.time } : b
    );

    const originalSnapshot = {
      scheduleOverrides: this.state.scheduleOverrides,
      timeline: this.state.timeline
    };

    this.runtime.updateStateOptimistic({
      scheduleOverrides: overrides,
      timeline: updatedBlocks
    });

    try {
      await UserRepository.updateUserProfile(this.userId, {
        scheduleOverrides: overrides
      });
      
      await this.runtime.refresh('INIT', { 
        scheduleOverrides: overrides,
        timeline: updatedBlocks
      });
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'updateScheduleBlock');
    }
  }
}
