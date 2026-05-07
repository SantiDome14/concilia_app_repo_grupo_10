import { computed, getCurrentInstance, onUnmounted, ref, type ComputedRef, type Ref } from 'vue';
import type { ZodSchema } from 'zod';
import {
  send as sendInternal,
  subscribe as subscribeInternal,
  onStateChange,
  getConnectionState,
  getValidationErrorsCount,
  type SubscribeHandle,
} from '@/lib/websocket-client';
import type { WsConnectionState, WsOutboundMessage } from '@/types/websocket';

// ════════════════════════════════════════════════════════════════════
// useWebSocket — canonical real-time subscription composable
// ────────────────────────────────────────────────────────────────────
// Implements `core-websocket-client`. Each call subscribes to ONE
// channel. The underlying physical connection is a singleton owned by
// `@/lib/websocket-client` and shared across all subscribers.
//
// Cleanup on `onUnmounted` is automatic — consumers do NOT call
// unsubscribe manually.
// ════════════════════════════════════════════════════════════════════

export interface UseWebSocketOptions<T> {
  onMessage?: (message: T) => void;
  onError?: (error: Error) => void;
  /** Cap on the in-memory `messages.value` array (default 50). */
  historyCap?: number;
}

export interface UseWebSocketApi<T> {
  /** Recent messages, newest at the end, capped at `historyCap`. */
  messages: Ref<T[]>;
  /** True only when the underlying connection is `open`. */
  isConnected: ComputedRef<boolean>;
  /** Reactive lifecycle state from the singleton client. */
  connectionState: Ref<WsConnectionState>;
  /** Cumulative count of validation/parse errors observed by this sub. */
  validationErrorsCount: Ref<number>;
  /** Send a message on this channel. Throws WebSocketClosedError when closed. */
  send(data?: unknown, event?: 'message' | 'subscribe' | 'unsubscribe'): void;
  /** Manual unsubscribe (rarely needed — automatic on unmount). */
  unsubscribe(): void;
}

export function useWebSocket<T>(
  channel: string,
  schema: ZodSchema<T>,
  options: UseWebSocketOptions<T> = {},
): UseWebSocketApi<T> {
  const historyCap = options.historyCap ?? 50;
  const messages = ref<T[]>([]) as Ref<T[]>;
  const validationErrorsCount = ref(getValidationErrorsCount());
  const connectionState = ref<WsConnectionState>(getConnectionState());

  const stopStateWatch = onStateChange((s) => {
    connectionState.value = s;
  });

  const handle: SubscribeHandle = subscribeInternal<T>(
    channel,
    schema,
    (msg) => {
      const next = [...messages.value, msg];
      if (next.length > historyCap) next.splice(0, next.length - historyCap);
      messages.value = next;
      if (options.onMessage) options.onMessage(msg);
    },
    (err) => {
      validationErrorsCount.value = getValidationErrorsCount();
      if (options.onError) options.onError(err);
    },
  );

  function send(data?: unknown, event: 'message' | 'subscribe' | 'unsubscribe' = 'message'): void {
    const msg: WsOutboundMessage = { channel, data, event };
    sendInternal(msg);
  }

  function unsubscribe(): void {
    handle.unsubscribe();
    stopStateWatch();
  }

  // Automatic cleanup on component unmount (only when inside a component).
  if (getCurrentInstance()) {
    onUnmounted(unsubscribe);
  }

  return {
    messages,
    isConnected: computed(() => connectionState.value === 'open'),
    connectionState,
    validationErrorsCount,
    send,
    unsubscribe,
  };
}

// Re-export the typed error for consumers that want to branch on it.
export { WebSocketClosedError } from '@/lib/websocket-client';
