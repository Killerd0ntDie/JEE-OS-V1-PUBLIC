/**
 * Advanced UI Audio Engine & Evangelion "A Cruel Angel's Thesis" Synthesizer
 * Generates authentic, loud, crystal-clear anime soundscapes and iconic melodies using the Web Audio API.
 * Features:
 * 1. Anime Laser Charge Glint ("shiiing!") on Expand -> Squeeze singularity
 * 2. Subject-Specific Harmonic Transpositions:
 *    - Maths (Unit-01): Authentic C Minor brass/piano fanfare
 *    - Physics (Unit-00): Celestial A Minor high-register crystal chime bells
 *    - Chemistry (Unit-02): Energetic E Minor punchy brass horns
 * 3. Tactical Mechanical Switch & Radio Relay Clicks
 */

export type SubjectThemeKey = 'maths' | 'physics' | 'chemistry' | string;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  public async init() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // High-Impact Master Dynamics Compressor (Loud, punchy, zero clipping distortion)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(5, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.002, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.1, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      this.masterGain = this.ctx.createGain();
      // Elevated master volume for loud, crystal-clear presence
      this.masterGain.gain.value = 0.95;
      this.masterGain.connect(this.compressor);

      this.createNoiseBuffer();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume().catch(() => {});
    }
  }

  public setVolume(vol: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, vol));
    }
  }

  public getVolume(): number {
    return this.masterGain ? this.masterGain.gain.value : 0.95;
  }

  private createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  /**
   * 🌟 EVANGELION COCKPIT INTRO FLOURISH (Anacrusis / Pickup into "A Cruel Angel's Thesis")
   * Synthesized using the exact same instrument timbre, tuning, and harmonics as the upcoming theme:
   * - Maths (Unit-01): Brass-Piano Ascending Arpeggio (G3 -> Bb3 -> D4 -> G4 shimmer)
   * - Physics (Unit-00): Celestial Glass Crystal Flourish (E4 -> G4 -> B4 -> E5 shimmer)
   * - Chemistry (Unit-02): Punchy Horn Ignition Swell (B3 -> D4 -> F#4 -> B4 shimmer)
   * Seamlessly blooms and resolves directly into the first note ("Zan-") of A Cruel Angel's Thesis!
   */
  /**
   * 🌟 EVANGELION COCKPIT INTRO & LINGERING HARMONIC BED (Anacrusis / Pickup into "A Cruel Angel's Thesis")
   * Synthesized using the exact same instrument timbre, tuning, and harmonics as the upcoming theme:
   * 1. Lingering Harmonic Ambient Drone (Sustains 2.2s in subject fundamental key: C Minor / A Minor / E Minor)
   * 2. Subject-Tuned Ascending Arpeggio Flourish (G3 -> Bb3 -> D4 -> G4 shimmer)
   * 3. Reverse-Filter Swell & Crystalline Octave Glint
   * 4. Optional Tactical Fighter Jet Seeker HUD Tone Overlay for Missile Lock Mode
   */
  public async playAnimeLaserCharge(subject: SubjectThemeKey = 'maths', animMode?: string) {
    await this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const s = String(subject || '').toLowerCase();

    let pickupNotes: { freq: number; time: number; dur: number }[];
    let rootFreq: number;
    let droneFreqs: number[];
    let timbre: 'brassPiano' | 'celestialGlass' | 'punchyHorn' = 'brassPiano';

    if (s.includes('phys')) {
      // Physics (Unit-00): Celestial A Minor dominant pickup & lingering A Minor drone
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
      // Chemistry (Unit-02): Energetic E Minor dominant pickup & lingering E Minor drone
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
      // Maths (Unit-01): Authentic C Minor dominant pickup & lingering C Minor drone
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

    // 1. Lingering Harmonic Drone / Ambient Resonance Bed (Sustains 2.2s beneath the song entry)
    droneFreqs.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const oscWarmth = this.ctx.createOscillator();
      const droneGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      oscWarmth.type = 'sine';
      oscWarmth.frequency.setValueAtTime(freq * 1.002, t); // gentle chorus shimmer

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, t);
      filter.frequency.exponentialRampToValueAtTime(1400, t + 0.45);
      filter.frequency.exponentialRampToValueAtTime(450, t + 2.2);

      // Smooth atmospheric envelope: gently ramps in, stays warm, slowly decays
      droneGain.gain.setValueAtTime(0.001, t);
      droneGain.gain.linearRampToValueAtTime(0.20 / (idx + 1), t + 0.35);
      droneGain.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);

      osc.connect(filter);
      oscWarmth.connect(filter);
      filter.connect(droneGain);
      droneGain.connect(this.masterGain);

      osc.start(t);
      oscWarmth.start(t);
      osc.stop(t + 2.5);
      oscWarmth.stop(t + 2.5);
    });

    // 2. Special: Tactical Fighter Jet Missile Lock-On Tone Overlay
    if (animMode === 'missileLock') {
      [0.00, 0.12].forEach(offset => {
        const chirpOsc = this.ctx!.createOscillator();
        const chirpGain = this.ctx!.createGain();
        chirpOsc.type = 'sawtooth';
        chirpOsc.frequency.setValueAtTime(880, t + offset);
        chirpOsc.frequency.linearRampToValueAtTime(1174, t + offset + 0.045);

        chirpGain.gain.setValueAtTime(0.001, t + offset);
        chirpGain.gain.linearRampToValueAtTime(0.20, t + offset + 0.01);
        chirpGain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.05);

        chirpOsc.connect(chirpGain);
        chirpGain.connect(this.masterGain!);
        chirpOsc.start(t + offset);
        chirpOsc.stop(t + offset + 0.055);
      });

      // Solid High-Frequency Target Lock Tone (1760Hz Fox-3 Beep into lingering reverb)
      const lockOsc = this.ctx.createOscillator();
      const lockGain = this.ctx.createGain();
      lockOsc.type = 'sine';
      lockOsc.frequency.setValueAtTime(1760, t + 0.22);

      lockGain.gain.setValueAtTime(0.001, t + 0.22);
      lockGain.gain.linearRampToValueAtTime(0.25, t + 0.24);
      lockGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);

      lockOsc.connect(lockGain);
      lockGain.connect(this.masterGain);
      lockOsc.start(t + 0.22);
      lockOsc.stop(t + 0.68);
    }

    // 3. Ascending Arpeggio Lead (Matches exact instrument tone of the main melody)
    pickupNotes.forEach(note => {
      this.playDistinctMelodyNote(note.freq, t + note.time, note.dur, true, timbre);
    });

    // 4. Harmonic Reverse-Filter Swell into Downbeat
    const swellOsc = this.ctx.createOscillator();
    const swellGain = this.ctx.createGain();
    const swellFilter = this.ctx.createBiquadFilter();

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
    swellGain.connect(this.masterGain);

    swellOsc.start(t);
    swellOsc.stop(t + 0.58);

    // 5. Shimmering Crystal Sparkle on the peak note
    const sparkleOsc = this.ctx.createOscillator();
    const sparkleGain = this.ctx.createGain();
    sparkleOsc.type = 'sine';
    sparkleOsc.frequency.setValueAtTime(pickupNotes[pickupNotes.length - 1].freq * 2, t + 0.32);

    sparkleGain.gain.setValueAtTime(0.001, t + 0.32);
    sparkleGain.gain.linearRampToValueAtTime(0.18, t + 0.35);
    sparkleGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.60);

    sparkleOsc.connect(sparkleGain);
    sparkleGain.connect(this.masterGain);
    sparkleOsc.start(t + 0.32);
    sparkleOsc.stop(t + 0.62);
  }

  /**
   * Helper: Plays a Crystal-Clear Anime Lead Synth Note (Piano + Brass Articulation)
   */
  private playDistinctMelodyNote(
    freq: number, 
    startTime: number, 
    duration: number, 
    isAccent: boolean = false,
    timbre: 'brassPiano' | 'celestialGlass' | 'punchyHorn' = 'brassPiano'
  ) {
    if (!this.ctx || !this.masterGain) return;

    const oscMain = this.ctx.createOscillator();
    const oscWarmth = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    if (timbre === 'celestialGlass') {
      // Physics (Unit-00): Celestial high-register chime bells
      oscMain.type = 'sine';
      oscWarmth.type = 'triangle';
      filter.frequency.setValueAtTime(freq * 2.5, startTime);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.8, startTime + duration * 0.8);
      filter.Q.value = 2.0;
    } else if (timbre === 'punchyHorn') {
      // Chemistry (Unit-02): Punchy energetic brass
      oscMain.type = 'sawtooth';
      oscWarmth.type = 'sawtooth';
      oscWarmth.detune.setValueAtTime(10, startTime);
      filter.frequency.setValueAtTime(freq * 2.2, startTime);
      filter.frequency.linearRampToValueAtTime(isAccent ? 4800 : 3400, startTime + 0.02);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.6, startTime + duration);
      filter.Q.value = 4.0;
    } else {
      // Maths (Unit-01): Authentic 90s Brass-Piano hybrid
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

    // Sharp percussive attack & clean natural release
    noteGain.gain.setValueAtTime(0.001, startTime);
    noteGain.gain.linearRampToValueAtTime(isAccent ? 0.48 : 0.38, startTime + 0.012);
    noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    oscMain.connect(filter);
    oscWarmth.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(this.masterGain);

    oscMain.start(startTime);
    oscWarmth.start(startTime);
    oscMain.stop(startTime + duration + 0.02);
    oscWarmth.stop(startTime + duration + 0.02);

    // High Sparkle Chime Layer (1 Octave Overtone)
    const chimeOsc = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();
    chimeOsc.type = 'sine';
    chimeOsc.frequency.setValueAtTime(freq * 2, startTime);

    chimeGain.gain.setValueAtTime(0.001, startTime);
    chimeGain.gain.linearRampToValueAtTime(timbre === 'celestialGlass' ? 0.28 : 0.18, startTime + 0.008);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.min(0.25, duration * 0.7));

    chimeOsc.connect(chimeGain);
    chimeGain.connect(this.masterGain);
    chimeOsc.start(startTime);
    chimeOsc.stop(startTime + duration * 0.8);
  }

  /**
   * Helper: Plays Sub-Bass Root Note
   */
  private playSubBassNote(freq: number, startTime: number, duration: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.42, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  /**
   * 🌟 EVANGELION ENTRANCE: "A Cruel Angel's Thesis" (Subject Transposed at 124 BPM)
   * - Maths (Unit-01): Authentic C Minor brass/piano fanfare
   * - Physics (Unit-00): Celestial A Minor crystal chime bells
   * - Chemistry (Unit-02): Energetic E Minor punchy brass
   */
  public async playCruelAngelsThesisEntrance(subject: SubjectThemeKey = 'maths') {
    await this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const s = String(subject).toLowerCase();

    // Determine Subject Key & Timbre
    let scale: { note1: number; note2: number; note3: number; note4: number; note5: number; note6: number };
    let bass: { b1: number; b2: number; b3: number; b4: number };
    let timbre: 'brassPiano' | 'celestialGlass' | 'punchyHorn' = 'brassPiano';

    if (s.includes('phys')) {
      // Physics (Unit-00): Celestial A Minor
      scale = {
        note1: 440.00, // A4 ("Zan-")
        note2: 523.25, // C5 ("ko-")
        note3: 587.33, // D5 ("ku")
        note4: 659.25, // E5 ("ten-")
        note5: 783.99, // G5 ("no")
        note6: 698.46  // F5 ("yō")
      };
      bass = { b1: 55.00, b2: 43.65, b3: 49.00, b4: 41.20 }; // A1, F1, G1, E1
      timbre = 'celestialGlass';
    } else if (s.includes('chem')) {
      // Chemistry (Unit-02): Energetic E Minor
      scale = {
        note1: 329.63, // E4 ("Zan-")
        note2: 392.00, // G4 ("ko-")
        note3: 440.00, // A4 ("ku")
        note4: 493.88, // B4 ("ten-")
        note5: 587.33, // D5 ("no")
        note6: 523.25  // C5 ("yō")
      };
      bass = { b1: 82.41, b2: 65.41, b3: 73.42, b4: 61.74 }; // E2, C2, D2, B1
      timbre = 'punchyHorn';
    } else {
      // Maths (Unit-01): Authentic C Minor (Original)
      scale = {
        note1: 261.63, // C4 ("Zan-")
        note2: 311.13, // Eb4 ("ko-")
        note3: 349.23, // F4 ("ku")
        note4: 349.23, // F4 ("ten-")
        note5: 466.16, // Bb4 ("no")
        note6: 415.30  // Ab4 ("yō")
      };
      bass = { b1: 65.41, b2: 51.91, b3: 58.27, b4: 49.00 }; // C2, Ab1, Bb1, G1
      timbre = 'brassPiano';
    }

    // 124 BPM Sequence: "Zan-ko-ku na ten-shi no yō ni, tē-ze!"
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
      this.playDistinctMelodyNote(note.freq, t + note.time, note.dur, note.accent, timbre);
    });

    bassline.forEach(b => {
      this.playSubBassNote(b.freq, t + b.time, b.dur);
    });
  }

  /**
   * 🌟 EVANGELION EXIT: "Shounen yo Shinwa ni Nare" (Subject Transposed)
   */
  public async playCruelAngelsThesisExit(subject: SubjectThemeKey = 'maths') {
    await this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const s = String(subject).toLowerCase();

    let chordRoots: number[];
    let notes: number[];
    let timbre: 'brassPiano' | 'celestialGlass' | 'punchyHorn' = 'brassPiano';

    if (s.includes('phys')) {
      // A Minor Resolution
      notes = [523.25, 587.33, 659.25, 698.46, 659.25, 587.33, 523.25, 440.00];
      chordRoots = [55.00, 110.00, 130.81, 164.81]; // A1, A2, C3, E3
      timbre = 'celestialGlass';
    } else if (s.includes('chem')) {
      // E Minor Resolution
      notes = [392.00, 440.00, 493.88, 523.25, 493.88, 440.00, 392.00, 329.63];
      chordRoots = [82.41, 164.81, 196.00, 246.94]; // E2, E3, G3, B3
      timbre = 'punchyHorn';
    } else {
      // C Minor Resolution
      notes = [311.13, 349.23, 392.00, 415.30, 392.00, 349.23, 311.13, 261.63];
      chordRoots = [65.41, 130.81, 155.56, 196.00]; // C2, C3, Eb3, G3
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
      this.playDistinctMelodyNote(note.freq, t + note.time, note.dur, note.accent, timbre);
    });

    chordRoots.forEach(freq => {
      this.playSubBassNote(freq, t + 2.88, 1.25);
    });
  }

  /**
   * 🔘 Tactical Cockpit Mechanical Switch Snap
   * Crisp toggle sound for checklist items with subtle high-tech telemetry pip.
   */
  public async playTacticalSwitch() {
    await this.init();
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;

    // 1. Mechanical Toggle Snap (High-passed click)
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = this.noiseBuffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 3500;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, t);
    noiseGain.gain.linearRampToValueAtTime(0.45, t + 0.002);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noiseSrc.start(t);
    noiseSrc.stop(t + 0.025);

    // 2. High-Tech Telemetry Tone Pip
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, t); // A6
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.025);

    oscGain.gain.setValueAtTime(0.001, t);
    oscGain.gain.linearRampToValueAtTime(0.35, t + 0.003);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  /**
   * 📡 Radio Relay Button Click
   * Tactile sci-fi terminal keystroke / button press click.
   */
  public async playRadioRelayClick() {
    await this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.025);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.035);
  }

  /**
   * Subtle organic hover tick (Muted wood / glass tap)
   */
  public async playHover() {
    await this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.03);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.035);
  }

  /**
   * Premium UI Click (Crisp glass/wood hybrid)
   */
  public async playClick() {
    await this.playRadioRelayClick();
  }

  /**
   * Modern Mission Complete (Dual Harmonic Bell)
   */
  public async playSuccess() {
    await this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, t);
    osc1.frequency.exponentialRampToValueAtTime(1046.50, t + 0.12);

    gain1.gain.setValueAtTime(0.001, t);
    gain1.gain.linearRampToValueAtTime(0.32, t + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(t);
    osc1.stop(t + 0.22);

    const t2 = t + 0.12;
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, t2);
    osc2.frequency.exponentialRampToValueAtTime(1567.98, t2 + 0.15);

    gain2.gain.setValueAtTime(0.001, t2);
    gain2.gain.linearRampToValueAtTime(0.32, t2 + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.3);

    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(t2);
    osc2.stop(t2 + 0.32);
  }

  public async playAlert() {
    await this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.38, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  public async playCardFlip() {
    await this.init();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate?.(12); } catch {}
    }
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.025);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.24, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.03);
  }

  public async playStreakChime(streak: number = 5) {
    await this.init();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate?.([25, 50, 25]); } catch {}
    }
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const baseFreqs = streak >= 10 ? [523.25, 659.25, 783.99, 1046.50] : [523.25, 659.25, 783.99];
    
    baseFreqs.forEach((freq, idx) => {
      const noteTime = t + idx * 0.06;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.35, noteTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(noteTime);
      osc.stop(noteTime + 0.26);
    });
  }

  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  public sendDesktopNotification(title: string, body: string, silent: boolean = false) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body, silent, icon: '/favicon.ico' });
      } catch (e) {
        console.error('Failed to send desktop notification', e);
      }
    }
  }

  // Aliases for seamless calling
  public async playEvangelionIgnition(subject?: string) { await this.playCruelAngelsThesisEntrance(subject); }
  public async playEvangelionEject(subject?: string) { await this.playCruelAngelsThesisExit(subject); }
  public async playStartChime() { await this.playCruelAngelsThesisEntrance(); }
  public async playSuccessChime() { await this.playSuccess(); }
  public async playAlertPop() { await this.playAlert(); }
  public stopCockpitTheme() { /* no-op */ }
  public startCockpitTheme() { /* no-op */ }
}

export const audioEngine = new AudioEngine();
