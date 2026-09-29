import { storageAdapter } from '@/services/StorageAdapter';
import { SourceCategory } from './audioTypes';

export class AudioContextManager {
  public ctx: AudioContext | null = null;
  public masterGain: GainNode | null = null;
  public cockpitGain: GainNode | null = null;
  public compressor: DynamicsCompressorNode | null = null;
  public noiseBuffer: AudioBuffer | null = null;
  private cockpitVolumeVal: number = 0.75;
  private _sequenceAnchorTime: number = 0;

  // Categorized source tracking for seamless transitions
  private entranceSources: Set<AudioScheduledSourceNode> = new Set();
  private exitSources: Set<AudioScheduledSourceNode> = new Set();
  private generalSources: Set<AudioScheduledSourceNode> = new Set();

  public get sequenceAnchorTime(): number {
    return this._sequenceAnchorTime;
  }

  public set sequenceAnchorTime(time: number) {
    this._sequenceAnchorTime = time;
  }

  public async init(): Promise<void> {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
      
      // High-Impact Master Dynamics Compressor (Loud, punchy, zero clipping distortion)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(5, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.002, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.1, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.95;
      this.masterGain.connect(this.compressor);

      // Dedicated Cockpit Gain node for start sound and theme songs
      this.cockpitGain = this.ctx.createGain();
      try {
        const saved = storageAdapter.getItem<string | number>('jeeos_cockpit_volume');
        if (saved !== null && saved !== undefined) {
          const parsed = typeof saved === 'number' ? saved : parseFloat(saved);
          if (!Number.isNaN(parsed)) this.cockpitVolumeVal = Math.max(0, Math.min(1, parsed));
        }
      } catch {}
      this.cockpitGain.gain.value = this.cockpitVolumeVal;
      this.cockpitGain.connect(this.masterGain);

      this.createNoiseBuffer();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume().catch(() => {});
    }
  }

  public setVolume(vol: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, vol));
    }
  }

  public getVolume(): number {
    return this.masterGain ? this.masterGain.gain.value : 0.95;
  }

  public setCockpitVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.cockpitVolumeVal = clamped;
    if (this.cockpitGain) {
      this.cockpitGain.gain.value = clamped;
    }
    try {
      storageAdapter.setItem('jeeos_cockpit_volume', clamped);
    } catch {}
  }

  public getCockpitVolume(): number {
    return this.cockpitVolumeVal;
  }

  private createNoiseBuffer(): void {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  public registerSource<T extends AudioScheduledSourceNode>(source: T, category: SourceCategory = 'general'): T {
    if (category === 'entrance') {
      this.entranceSources.add(source);
      source.onended = () => this.entranceSources.delete(source);
    } else if (category === 'exit') {
      this.exitSources.add(source);
      source.onended = () => this.exitSources.delete(source);
    } else {
      this.generalSources.add(source);
      source.onended = () => this.generalSources.delete(source);
    }
    return source;
  }

  public stopEntrancePlayback(): void {
    this.entranceSources.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch { /* already stopped */ }
    });
    this.entranceSources.clear();
  }

  public stopExitPlayback(): void {
    this.exitSources.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch { /* already stopped */ }
    });
    this.exitSources.clear();
  }

  public stopAllPlayback(): void {
    this.stopEntrancePlayback();
    this.stopExitPlayback();
    this.generalSources.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch { /* already stopped */ }
    });
    this.generalSources.clear();
  }
}
