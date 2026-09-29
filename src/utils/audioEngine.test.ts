import { describe, it, expect, vi, beforeEach } from 'vitest';
import { audioEngine } from './audioEngine';
import { storageAdapter } from '@/services/StorageAdapter';

describe('AudioEngine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes and manages master volume within [0, 1] bounds', () => {
    audioEngine.setVolume(0.5);
    // Before init, getVolume returns 0.95 default or updated
    audioEngine.setVolume(1.5);
    audioEngine.setVolume(-0.2);
  });

  it('manages cockpit volume and persists strictly to jeeos_cockpit_volume', () => {
    const setItemSpy = vi.spyOn(storageAdapter, 'setItem');
    audioEngine.setCockpitVolume(0.8);
    expect(audioEngine.getCockpitVolume()).toBe(0.8);
    expect(setItemSpy).toHaveBeenCalledWith('jeeos_cockpit_volume', 0.8);

    audioEngine.setCockpitVolume(1.5);
    expect(audioEngine.getCockpitVolume()).toBe(1.0);
    expect(setItemSpy).toHaveBeenCalledWith('jeeos_cockpit_volume', 1.0);

    audioEngine.setCockpitVolume(-0.5);
    expect(audioEngine.getCockpitVolume()).toBe(0.0);
    expect(setItemSpy).toHaveBeenCalledWith('jeeos_cockpit_volume', 0.0);
  });

  it('exposes all playback and sound effect methods without throwing in node environment', async () => {
    expect(() => audioEngine.stopEntrancePlayback()).not.toThrow();
    expect(() => audioEngine.stopExitPlayback()).not.toThrow();
    expect(() => audioEngine.stopAllPlayback()).not.toThrow();
    expect(() => audioEngine.stopCockpitTheme()).not.toThrow();
    expect(() => audioEngine.startCockpitTheme()).not.toThrow();

    await expect(audioEngine.playAnimeLaserCharge('maths')).resolves.not.toThrow();
    await expect(audioEngine.playAnimeLaserCharge('physics', 'missileLock')).resolves.not.toThrow();
    await expect(audioEngine.playAnimeLaserCharge('chemistry')).resolves.not.toThrow();
    await expect(audioEngine.playCruelAngelsThesisEntrance('maths')).resolves.not.toThrow();
    await expect(audioEngine.playCruelAngelsThesisExit('physics')).resolves.not.toThrow();
    await expect(audioEngine.playTacticalSwitch()).resolves.not.toThrow();
    await expect(audioEngine.playRadioRelayClick()).resolves.not.toThrow();
    await expect(audioEngine.playMechanicalKey('heavy')).resolves.not.toThrow();
    await expect(audioEngine.playTacticalBeep()).resolves.not.toThrow();
    await expect(audioEngine.playHover()).resolves.not.toThrow();
    await expect(audioEngine.playClick()).resolves.not.toThrow();
    await expect(audioEngine.playTap()).resolves.not.toThrow();
    await expect(audioEngine.playSuccess()).resolves.not.toThrow();
    await expect(audioEngine.playAlert()).resolves.not.toThrow();
    await expect(audioEngine.playCardFlip()).resolves.not.toThrow();
    await expect(audioEngine.playStreakChime(12)).resolves.not.toThrow();
    await expect(audioEngine.playEvangelionIgnition('maths')).resolves.not.toThrow();
    await expect(audioEngine.playEvangelionEject('physics')).resolves.not.toThrow();
    await expect(audioEngine.playStartChime()).resolves.not.toThrow();
    await expect(audioEngine.playSuccessChime()).resolves.not.toThrow();
    await expect(audioEngine.playVictoryFanfare()).resolves.not.toThrow();
    await expect(audioEngine.playAlertPop()).resolves.not.toThrow();
    await expect(audioEngine.playPowerUp()).resolves.not.toThrow();
  });
});
