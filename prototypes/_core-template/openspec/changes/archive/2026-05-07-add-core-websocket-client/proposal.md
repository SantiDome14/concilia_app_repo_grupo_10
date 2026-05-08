- Jira REQ: —
- Module: core-template (foundation)
- Tier: 2 — habilita OPS (balance reconciliation live), TRD (quotes / alerts updates)

# Add `core-websocket-client` capability — real-time event channel

## Why

Dos casos canónicos del financial-core demandan push de eventos del backend al cliente sin polling:

1. **OPS — balance reconciliation.** Cuando el saldo Coinag diverge del saldo interno, el sistema detecta el mismatch del lado del backend y debe notificar al OPS officer en tiempo real (alerta perfil B/C en `core-modulo-genericos`). Hoy el legacy ni siquiera tiene canal real-time — la divergencia se ve cuando el operador refresca la página, lo cual es costoso operativamente (el balance reconciliation puede deteriorarse durante esa ventana).
2. **TRD — quote updates / alerts.** Cuando una contraparte responde un RFQ, cuando un alert de spread/precio se dispara, cuando una operación de liquidez cambia de estado — el TRD trader necesita la actualización inmediata. El legacy declara `VITE_WS_URL` pero NO la usa: hay un placeholder de hook `useWebSocket.ts` con estructura desconocida y los datos llegan vía polling de `getQuotes`.

`core-api-layer` cubre HTTP requests; no hay un análogo para WebSocket. Sin esta capability, cuando OPS o TRD necesite real-time, la tentación va a ser implementar el cliente WS en cada app con sus propias convenciones, sin reconnect logic, sin queueing durante disconnect, sin auth refresh sobre WS. Anti-patrón directo del paradigma del template.

Esta change aterriza el cliente real-time canónico del financial-core: una capa única que maneja conexión, reconnect con exponential backoff, message queue durante disconnect, refresh del token de auth (mismo patrón que `setAccessTokenGetter` de `core-api-layer`), schemas tipados de eventos validados con Zod, y subscribe/unsubscribe a topics múltiples sobre una sola conexión física.

## What Changes

- **New capability `core-websocket-client`** con requirements para:
  - **Single connection per app** — un solo WebSocket compartido por toda la app; los apps NO instancian `new WebSocket(url)` directamente.
  - **Connection lifecycle observable** — estados `connecting | open | reconnecting | closed | error` expuestos como `ConnectionState: Ref<...>` para que la UI pueda mostrar indicadores ("Reconectando…").
  - **Reconnection logic con exponential backoff** — initial 1 segundo, factor 2, jitter ±20%, max 6 retries; al exceder, transition a `closed` y `lastError` expone la razón.
  - **Message queue durante disconnect** — outbound messages encolados se flushean al reconectar; cap configurable para evitar memory leaks (default 100 messages).
  - **Auth refresh sobre WS** — al expirar el token mid-session, el cliente re-handshake usando el mismo getter de Auth0 que `core-api-layer`; sin desconexión visible para la UI.
  - **Typed event schemas con Zod validation** — todos los eventos entrantes se validan contra schemas declarados; eventos malformed se descartan con `console.warn` y NO se entregan a los handlers.
  - **Channel multiplexing** — subscribe / unsubscribe a topics; per-topic typed handlers; el cliente multiplexa sobre una sola conexión física.
  - **Composable `useWebSocket(channel, schema)`** que expone `messages: Ref<T[]>`, `isConnected: ComputedRef<boolean>`, `connectionState: Ref<...>`, `send(message)`, `subscribe(handler)`, `unsubscribe()`.

## Capabilities

### Affected Capabilities

- `core-error-handling` — composes with: errores no recuperables (max retries excedido, schema validation persistente) se materializan como banner persistente o toast según severidad. La spec NO contracta el surface; lo decide la app.
- `core-auth` — composes with: el handshake WS reusa el access token getter; cuando el token expira mid-session, el cliente refresca silenciosamente.

### New Capabilities

- `core-websocket-client` — net-new. 8 requirements iniciales cubriendo conexión, lifecycle, reconnect, queue, auth refresh, schemas, multiplexing, composable.

### Cross-capability dependencies

- Compone con `core-api-layer` — la URL del WS la pasa la app via env var (`VITE_WS_URL`), el getter de token es el mismo `setAccessTokenGetter` ya wired en `core-api-layer`. Esta change NO modifica `core-api-layer`.
- Compone con `core-modulo-genericos` — cuando un evento de alerta llega vía WS, el handler resuelve el AlertProfile correspondiente y dispara el rendering canónico de `core-modulo-genericos`. La spec NO contracta esa traducción; vive en la app que registra el handler.

## Notes

- La spec NO contracta **Server-Sent Events (SSE)** como alternativa transport. SSE es válido para algunos casos (push unidireccional sin necesidad de send del cliente al servidor) pero adoptar dos transports duplica el contrato y la UX. Si en el futuro un caso justifica SSE específicamente, abre como capability separada.
- La spec NO contracta el **formato del frame**: JSON-RPC, custom envelopes, WAMP, etc. La asumpción del template es JSON con un `event` discriminator y un `data` payload. Si el backend usa otro framing, la app provee un `parser` opcional al composable que normaliza al shape canónico.
- La spec NO contracta **persistencia de mensajes recibidos** entre reloads. Los mensajes son ephemeral en memoria; al reload, el cliente reconecta y resume desde donde el backend determine (probablemente últimos N o desde un cursor).
- La spec NO contracta **broadcast cross-tab** (recibir en tab A y replicar en tab B vía BroadcastChannel). Cada tab abre su propia conexión. Si el escalado WS preocupa al backend, eso es un problema del backend (rate limit por user), no del frontend.
