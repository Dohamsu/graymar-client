// ---------------------------------------------------------------------------
// SSE Client — EventSource singleton for party real-time stream
// ---------------------------------------------------------------------------

type EventHandler = (data: unknown) => void;
type ConnectionCallback = () => void;

let eventSource: EventSource | null = null;
const handlers = new Map<string, EventHandler>();
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
  // EventSource does not expose removeEventListener by event name in a
  // simple way; the listener will simply no-op when the handler is gone.
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
  eventSource.addEventListener(eventType, ((ev: MessageEvent) => {
    const handler = handlers.get(eventType);
    if (!handler) return;
    try {
      handler(JSON.parse(ev.data));
    } catch {
      handler(ev.data);
    }
  }) as EventListener);
}
