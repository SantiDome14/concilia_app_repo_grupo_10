import type { ZodSchema } from 'zod';

// ════════════════════════════════════════════════════════════════════
// WebSocket — types for the real-time channel contract
// ────────────────────────────────────────────────────────────────────
// Implements the contract defined in `core-websocket-client`. A single
// physical connection is shared across the whole app; consumers reach
// it exclusively via `useWebSocket(channel, schema)`.
// ════════════════════════════════════════════════════════════════════

/** Canonical states of the singleton WebSocket connection. */
export type WsConnectionState =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'reconnecting'
  | 'closed'
  | 'error';

/**
 * Wire envelope every inbound frame conforms to. The `channel`
 * discriminator routes the payload to subscribers; the `event`
 * field is opaque to the client and lives inside `data`.
 */
export interface WsInboundEnvelope {
  /** Topic discriminator — routes to the right subscriber(s). */
  channel: string;
  /** Per-channel payload validated against the subscriber's Zod schema. */
  data: unknown;
}

/**
 * Outbound message shape. Apps send domain-specific payloads; the
 * client only enforces that there is a `channel` for routing on
 * the server side.
 */
export interface WsOutboundMessage {
  channel: string;
  data?: unknown;
  /** Server may use this to track subscribe/unsubscribe lifecycle. */
  event?: 'subscribe' | 'unsubscribe' | 'message';
}

export interface WsClientOptions {
  /** Override the default reconnect retry cap. */
  maxRetries?: number;
  /** Outbound queue cap during disconnect (default 100). */
  queueCap?: number;
  /** Initial backoff delay (ms). */
  initialDelayMs?: number;
  /** Backoff multiplicative factor. */
  factor?: number;
  /** Jitter ±fraction. */
  jitter?: number;
}

export interface UseWebSocketOptions<T> {
  /** Optional onMessage handler (in addition to the reactive `messages` ref). */
  onMessage?: (message: T) => void;
  /** Optional onError handler. */
  onError?: (error: Error) => void;
  /** Cap on the in-memory `messages.value` array (default 50). */
  historyCap?: number;
  /** Schema MUST be passed when subscribing — schema-less subs forbidden. */
  schema: ZodSchema<T>;
}
