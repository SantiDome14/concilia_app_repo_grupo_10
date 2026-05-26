# Design — align-genericos-with-product-spec-and-add-inbox-manual-cta

## Context

The product source-of-truth for the four generic modules of the financial-core (`features/common/centro-de-solicitudes.md`, `features/common/centro-de-alertas.md`, `features/common/centro-de-reporteria.md`) advanced through three sessions in May 2026 (10, 11, 12) that the template has not yet incorporated:

- **2026-05-10** — Profile A/B/C/D → categories `triage / workflow / metric / cross_app_panel`. `Solicitud` → `Solicitud<TPayload>` generic with `kind`, `assignee` distinct from `owner`, `target_app`, `target_role`, recurring-series fields, triggered-actions audit. `InboxTypeConfig` registry. `RecurringInboxItemDefinition`. `ReportPermissions` (4 levels). `consumer_apps[]`. `allows_auto_generation`. `ReportRun.dependencies_unmet[]`.
- **2026-05-11** — `REPORT_DEPENDENCY` modeled as a **Tarea** in the Inbox of the `blocking_app` with `auto_archive`, replacing the previous Alerta routing. Bifurcation by `allows_auto_generation` for próximo-emisión events. `ReportDependency.recurring_definition_id?` to link reportes against Inbox recurring series.
- **2026-05-12** — Wizard of Oz architectural principle + Centro scope exclusivity (handled by the companion docs-only change `formalize-paradigm-principles-2026-05-12`).

The downstream cost of leaving these gaps in the template is concrete: every new app cloned from the template inherits a model and a spec that contradict the product contract. The first app that imports `import type { Solicitud } from '@/types/genericos'` and writes against the current shape (`owner_id`, no `kind`, no `payload`) will have to be partially rewritten when the model catches up. PR review against the current spec greenlights misaligned implementations because the spec itself is misaligned. The main CTA "Crear Solicitud / Tarea" — the principal user-facing payoff of `centro-de-solicitudes.md` § Caminos de creación (b) — cannot be implemented with contract-aligned shape on top of the current model.

This change closes all the model gaps in one coordinated update and ships the main CTA on top of the new model. It is intentionally non-incremental: the new CTA depends on the new model, so splitting it into "model first, CTA later" would leave a half-aligned intermediate state where the model exists but no consumer exercises it.

The change is large but mostly mechanical. The hard design decisions are the few outlined below; everything else is a faithful port of the product source-of-truth shape.

## Decisions

### Decision 1 — `Solicitud` becomes a TS generic (`Solicitud<TPayload = unknown>`)

The product spec models `Solicitud<TPayload>` as a generic where each `type` declared in `InboxTypeConfig` pins a `TPayload` via the type's `payload_schema`. The template currently has the non-generic `Solicitud` with an ad-hoc `summary?: string` field that masquerades as the payload.

Alternatives considered:

- **Keep non-generic + add a `Record<string, unknown>` payload field.** Rejected — TS loses the per-type narrowing the spec requires; downstream apps would need `as` casts everywhere they read payload fields.
- **Discriminated union on `type`.** Rejected — the registry is open-ended (apps declare their own types); a closed union forces a recompile of the template every time an app adds a type.
- **Generic with `TPayload = unknown` default.** Adopted — matches the spec exactly; non-generic consumers see `unknown` and are forced to narrow (which is the correct safety posture); per-type narrowing is opt-in via `Solicitud<KycReviewPayload>` style annotations in app code.

Migration cost: every existing reference to `Solicitud` in the codebase becomes `Solicitud` (still valid TS — the default `TPayload = unknown` makes the bare name behave identically for consumers that don't pin the payload). The places that DO need to read `payload.x` (zero today, eventually some) declare a typed alias.

### Decision 2 — `assignee` is distinct from `owner`; both fields persist on the Solicitud

`centro-de-solicitudes.md` § "Asignación, routing y notificaciones" makes the distinction explicit:

- `assignee` = the user this Solicitud is **directed to** (settable at create time or later via the "Asignar / Reasignar / Liberar" CTA; nullable; editable in any non-terminal state).
- `owner` = the user actively **working** the Solicitud now (auto-assigned on transition to `en_proceso`; null in `pendiente`).

The template's current `owner_id` collapses both roles into one and adds `owner_name` for display caching. We split into two fields per the product spec and remove `owner_name` (resolved at display time via a user-lookup composable; persisting display names on records is a known antipattern — they drift when the user updates their name).

Alternative considered: introduce only `assignee` and rename `owner_id` → `assignee`. Rejected — that conflates the two distinct roles and breaks the spec semantics (e.g. "who is actively working this right now" cannot be expressed). The two-field model is the spec.

### Decision 3 — `InboxTypeConfig` registry lives in `src/config/inbox-types.ts`

The product spec calls for a typed registry of declarable Inbox types per app. The template needs:

- Where to put the registry → `src/config/inbox-types.ts`, alongside the existing `src/config/env.ts` and `src/config/routes.ts`. Matches the file-organization convention.
- How to expose lookups → a barrel-friendly `INBOX_TYPES_REGISTRY: Readonly<Record<string, InboxTypeConfig>>` plus a `getInboxTypeConfig(type: string)` helper. The `Readonly` wrapper enforces that the registry is immutable at runtime (apps register types at boot time, not by mutating the object at runtime).
- App overrides → apps that clone the template can replace the registry contents wholesale (the template ships four placeholder types to exercise the CTA flow). The shape is fixed by `InboxTypeConfig`; the entries are app-specific.

Alternative considered: put the registry on the Pinia store side, similar to `manifestRegistry`. Rejected — types are static configuration, not runtime state; they're loaded once at boot and never mutate. A const object in `src/config/` is the right shape; using Pinia would impose reactivity overhead with zero benefit.

### Decision 4 — `payload_schema` is JSON Schema; the form is rendered via `useDynamicForm`

The product spec declares `payload_schema: JSONSchema` per `InboxTypeConfig`. The template already has a `core-dynamic-forms` capability and a `useDynamicForm` composable (`src/composables/useDynamicForm.ts`) that renders forms from a declarative schema, plus a `core-multi-step-form` capability and a `useWizard` composable for the type-selector → payload-form sequence.

This change wires `<DynamicPayloadForm>` on top of `useDynamicForm` directly. No new dependency is needed; we do NOT bring in `@rjsf/core` or other heavyweight JSON Schema form libraries. The existing composable already supports the field types we need (`text`, `textarea`, `select`, `date`, `number`, `boolean`, `lookup`). If a future Inbox type requires a JSON Schema construct the composable doesn't yet support (e.g. anyOf branching), the composable gets extended via a follow-up change to `core-dynamic-forms` — not by adding a parallel library.

### Decision 5 — The main CTA lives OUTSIDE the manifest engine (new components, not `module_ctas[]`)

The manifest engine's `module_ctas[]` is single-action: one click → one dialog → one creator. The Inbox main CTA is two-step (pick type → render type-specific form) and the type-list is sourced from `INBOX_TYPES_REGISTRY`, not from the manifest. Modeling it as a `module_ctas[]` entry would force one of:

- N entries (one per creable type) → multiple buttons in the page header, inconsistent with the spec which expects a single CTA with kind-derived label.
- One entry with a `select` of type in the dialog → loses the type-specific `payload_schema` rendering (the dialog's `fields[]` is static once declared).

So new components live under `src/components/inbox/`:

- `<InboxCreateCTA>` — the button in the L1 header.
- `<InboxCreateDialog>` — wraps the wizard.
- `<InboxTypeSelector>` — step 1 (pick type).
- `<DynamicPayloadForm>` — step 2 (render payload form from `payload_schema`).

Once submitted, the path reuses the existing audit-log composable (`useAuditLog().append({ kind: 'cta', is_module_cta: true, created_record_type, ... })`) to keep the audit shape consistent with everything else the manifest engine emits. The audit log is the single source of truth for "what was created and by whom"; whether the user reached create via the manifest engine or the new components is internal detail.

### Decision 6 — `REPORT_DEPENDENCY` consumer changes from Alertas to Inbox-Tarea

Current spec routes `REPORT_DEPENDENCY` events to the Alertas of the destination app as `profile: 'A'`. The 2026-05-11 product decision (8) moved this to the Inbox of the destination app as a Tarea with declarative `auto_archive`. Rationale (from `centro-de-reporteria.md`):

1. A dependency block is a **task** that someone (human or recurring series) has to unblock. Modeling it as a Tarea matches the semantics.
2. `auto_archive` lets the Inbox engine close the Tarea automatically when the dependency resolves, without depending on a general auto-close in Alertas (which is V2-scoped).
3. Routing via `target_role` + optional `default_assignee` aligns with the rest of the Inbox dispatch.

This change replaces the existing Requirement and Scenarios with the new shape. The `ReportDependencyEvent` payload shape grows: `target_role` (capability), `recurring_definition_id?` (when the dependency binds to a recurring Inbox series), `description`, `due_at`. The destination app's manifest declares the Tarea type `report_dependency_block` with `auto_archive.condition_ref` evaluating `dependencies[].completed: true`.

Alternative considered: keep both routes (Alerta + Tarea). Rejected — duplicates the human-visible surface; the product decision was explicit about which one wins. The template ships one canonical route.

### Decision 7 — Profile A/B/C/D rename to category `triage / workflow / metric / cross_app_panel`

Pure rename; no semantic change. The product motivation (per the 2026-05-10 enrichment) is that "categoría" reads more naturally than "perfil" and the new names are self-describing. The four canonical categories map 1-to-1 to the old profiles. Mocks, scenarios, and any UI label updates accordingly. Apps that subscribe to ALERT_TYPEs declare their type's category instead of profile.

### Decision 8 — Tests scope: full updates and new behavioral tests for the CTA + registry

The repo is in development; tests can be modified and added freely. Path B inherently breaks existing test fixtures (`Solicitud` non-generic → generic; rename `Alerta.profile` → `Alerta.category`; drop `owner_name`; add `kind`/`payload`/`target_app`). The adopted policy is:

- **Update existing tests** so they compile and pass against the new types and mock shapes.
- **Add new behavioral tests** for the pieces this change ships:
  - `<InboxCreateCTA>` rendering rules (hidden / disabled / enabled; label kind-derivation).
  - `<InboxCreateDialog>` wizard step transitions.
  - `<InboxTypeSelector>` filtering by `creable_manualmente` + capabilities.
  - `<DynamicPayloadForm>` schema-driven rendering for a representative `InboxTypeConfig`.
  - `INBOX_TYPES_REGISTRY` helper functions (`getInboxTypeConfig`, `listCreableTypes`).
  - Audit-emit assertion: a successful submit calls `useAuditLog().append(...)` with `kind: 'cta'`, `is_module_cta: true`, `created_record_type` matching the picked type.
  - Capability gate: a user without the matching capability sees the CTA disabled with the canonical tooltip.
- **Test conventions hold:** Vitest + `@vue/test-utils`, mount + interact + assert observable output, no `*.skip`, no phantom asserts, every test asserts something meaningful (per `CLAUDE.md` § Testing).

This is the full coverage the change deserves. No deferral to a follow-up change.

### Decision 9 — `triggers_on_create[]` execution is mocked in this change; full manifest integration is V2

The product spec says `triggers_on_create[]` references actions of the manifest (REQ-68) with `payload_mapping`. The template's manifest engine already supports the underlying primitives (action invocation, `parameter_mapping` per Decision 1 of REQ-68). But wiring `triggers_on_create[]` end-to-end (resolve the action ref, build the parameter map from the new Solicitud's payload, invoke through the engine, persist `triggered_actions[]`) is a substantial add that conflicts with the "ship the CTA" priority.

Adopted scope for this change: `triggers_on_create[]` is declared in `InboxTypeConfig`, persisted on the type registry, and exercised by a **mock executor** that records "trigger fired" in the Timeline without actually invoking the manifest engine. The full integration is a follow-up change (slug suggested: `wire-inbox-triggers-on-create-to-manifest-engine`).

### Decision 10 — Recurring series (`RecurringInboxItemDefinition`) shape lands; scheduler does NOT

The product spec defines `RecurringInboxItemDefinition` and a scheduler that generates instances per `cadence`. The shape lands in `src/types/genericos.ts` (consumers of the type — e.g. `ReportDependency.recurring_definition_id` referencing a series — can compile against it). The **scheduler implementation** (the job that walks the registry, identifies series with `next_creation_date` past, and creates instances) is **out of scope** for this change. It's a separate runtime concern that needs its own design (cron infrastructure, job framework, etc.) and is naturally a Tecnología-side concern of the parent app, not the frontend template. A placeholder hook in the docs notes where the scheduler would land.

### Decision 11 — JSON Schema dependency check

The new `<DynamicPayloadForm>` consumes `InboxTypeConfig.payload_schema` of type `JSONSchema`. The template's existing `useDynamicForm` consumes a declarative shape that maps to (but is not identical to) JSON Schema. We adopt **the template's existing form-schema shape** (not raw JSON Schema) for `payload_schema` in this change. The "JSON Schema" wording in the product spec refers to the family of schema languages; the template's existing flavor is the contract. If a future product decision pins the exact JSON Schema dialect (Draft 2020-12, etc.), that's a follow-up.

**Consequence:** `payload_schema` in the template's `InboxTypeConfig` is typed as the existing `DynamicFormSchema` (or equivalent — TBD when wiring up). Apps that need stricter JSON Schema validation today implement it in code; the contract supports the upgrade path.

This avoids the explicit user-flag concern from the task brief: "NO instalar dependencias ni cambiar `package.json` salvo que el main CTA requiera explícitamente una librería de form rendering desde JSON Schema". We do not need a new library. No `package.json` change.

## Tests scope

Per Decision 8: full test updates and new behavioral tests for the pieces this change ships. Specifically:

**Existing tests, updated to track type and shape changes:**

- `src/pages/Inbox.spec.ts` — adjust mock Solicitud shape to include `kind`, `payload`, `target_app`, `assignee`; resolve `owner_name` via a mock user-lookup helper; update assertions that read renamed fields.
- `src/pages/Alertas.spec.ts` — rename `profile` references → `category`; update value mappings.
- `src/pages/Reportes.spec.ts` — add `permissions`, `consumer_apps[]`, `allows_auto_generation` to mock reports; update any assertions that read these fields.
- `src/components/manifest/ManifestActionsMenu.spec.ts` — unchanged (no Solicitud-specific fields).
- `src/components/drawer/{Timeline,CommentsThread,Drawer}.spec.ts` — adjust if the renderer test exercises the extended `TimelineEvent.kind` union; otherwise unchanged.

**New behavioral tests added in this change** (under `src/components/inbox/` and `src/config/`):

- `InboxCreateCTA.spec.ts` — rendering rules: hidden when no creable type, disabled-with-tooltip when no matching capability, enabled and labeled per kind derivation; click opens the dialog.
- `InboxCreateDialog.spec.ts` — wizard transitions, step state, cancel behavior, back navigation, submit handler shape.
- `InboxTypeSelector.spec.ts` — filtering by `creable_manualmente: true` AND user capabilities; kind-badge rendering.
- `DynamicPayloadForm.spec.ts` — renders fields from a sample `payload_schema`, validates required fields, emits the form values on submit.
- `inbox-types.spec.ts` — `getInboxTypeConfig` returns correct entry / undefined; `listCreableTypes` filters by both flags.
- `Inbox.spec.ts` (additional cases) — end-to-end submit through the CTA produces (a) a new Solicitud in `state: 'pendiente'`, (b) one `AuditEntryCTA` with `is_module_cta: true` and the right `created_record_type`, (c) a success toast, (d) `triggered_actions[]` entries when the type declares `triggers_on_create[]`.

The new tests are full Vitest + `@vue/test-utils` mounts (not snapshots). Every test asserts at least one observable outcome.

## Out of scope

- Full `triggers_on_create[]` end-to-end integration with the manifest engine (Decision 9 — mocked here, wired later).
- Recurring-series scheduler implementation (Decision 10 — types land, runtime doesn't).
- Per-app overrides of `INBOX_TYPES_REGISTRY` (each consuming app delivers its own registry in its own change).
- Migration of `REQ-52` / `REQ-33` to consume the new Alertas category model (those are on the Jira side, owned by the LEX and TRD app REQs).
- The Slack / Email / Web-Notifications side of `push_notification` — declared in `InboxTypeConfig.push_notification` but not yet wired to a delivery surface; that's a separate Tecnología concern.
- The `AuditEntryCTA.created_record_type` mapping for the new CTA is plumbed; the **stream-side consumers** (Dashboard activity feed, external sinks like Mixpanel/Amplitude) are not in this change.
- Behavioral test suite for the new CTA components (deferred to follow-up).

## Validation

- `openspec validate align-genericos-with-product-spec-and-add-inbox-manual-cta --strict` exits 0.
- `openspec validate --all --strict` exits 0 after deltas applied.
- `npm run type-check` exits 0 with the new generic `Solicitud<TPayload>` shape. (Expect ~30 file-touches across pages + mocks + tests for type tracking.)
- `npm run lint` exits 0.
- `npm run test:run` exits 0 with the minimally-updated tests.
- `npm run build:qa` exits 0.
- `diff CLAUDE.md AGENTS.md` returns no output (the companion docs change updates both byte-identically; this change does not touch them).
- Manual smoke: load `/inbox`, click "Crear Solicitud" (or "Crear Tarea" / "Crear"), pick a type, fill the form, submit. The Solicitud appears in the list with `state: 'pendiente'`. Audit log shows `{ kind: 'cta', is_module_cta: true, created_record_type: <type>, ... }`.
