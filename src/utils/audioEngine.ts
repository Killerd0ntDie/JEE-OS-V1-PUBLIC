/**
 * Web Audio API based sound synthesizer.
 * Generates lightweight, procedural sound effects without needing external audio files.
 */

class AudioEngine {
  private audioContext: AudioContext | null = null;

  private init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * Plays a sequence of synthesized notes.
   * @param notes Array of frequencies in Hz
   * @param type Oscillator type
   * @param duration Duration of each note in seconds
   * @param volume Volume (0.0 to 1.0)
   */
  private playSequence(notes: number[], type: OscillatorType = 'sine', duration: number = 0.1, volume: number = 0.5) {
    if (!window.AudioContext && !(window as any).webkitAudioContext) return;
    this.init();
    if (!this.audioContext) return;

    const t = this.audioContext.currentTime;

    notes.forEach((freq, index) => {
      if (!this.audioContext) return;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, t + index * duration);

      // Envelope: quick attack, smooth release
      gain.gain.setValueAtTime(0, t + index * duration);
      gain.gain.linearRampToValueAtTime(volume, t + index * duration + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (index + 1) * duration);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start(t + index * duration);
      osc.stop(t + (index + 1) * duration);
    });
  }

  // Common UI Sounds
  public playStartChime(volume: number = 0.5) {
    // Rising futuristic chord (C4, E4, G4)
    this.playSequence([261.63, 329.63, 392.00], 'sine', 0.15, volume);
  }

  public playSuccessChime(volume: number = 0.5) {
    // Success melody (C4, G4, C5)
    this.playSequence([261.63, 392.00, 523.25], 'triangle', 0.2, volume);
  }

  public playAlertPop(volume: number = 0.5) {
    // Quick pop for notifications (High pitch, very short)
    this.playSequence([880, 1760], 'sine', 0.05, volume * 0.7);
  }
}

export const audioEngine = new AudioEngine();
