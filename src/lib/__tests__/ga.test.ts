import { describe, it, expect, beforeEach, vi } from 'vitest';

let mod: typeof import('../ga');

function resetDom() {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  // @ts-ignore
  global.window = window;
  // @ts-ignore
  window.dataLayer = undefined;
  // @ts-ignore
  window.gtag = undefined;
}

describe('GA4 helpers', () => {
  beforeEach(async () => {
    resetDom();
    vi.resetModules();
    mod = await import('../ga');
  });

  it('skips when GA_ID is empty and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mod.loadGtagOnce('');
    expect(document.getElementById('ga4-gtag-script')).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('injects gtag script only once and initializes dataLayer/gtag', () => {
    mod.loadGtagOnce('G-TEST');
    mod.loadGtagOnce('G-TEST');
    const scripts = document.querySelectorAll('#ga4-gtag-script');
    expect(scripts.length).toBe(1);

    expect(window.dataLayer).toBeDefined();
    expect(typeof window.gtag).toBe('function');

    const dl = window.dataLayer as any[];
    const hasJsInit = dl.some((args) => Array.isArray(args) && args[0] === 'js');
    const hasConfig = dl.some((args) => Array.isArray(args) && args[0] === 'config' && args[1] === 'G-TEST');
    expect(hasJsInit).toBe(true);
    expect(hasConfig).toBe(true);
  });

  it('sendPageView pushes config with page_path', () => {
    mod.loadGtagOnce('G-TEST');
    const dlBefore = (window.dataLayer as any[]).length;
    mod.sendPageView('/quiz/123', 'G-TEST');
    const dlAfter = window.dataLayer as any[];

    const newPushes = dlAfter.slice(dlBefore);
    const hasPageConfig = newPushes.some(
      (args) =>
        Array.isArray(args) &&
        args[0] === 'config' &&
        args[1] === 'G-TEST' &&
        args[2] &&
        typeof args[2] === 'object' &&
        args[2].page_path === '/quiz/123'
    );
    expect(hasPageConfig).toBe(true);
  });

  it('does not throw on SSR (window undefined)', () => {
    // @ts-ignore
    const prevWindow = global.window;
    // @ts-ignore
    global.window = undefined;
    expect(() => mod.loadGtagOnce('G-TEST')).not.toThrow();
    expect(() => mod.sendPageView('/x', 'G-TEST')).not.toThrow();
    // @ts-ignore
    global.window = prevWindow;
  });
});
