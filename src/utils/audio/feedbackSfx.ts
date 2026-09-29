import { AudioContextManager } from './audioContextManager';

export class FeedbackSfxSynthesizer {
  constructor(private audioMgr: AudioContextManager) {}

  public async playSuccess(): Promise<void> {
    await this.audioMgr.init();
    const ctx = this.audioMgr.ctx;
    const masterGain = this.audioMgr.masterGain;
    if (!ctx || !masterGain) return;
    const t = ctx.currentTime;

    const osc1 = this.audioMgr.registerSource(ctx.createOscillator(), 'general');
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, t);
    osc1.frequency.exponentialRampToValueAtTime(1046.50, t + 0.12);

    gain1.gain.setValueAtTime(0.001, t);
    gain1.gain.linearRampToValueAtTime(0.32, t + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.start(t);
    osc1.stop(t + 0.22);

    const t2 = t + 0.12;
    const osc2 = this.audioMgr.registerSource(ctx.createOscillator(), 'general');
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, t2);
    osc2.frequency.exponentialRampToValueAtTime(1567.98, t2 + 0.15);

    gain2.gain.setValueAtTime(0.001, t2);
    gain2.gain.linearRampToValueAtTime(0.32, t2 + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.3);

    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(t2);
    osc2.stop(t2 + 0.32);
  }

  public async playAlert(): Promise<void> {
    await this.audioMgr.init();
    const ctx = this.audioMgr.ctx;
    const masterGain = this.audioMgr.masterGain;
    if (!ctx || !masterGain) return;
    const t = ctx.currentTime;

    const osc = this.audioMgr.registerSource(ctx.createOscillator(), 'general');
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.38, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  public async playCardFlip(): Promise<void> {
    await this.audioMgr.init();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate?.(12); } catch {}
    }
    const ctx = this.audioMgr.ctx;
    const masterGain = this.audioMgr.masterGain;
    if (!ctx || !masterGain) return;
    const t = ctx.currentTime;

    const osc = this.audioMgr.registerSource(ctx.createOscillator(), 'general');
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.025);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.24, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.03);
  }

  public async playStreakChime(streak: number = 5): Promise<void> {
    await this.audioMgr.init();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate?.([25, 50, 25]); } catch {}
    }
    const ctx = this.audioMgr.ctx;
    const masterGain = this.audioMgr.masterGain;
    if (!ctx || !masterGain) return;
    const t = ctx.currentTime;

    const baseFreqs = streak >= 10 ? [523.25, 659.25, 783.99, 1046.50] : [523.25, 659.25, 783.99];
    
    baseFreqs.forEach((freq, idx) => {
      const noteTime = t + idx * 0.06;
      const osc = this.audioMgr.registerSource(ctx.createOscillator(), 'general');
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.35, noteTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.26);
    });
  }
}
