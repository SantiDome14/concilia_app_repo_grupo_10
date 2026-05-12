## ADDED Requirements

### Requirement: Inbox L3 filter row MUST expose an assignee filter with `Todos` / `Sin asignar` / per-user options

The Inbox page SHALL render an assignee filter in the L3 filter row alongside the existing Tipo / Concepto / Estado filters. The filter narrows the visible records to those whose `assignee` field matches the user's selection. The filter SHALL be a single native `<select>` (consistent with the other L3 filters; per the Inbox-no-Segmenter Requirement) exposing three canonical option modes:

- **`''` (empty value, default — "Todos")** — no filtering on assignee; every visible record passes regardless of `assignee` value.
- **`'__unassigned__'` ("Sin asignar")** — only records with `assignee === null` OR `assignee === undefined` pass. Records assigned to any user are hidden.
- **`'<user_id>'` (any registered user id, e.g. `'u-2'`)** — only records with `assignee === <user_id>` pass.

The per-user options exposed in the dropdown SHALL be sourced from the app's user directory (the template mocks the directory via `MOCK_USERS` from `@/mocks/genericos/users`; real apps wire the directory via their auth provider). System actors (e.g. the seed `'Sistema'` user with id `'u-4'` and `role: 'system'`) MUST NOT appear in the dropdown — only human users. The filter SHALL AND-merge with every other L3 filter (Tipo, Concepto, Estado, search term).

#### Scenario: Default "Todos" passes every record regardless of assignee

- **GIVEN** the L3 filter row with `filterAssignee = ''`
- **WHEN** `filteredSolicitudes` recomputes
- **THEN** the dataset is unchanged on the assignee axis; records with `assignee === null`, `assignee === undefined`, AND records with any user-id assignee all pass

#### Scenario: "Sin asignar" hides every record with a non-null assignee

- **GIVEN** the L3 filter row with `filterAssignee = '__unassigned__'`
- **WHEN** `filteredSolicitudes` recomputes
- **THEN** records with `assignee === null` or `assignee === undefined` pass; records with any string assignee are hidden

#### Scenario: Per-user filter narrows to the matching assignee

- **GIVEN** the L3 filter row with `filterAssignee = 'u-2'` and a dataset containing records with `assignee` values `'u-1'`, `'u-2'`, `null`
- **WHEN** `filteredSolicitudes` recomputes
- **THEN** only the records with `assignee === 'u-2'` pass; the `'u-1'` and `null` records are hidden

#### Scenario: AND-merge with the other L3 filters

- **GIVEN** the L3 filter row with `filterAssignee = '__unassigned__'`, `filterType = 'solicitud'`, `filterState = 'pendiente'`
- **WHEN** `filteredSolicitudes` recomputes
- **THEN** only records that simultaneously satisfy `assignee === null`, `type === 'solicitud'`, AND `state === 'pendiente'` pass; all three filters AND-merge

#### Scenario: System actor is excluded from the per-user option list

- **GIVEN** `MOCK_USERS` contains an entry with `role: 'system'` (e.g. the seed `'Sistema'` user)
- **WHEN** the assignee `<select>` renders its options
- **THEN** the system user is NOT listed; only entries with `role !== 'system'` appear
