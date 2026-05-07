## ADDED Requirements

### Requirement: Notifications MUST be served by a single useLexNotifications composable with 30 s cache

The frontend SHALL expose `useLexNotifications()` as the single entry point for notifications. The composable SHALL maintain an in-memory cache of the last `GET /notification` response for **30 seconds**. Calling `fetchNotifications()` while the cache is fresh (`Date.now() - lastFetch < 30_000`) SHALL return the cached value without firing a request. Calling `fetchNotifications(true)` (force flag) SHALL bypass the cache. The composable SHALL expose reactive refs `notifications`, `loading`, `lastFetch`, plus `unreadCount` (deduped per Requirement "Unread count MUST be deduped by client_id + type"), and methods `fetchNotifications`, `markAsRead`, `clearCache`. Components MUST NOT call `GET /notification` directly.

#### Scenario: Cache hit avoids an extra request

- **GIVEN** the bell was opened 5 seconds ago and the cache has 7 notifications
- **WHEN** the user opens the bell again
- **THEN** no new `GET /notification` request fires; the popover renders from the cache

#### Scenario: Cache expires after 30 seconds

- **GIVEN** the cache was filled 31 seconds ago
- **WHEN** the user opens the bell
- **THEN** a new `GET /notification` request fires and the cache is replaced

#### Scenario: Force flag bypasses the cache

- **GIVEN** the cache was filled 5 seconds ago
- **WHEN** any consumer calls `fetchNotifications(true)`
- **THEN** a new request fires regardless of cache freshness

---

### Requirement: Unread count MUST be deduped by client_id + type

The badge on the bell SHALL show the count of unique `(client_id, type)` pairs in `notifications` whose `status` is `DELIVERED`. Multiple raw notifications for the same `(client_id, type)` SHALL collapse to one in the dedupe count, but the popover list SHALL render one entry per unique `(client_id, type)` summarising the most recent occurrence. The badge SHALL hide when the deduped count is zero.

#### Scenario: Two notifications for same (client_id, type) count as one

- **GIVEN** the notifications array contains two `DUE_DATE` notifications for `client_id='c-1'` and one `CLIENT_ASSIGNMENT` for `client_id='c-2'`, all `DELIVERED`
- **WHEN** the badge renders
- **THEN** the badge displays `2` (one for `c-1+DUE_DATE`, one for `c-2+CLIENT_ASSIGNMENT`)

#### Scenario: Popover renders one row per dedupe key

- **GIVEN** the same payload as above
- **WHEN** the popover opens
- **THEN** exactly two rows render; the row for `c-1+DUE_DATE` shows the most recent timestamp of the two raw notifications

#### Scenario: Empty deduped count hides the badge

- **GIVEN** `notifications` is empty or all entries have `status='READ'`
- **WHEN** the bell renders
- **THEN** the badge is not rendered (no `0` is shown)

---

### Requirement: Clicking a notification MUST mark it read and navigate per type

When the user clicks a notification entry in the popover, the composable SHALL call `markAsRead([notification_id])` which fires `POST /notification/mark-read { ids }`. Optimistically the entry's `status` flips to `READ` and the dedupe count decrements; failure SHALL revert the state and surface a toast `No se pudo marcar como leída`. After the optimistic update the popover SHALL navigate per type: `CLIENT_ASSIGNMENT` → `/clientes/:client_id?tab=detalles`, `DUE_DATE` → `/clientes/:client_id?tab=documentos` if `payload.scope='relationship'` else `?tab=detalles`. The popover SHALL close on navigation.

#### Scenario: CLIENT_ASSIGNMENT navigates to Detalles

- **GIVEN** a `CLIENT_ASSIGNMENT` row for `client_id='c-1'`
- **WHEN** the user clicks the row
- **THEN** the popover closes, `POST /notification/mark-read` is fired with the notification id, and the URL becomes `/clientes/c-1?tab=detalles`

#### Scenario: DUE_DATE on a relationship navigates to Documentos

- **GIVEN** a `DUE_DATE` row whose payload contains `scope='relationship'` and `client_id='c-1'`
- **WHEN** the user clicks the row
- **THEN** the URL becomes `/clientes/c-1?tab=documentos`

#### Scenario: Optimistic update reverts on failure

- **GIVEN** a row is clicked and the dedupe count was 3
- **WHEN** `POST /notification/mark-read` returns 500
- **THEN** the row's status reverts to `DELIVERED`, the dedupe count returns to 3, and a toast `No se pudo marcar como leída` is shown with a `Reintentar` action

---

### Requirement: DUE_DATE notifications MUST surface the urgency level via colour

Each `DUE_DATE` row SHALL render an icon coloured by the `level` field per `discoveries/lex-discovery.md` §3.8: `expired` → red intense, `critical` → red, `warning` → orange, `early_warning` → amber, `ok` → grey. The icon SHALL use the corresponding semantic CSS variables (`--severity-expired`, `--severity-critical`, `--severity-warning`, `--severity-early-warning`, `--severity-ok`). The row text SHALL include the count of days remaining (negative for expired) and the affected Cliente name.

#### Scenario: Expired DUE_DATE renders red intense

- **GIVEN** a `DUE_DATE` notification with `level='expired'` and `days_remaining=-3`
- **WHEN** the row renders
- **THEN** the icon colour comes from `--severity-expired` and the text contains `Vencido hace 3 días`

#### Scenario: Early warning renders amber

- **GIVEN** a `DUE_DATE` notification with `level='early_warning'` and `days_remaining=22`
- **WHEN** the row renders
- **THEN** the icon colour comes from `--severity-early-warning` and the text contains `Vence en 22 días`

#### Scenario: ok level still surfaces but uses neutral grey

- **GIVEN** a `DUE_DATE` notification with `level='ok'` and `days_remaining=45`
- **WHEN** the row renders
- **THEN** the icon colour comes from `--severity-ok` and the text contains `Vence en 45 días`

---

### Requirement: Auth errors during fetch MUST trigger a Auth0 re-login flow

When `GET /notification` fails because `getAccessTokenSilently()` throws `consent_required` or `login_required`, the composable SHALL redirect the user to `loginWithRedirect()` with `prompt='consent'` (the legacy fallback in `useNotifications.js`). Other auth errors (401 from the backend) SHALL fall back to the global 401 handler defined by `core-error-handling` Requirement "401 errors MUST trigger a logout and redirect", which logs the user out cleanly. Network errors SHALL keep the cached value visible (if any) and surface a toast `No se pudieron actualizar las notificaciones · Reintentar`.

#### Scenario: consent_required triggers loginWithRedirect

- **GIVEN** the next `getAccessTokenSilently()` call rejects with `error='consent_required'`
- **WHEN** the composable handles the rejection
- **THEN** `loginWithRedirect({ authorizationParams: { prompt: 'consent' } })` is called and the bell does not surface a generic error toast for this specific failure

#### Scenario: 401 from backend is handled globally

- **GIVEN** `GET /notification` returns 401
- **WHEN** the response surfaces
- **THEN** the global 401 handler from `core-error-handling` logs the user out and redirects; the composable does not surface a duplicate toast

#### Scenario: Network error keeps cache visible

- **GIVEN** the cache contains 7 notifications and the next force-refresh fails with a network error
- **WHEN** the failure surfaces
- **THEN** the popover keeps showing the previous 7 notifications and a toast `No se pudieron actualizar las notificaciones` with a `Reintentar` action is surfaced

---

### Requirement: Notifications MUST be refreshed on Topbar mount and bell open

The composable SHALL call `fetchNotifications()` on `onMounted` of the Topbar (subject to the 30 s cache) and SHALL call `fetchNotifications()` again every time the bell popover opens. The composable MUST NOT poll on a fixed interval — refresh is event-driven (mount, bell open, manual force). Logout SHALL call `clearCache()` to drop the in-memory state before redirecting per `core-error-handling`.

#### Scenario: Topbar mount triggers initial fetch

- **GIVEN** the user lands on `/clientes` for the first time
- **WHEN** the Topbar mounts
- **THEN** exactly one `GET /notification` request fires (cache is empty)

#### Scenario: Bell open re-fetches if cache is stale

- **GIVEN** the cache was filled 35 seconds ago and the user opens the bell
- **WHEN** the popover opens
- **THEN** `GET /notification` is fired and the popover renders the new payload after the response

#### Scenario: Logout clears the cache

- **GIVEN** the cache contains 7 notifications and the user clicks Logout in the avatar menu
- **WHEN** the logout flow begins
- **THEN** `clearCache()` is called (the in-memory `notifications`, `lastFetch`, and `unreadCount` reset to defaults) before the Auth0 redirect
