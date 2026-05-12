## MODIFIED Requirements

### Requirement: Inbox houses Solicitudes; the canonical TS identifier MUST be Solicitud<TPayload>

The Inbox module SHALL manage entities named `Solicitud` in TypeScript code; the canonical identifier is the **generic** `Solicitud<TPayload = unknown>` exported from `src/types/genericos.ts` and SHALL NOT be aliased to "Item", "Ticket", or any other generic noun. The interface SHALL declare required fields `id: string`, `concept: string`, `type: InboxType`, `source_app: string`, `source_module: string`, `target_app: string`, `owner: string | null`, `state: SolicitudState`, `payload: TPayload`, `timeline: TimelineEvent[]`, `comments: Comment[]`, `created_at: string`, `updated_at: string`; and optional fields `target_role?: string`, `assignee?: string | null`, `severity?: Severity`, `sla_hours?: number | null`, `due_at?: number`, `recurring_definition_id?: string`, `triggered_actions?: TriggeredAction[]`, `closure_action?: string`, `closure_comment?: string`, `closed_by?: string`, `closed_at?: number`. The `type: InboxType` field (canonical values `'solicitud' | 'tarea'`) is the **discriminator** between Solicitudes (third-party-requested) and Tareas (self-issued); both share the same engine, lifecycle, and `<ClosureModal>` mechanics. The `concept: string` field (e.g. `'aprobacion_pago'`, `'revision_legajo'`) is the **business classifier** — what this Solicitud is about — and matches the key of an entry in `INBOX_TYPES_REGISTRY`. The Inbox page SHALL NOT render a `<Segmenter>` for record-set segmentation; users narrow the visible records via the L3 filter row (Concepto / Estado / Tipo / Mías). The detail surface for any Solicitud/Tarea SHALL be the side `<Drawer>` (`meta.detail = 'drawer'`); a centered modal is forbidden.

#### Scenario: Solicitud<TPayload> is imported from the canonical types file

- **GIVEN** an app's Inbox page or extension types
- **WHEN** the file imports the canonical shape
- **THEN** the import statement reads `import type { Solicitud } from '@/types/genericos';`; apps that need typed payload pin it via `type KycSolicitud = Solicitud<KycPayload>`; redefining the base generic in app code is forbidden

#### Scenario: type is the discriminator between Solicitud and Tarea

- **GIVEN** two records of the same engine
- **WHEN** one is created from a CLP CTA targeting OPS (`type: 'solicitud'`) and the other from a recurring series internal to OPS (`type: 'tarea'`)
- **THEN** both share `state`, `timeline`, `comments`, `closeActions[]` mechanics; the only differences are the label/badge in the UI and the vocabulary of the closeActions

#### Scenario: assignee is distinct from owner

- **GIVEN** a Solicitud with `assignee: 'u-2'` and `owner: null` in state `pendiente`
- **WHEN** an operator clicks "Tomar"
- **THEN** the engine sets `owner: <current_user_id>` and transitions state to `en_proceso`; the `assignee` field is unchanged; the Timeline records both events separately (one `kind: 'taken'` and zero `kind: 'assigned'` for this transition)

#### Scenario: App-specific Solicitud pins the payload type

- **GIVEN** an app declares `type WithdrawalSolicitud = Solicitud<{ client: string; amount: number; currency: string; }>`
- **WHEN** the app reads `s.payload.amount`
- **THEN** the field is typed as `number`; TypeScript narrows correctly without `as` casts; the base fields (`id`, `concept`, `type`, `target_app`, `state`, etc.) remain required

#### Scenario: Removing type or concept is a contract violation

- **GIVEN** an app introduces `interface Solicitud { ... }` without a `type` field or without a `concept` field
- **WHEN** PR review checks the change
- **THEN** the change is REJECTED — `type` is the canonical discriminator (`'solicitud' | 'tarea'`) and `concept` is the business classifier; the UI MUST render the correct badge per `type` and the engine MUST resolve `InboxTypeConfig` via `concept`

---

### Requirement: Inbox MUST expose a typed registry `InboxTypeConfig` declaring `creable_manualmente`, `manual_creation_capability`, `payload_schema`, `closeActions[]`, `triggers_on_create[]`, `available_actions[]`, `push_notification?`, `auto_archive?`

Every app's Inbox SHALL declare a typed registry `INBOX_TYPES_REGISTRY: Readonly<Record<string, InboxTypeConfig>>` in `src/config/inbox-types.ts` (or in an app-specific equivalent that the Inbox page imports). The registry is keyed by `concept` (the business classifier — `Solicitud.concept`). Each registry entry SHALL declare:

- `concept: string` — the canonical business classifier identifier matching `Solicitud.concept` of records of this kind.
- `type: InboxType` — `'solicitud'` or `'tarea'`; mandatory; drives label/badge and closeActions vocabulary.
- `label: string` — human-readable label of the concept.
- `target_app: string` — the app that owns Solicitudes/Tareas of this concept.
- `target_role?: string` — capability for routing notifications.
- `payload_schema: DynamicFormSchema` — the schema that `<DynamicPayloadForm>` consumes to render the create form; consumed by the template's existing `useDynamicForm` composable.
- `sla_hours?: number` — default SLA window for new records of this concept.
- `creable_manualmente?: boolean` — default `false`; when `true`, the concept is creatable from the Inbox main CTA.
- `manual_creation_capability?: string` — capability required for manual creation from the Inbox CTA; SHALL be honored even when `creable_manualmente: true` is set.
- `closeActions: CloseAction[]` — at least one entry; each `{ id, label, terminal_state, requires_comment? }`. The `<ClosureModal>` lists these as the close-action choices.
- `triggers_on_create?: TriggerSpec[]` — manifest-engine actions to invoke automatically on creation, each with `action_id` + optional `payload_mapping`.
- `available_actions?: ActionSpec[]` — CTAs that appear in the `<Drawer>` of records of this concept, with `enable_when` predicate.
- `push_notification?` — declares optional canales `browser` / `email` / `slack` (each opt-in per concept; in-app badge is always-on, not declared per concept).
- `auto_archive?` — declarative auto-close rule: `{ condition_ref: string; closure_action: string }`. The engine evaluates `condition_ref` over time and auto-closes the record with `closure_action` when the condition becomes true; `closed_by: 'system'`.
- `state_labels?: Partial<Record<SolicitudState, string>>` — visual override of state labels; never changes the mechanism.

The registry SHALL be immutable at runtime (`Readonly<...>`). The Inbox page SHALL import the registry and use it to: (a) resolve close-action vocabularies for the `<ClosureModal>`; (b) gate the main CTA (see next Requirement); (c) render labels and badges. Apps SHALL NOT mutate the registry at runtime; new concepts are added via a fresh declaration + PR.

#### Scenario: A concept is creable_manualmente AND the user has the capability

- **GIVEN** an `InboxTypeConfig` entry for `'aprobacion_pago'` with `creable_manualmente: true` and `manual_creation_capability: 'INBOX_CREATE'`, and a user with `capabilities: ['INBOX_CREATE']`
- **WHEN** the Inbox page renders
- **THEN** the concept is included in the result of `listCreableTypes(user.capabilities)`; the main CTA surfaces this concept in the type-selector wizard

#### Scenario: A concept is creable_manualmente but the user lacks the capability

- **GIVEN** the same concept, but a user with `capabilities: []`
- **WHEN** `listCreableTypes(user.capabilities)` is called
- **THEN** the concept is NOT included in the result; the main CTA does not list it in the type selector

#### Scenario: A concept is NOT creable_manualmente

- **GIVEN** an `InboxTypeConfig` entry with `creable_manualmente: false` (or omitted; default is `false`)
- **WHEN** `listCreableTypes(...)` is called
- **THEN** the concept is NEVER in the result regardless of the user's capabilities; the concept can still arrive via API ingestion or recurring series, just not from the manual CTA

#### Scenario: auto_archive closes the record on condition evaluation

- **GIVEN** an `InboxTypeConfig` for `report_dependency_block` with `auto_archive: { condition_ref: 'reportDeps.completed === true', closure_action: 'dependency_resolved' }`
- **WHEN** the engine evaluates the condition at a later time and it returns true
- **THEN** the Tarea transitions to `state: 'completed'`, `closure_action: 'dependency_resolved'`, `closed_by: 'system'`, `closed_at: <ts>`; a `TimelineEvent { kind: 'closed', by: 'system' }` is appended

## RENAMED Requirements

- FROM: `### Requirement: Inbox MUST expose a main CTA "Crear Solicitud / Tarea" filtered by `InboxTypeConfig.creable_manualmente: true` and `manual_creation_capability`; the label is derived from `kind` of the available types`
- TO: `### Requirement: Inbox MUST expose a main CTA "Crear Solicitud / Tarea" filtered by InboxTypeConfig.creable_manualmente: true and manual_creation_capability; the label is derived from type of the available configs`

- FROM: `### Requirement: Inbox views MUST surface the `kind` discriminator as a badge and the L3 filter row MUST expose a kind filter`
- TO: `### Requirement: Inbox views MUST surface the type discriminator as a badge and the L3 filter row MUST expose a type filter`
