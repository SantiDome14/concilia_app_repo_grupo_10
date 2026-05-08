# Tasks — add-lex-notificaciones

This change creates the `lex-notificaciones` capability — the Topbar bell + the `useLexNotifications` composable. It is a NEW capability with one delivered artifact: the spec at `openspec/specs/lex-notificaciones/spec.md` (materialised by `openspec archive`). Implementation tasks (sections 2–4) are aspirational checkboxes. Implementation MAY ship inside this same change folder, OR be split into a follow-up `implement-lex-notificaciones` change. Validation gates and archive (sections 5–6) are mandatory in either case.

## 1. Spec deltas (mandatory — this change blocks on these)

- [x] `specs/lex-notificaciones/spec.md` — ADDED Requirements: 6 requirements, 18 scenarios. Cover: single composable + 30 s cache, dedupe by `(client_id, type)`, optimistic click + per-type navigation, DUE_DATE severity mapping, auth-error fallback (consent_required → loginWithRedirect, 401 → global handler, network → cached + toast), event-driven refresh (no polling) + logout clears cache.
- [ ] Run `openspec validate add-lex-notificaciones --strict` and confirm the change validates.
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline + the new capability validate together.

## 2. TypeScript types and composable (aspirational)

### 2.1 Types

- [ ] `src/lex/notificaciones/types.ts` — `Notification` (`id`, `type`, `status`, `client_id`, `payload`, `created_at`), `NotificationType` (`'CLIENT_ASSIGNMENT' | 'DUE_DATE'`), `NotificationStatus` (`'DELIVERED' | 'READ'`), `DueDateLevel` (`'expired' | 'critical' | 'warning' | 'early_warning' | 'ok'`), `DueDateScope` (`'cliente' | 'relationship'`).

### 2.2 API binding

- [ ] `src/lex/notificaciones/api.ts` — `getNotifications()` calling `GET /notification?status=DELIVERED`, `markAsRead(ids)` calling `POST /notification/mark-read`.

### 2.3 Composable

- [ ] `src/lex/notificaciones/useLexNotifications.ts` — `notifications`, `loading`, `lastFetch`, `unreadCount` (computed deduped), `fetchNotifications(force?)`, `markAsRead(ids)`, `clearCache()`. 30-second in-memory cache. Catches `consent_required` / `login_required` and calls `loginWithRedirect({ authorizationParams: { prompt: 'consent' } })`.

## 3. Components (aspirational)

- [ ] `src/components/topbar/NotificationBell.vue` — bell icon + badge (deduped count) + popover. Calls `fetchNotifications()` on mount and on bell open. Renders one row per dedupe key with the most recent timestamp.
- [ ] Per-row icon + colour driven by `--severity-*` for `DUE_DATE`.
- [ ] Click handler: optimistic mark-as-read, then `router.push` per type/scope.
- [ ] Logout flow (in the user avatar menu) calls `useLexNotifications().clearCache()` before Auth0 redirect.

## 4. Tests (aspirational)

- [ ] `src/lex/notificaciones/useLexNotifications.spec.ts` — exercise every Scenario:
  - Cache hit (5 s) avoids extra request.
  - Cache miss (31 s) triggers new fetch.
  - Force flag bypass cache.
  - Dedupe count = unique `(client_id, type)` pairs.
  - Popover renders one row per dedupe key with most recent timestamp.
  - Empty deduped count hides badge.
  - Click marks read optimistically + navigates per type.
  - DUE_DATE relationship scope navigates to `?tab=documentos`.
  - Optimistic revert on 500 + Reintentar toast.
  - DUE_DATE colour map for each level.
  - `consent_required` triggers `loginWithRedirect`.
  - 401 falls through to global handler.
  - Network error keeps cache visible + toast.
  - Topbar mount triggers fetch.
  - Bell open re-fetches if stale.
  - Logout calls `clearCache()`.
- [ ] Coverage on `useLexNotifications.ts` ≥ 95%; on `NotificationBell.vue` ≥ 85%.

## 5. Validation gates (mandatory)

- [ ] `openspec validate add-lex-notificaciones --strict` passes.
- [ ] `openspec validate --all --strict` passes.
- [ ] If implementation tasks (2–4) are completed in this change: `npm run lint`, `npm run type-check`, `npm run test:run`, `npm run build:qa` all pass.
- [ ] If implementation is deferred: confirm a follow-up change `implement-lex-notificaciones` is opened with sections 2–4 as its scope.

## 6. Archive

- [ ] After all mandatory gates pass, run `openspec archive add-lex-notificaciones`.
- [ ] Confirm the CLI applies the ADDED Requirements into a new baseline `openspec/specs/lex-notificaciones/spec.md` and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-lex-notificaciones/`.
- [ ] Final commit with conventional message: `specs: add lex-notificaciones — Topbar bell + notifications composable`.
