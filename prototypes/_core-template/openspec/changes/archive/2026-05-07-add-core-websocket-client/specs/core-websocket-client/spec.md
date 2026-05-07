## ADDED Requirements

### Requirement: All real-time event consumption MUST go through a single shared WebSocket client

Every Ardua core app SHALL expose exactly one WebSocket client instance per application context, instantiated at bootstrap and shared across all consumers. Direct instantiation of `new WebSocket(url)` inside modules, components, or composables is forbidden. Modules consume the channel exclusively via the `useWebSocket(channel, schema)` composable, which subscribes to topics over the shared single connection. The client SHALL be configured with the WebSocket URL from `VITE_WS_URL` and the same Auth0 access token getter wired into `core-api-layer`'s `setAccessTokenGetter`.

#### Scenario: Module consumes only via the composable

- **GIVEN** an OPS module needs to subscribe to balance reconciliation events
- **WHEN** the implementation is authored
- **THEN** it imports `useWebSocket` from `@/composables/useWebSocket` and calls `const { messages, send } = useWebSocket('balance-reconciliation', BalanceReconciliationEventSchema)` — direct calls to `new WebSocket(...)` are forbidden

#### Scenario: Single physical connection multiplexes multiple subscriptions

- **GIVEN** an app where OPS subscribes to `balance-reconciliation` and TRD subscribes to `quotes-updates` (in the same app instance)
- **WHEN** both subscriptions are active
- **THEN** the WebSocket client maintains exactly one physical connection to `VITE_WS_URL`, multiplexing both topics over it via per-message routing — opening a second physical socket is forbidden

#### Scenario: Bootstrap wires the auth getter and the URL

- **GIVEN** the app boots with valid `VITE_WS_URL` and Auth0 configured
- **WHEN** the WebSocket client initializes
- **THEN** it reads the URL from env, registers the Auth0 access token getter (the same one used by `apiClient`), and waits for the first `subscribe()` call before opening the connection

### Requirement: Connection lifecycle MUST be observable as canonical states

The client SHALL expose `connectionState: Ref<'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed' | 'error'>` reactively and `isConnected: ComputedRef<boolean>` (a convenience for `connectionState.value === 'open'`). The states transition deterministically: `idle → connecting → open` on successful first connection; `open → reconnecting → open` on transient disconnect; `reconnecting → closed` after exceeding max retries; `* → error` when an unrecoverable error fires (e.g., schema-version mismatch with the backend). Apps MAY render UI indicators bound to `connectionState` (e.g., a small badge in the topbar showing `"Reconectando…"` while `reconnecting`).

#### Scenario: First subscribe transitions idle → connecting → open

- **GIVEN** the client is in `idle` and has never connected
- **WHEN** any module calls `useWebSocket(channel, schema).subscribe(...)`
- **THEN** the client transitions to `connecting`, opens the WebSocket, and on successful handshake transitions to `open`; subscribers receive messages from that point forward

#### Scenario: Transient network drop transitions to reconnecting and back

- **GIVEN** the connection was `open` and the underlying TCP/TLS layer drops (Wi-Fi blip, server restart)
- **WHEN** the WebSocket emits `close` with a recoverable code
- **THEN** `connectionState` transitions to `reconnecting`, the reconnect timer fires, and on successful re-handshake transitions back to `open` — the queue (if any) flushes after re-handshake

#### Scenario: Max retries exceeded transitions to closed permanently

- **GIVEN** the client has retried 6 times unsuccessfully
- **WHEN** the 6th retry also fails
- **THEN** `connectionState` transitions to `closed`, no further automatic reconnect happens, and `lastError` exposes the underlying cause; the app SHALL surface a banner via `core-error-handling` (decision is the app's; the spec does NOT prescribe the surface)

### Requirement: Reconnection MUST use exponential backoff with bounded retries

When the connection drops with a recoverable close code, the client SHALL attempt to re-handshake with exponential backoff: initial delay 1 second, multiplicative factor 2, jitter ±20%, max 6 retries before transitioning to `closed`. Each retry attempt SHALL re-fetch the access token via the registered getter (so an expired token is refreshed automatically). Apps MAY override the retry count via `useWebSocketClient({ maxRetries })` at bootstrap, but MAY NOT disable retries (`maxRetries: 0` is forbidden — disconnects without retry are not allowed; if retries are exhausted, transition is to `closed`, not silent disconnect).

#### Scenario: First retry waits ~1 second with jitter

- **GIVEN** the connection just dropped from `open` to `reconnecting`
- **WHEN** the client schedules the first retry
- **THEN** the delay is between 800ms and 1200ms (1 second ±20% jitter); after firing, if it fails, the next delay is between 1.6s and 2.4s; then between 3.2s and 4.8s; up to 6 attempts

#### Scenario: Retry refreshes the token

- **GIVEN** the token expired mid-disconnect and the client is about to retry
- **WHEN** the retry attempt runs
- **THEN** the client awaits the registered Auth0 token getter, which returns a refreshed token, and uses it in the new handshake — the user does not need to re-login

#### Scenario: Disabling retries is forbidden

- **GIVEN** a developer attempts to instantiate the client with `maxRetries: 0`
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — `maxRetries` SHALL be a positive integer (default 6); `0` is invalid

### Requirement: Outbound messages MUST be queued during disconnect and flushed on reconnect

When `send(message)` is called while `connectionState` is `reconnecting` or `connecting`, the client SHALL enqueue the message and flush the queue in FIFO order once `connectionState` becomes `open`. The queue cap SHALL be 100 messages by default (configurable via `useWebSocketClient({ queueCap })`); when the cap is reached, the oldest queued message is dropped and `console.warn` is emitted. Calls to `send()` while `connectionState` is `closed` or `error` SHALL throw immediately — there is no future reconnect to flush against.

#### Scenario: Send during reconnecting enqueues, send after reconnect flushes

- **GIVEN** `connectionState` is `reconnecting` and the consumer calls `send({ event: 'ping' })`
- **WHEN** the message is dispatched
- **THEN** the message is enqueued; once `connectionState` transitions to `open`, the queue flushes in FIFO order and the `ping` is sent

#### Scenario: Queue cap drops oldest message with a warning

- **GIVEN** the queue is at the default cap of 100 messages and the consumer calls `send(101st)` while still disconnected
- **WHEN** the client enqueues
- **THEN** the oldest queued message is dropped, `console.warn` logs `WebSocket queue cap reached, oldest message dropped`, and the new message is enqueued at the tail

#### Scenario: Send while closed throws

- **GIVEN** `connectionState` is `closed` (max retries exceeded) and the consumer calls `send(...)`
- **WHEN** the call dispatches
- **THEN** the call throws an error (`WebSocketClosedError` or equivalent typed class); apps must reset the client or the user must re-authenticate before sending again

### Requirement: Auth token expiration mid-session MUST trigger a silent re-handshake

When the backend signals that the access token has expired during an open WebSocket session (via a control frame, a typed event, or a connection close with a specific code — the exact mechanism is backend-decided and abstracted by the client), the client SHALL re-fetch the token via the registered getter and re-handshake the connection. The transition SHALL be invisible to consumers when it succeeds — `messages` and subscriptions persist; only `connectionState` may briefly flicker through `reconnecting → open`. If the token refresh itself fails (refresh token expired, user logged out), the client transitions to `error` and consumers receive the error via `lastError`.

#### Scenario: Token expires mid-session, client silently refreshes

- **GIVEN** an `open` connection where the backend signals token expiry (e.g., closes with code `4001`)
- **WHEN** the client observes the close
- **THEN** the client transitions to `reconnecting`, calls the registered Auth0 getter (which silently refreshes), and reconnects with the new token; consumers see at most a brief flicker on `connectionState` and continue receiving messages

#### Scenario: Token refresh fails, client transitions to error

- **GIVEN** the backend signals token expiry and the registered getter returns `null` or throws (refresh token expired)
- **WHEN** the client attempts to reconnect
- **THEN** `connectionState` transitions to `error`, `lastError` exposes the auth failure, and the app's auth layer is responsible for logging the user out (per `core-auth` baseline)

### Requirement: Inbound events MUST be validated against a Zod schema before dispatch

Every inbound message SHALL be validated by the Zod schema declared at subscribe time (`useWebSocket(channel, schema)`). Messages that fail validation SHALL be dropped (NOT delivered to handlers), and `console.warn` SHALL log the validation error along with the raw payload (truncated to 1KB) for diagnostic purposes. The dropped count is tracked internally and exposed via `validationErrorsCount: Ref<number>` for observability. Apps SHALL NOT bypass validation — schema-less subscriptions are forbidden.

#### Scenario: Valid inbound message reaches the handler

- **GIVEN** a subscription `useWebSocket('balance-reconciliation', schema)` where the schema accepts `{ event: 'mismatch', data: { difference: number } }`
- **WHEN** the backend pushes a valid message of that shape
- **THEN** the message is parsed, validated, and the resulting typed object is appended to `messages.value`; subscribed handlers fire

#### Scenario: Invalid message is dropped with a warning

- **GIVEN** the same subscription and the backend pushes `{ event: 'mismatch', data: { wrong_field: 'foo' } }`
- **WHEN** the validator runs
- **THEN** the message is dropped, `validationErrorsCount` increments by 1, `console.warn` logs the Zod error and the payload, and no handler fires

#### Scenario: Schema-less subscription is forbidden

- **GIVEN** a developer authors `useWebSocket('channel')` without passing a schema
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — every subscription SHALL declare a Zod schema; `schema` is a required parameter

### Requirement: Channels MUST be multiplexed over a single connection with subscribe / unsubscribe lifecycle

The client SHALL support multiple independent subscriptions to distinct channels (topics) over the single physical connection. Each subscription SHALL receive only the messages routed to its channel by the backend (via a `channel` discriminator in the inbound payload, matched against the subscriber's declared channel name). Subscriptions SHALL be reference-counted: the same channel subscribed by N composable instances results in one upstream subscription; unsubscribing all consumers triggers an unsubscribe message to the backend. Each `useWebSocket()` call SHALL clean up automatically when the consuming component unmounts.

#### Scenario: Multiple subscriptions multiplex correctly

- **GIVEN** Component A subscribed to `quotes-updates` and Component B subscribed to `balance-reconciliation`
- **WHEN** the backend pushes a `quotes-updates` event
- **THEN** Component A's `messages` updates; Component B's `messages` does NOT — routing is per-channel

#### Scenario: Unmount unsubscribes automatically

- **GIVEN** a component mounted and `const { messages } = useWebSocket('quotes-updates', schema)` is active
- **WHEN** the component unmounts
- **THEN** the composable's internal cleanup decrements the reference count for `quotes-updates`; if the count reaches 0, an `unsubscribe` message is sent to the backend

#### Scenario: Multiple subscribers to the same channel share one upstream subscription

- **GIVEN** Component A and Component B both subscribe to `quotes-updates`
- **WHEN** both subscriptions are active
- **THEN** the client sends exactly one `subscribe` message to the backend for `quotes-updates`; both components' `messages` refs receive the same event stream; when Component A unmounts but Component B remains, the upstream subscription stays open

### Requirement: Composable `useWebSocket` MUST be the only consumer entry point

Apps SHALL consume the WebSocket contract exclusively via the `useWebSocket(channel, schema, options?)` composable. Direct manipulation of the underlying client (which exists as a singleton internal to the composable) is forbidden. The composable SHALL accept `channel: string`, `schema: ZodSchema<T>`, and optional `options` for `onMessage(message)` callback (in addition to the reactive `messages` ref), `onError(error)` callback, and `historyCap` (cap on the `messages.value` array, default 50, for memory bounding). It SHALL expose `messages: Ref<T[]>`, `isConnected: ComputedRef<boolean>`, `connectionState: Ref<...>`, `validationErrorsCount: Ref<number>`, `send(message: unknown)`, and an automatic cleanup on unmount.

#### Scenario: Module consumes the composable with channel and schema

- **GIVEN** an OPS module subscribing to balance reconciliation events
- **WHEN** the implementation is authored
- **THEN** it calls `const { messages, send, isConnected } = useWebSocket('balance-reconciliation', BalanceReconciliationEventSchema, { historyCap: 100 })` — direct access to the singleton client is forbidden

#### Scenario: History cap bounds memory usage

- **GIVEN** a subscription with `historyCap: 50` and 100 messages received over time
- **WHEN** the messages array grows
- **THEN** the array maintains at most 50 items, dropping the oldest as new ones arrive — apps that need persistent history SHALL persist messages explicitly to a Pinia store, not rely on the in-memory ref

#### Scenario: Cleanup on unmount is automatic

- **GIVEN** a component mounted with `useWebSocket('quotes-updates', schema)`
- **WHEN** the component unmounts
- **THEN** the composable internally calls the unsubscribe path; consumers do NOT need to manually call any cleanup function
