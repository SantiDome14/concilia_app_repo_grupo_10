> Jira REQ: — (no ticket; capability scoping for the Lex migration from `core-lex-frontend` legacy)
> Module: LEX

# Add lex-notificaciones — Topbar bell + notifications composable

## Why

The legacy `useNotifications.js` (~158 LOC) implements a bespoke notifications surface for Lex: 30-second client-side cache, deduped `unreadCount` keyed by `(client_id, type)`, mark-as-read flow, and a clever-but-undocumented Auth0 fallback that redirects to `loginWithRedirect` when `getAccessTokenSilently()` throws `consent_required` or `login_required`. The composable is referenced from `NotificationBell.vue` and indirectly from the Topbar mount logic. Two notification types exist: `CLIENT_ASSIGNMENT` (someone assigned you a Cliente) and `DUE_DATE` (a due date approaches per the urgency levels in `discoveries/lex-discovery.md` §3.8).

The legacy code mixes concerns and lacks a contract: dedupe rules for the badge live in computed props that never get tested, the polling story is event-driven by accident (refresh on Topbar mount, refresh on bell open), the `consent_required` redirect happens inside a try/catch that no other auth flow knows about. The new spec locks all of it: cache TTL, dedupe key, click-through navigation per type, severity colour mapping for `DUE_DATE`, the auth-error fallback rules, and the no-polling rule.

## What Changes

- Create the `lex-notificaciones` capability. New spec at `openspec/specs/lex-notificaciones/spec.md` (materialised via archive) with 6 requirements covering: (a) single `useLexNotifications()` composable as entry point with 30-second in-memory cache + force flag; (b) badge dedupe keyed by `(client_id, type)`, popover renders one row per dedupe key, hidden when count is zero; (c) optimistic mark-as-read on click + per-type click-through navigation (`CLIENT_ASSIGNMENT` → `?tab=detalles`, `DUE_DATE` → `?tab=documentos` for relationship-scope, else `?tab=detalles`); (d) `DUE_DATE` urgency colour mapping via `--severity-*` variables; (e) Auth0 `consent_required` / `login_required` triggers `loginWithRedirect`; 401 falls through to global handler; network errors keep cached value; (f) refresh event-driven (Topbar mount + bell open + force), no fixed-interval polling; logout clears cache.
- Define the typed surface. `src/lex/notificaciones/useLexNotifications.ts`, `src/lex/notificaciones/types.ts` (`Notification`, `NotificationType`, `NotificationStatus`, `DueDateLevel`), `src/components/topbar/NotificationBell.vue`.
- Integrate with sibling capabilities — referenced, not edited:
  - `core-error-handling` — global 401 handler; toast for network errors with Reintentar.
  - `core-auth` — `useAuth()` exposes the Auth0 client; the composable consumes it.
  - `core-api-layer` — the `GET /notification` and `POST /notification/mark-read` requests go through the shared axios.
  - `core-theming` — `--severity-*` CSS variables for `DUE_DATE` colour mapping.
  - `lex-cliente-detalle` — destination of the click-through navigation.
  - `lex-clientes`, `lex-altas` — sources of `CLIENT_ASSIGNMENT` notifications (assignment in `/clientes` or `/altas` triggers a notification on the assignee).

## Capabilities

### Affected Capabilities

None modified by this change.

### New Capabilities

- `lex-notificaciones` (Lex transversal; bell + composable) — 6 requirements, 18 scenarios.

### Non-capability artifacts

- `src/lex/notificaciones/useLexNotifications.ts` — the composable.
- `src/lex/notificaciones/types.ts` — typed surface.
- `src/components/topbar/NotificationBell.vue` — bell + popover.
- `src/lex/notificaciones/api.ts` — `GET /notification`, `POST /notification/mark-read`.
