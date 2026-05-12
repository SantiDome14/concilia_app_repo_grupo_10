## ADDED Requirements

### Requirement: Inbox views MUST surface the `kind` discriminator as a badge and the L3 filter row MUST expose a kind filter

The Inbox page SHALL render the `kind` (`'solicitud' | 'tarea'`) discriminator of every visible record as a `<Badge>` per the canonical `Solicitud` / `Tarea` labels in **all four** surfaces: list rows, card headers, kanban cards, and the Drawer header area. The L3 filter row SHALL also expose a **kind filter** (separate from the Tipo and Estado filters; native `<select>` is permitted at the L3 row per the existing Inbox convention; `<Segmenter>` is forbidden because the Inbox spec disallows record-set segmentation). The kind filter SHALL expose three options regardless of how many entries of each kind exist in the dataset: `"Todos"`, `"Solicitudes"`, `"Tareas"`. When the filter is `"Todos"` (or unset) the view SHALL render records of both kinds; when set to a specific kind, the view SHALL hide records of the other kind. The kind filter is independent of and AND-merges with the Tipo and Estado filters.

#### Scenario: Kind badge appears in every view

- **GIVEN** a Solicitud with `kind: 'solicitud'` and a Tarea with `kind: 'tarea'` both present in the dataset
- **WHEN** the Inbox page renders
- **THEN** the row of the Solicitud surfaces a `<Badge>` labeled `"Solicitud"` (and the row of the Tarea a `<Badge>` labeled `"Tarea"`) in the list view, the cards view, the kanban view, and on the header of the Drawer when opened — four surfaces total

#### Scenario: Kind filter narrows the visible dataset to one kind

- **GIVEN** the L3 filter row with `Kind = "Tareas"` selected
- **WHEN** `filteredSolicitudes` recomputes
- **THEN** only records with `kind: 'tarea'` are rendered in the active view; the L2 KPI counters recompute over the narrowed set

#### Scenario: Kind filter "Todos" renders both kinds simultaneously

- **GIVEN** the L3 filter row with `Kind = "Todos"`
- **WHEN** `filteredSolicitudes` recomputes
- **THEN** both Solicitudes and Tareas render together; each row carries its own kind badge so the user can disambiguate at a glance

#### Scenario: Kind filter coexists with the Tipo and Estado filters

- **GIVEN** the L3 filter row with `Kind = "Solicitudes"`, `Tipo = "aprobacion_pago"`, `Estado = "pendiente"`
- **WHEN** `filteredSolicitudes` recomputes
- **THEN** only records with `kind: 'solicitud' AND type === 'aprobacion_pago' AND state === 'pendiente'` are rendered; all three filters AND-merge

#### Scenario: Hiding the kind badge from any of the four surfaces is a contract violation

- **GIVEN** a PR proposes removing the kind badge from the list view (or any of the other three surfaces)
- **WHEN** PR review checks the change against this Requirement
- **THEN** the change is REJECTED — the kind discriminator MUST be visible on all four surfaces simultaneously

---

### Requirement: Drawer MUST render a `triggered_actions` panel when the Solicitud carries one or more entries

When the Drawer opens for a Solicitud whose `triggered_actions[]` is non-empty, the Drawer body SHALL render a labeled section (`"Acciones disparadas"` — or equivalent) listing every entry. Each row SHALL surface:

- The `action_ref` of the trigger (mono-font / kbd-style rendering to communicate it is an action identifier, not free text).
- A `<Badge>` rendering the entry's `status`, mapped:
  - `pending` → variant `warning`
  - `ok` → variant `success`
  - `error` → variant `danger`
- The `result_ref` (when present) rendered next to / under the badge.
- The `error_message` (when present, and `status === 'error'`) rendered as a small caption row below the action_ref.

The panel SHALL be hidden entirely when `triggered_actions` is `undefined` or an empty array — no "no triggers yet" placeholder is rendered (the Drawer's other sections — Información, Timeline, Comments — already convey the absence by their presence). The panel placement SHALL be inside the Drawer body slot between the Información section and the Timeline section.

#### Scenario: Panel renders one row per triggered_actions entry

- **GIVEN** a Solicitud with `triggered_actions: [{ action_ref: 'demo.x', status: 'ok', result_ref: 'FACT-001', at: 0 }, { action_ref: 'demo.y', status: 'pending', at: 1 }]`
- **WHEN** the user opens the Drawer on this Solicitud
- **THEN** the body shows the labeled panel with two rows: the first for `demo.x` with a `success` badge ("ok") and `FACT-001` shown; the second for `demo.y` with a `warning` badge ("pending")

#### Scenario: Error entries surface the error_message caption

- **GIVEN** a Solicitud with `triggered_actions: [{ action_ref: 'demo.z', status: 'error', error_message: 'Service unavailable', at: 0 }]`
- **WHEN** the Drawer renders the panel
- **THEN** the row shows `demo.z` with a `danger` badge ("error") AND a caption row below the action_ref showing `"Service unavailable"`

#### Scenario: Empty triggered_actions hides the panel entirely

- **GIVEN** a Solicitud with `triggered_actions` undefined or `[]`
- **WHEN** the Drawer renders
- **THEN** no "Acciones disparadas" section is rendered; the Drawer body shows only Información (the page-provided default slot content) + Timeline + Comments

#### Scenario: Hiding the panel when entries are populated is a contract violation

- **GIVEN** a PR proposes hiding the panel even when entries are non-empty (e.g. behind a collapsed toggle by default)
- **WHEN** PR review checks the change against this Requirement
- **THEN** the change is REJECTED — when entries are populated, the panel MUST render eagerly so the user sees the trigger status without extra clicks
