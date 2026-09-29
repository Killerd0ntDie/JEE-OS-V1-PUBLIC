import { AudioContextManager } from './audioContextManager';

export class TacticalSfxSynthesizer {
  constructor(private audioMgr: AudioContextManager) {}

  public async playTacticalSwitch(): Promise<void> {
    await this.audioMgr.init();
    const ctx = this.audioMgr.ctx;
    const masterGain = this.audioMgr.masterGain;
    const noiseBuffer = this.audioMgr.noiseBuffer;
    if (!ctx || !masterGain || !noiseBuffer) return;
    const t = ctx.currentTime;

    const noiseSrc = this.audioMgr.registerSource(ctx.createBufferSource(), 'general');
    noiseSrc.buffer = noiseBuffer;
    
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 3500;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, t);
    noiseGain.gain.linearRampToValueAtTime(0.45, t + 0.002);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noiseSrc.start(t);
    noiseSrc.stop(t + 0.025);

    const osc = this.audioMgr.registerSource(ctx.createOscillator(), 'general');
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.025);

    oscGain.gain.setValueAtTime(0.001, t);
    oscGain.gain.linearRampToValueAtTime(0.35, t + 0.003);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);

    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  public async playRadioRelayClick(): Promise<void> {
    await this.audioMgr.init();
    const ctx = this.audioMgr.ctx;
    const masterGain = this.audioMgr.masterGain;
    if (!ctx || !masterGain) return;
    const t = ctx.currentTime;

    const osc = this.audioMgr.registerSource(ctx.createOscillator(), 'general');
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.025);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.035);
  }

  public async playMechanicalKey(tone: 'click' | 'clack' | 'heavy' = 'click'): Promise<void> {
    await this.audioMgr.init();
    const ctx = this.audioMgr.ctx;
    const masterGain = this.audioMgr.masterGain;
    if (!ctx || !masterGain) return;
    const t = ctx.currentTime;

    // 1. High-frequency keycap impact snap (noise burst)
    if (this.audioMgr.noiseBuffer) {
      const noise = this.audioMgr.registerSource(ctx.createBufferSource(), 'general');
      noise.buffer = this.audioMgr.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = tone === 'heavy' ? 3200 : tone === 'clack' ? 4500 : 6000;
      filter.Q.value = 3.5;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(tone === 'heavy' ? 0.35 : 0.28, t + 0.001);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      noise.start(t);
      noise.stop(t + 0.02);
    }

    // 2. Mechanical switch bottom-out resonance
    const osc = this.audioMgr.registerSource(ctx.createOscillator(), 'general');
    const oscGain = ctx.createGain();
    const baseFreq = tone === 'heavy' ? 320 : tone === 'clack' ? 480 : 640;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq * 1.5, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, t + 0.025);

    oscGain.gain.setValueAtTime(0.001, t);
    oscGain.gain.linearRampToValueAtTime(0.25, t + 0.002);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);

    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.035);
  }

  public async playTacticalBeep(freq: number = 1174.66): Promise<void> {
    await this.audioMgr.init();
    const ctx = this.audioMgr.ctx;
    const masterGain = this.audioMgr.masterGain;
    if (!ctx || !masterGain) return;
    const t = ctx.currentTime;

    const osc = this.audioMgr.registerSource(ctx.createOscillator(), 'general');
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.055);
  }

  public async playHover(): Promise<void> {
    await this.audioMgr.init();
    const ctx = this.audioMgr.ctx;
    const masterGain = this.audioMgr.masterGain;
    if (!ctx || !masterGain) return;
    const t = ctx.currentTime;

    const osc = this.audioMgr.registerSource(ctx.createOscillator(), 'general');
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.03);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.035);
  }
}
