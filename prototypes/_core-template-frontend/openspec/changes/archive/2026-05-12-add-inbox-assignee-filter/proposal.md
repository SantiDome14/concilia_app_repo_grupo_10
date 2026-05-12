- Jira REQ: — (queued UI feature surfaced during the rename session)
- Module: core-template (foundation)

# Add an assignee filter to the Inbox L3 filter row with "Todos" / "Sin asignar" / per-user options

## Why

The canonical `core-modulo-genericos` spec already lists `assignee` as one of the L3 filters every Inbox SHALL surface (alongside Tipo / Concepto / Estado / Mías / Período). The template's Inbox renders all of those except the assignee filter — so today a user cannot narrow the view to "records directed to me" or "records still unassigned" via the L3 row. Hands-on review surfaced this gap explicitly:

> "agregar también un filtro en las Inbox para los Responsables, también incluir opciones para filtrar/ver todos y filtrar solo las que no están asignadas"

The two specific user-stories named — "filter to all" (default) and "filter only the unassigned" — line up cleanly with two of the three states `Solicitud.assignee` can be in (the third is "assigned to user X"). The filter exposes all three.

## What Changes

### Spec deltas (`core-modulo-genericos`)

- **ADDED Requirement: Inbox L3 filter row MUST expose an assignee filter with `'Todos'` / `'Sin asignar'` / per-user options.** The filter narrows `filteredSolicitudes` to records whose `assignee` matches the selection. Three canonical option modes:
  - `''` (Todos, default) → no filtering on assignee.
  - `'__unassigned__'` (Sin asignar) → only records with `assignee === null` or `assignee === undefined`.
  - `'<user_id>'` (any registered user id) → only records with `assignee === <user_id>`.
  The user options listed in the dropdown SHALL be sourced from the app's user directory (template mocks the directory via `MOCK_USERS` from `@/mocks/genericos/users`; real apps wire the directory via their auth provider). System actors (e.g. the seed `'Sistema'` user) MUST NOT appear in the dropdown — only human users.

### Code

- `src/pages/Inbox.vue` — new ref `filterAssignee: '' | '__unassigned__' | <user_id>`. New `<select>` in the L3 filter row labeled "Asignado a · Todos / Sin asignar / <user names>". The select sits between the existing Concepto and Estado filters (filter row order: Kind / Concepto / Asignado a / Estado). `filteredSolicitudes` AND-merges the new filter alongside Kind / Concepto / Estado.
- The existing "Responsable" table column (which displays `solicitudOwnerName(s)` — the *owner*, i.e. currently-working user) is unchanged. The filter operates on `assignee` (the directed-to user) per spec — these are independent fields and the filter intentionally aligns with `assignee`. A future polish round MAY rename the column header to disambiguate.

### Tests

- No new tests in this round (the queue is open; the user prioritized speed of iteration). A follow-up change can add behavioral tests for the filter (test for "Todos" default, test for "Sin asignar" filtering null assignees, test for per-user filtering).

### Product source-of-truth

- No update needed — `features/common/centro-de-solicitudes.md` already lists `assignee` in the L3 filters table; this change brings the template in line with the spec.

## Capabilities

### Affected Capabilities

- `core-modulo-genericos` — 1 ADDED Requirement (the assignee filter specification). Capability count: 22 → 23.

### New Capabilities

None.
