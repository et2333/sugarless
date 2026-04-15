import { create } from 'zustand';

type UIScale = 0.8 | 1 | 1.3;

interface UIState {
  fontScale: UIScale;
  setFontScale: (scale: UIScale) => void;
}

const STORAGE_KEY = 'ui.fontScale';

export const useUIStore = create<UIState>((set) => ({
  fontScale: (() => {
    const fromStorage = localStorage.getItem(STORAGE_KEY);
    const num = fromStorage ? Number(fromStorage) : 1;
    const allowed = [0.8, 1, 1.3] as const;
    return (allowed as readonly number[]).includes(num) ? (num as UIScale) : 1;
  })(),
  setFontScale: (scale) => {
    localStorage.setItem(STORAGE_KEY, String(scale));
    set({ fontScale: scale });
  },
}));
