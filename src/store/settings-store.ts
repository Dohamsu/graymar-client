import { create } from 'zustand';

// 텍스트 출력 속도 프리셋 (ms per character)
export const TEXT_SPEED_PRESETS = {
  fast: { label: '빠르게', charSpeed: 10, paragraphPause: 200 },
  normal: { label: '보통', charSpeed: 25, paragraphPause: 600 },
  slow: { label: '느리게', charSpeed: 45, paragraphPause: 900 },
  instant: { label: '즉시', charSpeed: 0, paragraphPause: 0 },
} as const;

export type TextSpeedKey = keyof typeof TEXT_SPEED_PRESETS;
/** 구조적 타입 — 런타임 조정된 preset(dialogue 전용 charSpeed 감소 등)도 받기 위함 */
export interface TextSpeedPreset {
  readonly charSpeed: number;
  readonly paragraphPause: number;
  readonly label?: string;
}

/**
 * 타이핑 딜레이 계산 (3곳 공통).
 *
 * pos는 "이번에 표시할 글자의 위치" = "방금 표시한 글자 다음".
 *  - 예) text="abc", pos=2 → text[1]='b'가 방금 표시됨, 'c' 표시 전 대기 시간
 *
 * 규칙:
 *  - \n\n → paragraphPause (문단 경계)
 *  - …   → charSpeed × 7 (말줄임, 여운)
 *  - .!?。 → charSpeed × 5 (문장 끝)
 *  - ,;，、 → charSpeed × 2 (호흡 분할)
 *  - 그 외 → charSpeed
 */
export function getTypingDelay(
  text: string,
  pos: number,
  preset: TextSpeedPreset,
): number {
  if (preset.charSpeed === 0) return 0;
  if (pos <= 0) return preset.charSpeed;
  const ch = text[pos - 1];
  if (!ch) return preset.charSpeed;
  // 문단 경계: 방금 \n 표시 + 다음도 \n
  if (ch === '\n' && pos < text.length && text[pos] === '\n') {
    return preset.paragraphPause;
  }
  // 말줄임 (U+2026) — 여운 강조
  if (ch === '…') return preset.charSpeed * 7;
  // 문장 끝
  if ('.!?。'.includes(ch)) return preset.charSpeed * 5;
  // 쉼표 계열
  if (',;，、'.includes(ch)) return preset.charSpeed * 2;
  return preset.charSpeed;
}

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
