import { ZodError, type ZodSchema } from 'zod';
import { ApiError } from '@/types/api';
import type {
  WsClientOptions,
  WsConnectionState,
  WsInboundEnvelope,
  WsOutboundMessage,
} from '@/types/websocket';

// ════════════════════════════════════════════════════════════════════
// WebSocket singleton client
// ────────────────────────────────────────────────────────────────────
// Owns the single physical connection, multiplexes channels, drives
// reconnection with exponential backoff, queues outbound messages
// during disconnect, and refreshes auth tokens on demand.
//
// Composables consume this via `useWebSocket(channel, schema)`; this
// file is internal — application code SHALL not import from here
// directly (lint convention; not enforced beyond review).
// ════════════════════════════════════════════════════════════════════

type Listener = (envelope: WsInboundEnvelope) => void;

interface ChannelSubscription {
  channel: string;
  listeners: Set<Listener>;
}

const channelSubs = new Map<string, ChannelSubscription>();
const stateListeners = new Set<(state: WsConnectionState) => void>();

let _socket: WebSocket | null = null;
let _state: WsConnectionState = 'idle';
let _retryAttempts = 0;
let _outboundQueue: WsOutboundMessage[] = [];
let _accessTokenGetter: (() => Promise<string | undefined>) | null = null;
let _wsUrl: string | null = null;
let _options: Required<WsClientOptions> = {
  maxRetries: 6,
  queueCap: 100,
  initialDelayMs: 1000,
  factor: 2,
  jitter: 0.2,
};
let _validationErrorsCount = 0;
let _lastError: Error | null = null;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function setState(next: WsConnectionState): void {
  _state = next;
  for (const listener of stateListeners) listener(next);
}

function withJitter(baseMs: number, jitter: number): number {
  const variance = baseMs * jitter;
  return baseMs + (Math.random() * 2 - 1) * variance;
}

async function buildUrl(): Promise<string> {
  if (!_wsUrl) throw new ApiError('VITE_WS_URL not configured', 0, 'WS_URL_MISSING');
  if (_accessTokenGetter) {
    try {
      const token = await _accessTokenGetter();
      if (token) {
        const sep = _wsUrl.includes('?') ? '&' : '?';
        return `${_wsUrl}${sep}access_token=${encodeURIComponent(token)}`;
      }
    } catch {
      // Proceed without token — server may close us with auth-required
      // and we'll re-handshake on next attempt.
    }
  }
  return _wsUrl;
}

function flushQueue(): void {
  if (!_socket || _socket.readyState !== WebSocket.OPEN) return;
  while (_outboundQueue.length > 0) {
    const msg = _outboundQueue.shift();
    if (msg) _socket.send(JSON.stringify(msg));
  }
}

function dispatchInbound(raw: string): void {
  let envelope: WsInboundEnvelope;
  try {
    envelope = JSON.parse(raw) as WsInboundEnvelope;
  } catch {
    _validationErrorsCount += 1;
    console.warn('[ws] dropped non-JSON frame', raw.slice(0, 200));
    return;
  }
  if (!envelope || typeof envelope !== 'object' || typeof envelope.channel !== 'string') {
    _validationErrorsCount += 1;
    console.warn('[ws] dropped frame without channel discriminator', envelope);
    return;
  }
  const sub = channelSubs.get(envelope.channel);
  if (!sub) return;
  for (const listener of sub.listeners) listener(envelope);
}

function scheduleReconnect(): void {
  if (_retryAttempts >= _options.maxRetries) {
    setState('closed');
    return;
  }
  setState('reconnecting');
  _retryAttempts += 1;
  const base = _options.initialDelayMs * Math.pow(_options.factor, _retryAttempts - 1);
  const delay = withJitter(base, _options.jitter);
  if (_reconnectTimer !== null) clearTimeout(_reconnectTimer);
  _reconnectTimer = setTimeout(() => {
    _reconnectTimer = null;
    void connect();
  }, delay);
}

async function connect(): Promise<void> {
  if (_state === 'open' || _state === 'connecting') return;
  if (channelSubs.size === 0) return; // nothing subscribed → don't open
  setState('connecting');
  let url: string;
  try {
    url = await buildUrl();
  } catch (e) {
    _lastError = e instanceof Error ? e : new Error(String(e));
    setState('error');
    return;
  }

  try {
    _socket = new WebSocket(url);
  } catch (e) {
    _lastError = e instanceof Error ? e : new Error(String(e));
    scheduleReconnect();
    return;
  }

  _socket.onopen = () => {
    _retryAttempts = 0;
    _lastError = null;
    setState('open');
    // Re-issue subscribe for every channel after (re)connect.
    for (const sub of channelSubs.values()) {
      const msg: WsOutboundMessage = { channel: sub.channel, event: 'subscribe' };
      _socket?.send(JSON.stringify(msg));
    }
    flushQueue();
  };

  _socket.onmessage = (event) => {
    if (typeof event.data === 'string') dispatchInbound(event.data);
  };

  _socket.onerror = () => {
    _lastError = new Error('WebSocket error');
  };

  _socket.onclose = (event) => {
    _socket = null;
    // Recoverable close codes → reconnect; unrecoverable → close.
    // 1000 = normal closure (we asked for it), 4001 = our convention
    // for "auth expired, please refresh and reconnect".
    if (event.code === 1000) {
      setState('closed');
      return;
    }
    scheduleReconnect();
  };
}

// ─── Public client api (consumed by useWebSocket) ─────────────────────

export function setWsUrl(url: string): void {
  _wsUrl = url || null;
}

export function setWsAccessTokenGetter(
  getter: () => Promise<string | undefined>,
): void {
  _accessTokenGetter = getter;
}

export function configureWsClient(options: WsClientOptions): void {
  if (options.maxRetries !== undefined) {
    if (options.maxRetries < 1) {
      throw new Error('[ws] maxRetries SHALL be a positive integer');
    }
    _options.maxRetries = options.maxRetries;
  }
  if (options.queueCap !== undefined) _options.queueCap = options.queueCap;
  if (options.initialDelayMs !== undefined) _options.initialDelayMs = options.initialDelayMs;
  if (options.factor !== undefined) _options.factor = options.factor;
  if (options.jitter !== undefined) _options.jitter = options.jitter;
}

export function getConnectionState(): WsConnectionState {
  return _state;
}

export function getLastError(): Error | null {
  return _lastError;
}

export function getValidationErrorsCount(): number {
  return _validationErrorsCount;
}

export function onStateChange(listener: (state: WsConnectionState) => void): () => void {
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

export interface SubscribeHandle {
  channel: string;
  unsubscribe(): void;
}

export function subscribe<T>(
  channel: string,
  schema: ZodSchema<T>,
  onMessage: (message: T) => void,
  onError?: (error: Error) => void,
): SubscribeHandle {
  let sub = channelSubs.get(channel);
  const isFirstSubscriber = !sub;
  if (!sub) {
    sub = { channel, listeners: new Set<Listener>() };
    channelSubs.set(channel, sub);
  }

  const listener: Listener = (envelope) => {
    try {
      const parsed = schema.parse(envelope.data);
      onMessage(parsed);
    } catch (e) {
      _validationErrorsCount += 1;
      const err =
        e instanceof ZodError
          ? new Error(`Validation error on channel '${channel}': ${e.message}`)
          : e instanceof Error
            ? e
            : new Error(String(e));
      console.warn('[ws] dropped invalid message', {
        channel,
        error: err.message,
      });
      if (onError) onError(err);
    }
  };
  sub.listeners.add(listener);

  if (isFirstSubscriber && _socket?.readyState === WebSocket.OPEN) {
    const msg: WsOutboundMessage = { channel, event: 'subscribe' };
    _socket.send(JSON.stringify(msg));
  } else if (channelSubs.size === 1) {
    // First-ever subscription → open the connection lazily.
    void connect();
  }

  return {
    channel,
    unsubscribe(): void {
      const current = channelSubs.get(channel);
      if (!current) return;
      current.listeners.delete(listener);
      if (current.listeners.size === 0) {
        channelSubs.delete(channel);
        if (_socket?.readyState === WebSocket.OPEN) {
          const msg: WsOutboundMessage = { channel, event: 'unsubscribe' };
          _socket.send(JSON.stringify(msg));
        }
      }
    },
  };
}

export class WebSocketClosedError extends Error {
  constructor() {
    super('WebSocket connection is closed; cannot send');
    this.name = 'WebSocketClosedError';
  }
}

export function send(message: WsOutboundMessage): void {
  if (_state === 'closed' || _state === 'error') {
    throw new WebSocketClosedError();
  }
  if (_socket?.readyState === WebSocket.OPEN) {
    _socket.send(JSON.stringify(message));
    return;
  }
  // Queue while connecting / reconnecting.
  if (_outboundQueue.length >= _options.queueCap) {
    _outboundQueue.shift(); // drop oldest
    console.warn('[ws] queue cap reached, oldest message dropped');
  }
  _outboundQueue.push(message);
}

/** Force a re-handshake (e.g. after `setWsAccessTokenGetter` updates). */
export function refreshAuth(): void {
  if (!_socket) return;
  try {
    _socket.close(4001, 'auth refresh');
  } catch {
    // ignore
  }
  // onclose will trigger scheduleReconnect → new handshake with fresh token.
}

// ── Internal — exposed only for tests ─────────────────────────────────

export const _internals = {
  reset(): void {
    if (_reconnectTimer !== null) {
      clearTimeout(_reconnectTimer);
      _reconnectTimer = null;
    }
    if (_socket) {
      try {
        _socket.close();
      } catch {
        // ignore
      }
    }
    _socket = null;
    channelSubs.clear();
    stateListeners.clear();
    _outboundQueue = [];
    _state = 'idle';
    _retryAttempts = 0;
    _validationErrorsCount = 0;
    _lastError = null;
    _wsUrl = null;
    _accessTokenGetter = null;
    _options = {
      maxRetries: 6,
      queueCap: 100,
      initialDelayMs: 1000,
      factor: 2,
      jitter: 0.2,
    };
  },
  getQueue(): WsOutboundMessage[] {
    return [..._outboundQueue];
  },
  getRetryAttempts(): number {
    return _retryAttempts;
  },
  getSocket(): WebSocket | null {
    return _socket;
  },
};
