import { describe, it, expect } from 'vitest';

// zustand's persist middleware defaults to `window.localStorage` and, when no
// storage is available, returns early WITHOUT attaching its `.persist` API or
// writing anything. The Vitest node env has no `window`, so we provide a minimal
// `window.localStorage` BEFORE importing the store, then assert real round-trip
// behavior (which also validates the exact JSON shape the anti-FOUC script reads).
function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

describe('useUIStore persistence', () => {
  it('persists theme + sidebarOpen under freecipies-ui in the { state } shape the anti-FOUC script reads', async () => {
    const ls = createLocalStorageMock();
    (globalThis as unknown as { window: { localStorage: Storage } }).window = {
      localStorage: ls as unknown as Storage,
    };

    const { useUIStore } = await import('../useStore');

    // persist API is attached now that storage is available
    expect(useUIStore.persist.getOptions().name).toBe('freecipies-ui');

    // a state change writes through to storage, partialized to theme + sidebarOpen
    useUIStore.getState().setTheme('dark');

    const raw = ls.getItem('freecipies-ui');
    expect(raw).toBeTruthy();

    const parsed = JSON.parse(raw as string);
    expect(parsed.state.theme).toBe('dark');
    expect(Object.keys(parsed.state).sort()).toEqual(['sidebarOpen', 'theme']);
  });
});
