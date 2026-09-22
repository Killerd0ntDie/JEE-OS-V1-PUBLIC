import { describe, it, expect } from 'vitest';
import { AdaptiveInkScanner } from './AdaptiveInkScanner';

describe('AdaptiveInkScanner', () => {
  it('identifies dark ink vs faint watermark correctly', () => {
    const width = 100;
    const height = 50;
    const pixelData = new Uint8ClampedArray(width * height * 4);
    pixelData.fill(255); // white background

    // Add grey watermark (lum ~220)
    for (let y = 10; y < 20; y++) {
      for (let x = 10; x < 90; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 220;
        pixelData[idx + 1] = 220;
        pixelData[idx + 2] = 220;
      }
    }

    // Add dark ink (lum ~10)
    for (let y = 30; y < 35; y++) {
      for (let x = 40; x < 60; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 10;
        pixelData[idx + 1] = 10;
        pixelData[idx + 2] = 10;
      }
    }

    const mockCtx = {
      getImageData: (x: number, y: number, w: number, h: number) => {
        const sub = new Uint8ClampedArray(w * h * 4);
        for (let row = 0; row < h; row++) {
          const srcOff = ((y + row) * width + x) * 4;
          const dstOff = row * w * 4;
          sub.set(pixelData.subarray(srcOff, srcOff + w * 4), dstOff);
        }
        return { data: sub };
      }
    } as any;

    const profile = AdaptiveInkScanner.computeInkProfile(mockCtx, width, height);
    expect(profile.inkThreshold).toBeLessThanOrEqual(185);

    const rowInk = AdaptiveInkScanner.scanRowInk(pixelData, width, 0, height - 1, profile);
    // Watermark rows (10..19) should have 0 ink counted
    expect(rowInk[15]).toBe(0);
    // Dark ink rows (30..34) should have ink counted
    expect(rowInk[32]).toBe(20);
  });

  it('groups contiguous ink rows into bands with gap tolerance', () => {
    const rowInk = new Int32Array(50);
    // Band 1: rows 10-15
    for (let i = 10; i <= 15; i++) rowInk[i] = 25;
    // Gap: rows 16-22 (gap of 7 > maxGap 5)
    // Band 2: rows 23-30
    for (let i = 23; i <= 30; i++) rowInk[i] = 25;

    const bands = AdaptiveInkScanner.groupInkIntoBands(rowInk, 0, 49, 15, 5);
    expect(bands.length).toBe(2);
    expect(bands[0].start).toBe(10);
    expect(bands[0].end).toBe(15);
    expect(bands[1].start).toBe(23);
    expect(bands[1].end).toBe(30);
  });
});
