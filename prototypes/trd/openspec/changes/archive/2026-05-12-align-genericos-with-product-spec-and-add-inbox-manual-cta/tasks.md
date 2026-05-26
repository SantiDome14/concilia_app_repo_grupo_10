# Tasks — align-genericos-with-product-spec-and-add-inbox-manual-cta

The change has eight task groups. Group order is the suggested implementation sequence — each group leaves the codebase in a green-gates state (type-check + lint + tests) before the next starts. Groups 1–4 are the model refactor; groups 5–6 ship the main CTA; groups 7–8 reconcile and validate.

## 1. Types refactor — `src/types/genericos.ts`

- [ ] Add `InboxKind = 'solicitud' | 'tarea'`
- [ ] Promote `Solicitud` to `Solicitud<TPayload = unknown>` with `payload: TPayload`
- [ ] Add to `Solicitud<TPayload>`: `kind: InboxKind`, `target_app: string`, `target_role?: string`, `assignee?: string | null`, `recurring_definition_id?: string`, `triggered_actions?: TriggeredAction[]`, `closure_action?: string`, `closed_by?: string`, `closed_at?: number`, `due_at?: number`
- [ ] Rename `Solicitud.owner_id` → `owner: string | null`; remove `Solicitud.owner_name`
- [ ] Extend `TimelineEvent.kind` union with `'assigned' | 'taken' | 'released' | 'action_invoked'`
- [ ] Add `TriggeredAction` interface: `{ action_ref: string; status: 'pending' | 'ok' | 'error'; result_ref?: string; error_message?: string; at: number }`
- [ ] Add `CloseAction` interface: `{ id: string; label: string; terminal_state: 'completed' | 'rejected'; requires_comment?: boolean }`
- [ ] Add `TriggerSpec` interface: `{ action_id: string; payload_mapping?: Record<string, string> }`
- [ ] Add `ActionSpec` interface (CTAs in Drawer): `{ action_id: string; enable_when?: unknown }`
- [ ] Add `InboxTypeConfig` interface per spec § Modelo canónico (mandatory `kind`, `label`, `target_app`, `payload_schema`, `closeActions[]`; optional `target_role`, `sla_hours`, `creable_manualmente`, `manual_creation_capability`, `triggers_on_create[]`, `available_actions[]`, `push_notification?`, `auto_archive?`, `state_labels?`)
- [ ] Add `RecurringInboxItemDefinition` interface per spec § Series recurrentes (full shape: `cadence: { periodicity, cron_expr?, next_creation_date, sla_hours?, due_offset_hours? }`, `series_state: 'active' | 'paused' | 'archived'`)
- [ ] Rename `AlertProfile` → `AlertCategory` with union `'triage' | 'workflow' | 'metric' | 'cross_app_panel'`
- [ ] Rename `Alerta.profile` → `Alerta.category`
- [ ] Update `isAlerta` type guard to read `category` and validate the four canonical values
- [ ] Add `ReportPermissions` interface: `{ view: string[]; execute: string[]; edit: string[]; delete: string[] }`
- [ ] Add `ConsumerAppRef` interface (opaque ref to a consumer app)
- [ ] Extend `Report` with `permissions: ReportPermissions` (mandatory), `consumer_apps: ConsumerAppRef[]`, `allows_auto_generation: boolean`
- [ ] Extend `ReportDependency` with `recurring_definition_id?: string`
- [ ] Add `ReportDependencySnapshot` interface
- [ ] Extend `ReportRun` with `dependencies_unmet?: ReportDependencySnapshot[]`
- [ ] Update `isSolicitud` and `isReport` type guards to validate new mandatory fields
- [ ] `npm run type-check` reports errors only in downstream files (mocks, pages, tests) — to be fixed in subsequent groups

## 2. Inbox types registry — `src/config/inbox-types.ts` (NEW)

- [ ] Create the file with banner comment explaining the role of the registry
- [ ] Export `INBOX_TYPES_REGISTRY: Readonly<Record<string, InboxTypeConfig>>` with the four placeholder types from the current mocks: `aprobacion_pago`, `revision_legajo`, `baja_usuario`, `cambio_limite`
- [ ] For each type, declare `kind`, `label`, `target_app: 'CORE'` (placeholder), `payload_schema` (a 3–5 field shape compatible with the existing `useDynamicForm` schema flavor), `closeActions[]` (at least one terminal `completed` and one terminal `rejected`)
- [ ] Mark two of the four with `creable_manualmente: true` and `manual_creation_capability: 'INBOX_CREATE'` to exercise the CTA filtering path. Leave the other two with `creable_manualmente: false`
- [ ] Optionally declare `sla_hours` on at least one type
- [ ] Export `getInboxTypeConfig(type: string): InboxTypeConfig | undefined`
- [ ] Export `listCreableTypes(userCapabilities: string[]): InboxTypeConfig[]` (helper that filters by `creable_manualmente: true` AND capability intersection)
- [ ] `npm run type-check` exits 0 for this file in isolation

## 3. Mock data alignment

- [ ] `src/mocks/genericos/inbox.ts` — for each existing Solicitud, add `kind` (derive from the type registry), `target_app: 'CORE'`, `payload` (a typed object matching the type's schema; move `summary` content into `payload.description` or equivalent), `assignee` (set equal to the current `owner_id`)
- [ ] `src/mocks/genericos/inbox.ts` — rename `owner_id` → `owner`; remove the `owner_name` field (resolution is now display-time)
- [ ] `src/mocks/genericos/alertas.ts` — rename `profile` → `category`; map values `'A' → 'triage'`, `'B' → 'workflow'`, `'C' → 'metric'`, `'D' → 'cross_app_panel'`
- [ ] `src/mocks/genericos/reportes.ts` — add `permissions: { view, execute, edit, delete }` to each mock report (use a placeholder capability set like `['MANAGE_REPORTS']` for all four levels on every report); add `consumer_apps: []` (empty / headless for the template defaults); add `allows_auto_generation: true` for cron-enabled reports and `false` for ad-hoc
- [ ] `npm run type-check` exits 0 for the mocks

## 4. Pages + components reconciliation (model refactor consumers)

- [ ] `src/pages/Inbox.vue` — replace `s.owner_id`/`s.owner_name` with `s.assignee`/`s.owner` reads via a user-lookup helper; update `INBOX_KANBAN_STATES` / transitions to reference `state` field unchanged; ensure the existing render still compiles
- [ ] `src/pages/Inbox.vue` — replace static `STATE_LABELS` lookup with `InboxTypeConfig.state_labels` override when the type declares it (fallback to the global default labels)
- [ ] `src/pages/Alertas.vue` — replace `profile` reads with `category`; update any conditional branching on profile A/B/C/D → category triage/workflow/metric/cross_app_panel
- [ ] `src/pages/Reportes.vue` — read the new `permissions` field where the row-action visibility was previously hardcoded (filter "Editar metadata" / "Configurar CRON" / "Archivar" by capability intersection); read `consumer_apps[]` for the catalog filter (no UI change in this round)
- [ ] `src/manifests/framework.template.inbox.actions.ts` — update `inbox.asignar_owner` action to write `assignee` (not `owner_id`) and add a new `inbox.tomar` action that writes `owner` + transitions to `en_proceso` (this is the "Tomar / Liberar" CTA pair per the spec)
- [ ] `src/components/drawer/Timeline.vue` — accept the extended `TimelineEvent.kind` union; render labels for the new kinds (`assigned`, `taken`, `released`, `action_invoked`)
- [ ] `npm run type-check` exits 0
- [ ] `npm run lint` exits 0

## 5. Main CTA components — `src/components/inbox/` (NEW directory)

- [ ] Create `src/components/inbox/InboxCreateCTA.vue` — page-header Button. Computes `availableTypes = listCreableTypes(user.capabilities)`. Hides the CTA entirely when `availableTypes.length === 0` AND `INBOX_TYPES_REGISTRY` has no entry with `creable_manualmente: true` (no creable type at all → CTA disappears). Renders disabled with tooltip "Sin permiso para crear" when `availableTypes.length === 0` AND the registry has at least one creable type the user can't reach. Label derived from available types: only `solicitud` → "Crear Solicitud"; only `tarea` → "Crear Tarea"; both → "Crear". On click opens `<InboxCreateDialog>`.
- [ ] Create `src/components/inbox/InboxTypeSelector.vue` — step 1 of the wizard. Renders the type list as cards with kind-badge + label + description; click selects.
- [ ] Create `src/components/inbox/DynamicPayloadForm.vue` — step 2. Wraps `useDynamicForm` against the selected type's `payload_schema`. Renders fields per the schema; also surfaces common metadata (assignee picker via a user-lookup dropdown; optional `sla_hours` / `due_at` when the type allows them).
- [ ] Create `src/components/inbox/InboxCreateDialog.vue` — wraps the 2-step wizard using `useWizard` (existing composable from `core-multi-step-form`). Step 1 mounts `<InboxTypeSelector>`; step 2 mounts `<DynamicPayloadForm>`. Footer: Cancel + Back (step 2) + Submit (step 2). On submit: builds the `Solicitud<TPayload>` shape (id sequential, `state: 'pendiente'`, `kind` from registry, `payload` from form, `source_app: <current>`, `source_module: 'inbox'`, `target_app: <inbox target>`, optional `assignee`, `due_at`, `sla_hours`, `timeline: [created event]`, `comments: []`); emits a `created` event with the new Solicitud.
- [ ] Create `src/components/inbox/index.ts` barrel file exporting the four components.
- [ ] `npm run lint && npm run type-check` exits 0

## 6. Wire CTA into `Inbox.vue`

- [ ] Add `<InboxCreateCTA @created="handleCreated" />` to the L1 header alongside `<ViewToggle>`
- [ ] Implement `handleCreated(newSolicitud)`: push into `solicitudes.value`, emit audit log entry `{ kind: 'cta', is_module_cta: true, created_record_type: newSolicitud.type, record_id: newSolicitud.id, manifest_key: INBOX_MANIFEST_KEY, user_id, timestamp, changes: { ...payload } }` via `useAuditLog().append(...)`, surface a success toast "Solicitud creada" or "Tarea creada" per kind
- [ ] Mock executor for `triggers_on_create[]`: when the selected type declares triggers, append a `TimelineEvent { kind: 'action_invoked', label: 'Trigger: <action_ref>' }` to the new Solicitud's timeline; do NOT invoke the manifest engine in this round (Decision 9). Persist `triggered_actions[]` entries with `status: 'pending'`.
- [ ] Manual smoke: in dev, click "Crear" → wizard opens → select type → fill payload → submit → new row appears in the list view with `state: 'pendiente'`; reopen via the drawer to confirm payload renders; check `useAuditLog().entries` shows the new entry.

## 7. Spec deltas — `specs/core-modulo-genericos/spec.md`

- [ ] MODIFIED Requirement: `Inbox houses Solicitudes; the canonical TS identifier MUST be Solicitud<TPayload>` (was non-generic) — update body + Scenarios to reference the new field set
- [ ] MODIFIED Requirement: `Inbox MUST declare a state machine with terminal-state ClosureModal` — formalize the reference to `InboxTypeConfig.closeActions[]`
- [ ] MODIFIED Requirement: `Alertas houses system-detected events with category triage/workflow/metric/cross_app_panel semantics` (was profile A/B/C/D)
- [ ] MODIFIED Requirement: `Alertas terminal states MUST require a justification via the ClosureModal` (replace "profile B" with "category workflow")
- [ ] MODIFIED Requirement: `Reports MAY emit REPORT_DEPENDENCY events; destination Inbox MUST consume them as Tarea report_dependency_block with declarative auto_archive` (was Alerta profile A)
- [ ] MODIFIED Requirement: `Reportes MUST split Catálogo / Ejecución via the Type B Tabs pattern` — extend with `permissions`, `consumer_apps[]`, `allows_auto_generation` constraints + Scenarios
- [ ] MODIFIED Requirement: `Shared TS types MUST live in src/types/genericos.ts; app-specific extensions extend the base types` — extend the type list with `InboxTypeConfig`, `RecurringInboxItemDefinition`, `AlertCategory`, `ReportPermissions`, `ReportDependencySnapshot`
- [ ] ADDED Requirement: `Inbox MUST expose a typed registry InboxTypeConfig with creable_manualmente, manual_creation_capability, payload_schema, closeActions, triggers_on_create, available_actions, push_notification, auto_archive` with Scenarios
- [ ] ADDED Requirement: `Inbox MUST expose a main CTA Crear Solicitud / Tarea filtered by InboxTypeConfig.creable_manualmente: true and manual_creation_capability; label is kind-derived` with Scenarios
- [ ] ADDED Requirement: `Solicitud assignee is distinct from owner; both are independently mutable` with Scenarios (assignee settable at create, mutable in non-terminal states; owner auto-assigned on transition to en_proceso)
- [ ] ADDED Requirement: `Inbox SHALL support recurring series via RecurringInboxItemDefinition` with Scenarios (series-instance independence, scheduler creates new instances per cadence, pause/archive states)
- [ ] ADDED Requirement: `Reportes MUST declare ReportPermissions (4 levels: view/execute/edit/delete) with secure defaults and consumer_apps[]` with Scenarios
- [ ] ADDED Requirement: `Reportes MUST bifurcate by allows_auto_generation for próximo-emisión and incomplete-dependency events` with Scenarios

## 8. Tests — update existing fixtures AND add new behavioral tests for the CTA + registry

### 8a. Existing tests updated to track type and shape changes

- [ ] `src/pages/Inbox.spec.ts` — update mock Solicitud shapes (add `kind`, `payload`, `target_app`, `assignee`, rename `owner_id` → `owner`, drop `owner_name`); fix assertions that read renamed fields
- [ ] `src/pages/Alertas.spec.ts` — rename `profile` references → `category`; update mock Alerta values
- [ ] `src/pages/Reportes.spec.ts` — add `permissions`, `consumer_apps[]`, `allows_auto_generation` to mock reports; update any assertions that read these fields by name
- [ ] `src/components/drawer/Timeline.spec.ts` — extend mock TimelineEvent kinds when the renderer is exercised with the new kinds (`assigned`, `taken`, `released`, `action_invoked`)
- [ ] `src/components/drawer/Drawer.spec.ts`, `CommentsThread.spec.ts` — unchanged (no Solicitud-specific fields read)
- [ ] `src/components/manifest/ManifestActionsMenu.spec.ts` — unchanged

### 8b. New behavioral tests for the CTA + registry

- [ ] `src/components/inbox/InboxCreateCTA.spec.ts` — mount + capability scenarios: hidden when no creable type / disabled-with-tooltip when no matching capability / enabled when the user has at least one capability / label kind-derivation (only solicitud → "Crear Solicitud", only tarea → "Crear Tarea", mixed → "Crear")
- [ ] `src/components/inbox/InboxCreateDialog.spec.ts` — wizard step transitions (step 1 → step 2 after selecting a type, back navigation, cancel resets state, submit closes the dialog)
- [ ] `src/components/inbox/InboxTypeSelector.spec.ts` — filtering rules: hides non-`creable_manualmente` types, hides types lacking the user's capability, renders kind-badge per entry
- [ ] `src/components/inbox/DynamicPayloadForm.spec.ts` — renders fields from a representative `payload_schema`, validates required fields, emits typed form values on submit
- [ ] `src/config/inbox-types.spec.ts` — `getInboxTypeConfig` returns the correct entry / `undefined` when missing; `listCreableTypes` filters by both `creable_manualmente: true` AND user-capability intersection
- [ ] `src/pages/Inbox.spec.ts` (additional cases) — end-to-end CTA submission produces (a) a new Solicitud in `state: 'pendiente'` with the expected `kind` / `target_app` / `payload`; (b) exactly one `AuditEntryCTA` with `kind: 'cta'`, `is_module_cta: true`, `created_record_type` matching the picked type; (c) a success toast; (d) `triggered_actions[]` entries populated when the type declares `triggers_on_create[]`, plus a `TimelineEvent { kind: 'action_invoked' }` per trigger

### 8c. Gate

- [ ] `npm run test:run` exits 0 with all updates + new tests included

## 9. Validation gates

- [ ] `openspec validate align-genericos-with-product-spec-and-add-inbox-manual-cta --strict` exits 0
- [ ] `openspec validate --all --strict` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm run type-check` exits 0
- [ ] `npm run test:run` exits 0
- [ ] `npm run build:qa` exits 0
- [ ] Manual smoke recorded in `design.md` § Validation: load `/inbox`, click "Crear Solicitud" / "Crear Tarea" / "Crear", complete the wizard, confirm new Solicitud lands in list view with correct shape and audit entry

## 10. Archive

- [ ] After all validation gates pass, run `openspec archive align-genericos-with-product-spec-and-add-inbox-manual-cta`
- [ ] Confirm the CLI applies the deltas into the baseline (`openspec/specs/core-modulo-genericos/spec.md`) and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-align-genericos-with-product-spec-and-add-inbox-manual-cta/`
- [ ] Final commit with conventional message: `feat(inbox): align Solicitud<TPayload> + InboxTypeConfig with product spec, migrate Alerta profile→category, refactor REPORT_DEPENDENCY to Tarea, ship main CTA Crear Solicitud/Tarea`
