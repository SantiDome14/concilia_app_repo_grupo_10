# Design — add-core-websocket-client

## Context

This design captures the rationale behind opening `core-websocket-client` as a new capability. The capability formalises a real-time transport pattern that two canonical use cases of the financial-core need (OPS balance reconciliation, TRD quote / alert updates) and that a generic enough contract to absorb future use cases without re-opening the contract every time.

The decisions below explain the shape of the contract, the trade-offs between competing options, and the explicit non-features that keep the v1 surface bounded.

---

## Decision 1 — Single shared connection multiplexed across channels (not one connection per channel)

### The question

When multiple modules in the same app need real-time events for different topics (OPS subscribes to `balance-reconciliation`, TRD to `quotes-updates`, both potentially active in the same session), should each module open its own WebSocket connection to its dedicated topic, or should the app multiplex over a single connection?

### The decision

**Single connection multiplexed across channels.** The client is a singleton; subscriptions register topics; per-message routing fans events out to the right subscriber.

### Why

- **Backend connection limits.** Browsers cap concurrent WebSocket connections per host (~6 per origin in most browsers). One connection per topic exhausts that quota fast, especially in apps that compose multiple modules.
- **Server-side cost.** Each connection costs a worker / thread on the server. A 100-user app with 5 active subscriptions per user = 500 connections under per-channel; under multiplexed = 100.
- **Auth refresh atomicity.** Refreshing the token on one connection is straightforward. Refreshing N connections concurrently introduces ordering issues — what if connection 3 fails while 1 and 2 succeeded?
- **Reconnect economics.** One reconnect attempt with backoff is bounded. N independent attempts mean N times the chance of cascading failures.

### Alternatives considered

- **One connection per channel.** Rejected for the reasons above.
- **One connection per "context" (e.g., per module).** Rejected as a hybrid that inherits both the cost of multiple connections and the multiplexing complexity.

### Failure modes the rule prevents

- A developer reaches `new WebSocket(...)` directly in a module → spec rejects; multiplexing is mandatory.
- Multiple modules duplicate auth-refresh logic → eliminated; the singleton handles it once.

---

## Decision 2 — Exponential backoff, max 6 retries, no opt-out

### The question

When the connection drops, how aggressively should the client retry, and can the consumer disable retries?

### The decision

**Exponential backoff: initial 1s, factor 2, jitter ±20%, max 6 retries.** No opt-out — `maxRetries: 0` is forbidden.

The 6 retries cover ~63 seconds of attempts (1 + 2 + 4 + 8 + 16 + 32 with jitter), which absorbs typical transient failures (network blip, server restart) without indefinitely hammering a dead backend. After 6 retries the connection state transitions to `closed` and the app's responsibility is to surface a banner via `core-error-handling`.

### Why no opt-out

A WebSocket without retry is just a fragile connection. If a consumer doesn't want retry, they don't want WebSocket — they want HTTP polling. The contract here is "real-time with reasonable resilience". Letting consumers disable retry would be a footgun.

### Alternatives considered

- **Linear backoff (always 5 seconds).** Rejected. First reconnect should be fast (most outages are transient); subsequent should slow down to avoid thundering-herd on a struggling backend.
- **Indefinite retry.** Rejected. A connection that retries forever burns CPU on the client and connection requests on the server when the failure is non-transient (the WS endpoint was decommissioned, the user's network is permanently down). 6 retries is enough to catch the recoverable cases.
- **Configurable opt-out.** Rejected for the reasons above.

### Failure modes the rule prevents

- Indefinite reconnect on a permanently-broken endpoint → eliminated by the cap.
- Aggressive linear retry that hammers a struggling server → eliminated by exponential backoff with jitter.

---

## Decision 3 — Outbound messages queued during disconnect, with cap

### The question

When the consumer calls `send(message)` while the connection is in `reconnecting` or `connecting`, what happens?

### The decision

**Enqueue with FIFO flush on reconnect, capped at 100 messages by default.** When the cap is reached, drop the oldest (with a warning). Calls during `closed` or `error` throw immediately.

### Why queueing instead of throwing

Most of the disconnect cases are transient (a few seconds). Throwing would force every consumer to wrap every `send()` in retry logic and dropped-message handling, duplicating the queueing across the app. The client absorbs that.

### Why a cap

Without a cap, a long disconnect with active sends accumulates unbounded memory. 100 messages is enough for any reasonable burst (typical apps don't queue dozens of messages per minute) and small enough to bound memory.

### Why drop oldest, not newest

The newest message is the one the consumer just dispatched; their immediate intent is captured there. Older queued messages are stale ("send a heartbeat" 30 seconds ago is meaningless after 30 seconds of disconnect).

### Alternatives considered

- **Throw immediately on every send during disconnect.** Rejected for ergonomics.
- **No cap.** Rejected for memory safety.
- **Drop newest (preserve oldest).** Rejected — the older the message the staler it is.

### Failure modes the rule prevents

- Unbounded queue growth during prolonged disconnect → eliminated by cap.
- App developers writing duplicated retry logic around every `send()` → eliminated by built-in queueing.

---

## Decision 4 — Mandatory Zod schema validation on inbound messages

### The question

Should inbound message validation be optional (consumer's responsibility) or mandatory (client enforces)?

### The decision

**Mandatory.** Every subscription declares a Zod schema; messages that fail validation are dropped silently (with `console.warn` and a counter for observability).

### Why mandatory

WebSocket payloads are user-influenced (in some architectures the WS frames flow through a service that mutates them; in others the backend can be compromised). Without validation, malformed events reach handler code that assumes shape and crashes. Validation is **defensive trust at the transport boundary** — the client is always at runtime checked.

It also catches backend regressions: the backend changes a field name, the validation fails, the warning is loud, the developer fixes it. Without validation, the regression appears as a runtime crash buried inside the handler.

### Why drop silently (not throw)

A throw at the message handler propagates up to wherever Vue's reactivity is. That breaks the rendering loop and potentially crashes the page. Silent drop with an observability counter (`validationErrorsCount`) lets the app render a "connection unstable" banner if the count grows abnormally, without breaking the UX.

### Alternatives considered

- **Optional validation.** Rejected for the reasons above.
- **Validation that throws on failure.** Rejected — bad UX, easy to make the page break.
- **Validation that returns a Result type and lets the consumer decide.** Considered. Rejected because it pushes complexity to every consumer; the same ergonomics issue as the throwing send.

### Failure modes the rule prevents

- Backend ships a schema regression → caught at the validation boundary, app keeps running, observability surfaces the issue.
- Handler code crashes on malformed input → eliminated; malformed input never reaches the handler.

---

## Decision 5 — Auth refresh sub-flow is silent and orchestrated by the client

### The question

When the access token expires mid-session, should the consumer see the expiration and explicitly handle it, or should the client refresh transparently?

### The decision

**Transparent refresh.** When the backend signals expiration (via close code or control frame — backend-decided), the client reconnects with a fresh token. Consumers see at most a flicker on `connectionState`.

### Why transparent

The consumer code is busy with domain logic. Mid-session token rotation is an infrastructure concern, not a domain concern. Forcing every consumer to handle "token expired, please subscribe again with a new token" is repetitive boilerplate.

### Why fall back to error (not silent fail) when refresh fails

When the refresh token itself expires (user truly needs to log in again), there is no path to silent recovery. The client transitions to `error`; the app's auth layer redirects to login per the `core-auth` baseline.

### Alternatives considered

- **Consumer-handled refresh.** Rejected as boilerplate-heavy.
- **Silent fail without `error` state.** Rejected — consumers need to know the WS is no longer functional so the app can re-auth.

### Failure modes the rule prevents

- User mid-session sees their WS-driven UI freeze when token expires → eliminated by silent refresh.
- Consumer code has to handle 401 / 403 / token-expired error variants for WS messages → eliminated; the client absorbs that complexity.

---

## Decision 6 — Reference-counted subscriptions, automatic cleanup on unmount

### The question

When two components subscribe to the same channel, how is the underlying subscription managed?

### The decision

**Reference counting.** First subscriber sends `subscribe` to backend; subsequent subscribers share the upstream subscription; last unsubscriber sends `unsubscribe`. The composable's lifecycle hook (`onUnmounted`) decrements automatically.

### Why

- **Idempotent backend subscription.** Sending two `subscribe` for the same channel from one client should be a no-op or duplicated — counting avoids having to assume the backend is idempotent.
- **Avoid premature unsubscribe.** Component A and B both subscribe; A unmounts; without ref count, the unsubscribe would fire and B would lose its messages.
- **Automatic cleanup.** Vue's `onUnmounted` is reliable; tying cleanup to the component lifecycle removes a class of memory leaks.

### Alternatives considered

- **Global subscription, no ref counting.** Rejected — leaves channels open forever after consumers unmount.
- **Manual cleanup.** Rejected — relies on developer discipline; bug-prone.

---

## Cross-capability composition

| Neighbor | What it owns | What `core-websocket-client` owns |
|---|---|---|
| `core-api-layer` | Axios client, `setAccessTokenGetter`, `ApiError`, retry policy for HTTP | The WebSocket client reuses the same access token getter; HTTP and WS share auth state |
| `core-auth` | Auth0 plugin, route guards, capabilities | The WS client refreshes tokens via the same Auth0 SDK; on refresh failure, escalates to the auth layer |
| `core-error-handling` | Toasts, banners, EmptyState, Skeleton | When the connection state transitions to `error` or `closed`, the app renders a banner — the spec does NOT prescribe which |
| `core-modulo-genericos` | Alert / Inbox / Reportes / Dashboard generic modules | Real-time alert events flow through the WS and are routed by the app to the alert pipeline of `core-modulo-genericos` (the rendering is owned there) |

The clearest boundary: **transport (WS) vs. domain (alerts).** This capability owns the connection, the multiplexing, the reliability primitives. Alerts that arrive over WS flow into `core-modulo-genericos`; the spec does NOT couple the two — apps are free to use the WS for non-alert use cases (e.g., live quote streams in TRD that aren't alerts).

---

## Open questions

1. **Server-side framing format.** The spec assumes JSON-encoded messages with `event`/`channel`/`data` discriminators. If a backend uses an alternative framing (Protobuf, MessagePack, JSON-RPC), apps provide a `parser` adapter to the composable. Documented behavior; not contracted because the financial-core today is JSON over the wire.
2. **Cross-tab broadcast.** If a user has two tabs of the same app, each opens its own WebSocket connection. No coordination. If the backend rate-limits per user and the rate is hit, one of the tabs degrades. Acceptable for v1; revisit with `BroadcastChannel`-based sharing if it becomes a real problem.
3. **Server-Sent Events (SSE) as alternative.** Some backends prefer SSE for unidirectional push (lower complexity, native HTTP). Out of v1 — opening an SSE capability is a future change. The two transports do NOT need to be uniform; apps pick one or the other based on the backend.
4. **Persistent message history.** The composable's `messages` ref bounded by `historyCap` (default 50) is for in-memory display. Apps that need persistent history (audit log of received events, replay across reloads) MUST persist to a Pinia store explicitly. The spec does NOT contract that persistence — it would couple the WS layer to storage decisions.
5. **Backpressure from server.** If the backend pushes faster than the client can consume (extreme corner case), the browser's WebSocket buffer fills. Browsers handle this transparently up to a limit; beyond that the connection drops. The spec does NOT contract a backpressure protocol — if it becomes necessary, the backend declares one and the client adapts in a future change.
6. **Heartbeats.** Some backends require client-driven keepalive pings. The spec does NOT contract heartbeat semantics — apps register them via `send()` on a timer if the backend requires them. Contracting heartbeats means coupling to a specific backend protocol.
