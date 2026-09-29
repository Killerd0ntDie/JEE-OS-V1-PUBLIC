/**
 * Advanced UI Audio Engine & Evangelion "A Cruel Angel's Thesis" Synthesizer
 * Generates authentic, loud, crystal-clear anime soundscapes and iconic melodies using the Web Audio API.
 * Refactored into modular sub-synthesizers for context management, anime leads, tactical SFX, and feedback tones.
 */

import { AudioContextManager } from './audio/audioContextManager';
import { EvangelionSynthesizer } from './audio/evangelionSynthesizer';
import { TacticalSfxSynthesizer } from './audio/tacticalSfx';
import { FeedbackSfxSynthesizer } from './audio/feedbackSfx';
import { NotificationManager } from './audio/notificationManager';
import { SubjectThemeKey } from './audio/audioTypes';

export type { SubjectThemeKey };

class AudioEngine {
  private audioMgr: AudioContextManager;
  private evangelionSynth: EvangelionSynthesizer;
  private tacticalSfx: TacticalSfxSynthesizer;
  private feedbackSfx: FeedbackSfxSynthesizer;
  private notifications: NotificationManager;

  constructor() {
    this.audioMgr = new AudioContextManager();
    this.evangelionSynth = new EvangelionSynthesizer(this.audioMgr);
    this.tacticalSfx = new TacticalSfxSynthesizer(this.audioMgr);
    this.feedbackSfx = new FeedbackSfxSynthesizer(this.audioMgr);
    this.notifications = new NotificationManager();
  }

  public async init(): Promise<void> {
    await this.audioMgr.init();
  }

  public setVolume(vol: number): void {
    this.audioMgr.setVolume(vol);
  }

  public getVolume(): number {
    return this.audioMgr.getVolume();
  }

  public setCockpitVolume(vol: number): void {
    this.audioMgr.setCockpitVolume(vol);
  }

  public getCockpitVolume(): number {
    return this.audioMgr.getCockpitVolume();
  }

  public stopEntrancePlayback(): void {
    this.audioMgr.stopEntrancePlayback();
  }

  public stopExitPlayback(): void {
    this.audioMgr.stopExitPlayback();
  }

  public stopAllPlayback(): void {
    this.audioMgr.stopAllPlayback();
  }

  public async playAnimeLaserCharge(subject: SubjectThemeKey = 'maths', animMode?: string): Promise<void> {
    await this.evangelionSynth.playAnimeLaserCharge(subject, animMode);
  }

  public async playCruelAngelsThesisEntrance(subject: SubjectThemeKey = 'maths', intendedOffsetSeconds?: number): Promise<void> {
    await this.evangelionSynth.playCruelAngelsThesisEntrance(subject, intendedOffsetSeconds);
  }

  public async playCruelAngelsThesisExit(subject: SubjectThemeKey = 'maths'): Promise<void> {
    await this.evangelionSynth.playCruelAngelsThesisExit(subject);
  }

  public async playTacticalSwitch(): Promise<void> {
    await this.tacticalSfx.playTacticalSwitch();
  }

  public async playRadioRelayClick(): Promise<void> {
    await this.tacticalSfx.playRadioRelayClick();
  }

  public async playMechanicalKey(tone: 'click' | 'clack' | 'heavy' = 'click'): Promise<void> {
    await this.tacticalSfx.playMechanicalKey(tone);
  }

  public async playTacticalBeep(freq: number = 1174.66): Promise<void> {
    await this.tacticalSfx.playTacticalBeep(freq);
  }

  public async playHover(): Promise<void> {
    await this.tacticalSfx.playHover();
  }

  public async playClick(): Promise<void> {
    await this.tacticalSfx.playRadioRelayClick();
  }

  public async playTap(): Promise<void> {
    await this.playClick();
  }

  public async playSuccess(): Promise<void> {
    await this.feedbackSfx.playSuccess();
  }

  public async playAlert(): Promise<void> {
    await this.feedbackSfx.playAlert();
  }

  public async playCardFlip(): Promise<void> {
    await this.feedbackSfx.playCardFlip();
  }

  public async playStreakChime(streak: number = 5): Promise<void> {
    await this.feedbackSfx.playStreakChime(streak);
  }

  public async requestNotificationPermission(): Promise<boolean> {
    return this.notifications.requestNotificationPermission();
  }

  public sendDesktopNotification(title: string, body: string, silent: boolean = false): void {
    this.notifications.sendDesktopNotification(title, body, silent);
  }

  // Aliases for seamless backward compatibility
  public async playEvangelionIgnition(subject?: string): Promise<void> { await this.playCruelAngelsThesisEntrance(subject); }
  public async playEvangelionEject(subject?: string): Promise<void> { await this.playCruelAngelsThesisExit(subject); }
  public async playStartChime(): Promise<void> { await this.playCruelAngelsThesisEntrance(); }
  public async playSuccessChime(): Promise<void> { await this.playSuccess(); }
  public async playVictoryFanfare(): Promise<void> { await this.playStreakChime(10); }
  public async playAlertPop(): Promise<void> { await this.playAlert(); }
  public async playPowerUp(): Promise<void> { await this.playStreakChime(7); }
  public stopCockpitTheme(): void { this.stopEntrancePlayback(); }
  public startCockpitTheme(): void { /* no-op */ }
}

export const audioEngine = new AudioEngine();
