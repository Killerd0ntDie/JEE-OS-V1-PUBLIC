import { AudioContextManager } from './audioContextManager';
import { SubjectThemeKey, SoundTimbre, SourceCategory } from './audioTypes';

export class EvangelionSynthesizer {
  constructor(private audioMgr: AudioContextManager) {}

  public playDistinctMelodyNote(
    freq: number, 
    startTime: number, 
    duration: number, 
    isAccent: boolean = false,
    timbre: SoundTimbre = 'brassPiano',
    category: SourceCategory = 'general'
  ): void {
    const ctx = this.audioMgr.ctx;
    const masterGain = this.audioMgr.masterGain;
    if (!ctx || !masterGain) return;

    const targetGain = (category === 'entrance' || category === 'exit') && this.audioMgr.cockpitGain
      ? this.audioMgr.cockpitGain
      : masterGain;

    const oscMain = this.audioMgr.registerSource(ctx.createOscillator(), category);
    const oscWarmth = this.audioMgr.registerSource(ctx.createOscillator(), category);
    const noteGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    if (timbre === 'celestialGlass') {
      oscMain.type = 'sine';
      oscWarmth.type = 'triangle';
      filter.frequency.setValueAtTime(freq * 2.5, startTime);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.8, startTime + duration * 0.8);
      filter.Q.value = 2.0;
    } else if (timbre === 'punchyHorn') {
      oscMain.type = 'sawtooth';
      oscWarmth.type = 'sawtooth';
      oscWarmth.detune.setValueAtTime(10, startTime);
      filter.frequency.setValueAtTime(freq * 2.2, startTime);
      filter.frequency.linearRampToValueAtTime(isAccent ? 4800 : 3400, startTime + 0.02);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.6, startTime + duration);
      filter.Q.value = 4.0;
    } else {
      oscMain.type = 'triangle';
      oscWarmth.type = 'sawtooth';
      oscWarmth.detune.setValueAtTime(6, startTime);
      filter.frequency.setValueAtTime(freq * 1.8, startTime);
      filter.frequency.linearRampToValueAtTime(isAccent ? 3800 : 2800, startTime + 0.02);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + duration * 0.9);
      filter.Q.value = isAccent ? 3.5 : 2.0;
    }

    oscMain.frequency.setValueAtTime(freq, startTime);
    oscWarmth.frequency.setValueAtTime(freq, startTime);

    noteGain.gain.setValueAtTime(0.001, startTime);
    noteGain.gain.linearRampToValueAtTime(isAccent ? 0.48 : 0.38, startTime + 0.012);
    noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    oscMain.connect(filter);
    oscWarmth.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(targetGain);

    oscMain.start(startTime);
    oscWarmth.start(startTime);
    oscMain.stop(startTime + duration + 0.02);
    oscWarmth.stop(startTime + duration + 0.02);

    // High Sparkle Chime Layer (1 Octave Overtone)
    const chimeOsc = this.audioMgr.registerSource(ctx.createOscillator(), category);
    const chimeGain = ctx.createGain();
    chimeOsc.type = 'sine';
    chimeOsc.frequency.setValueAtTime(freq * 2, startTime);

    chimeGain.gain.setValueAtTime(0.001, startTime);
    chimeGain.gain.linearRampToValueAtTime(timbre === 'celestialGlass' ? 0.28 : 0.18, startTime + 0.008);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.min(0.25, duration * 0.7));

    chimeOsc.connect(chimeGain);
    chimeGain.connect(targetGain);
    chimeOsc.start(startTime);
    chimeOsc.stop(startTime + duration * 0.8);
  }

  public playSubBassNote(
    freq: number, 
    startTime: number, 
    duration: number, 
    category: SourceCategory = 'general'
  ): void {
    const ctx = this.audioMgr.ctx;
    const masterGain = this.audioMgr.masterGain;
    if (!ctx || !masterGain) return;

    const targetGain = (category === 'entrance' || category === 'exit') && this.audioMgr.cockpitGain
      ? this.audioMgr.cockpitGain
      : masterGain;

    const osc = this.audioMgr.registerSource(ctx.createOscillator(), category);
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.42, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(targetGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  public async playAnimeLaserCharge(subject: SubjectThemeKey = 'maths', animMode?: string): Promise<void> {
    await this.audioMgr.init();
    const ctx = this.audioMgr.ctx;
    const masterGain = this.audioMgr.masterGain;
    if (!ctx || !masterGain) return;
    
    this.audioMgr.stopAllPlayback();

    const t = ctx.currentTime;
    this.audioMgr.sequenceAnchorTime = t;
    const s = String(subject || '').toLowerCase();
    const targetGainNode = this.audioMgr.cockpitGain || masterGain;

    let pickupNotes: { freq: number; time: number; dur: number }[];
    let rootFreq: number;
    let droneFreqs: number[];
    let timbre: SoundTimbre = 'brassPiano';

    if (s.includes('phys')) {
      pickupNotes = [
        { freq: 329.63, time: 0.00, dur: 0.10 }, // E4
        { freq: 392.00, time: 0.10, dur: 0.10 }, // G4
        { freq: 493.88, time: 0.20, dur: 0.12 }, // B4
        { freq: 659.25, time: 0.32, dur: 0.28 }, // E5 (Glint)
      ];
      rootFreq = 220.00; // A3 swell
      droneFreqs = [110.00, 220.00, 329.63]; // A2, A3, E4
      timbre = 'celestialGlass';
    } else if (s.includes('chem')) {
      pickupNotes = [
        { freq: 246.94, time: 0.00, dur: 0.10 }, // B3
        { freq: 293.66, time: 0.10, dur: 0.10 }, // D4
        { freq: 369.99, time: 0.20, dur: 0.12 }, // F#4
        { freq: 493.88, time: 0.32, dur: 0.28 }, // B4 (Glint)
      ];
      rootFreq = 164.81; // E3 swell
      droneFreqs = [82.41, 164.81, 246.94]; // E2, E3, B3
      timbre = 'punchyHorn';
    } else {
      pickupNotes = [
        { freq: 196.00, time: 0.00, dur: 0.10 }, // G3
        { freq: 233.08, time: 0.10, dur: 0.10 }, // Bb3
        { freq: 293.66, time: 0.20, dur: 0.12 }, // D4
        { freq: 392.00, time: 0.32, dur: 0.28 }, // G4 (Glint)
      ];
      rootFreq = 130.81; // C3 swell
      droneFreqs = [65.41, 130.81, 196.00]; // C2, C3, G3
      timbre = 'brassPiano';
    }

    // Lingering Harmonic Drone
    droneFreqs.forEach((freq, idx) => {
      if (!ctx || !masterGain) return;
      const osc = this.audioMgr.registerSource(ctx.createOscillator(), 'entrance');
      const oscWarmth = this.audioMgr.registerSource(ctx.createOscillator(), 'entrance');
      const droneGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      oscWarmth.type = 'sine';
      oscWarmth.frequency.setValueAtTime(freq * 1.002, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, t);
      filter.frequency.exponentialRampToValueAtTime(1400, t + 0.45);
      filter.frequency.exponentialRampToValueAtTime(450, t + 2.2);

      droneGain.gain.setValueAtTime(0.001, t);
      droneGain.gain.linearRampToValueAtTime(0.20 / (idx + 1), t + 0.35);
      droneGain.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);

      osc.connect(filter);
      oscWarmth.connect(filter);
      filter.connect(droneGain);
      droneGain.connect(targetGainNode);

      osc.start(t);
      oscWarmth.start(t);
      osc.stop(t + 2.5);
      oscWarmth.stop(t + 2.5);
    });

    // Tactical Fighter Jet Missile Lock-On Tone Overlay
    if (animMode === 'missileLock') {
      [0.00, 0.12].forEach(offset => {
        const chirpOsc = this.audioMgr.registerSource(ctx.createOscillator(), 'entrance');
        const chirpGain = ctx.createGain();
        chirpOsc.type = 'sawtooth';
        chirpOsc.frequency.setValueAtTime(880, t + offset);
        chirpOsc.frequency.linearRampToValueAtTime(1174, t + offset + 0.045);

        chirpGain.gain.setValueAtTime(0.001, t + offset);
        chirpGain.gain.linearRampToValueAtTime(0.20, t + offset + 0.01);
        chirpGain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.05);

        chirpOsc.connect(chirpGain);
        chirpGain.connect(targetGainNode);
        chirpOsc.start(t + offset);
        chirpOsc.stop(t + offset + 0.055);
      });

      const lockOsc = this.audioMgr.registerSource(ctx.createOscillator(), 'entrance');
      const lockGain = ctx.createGain();
      lockOsc.type = 'sine';
      lockOsc.frequency.setValueAtTime(1760, t + 0.22);

      lockGain.gain.setValueAtTime(0.001, t + 0.22);
      lockGain.gain.linearRampToValueAtTime(0.25, t + 0.24);
      lockGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);

      lockOsc.connect(lockGain);
      lockGain.connect(targetGainNode);
      lockOsc.start(t + 0.22);
      lockOsc.stop(t + 0.68);
    }

    // Ascending Arpeggio Lead
    pickupNotes.forEach(note => {
      this.playDistinctMelodyNote(note.freq, t + note.time, note.dur, true, timbre, 'entrance');
    });

    // Harmonic Reverse-Filter Swell into Downbeat
    const swellOsc = this.audioMgr.registerSource(ctx.createOscillator(), 'entrance');
    const swellGain = ctx.createGain();
    const swellFilter = ctx.createBiquadFilter();

    swellOsc.type = 'triangle';
    swellOsc.frequency.setValueAtTime(rootFreq, t);
    swellOsc.frequency.exponentialRampToValueAtTime(rootFreq * 2, t + 0.42);

    swellFilter.type = 'lowpass';
    swellFilter.frequency.setValueAtTime(250, t);
    swellFilter.frequency.exponentialRampToValueAtTime(3200, t + 0.40);
    swellFilter.Q.value = 2.5;

    swellGain.gain.setValueAtTime(0.001, t);
    swellGain.gain.linearRampToValueAtTime(0.22, t + 0.35);
    swellGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

    swellOsc.connect(swellFilter);
    swellFilter.connect(swellGain);
    swellGain.connect(targetGainNode);

    swellOsc.start(t);
    swellOsc.stop(t + 0.58);

    // Shimmering Crystal Sparkle on the peak note
    const sparkleOsc = this.audioMgr.registerSource(ctx.createOscillator(), 'entrance');
    const sparkleGain = ctx.createGain();
    sparkleOsc.type = 'sine';
    sparkleOsc.frequency.setValueAtTime(pickupNotes[pickupNotes.length - 1].freq * 2, t + 0.32);

    sparkleGain.gain.setValueAtTime(0.001, t + 0.32);
    sparkleGain.gain.linearRampToValueAtTime(0.18, t + 0.35);
    sparkleGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.60);

    sparkleOsc.connect(sparkleGain);
    sparkleGain.connect(targetGainNode);
    sparkleOsc.start(t + 0.32);
    sparkleOsc.stop(t + 0.62);
  }

  public async playCruelAngelsThesisEntrance(subject: SubjectThemeKey = 'maths', intendedOffsetSeconds?: number): Promise<void> {
    await this.audioMgr.init();
    const ctx = this.audioMgr.ctx;
    const masterGain = this.audioMgr.masterGain;
    if (!ctx || !masterGain) return;
    
    this.audioMgr.stopEntrancePlayback();

    let t = ctx.currentTime;
    if (intendedOffsetSeconds !== undefined && this.audioMgr.sequenceAnchorTime > 0) {
      const preciseTime = this.audioMgr.sequenceAnchorTime + intendedOffsetSeconds;
      t = Math.max(ctx.currentTime, preciseTime);
    }
    const s = String(subject).toLowerCase();

    let scale: { note1: number; note2: number; note3: number; note4: number; note5: number; note6: number };
    let bass: { b1: number; b2: number; b3: number; b4: number };
    let timbre: SoundTimbre = 'brassPiano';

    if (s.includes('phys')) {
      scale = {
        note1: 440.00, // A4
        note2: 523.25, // C5
        note3: 587.33, // D5
        note4: 659.25, // E5
        note5: 783.99, // G5
        note6: 698.46  // F5
      };
      bass = { b1: 55.00, b2: 43.65, b3: 49.00, b4: 41.20 };
      timbre = 'celestialGlass';
    } else if (s.includes('chem')) {
      scale = {
        note1: 329.63, // E4
        note2: 392.00, // G4
        note3: 440.00, // A4
        note4: 493.88, // B4
        note5: 587.33, // D5
        note6: 523.25  // C5
      };
      bass = { b1: 82.41, b2: 65.41, b3: 73.42, b4: 61.74 };
      timbre = 'punchyHorn';
    } else {
      scale = {
        note1: 261.63, // C4
        note2: 311.13, // Eb4
        note3: 349.23, // F4
        note4: 349.23, // F4
        note5: 466.16, // Bb4
        note6: 415.30  // Ab4
      };
      bass = { b1: 65.41, b2: 51.91, b3: 58.27, b4: 49.00 };
      timbre = 'brassPiano';
    }

    const melody = [
      { freq: scale.note1, time: 0.00, dur: 0.42, accent: true },   // "Zan-"
      { freq: scale.note2, time: 0.48, dur: 0.22, accent: false },  // "ko-"
      { freq: scale.note3, time: 0.72, dur: 0.22, accent: true },   // "ku"
      { freq: scale.note2, time: 0.96, dur: 0.22, accent: false },  // "na"
      { freq: scale.note4, time: 1.20, dur: 0.22, accent: true },   // "ten-"
      { freq: scale.note4, time: 1.44, dur: 0.22, accent: false },  // "shi"
      { freq: scale.note5, time: 1.92, dur: 0.42, accent: true },   // "no"
      { freq: scale.note6, time: 2.40, dur: 0.22, accent: false },  // "yō"
      { freq: scale.note3, time: 2.64, dur: 0.22, accent: false },  // "ni"
      { freq: scale.note3, time: 2.88, dur: 0.95, accent: true },   // "tē-ze!"
    ];

    const bassline = [
      { freq: bass.b1, time: 0.00, dur: 0.90 },
      { freq: bass.b2, time: 0.96, dur: 0.90 },
      { freq: bass.b3, time: 1.92, dur: 0.90 },
      { freq: bass.b4, time: 2.88, dur: 1.10 },
    ];

    melody.forEach(note => {
      this.playDistinctMelodyNote(note.freq, t + note.time, note.dur, note.accent, timbre, 'entrance');
    });

    bassline.forEach(b => {
      this.playSubBassNote(b.freq, t + b.time, b.dur, 'entrance');
    });
  }

  public async playCruelAngelsThesisExit(subject: SubjectThemeKey = 'maths'): Promise<void> {
    await this.audioMgr.init();
    const ctx = this.audioMgr.ctx;
    const masterGain = this.audioMgr.masterGain;
    if (!ctx || !masterGain) return;
    
    this.audioMgr.stopEntrancePlayback();
    this.audioMgr.stopExitPlayback();

    const t = ctx.currentTime;
    const s = String(subject).toLowerCase();

    let chordRoots: number[];
    let notes: number[];
    let timbre: SoundTimbre = 'brassPiano';

    if (s.includes('phys')) {
      notes = [523.25, 587.33, 659.25, 698.46, 659.25, 587.33, 523.25, 440.00];
      chordRoots = [55.00, 110.00, 130.81, 164.81];
      timbre = 'celestialGlass';
    } else if (s.includes('chem')) {
      notes = [392.00, 440.00, 493.88, 523.25, 493.88, 440.00, 392.00, 329.63];
      chordRoots = [82.41, 164.81, 196.00, 246.94];
      timbre = 'punchyHorn';
    } else {
      notes = [311.13, 349.23, 392.00, 415.30, 392.00, 349.23, 311.13, 261.63];
      chordRoots = [65.41, 130.81, 155.56, 196.00];
      timbre = 'brassPiano';
    }

    const melody = [
      { freq: notes[0], time: 0.00, dur: 0.44, accent: true },   // "Shō-"
      { freq: notes[1], time: 0.48, dur: 0.44, accent: true },   // "-nen"
      { freq: notes[2], time: 0.96, dur: 0.44, accent: true },   // "yo"
      { freq: notes[3], time: 1.44, dur: 0.44, accent: true },   // "shin-"
      { freq: notes[4], time: 1.92, dur: 0.22, accent: false },  // "-wa"
      { freq: notes[5], time: 2.16, dur: 0.22, accent: false },  // "ni"
      { freq: notes[6], time: 2.40, dur: 0.42, accent: true },   // "na-"
      { freq: notes[7], time: 2.88, dur: 1.25, accent: true },   // "-re!"
    ];

    melody.forEach(note => {
      this.playDistinctMelodyNote(note.freq, t + note.time, note.dur, note.accent, timbre, 'exit');
    });

    chordRoots.forEach(freq => {
      this.playSubBassNote(freq, t + 2.88, 1.25, 'exit');
    });
  }
}
