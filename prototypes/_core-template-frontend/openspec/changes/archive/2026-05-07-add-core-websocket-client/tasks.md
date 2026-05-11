# Tasks — add-core-websocket-client

This change is a **contract-only** addition of the new `core-websocket-client` capability. No application code is implemented in this change. The actual WebSocket client singleton, the `useWebSocket()` composable, the reconnect / queue / auth-refresh logic, and the channel multiplexer will be implemented in a subsequent OpenSpec change when OPS or TRD begins to consume real-time events.

## 1. Spec deltas

- [ ] `specs/core-websocket-client/spec.md` — NEW capability with 8 requirements:
  - [ ] `All real-time event consumption MUST go through a single shared WebSocket client` (≥3 scenarios)
  - [ ] `Connection lifecycle MUST be observable as canonical states` (≥3 scenarios)
  - [ ] `Reconnection MUST use exponential backoff with bounded retries` (≥3 scenarios)
  - [ ] `Outbound messages MUST be queued during disconnect and flushed on reconnect` (≥3 scenarios)
  - [ ] `Auth token expiration mid-session MUST trigger a silent re-handshake` (≥2 scenarios)
  - [ ] `Inbound events MUST be validated against a Zod schema before dispatch` (≥3 scenarios)
  - [ ] `Channels MUST be multiplexed over a single connection with subscribe / unsubscribe lifecycle` (≥3 scenarios)
  - [ ] `Composable useWebSocket MUST be the only consumer entry point` (≥3 scenarios)

## 2. Validation gates

- [ ] Run `openspec validate add-core-websocket-client --strict` and confirm the change validates
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline specs still validate
- [ ] `npm run lint` passes (no source code changes — should be a no-op)
- [ ] `npm run type-check` passes (no source code changes — should be a no-op)
- [ ] `npm run test:run` passes (no source code changes — should be a no-op)
- [ ] `npm run spec:check` passes
- [ ] `npm run build:qa` passes

## 3. Documentation cross-references

- [ ] Verify `proposal.md` documents the explicit non-features (no SSE alternative, no specific framing format, no cross-tab broadcast, no message persistence)
- [ ] Verify `design.md` documents the boundary between `core-websocket-client` (transport, lifecycle, multiplexing) and `core-modulo-genericos` (alert events that flow through the WS but are rendered by the alert pipeline)
- [ ] Verify `design.md` records the rationale for single-connection multiplexing vs. one-connection-per-channel
- [ ] Verify `design.md` records the rationale for the 6-retry max with exponential backoff (UX vs. server load trade-off)

## 4. Archive

- [ ] After all validation gates pass, run `openspec archive add-core-websocket-client`
- [ ] Confirm the CLI applies the new capability (`openspec/specs/core-websocket-client/spec.md`) and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-core-websocket-client/`
- [ ] Final commit with conventional message: `specs: add core-websocket-client capability for real-time event channels`
