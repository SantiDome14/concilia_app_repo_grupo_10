import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';
import {
  useWebSocket,
  WebSocketClosedError,
} from './useWebSocket';
import {
  setWsUrl,
  configureWsClient,
  send as clientSend,
  _internals as ws,
} from '@/lib/websocket-client';

// ─── Fake WebSocket implementation (jsdom doesn't ship a full one) ───
// Extends EventTarget so MSW's WebSocket interceptor — which is installed
// globally by `tests/setup.ts` and calls addEventListener on the "real"
// WebSocket during passthrough — can interact with the stub without
// throwing. The spec's own logic still drives the lifecycle via the
// imperative `triggerOpen` / `receive` / `triggerClose` helpers.
class FakeWebSocket extends EventTarget {
  static CONNECTING = 0 as const;
  static OPEN = 1 as const;
  static CLOSING = 2 as const;
  static CLOSED = 3 as const;
  static instances: FakeWebSocket[] = [];

  url: string;
  readyState: number = FakeWebSocket.CONNECTING;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  sentFrames: string[] = [];

  constructor(url: string) {
    super();
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  // ── Test helpers (NOT part of the WebSocket spec) ──────────────────
  triggerOpen(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }
  receive(payload: unknown): void {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    this.onmessage?.({ data } as MessageEvent);
  }
  triggerClose(code = 1006): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code } as CloseEvent);
  }

  // ── Real WebSocket API surface ─────────────────────────────────────
  send(data: string): void {
    this.sentFrames.push(data);
  }
  close(code = 1000): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code } as CloseEvent);
  }
}

// Inject the fake into globalThis BEFORE the client uses it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).WebSocket = FakeWebSocket;

const QuoteSchema = z.object({
  pair: z.string(),
  price: z.number(),
});
type Quote = z.infer<typeof QuoteSchema>;

beforeEach(() => {
  ws.reset();
  FakeWebSocket.instances = [];
  setWsUrl('wss://test/ws');
  configureWsClient({
    initialDelayMs: 1,
    factor: 1,
    jitter: 0,
    maxRetries: 3,
    queueCap: 5,
  });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  ws.reset();
});

function lastSocket(): FakeWebSocket {
  const s = FakeWebSocket.instances.at(-1);
  if (!s) throw new Error('no socket');
  return s;
}

describe('useWebSocket — lazy connect & multiplexing', () => {
  it('opens the connection lazily on first subscribe', async () => {
    expect(FakeWebSocket.instances).toHaveLength(0);
    useWebSocket('quotes', QuoteSchema);
    // microtask to allow connect()'s `await buildUrl` to resolve
    await Promise.resolve();
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('multiplexes multiple channels on a single physical socket', async () => {
    useWebSocket('quotes', QuoteSchema);
    useWebSocket('alerts', QuoteSchema);
    await Promise.resolve();
    expect(FakeWebSocket.instances).toHaveLength(1);
    lastSocket().triggerOpen();
    // After open, both channels emit a `subscribe` frame upstream.
    const subFrames = lastSocket().sentFrames.map((f) => JSON.parse(f));
    expect(subFrames).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ channel: 'quotes', event: 'subscribe' }),
        expect.objectContaining({ channel: 'alerts', event: 'subscribe' }),
      ]),
    );
  });

  it('routes inbound messages only to the subscribed channel', async () => {
    const quotes: Quote[] = [];
    const alerts: Quote[] = [];
    useWebSocket('quotes', QuoteSchema, { onMessage: (m) => quotes.push(m) });
    useWebSocket('alerts', QuoteSchema, { onMessage: (m) => alerts.push(m) });
    await Promise.resolve();
    lastSocket().triggerOpen();

    lastSocket().receive({ channel: 'quotes', data: { pair: 'BTC/USD', price: 1 } });
    lastSocket().receive({ channel: 'alerts', data: { pair: 'ETH/USD', price: 2 } });

    expect(quotes).toEqual([{ pair: 'BTC/USD', price: 1 }]);
    expect(alerts).toEqual([{ pair: 'ETH/USD', price: 2 }]);
  });
});

describe('useWebSocket — schema validation', () => {
  it('drops messages failing the Zod schema and increments validationErrorsCount', async () => {
    const errors: Error[] = [];
    const sub = useWebSocket('quotes', QuoteSchema, {
      onError: (e) => errors.push(e),
    });
    await Promise.resolve();
    lastSocket().triggerOpen();

    lastSocket().receive({ channel: 'quotes', data: { pair: 'BTC/USD' } }); // missing `price`

    expect(sub.messages.value).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(sub.validationErrorsCount.value).toBeGreaterThan(0);
  });

  it('caps the in-memory history at historyCap', async () => {
    const sub = useWebSocket('quotes', QuoteSchema, { historyCap: 3 });
    await Promise.resolve();
    lastSocket().triggerOpen();
    for (let i = 0; i < 5; i += 1) {
      lastSocket().receive({ channel: 'quotes', data: { pair: 'BTC/USD', price: i } });
    }
    expect(sub.messages.value).toHaveLength(3);
    expect(sub.messages.value.map((m) => m.price)).toEqual([2, 3, 4]);
  });
});

describe('useWebSocket — outbound queue & send semantics', () => {
  it('forwards send() while open', async () => {
    const sub = useWebSocket('quotes', QuoteSchema);
    await Promise.resolve();
    lastSocket().triggerOpen();
    lastSocket().sentFrames = []; // clear initial subscribe frames

    sub.send({ pair: 'BTC/USD', price: 100 });
    expect(lastSocket().sentFrames).toHaveLength(1);
    expect(JSON.parse(lastSocket().sentFrames[0]!)).toMatchObject({
      channel: 'quotes',
      data: { pair: 'BTC/USD', price: 100 },
    });
  });

  it('queues messages while disconnected and flushes on reconnect', async () => {
    const sub = useWebSocket('quotes', QuoteSchema);
    await Promise.resolve();
    // Don't trigger open yet.
    sub.send({ ping: 1 });
    sub.send({ ping: 2 });
    expect(ws.getQueue()).toHaveLength(2);

    lastSocket().triggerOpen();
    expect(ws.getQueue()).toHaveLength(0);
    // initial subscribe + 2 queued frames
    const sentEvents = lastSocket().sentFrames.map((f) => JSON.parse(f));
    expect(sentEvents.filter((e) => e.event === 'message')).toHaveLength(2);
  });

  it('drops the oldest queued message when queueCap is exceeded', async () => {
    const sub = useWebSocket('quotes', QuoteSchema);
    await Promise.resolve();
    for (let i = 0; i < 7; i += 1) {
      sub.send({ ping: i });
    }
    // queueCap is 5, so after pushing 7 the first 2 are dropped.
    expect(ws.getQueue()).toHaveLength(5);
    const pings = ws
      .getQueue()
      .map((m) => (m.data as { ping: number }).ping);
    expect(pings).toEqual([2, 3, 4, 5, 6]);
  });

  it('throws WebSocketClosedError when sending after maxRetries exhausted', async () => {
    useWebSocket('quotes', QuoteSchema);
    await Promise.resolve();

    // Drive failures: each connect attempt → onclose with non-1000 → schedule
    // reconnect → next attempt fires.
    for (let i = 0; i < 4; i += 1) {
      lastSocket().triggerClose(1006);
      vi.advanceTimersByTime(10);
      await Promise.resolve();
      await Promise.resolve();
    }
    // After exceeding maxRetries=3, state is `closed`.
    expect(() => clientSend({ channel: 'quotes', data: 1 })).toThrow(
      WebSocketClosedError,
    );
  });
});

describe('useWebSocket — reconnect lifecycle', () => {
  it('schedules a reconnect on non-normal close and re-issues subscribe frames', async () => {
    useWebSocket('quotes', QuoteSchema);
    await Promise.resolve();
    lastSocket().triggerOpen();
    expect(ws.getRetryAttempts()).toBe(0);

    lastSocket().triggerClose(1006);
    vi.advanceTimersByTime(10);
    await Promise.resolve();
    await Promise.resolve();

    expect(FakeWebSocket.instances.length).toBeGreaterThan(1);
    lastSocket().triggerOpen();
    // After reopen, re-issued subscribe frame for the active channel.
    const subFrames = lastSocket().sentFrames
      .map((f) => JSON.parse(f))
      .filter((f) => f.event === 'subscribe');
    expect(subFrames).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ channel: 'quotes' }),
      ]),
    );
  });

  it('transitions to `closed` permanently after exceeding maxRetries', async () => {
    const sub = useWebSocket('quotes', QuoteSchema);
    await Promise.resolve();

    // 4 sequential failures (more than maxRetries=3).
    for (let i = 0; i < 4; i += 1) {
      lastSocket().triggerClose(1006);
      vi.advanceTimersByTime(10);
      await Promise.resolve();
      await Promise.resolve();
    }
    expect(sub.connectionState.value).toBe('closed');
  });
});

describe('useWebSocket — channel reference counting', () => {
  it('does not unsubscribe upstream while another subscriber remains', async () => {
    const a = useWebSocket('quotes', QuoteSchema);
    const b = useWebSocket('quotes', QuoteSchema);
    await Promise.resolve();
    lastSocket().triggerOpen();
    lastSocket().sentFrames = [];

    a.unsubscribe();
    // No upstream unsubscribe — the channel still has B as listener.
    expect(lastSocket().sentFrames).toHaveLength(0);

    b.unsubscribe();
    // Now upstream unsubscribe fires (the Set's size hit 0).
    const frames = lastSocket().sentFrames.map((f) => JSON.parse(f));
    expect(frames.some((f) => f.channel === 'quotes' && f.event === 'unsubscribe')).toBe(
      true,
    );
  });
});
