// ---------------------------------------------------------------------------
// LLM SSE Stream Client
// EventSource + query param token (AuthGuard 호환)
// 서버 엔드포인트: GET /v1/runs/:runId/turns/:turnNo/stream?token=JWT
// 이벤트 형식:
//   { type: 'narration', text } — 서술 세그먼트
//   { type: 'dialogue', text, npcName, npcImage } — NPC 대사 세그먼트
//   { type: 'token', text } — raw 토큰 (하위 호환)
//   { type: 'done', narrative, choices } — 후처리 완료
//   { type: 'error', message }
// ---------------------------------------------------------------------------

export interface LlmTokenEvent {
  type: 'token';
  text: string;
}

export interface LlmNarrationEvent {
  type: 'narration';
  text: string;
}

export interface LlmDialogueEvent {
  type: 'dialogue';
  text: string;
  npcName?: string;
  npcImage?: string;
}

export interface LlmDoneEvent {
  type: 'done';
  narrative: string;
  choices?: Array<{ id: string; label: string; action?: { payload?: { affordance?: string } } }>;
}

export interface LlmErrorEvent {
  type: 'error';
  message: string;
}

export type LlmStreamEvent = LlmTokenEvent | LlmNarrationEvent | LlmDialogueEvent | LlmDoneEvent | LlmErrorEvent;

export interface LlmStreamCallbacks {
  onToken: (text: string) => void;
  onNarration?: (text: string) => void;
  onDialogue?: (text: string, npcName?: string, npcImage?: string) => void;
  onDone: (narrative: string, choices?: LlmDoneEvent['choices']) => void;
  onError: (message: string) => void;
}

function getBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  }
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  }
  // 외부 접속 (ngrok/Vercel) — 상대경로로 Next.js rewrites 프록시 사용
  return '';
}

/**
 * LLM 서술 SSE 스트림을 열고, 토큰/완료/에러 콜백을 호출한다.
 * 반환값: disconnect 함수
 */
export function connectLlmStream(
  runId: string,
  turnNo: number,
  token: string,
  callbacks: LlmStreamCallbacks,
): () => void {
  const url = `${getBaseUrl()}/v1/runs/${runId}/turns/${turnNo}/stream?token=${encodeURIComponent(token)}`;
  const es = new EventSource(url);
  let closed = false;

  es.onmessage = (ev: MessageEvent) => {
    if (closed) return;
    try {
      const data = JSON.parse(ev.data as string) as LlmStreamEvent;
      switch (data.type) {
        case 'token':
          callbacks.onToken(data.text);
          break;
        case 'narration':
          callbacks.onNarration?.(data.text);
          break;
        case 'dialogue':
          callbacks.onDialogue?.(data.text, data.npcName, data.npcImage);
          break;
        case 'done':
          callbacks.onDone(data.narrative, data.choices);
          cleanup();
          break;
        case 'error':
          callbacks.onError(data.message);
          cleanup();
          break;
      }
    } catch {
      // JSON 파싱 실패 무시
    }
  };

  es.onerror = () => {
    if (closed) return;
    // EventSource 자동 재연결 방지 — 에러 시 정리 후 폴링 fallback
    callbacks.onError('SSE 연결이 끊어졌습니다.');
    cleanup();
  };

  function cleanup() {
    if (closed) return;
    closed = true;
    es.close();
  }

  return cleanup;
}
