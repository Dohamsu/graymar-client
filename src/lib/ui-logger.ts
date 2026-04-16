/**
 * UI 디버그 로거 — 스트리밍/타이핑 파이프라인 추적용
 * 모듈 레벨 버퍼에 이벤트 누적, 버그 리포트 시 포함.
 */

interface UiLogEntry {
  t: number;   // elapsed ms from session start
  tag: string; // category (e.g. 'stream', 'typer', 'narrator', 'flush')
  msg: string; // event description
  data?: Record<string, unknown>; // optional payload
}

const SESSION_START = Date.now();
const LOG_BUFFER: UiLogEntry[] = [];
const MAX_ENTRIES = 200;

export function uiLog(tag: string, msg: string, data?: Record<string, unknown>) {
  const entry: UiLogEntry = {
    t: Date.now() - SESSION_START,
    tag,
    msg,
    ...(data ? { data } : {}),
  };
  LOG_BUFFER.push(entry);
  if (LOG_BUFFER.length > MAX_ENTRIES) {
    LOG_BUFFER.shift();
  }
  // 개발 콘솔에도 출력 (window.__UI_DEBUG__ = true 설정 시)
  if (typeof window !== 'undefined' && '__UI_DEBUG__' in window) {
    console.log(`[${tag}] ${msg}`, data ?? '');
  }
}

/** 현재 로그 버퍼 스냅샷 반환 (버그 리포트용) */
export function getUiLogs(): UiLogEntry[] {
  return [...LOG_BUFFER];
}

/** 버퍼 초기화 */
export function clearUiLogs() {
  LOG_BUFFER.length = 0;
}
