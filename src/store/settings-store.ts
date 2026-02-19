import { create } from 'zustand';

// 텍스트 출력 속도 프리셋 (ms per character)
export const TEXT_SPEED_PRESETS = {
  fast: { label: '빠르게', charSpeed: 10, paragraphPause: 200 },
  normal: { label: '보통', charSpeed: 25, paragraphPause: 600 },
  slow: { label: '느리게', charSpeed: 45, paragraphPause: 900 },
  instant: { label: '즉시', charSpeed: 0, paragraphPause: 0 },
} as const;

export type TextSpeedKey = keyof typeof TEXT_SPEED_PRESETS;

interface SettingsState {
  textSpeed: TextSpeedKey;
  setTextSpeed: (speed: TextSpeedKey) => void;
}

function loadTextSpeed(): TextSpeedKey {
  if (typeof window === 'undefined') return 'normal';
  const saved = localStorage.getItem('graymar_textSpeed');
  if (saved && saved in TEXT_SPEED_PRESETS) return saved as TextSpeedKey;
  return 'normal';
}

export const useSettingsStore = create<SettingsState>((set) => ({
  textSpeed: loadTextSpeed(),
  setTextSpeed: (speed) => {
    localStorage.setItem('graymar_textSpeed', speed);
    set({ textSpeed: speed });
  },
}));
