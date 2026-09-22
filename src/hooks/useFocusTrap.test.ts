import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFocusTrap } from './useFocusTrap';

describe('useFocusTrap (BUG-27)', () => {
  let container: HTMLDivElement;
  let btn1: HTMLButtonElement;
  let btn2: HTMLButtonElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.tabIndex = -1;

    btn1 = document.createElement('button');
    btn1.textContent = 'Button 1';

    btn2 = document.createElement('button');
    btn2.textContent = 'Button 2';

    container.appendChild(btn1);
    container.appendChild(btn2);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('traps Tab navigation within container elements and handles boundary wrapping', () => {
    const ref = { current: container };
    renderHook(() => useFocusTrap(ref, true));

    // Focus last element
    btn2.focus();
    expect(document.activeElement).toBe(btn2);

    // Press Tab on last element -> wraps to first
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(tabEvent);
    expect(document.activeElement).toBe(btn1);

    // Press Shift+Tab on first element -> wraps to last
    const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    document.dispatchEvent(shiftTabEvent);
    expect(document.activeElement).toBe(btn2);
  });

  it('pulls focus back inside container if focus escapes to background document', () => {
    const outsideBtn = document.createElement('button');
    document.body.appendChild(outsideBtn);
    outsideBtn.focus();
    expect(document.activeElement).toBe(outsideBtn);

    const ref = { current: container };
    renderHook(() => useFocusTrap(ref, true));

    // Press Tab while focus is outside container -> pulled back into first element
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(tabEvent);
    expect(document.activeElement).toBe(btn1);

    document.body.removeChild(outsideBtn);
  });
});
