// ---------------------------------------------------------------------------
// SSE Client — EventSource singleton for party real-time stream
// ---------------------------------------------------------------------------

type EventHandler = (data: unknown) => void;
type ConnectionCallback = () => void;

let eventSource: EventSource | null = null;
const handlers = new Map<string, EventHandler>();
// P3-C2: EventSource 에 실제 등록된 raw 리스너를 추적해 재연결 시 누락 없이
//   removeEventListener 로 정리. offEvent/disconnect 시 누적 리스너 누수 차단.
const rawListeners = new Map<string, EventListener>();
let onConnectCb: ConnectionCallback | null = null;
let onDisconnectCb: ConnectionCallback | null = null;

function getBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  }
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  }
  return '';
}

/**
 * Open an SSE connection to the party stream.
 * Token is passed as a query parameter because EventSource does not support
 * custom headers.
 */
export function connectPartyStream(partyId: string, token: string): void {
  // Tear down any existing connection first
  disconnectPartyStream();

  const url = `${getBaseUrl()}/v1/parties/${partyId}/stream?token=${encodeURIComponent(token)}`;
  eventSource = new EventSource(url);

  eventSource.onopen = () => {
    onConnectCb?.();
  };

  eventSource.onerror = () => {
    // The browser will automatically attempt to reconnect.
    // We fire the disconnect callback so the store can update `isConnected`.
    onDisconnectCb?.();
  };

  // Default "message" event — covers unnamed server events
  eventSource.onmessage = (ev: MessageEvent) => {
    const handler = handlers.get('message');
    if (handler) {
      try {
        handler(JSON.parse(ev.data));
      } catch {
        handler(ev.data);
      }
    }
  };

  // Re-register all named event listeners on the new EventSource
  for (const eventType of handlers.keys()) {
    if (eventType === 'message') continue;
    attachListener(eventType);
  }
}

/** Close the SSE connection and clean up. */
export function disconnectPartyStream(): void {
  if (eventSource) {
    // P3-C2: raw 리스너 제거 후 close — 재연결 시 중복 등록 방지
    for (const [eventType, listener] of rawListeners) {
      eventSource.removeEventListener(eventType, listener);
    }
    rawListeners.clear();
    eventSource.close();
    eventSource = null;
  }
  onDisconnectCb?.();
}

/** Register a handler for a named SSE event type (e.g. "chat:new_message"). */
export function onEvent(eventType: string, handler: EventHandler): void {
  handlers.set(eventType, handler);
  if (eventSource && eventType !== 'message') {
    attachListener(eventType);
  }
}

/** Remove a previously registered event handler. */
export function offEvent(eventType: string): void {
  handlers.delete(eventType);
  // P3-C2: 실제 DOM 리스너도 제거 (누수 방지)
  const rawListener = rawListeners.get(eventType);
  if (rawListener && eventSource) {
    eventSource.removeEventListener(eventType, rawListener);
  }
  rawListeners.delete(eventType);
}

/** Set a callback invoked when the SSE connection opens. */
export function onConnect(cb: ConnectionCallback): void {
  onConnectCb = cb;
}

/** Set a callback invoked when the SSE connection errors / closes. */
export function onDisconnect(cb: ConnectionCallback): void {
  onDisconnectCb = cb;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function attachListener(eventType: string): void {
  if (!eventSource) return;
  // P3-C2: 이미 등록된 리스너가 있으면 먼저 제거 (중복 방지)
  const existing = rawListeners.get(eventType);
  if (existing) {
    eventSource.removeEventListener(eventType, existing);
  }
  const listener = ((ev: MessageEvent) => {
    const handler = handlers.get(eventType);
    if (!handler) return;
    try {
      handler(JSON.parse(ev.data));
    } catch {
      handler(ev.data);
    }
  }) as EventListener;
  eventSource.addEventListener(eventType, listener);
  rawListeners.set(eventType, listener);
}
