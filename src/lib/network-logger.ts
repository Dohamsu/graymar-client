/**
 * 네트워크 호출 로거 — 버그 리포트 분석용 API 타임라인 수집.
 * 모듈 레벨 버퍼에 최근 N개 유지, getNetworkLog()로 스냅샷 추출.
 */

export interface NetworkLogEntry {
  t: number;         // elapsed ms from session start
  method: string;
  path: string;
  status?: number;
  latencyMs: number;
  ok: boolean;
  errorCode?: string;
  errorMsg?: string;
}

const SESSION_START = Date.now();
const LOG_BUFFER: NetworkLogEntry[] = [];
const MAX_ENTRIES = 100;

type FinishFn = (result: {
  status?: number;
  ok: boolean;
  errorCode?: string;
  errorMsg?: string;
}) => void;

export function logNetworkStart(method: string, path: string): FinishFn {
  const startedAt = Date.now();
  const t = startedAt - SESSION_START;
  return (result) => {
    const entry: NetworkLogEntry = {
      t,
      method,
      path,
      status: result.status,
      latencyMs: Date.now() - startedAt,
      ok: result.ok,
      ...(result.errorCode ? { errorCode: result.errorCode } : {}),
      ...(result.errorMsg ? { errorMsg: result.errorMsg } : {}),
    };
    LOG_BUFFER.push(entry);
    if (LOG_BUFFER.length > MAX_ENTRIES) LOG_BUFFER.shift();
  };
}

export function getNetworkLog(): NetworkLogEntry[] {
  return [...LOG_BUFFER];
}

export function clearNetworkLog() {
  LOG_BUFFER.length = 0;
}
