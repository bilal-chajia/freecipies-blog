/**
 * Template Module - UI Store
 * ==========================
 * Minimal UI state used by template components.
 * This is a subset of admin/useStore's useUIStore.
 */

import { create } from 'zustand';

export interface UIState {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'light',
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ 
    theme: state.theme === 'light' ? 'dark' : 'light' 
  })),
}));

export default useUIStore;
