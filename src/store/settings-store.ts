import { create } from 'zustand';

// 텍스트 출력 속도 프리셋 (ms per character)
export const TEXT_SPEED_PRESETS = {
  fast: { label: '빠르게', charSpeed: 10, paragraphPause: 200 },
  normal: { label: '보통', charSpeed: 25, paragraphPause: 600 },
  slow: { label: '느리게', charSpeed: 45, paragraphPause: 900 },
  instant: { label: '즉시', charSpeed: 0, paragraphPause: 0 },
} as const;

export type TextSpeedKey = keyof typeof TEXT_SPEED_PRESETS;

// 폰트 크기 프리셋
export const FONT_SIZE_PRESETS = {
  small:  { label: '작게',  narrative: 15, choice: 14, ui: 13 },
  normal: { label: '보통',  narrative: 17, choice: 16, ui: 14 },
  large:  { label: '크게',  narrative: 19, choice: 18, ui: 15 },
  xlarge: { label: '매우 크게', narrative: 21, choice: 20, ui: 16 },
} as const;

export type FontSizeKey = keyof typeof FONT_SIZE_PRESETS;

interface SettingsState {
  textSpeed: TextSpeedKey;
  fontSize: FontSizeKey;
  setTextSpeed: (speed: TextSpeedKey) => void;
  setFontSize: (size: FontSizeKey) => void;
}

function loadTextSpeed(): TextSpeedKey {
  if (typeof window === 'undefined') return 'normal';
  const saved = localStorage.getItem('graymar_textSpeed');
  if (saved && saved in TEXT_SPEED_PRESETS) return saved as TextSpeedKey;
  return 'normal';
}

function loadFontSize(): FontSizeKey {
  if (typeof window === 'undefined') return 'normal';
  const saved = localStorage.getItem('graymar_fontSize');
  if (saved && saved in FONT_SIZE_PRESETS) return saved as FontSizeKey;
  return 'normal';
}

export const useSettingsStore = create<SettingsState>((set) => ({
  textSpeed: loadTextSpeed(),
  fontSize: loadFontSize(),
  setTextSpeed: (speed) => {
    localStorage.setItem('graymar_textSpeed', speed);
    set({ textSpeed: speed });
  },
  setFontSize: (size) => {
    localStorage.setItem('graymar_fontSize', size);
    set({ fontSize: size });
  },
}));
