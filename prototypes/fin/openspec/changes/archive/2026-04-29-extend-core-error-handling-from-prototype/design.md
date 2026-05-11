# Design — extend-core-error-handling-from-prototype

## Context

This design document captures the rationale behind the three new requirements proposed for `core-error-handling`: the **anti-pattern register**, the **unified `devWarn(category, message, context?)` helper**, and the **default-blocked kanban transitions** contract.

Each requirement answers a specific question that the current `core-error-handling` baseline leaves open. The design here explains **why the answer is what it is**, what alternatives we considered, and what tradeoffs we accepted.

The reference prototype at `/Users/yasmani/product-management-framework/prototypes/_core-template-frontend/` v1.15 is the source of truth for the patterns being contracted. Each decision below cites the prototype line range that the contract codifies.

---

## Decision 1 — Anti-pattern register: seven named shapes, three surface tags

### The question

The README explicitly catalogs anti-patterns in three places (lines 144–155 for the three-level framework, lines 300–306 for the actions menu, lines 624–632 for kanban). Reviewers and dev-mode validators currently treat these as prose callouts with no canonical list. Two questions surface:

- Should the register be normative (a SHALL contract) or advisory?
- Where do these checks fire — PR review only, dev-mode console only, runtime, or some combination?

### The decision

The register is **normative** (`SHALL` formally prohibit). Seven anti-patterns are named, each with a one-sentence rationale and a surface tag picked from the closed set `{ PR-review, dev-mode-warn, runtime-error }`. The seven names are:

1. **`segmentation-in-filter-dropdown`** — putting Activos / Histórico in a granular filter dropdown instead of in the L1 Segmenter sub-tabs. Surface: `PR-review`. Rationale: segmentation is a mutually exclusive subset of the module universe (different KPI denominators); a filter is a within-segment narrowing — they're not the same axis.
2. **`granular-filter-in-l1`** — placing a granular filter dropdown anywhere in the page-header actions area. Surface: `PR-review`. Rationale: only Segmenter, ViewToggle, and the Main CTA belong in `.ph-actions`; granular filters live in L3 (section header).
3. **`period-as-third-axis`** — treating period as a third conceptual category alongside Segmentación and Vista. Surface: `PR-review`. Rationale: period is a filter with UI privileges (mandatory, no "Todos", pinned), not a separate axis.
4. **`row-click-duplicated-in-actions-menu`** — adding "Ver detalle" (or any item that just reproduces the row-click) to the per-row Acciones menu. Surface: `PR-review`. Rationale: row click already opens detail; the Acciones menu is for record-level operations, not navigation.
5. **`kanban-without-states`** — declaring `'kanban'` in `MOD_VIEWS` without a corresponding `MOD_STATES` (or `MOD_AXES`). Surface: `dev-mode-warn` (also `PR-review`). Rationale: a kanban without a state machine has no columns and is a UX placeholder, not a view; the runtime omits it from the toggle.
6. **`duplicate-state-field-axes`** — declaring two `MOD_AXES` whose `stateField` resolves to the same path. Surface: `dev-mode-warn` (also test-rejected). Rationale: two axes over the same field are the same machine in disguise; the user-facing axis picker would be a coin flip.
7. **`row-click-while-actions-menu-open`** — the per-row Acciones cell forgets `stopPropagation`, so a click on the menu also fires the row-click and opens the detail. Surface: `dev-mode-warn` (also `runtime-error` via test). Rationale: the structural rule lives in `core-actions-menu`; this register adds the dev-mode warning that fires when both events arrive in the same task.

The seven names are stable identifiers (used in `devWarn` context, telemetry, and PR templates); the prose rationales are advisory and may evolve in follow-up changes.

### Alternatives considered

- **Advisory only (no SHALL).** Rejected. Advisory anti-patterns are treated as suggestions and re-introduced by every new agent. Making them normative gives reviewers a contract to point to.
- **One mega-category "anti-patterns" without numbered names.** Rejected. Numbered, named anti-patterns are searchable, citable in PR comments, and addressable in `devWarn` context payloads.
- **Surface tag as free text.** Rejected. Closing the surface set to three values (`PR-review`, `dev-mode-warn`, `runtime-error`) keeps the contract precise and lets us assert "every anti-pattern declares at least one surface" in tests.

### Why these seven, not more

The seven cover every anti-pattern explicitly named in the README v1.15. Future patterns (e.g., "two primary CTAs in the page header" already covered structurally by `core-layout`) are not duplicated here unless the structural contract leaves a defect-detection gap.

---

## Decision 2 — `devWarn(category, message, context?)`: one helper, seven fixed categories, DEV-gated

### The question

The prototype currently warns from three places with different prefixes:

- `validateManifest()` logs `console.warn('[MANIFEST] ...')` at load time when `MANIFEST_DEV_MODE = true`.
- The kanban view registration logs a warning when `'kanban'` is declared without `MOD_STATES`.
- The multi-axis registration logs a warning when two axes share the same `stateField`.

There's also informal `console.warn` usage scattered throughout (predicate eval on unknown keys, breadcrumb resolution missing block, theme variable missing). Three questions surface:

- Should there be a single helper or per-subsystem helpers?
- What's the canonical category set?
- Production behavior: silent no-op or always-on?

### The decision

A single helper `devWarn(category, message, context?)` with these properties:

- **Signature**: `(category: DevWarnCategory, message: string, context?: Record<string, unknown>) => void`. The `category` is a TypeScript discriminated union of seven literal strings; the `message` is a free-form sentence; the `context` is an optional structured payload.
- **Format**: `console.warn('[<CATEGORY>] <message>', context)` when context is present; `console.warn('[<CATEGORY>] <message>')` otherwise.
- **Gate**: `if (!import.meta.env.DEV) return;` as the first line — production builds get a silent no-op.
- **Categories** (the closed set): `MANIFEST`, `VIEWS`, `KANBAN`, `STATES`, `PREDICATES`, `BREADCRUMB`, `THEME`.

Each category maps to a subsystem owner:

- `MANIFEST` — manifest validator (`validateManifest()` in `core-actions-menu`).
- `VIEWS` — view-toggle validator (`registerModule()` views array in `core-data-tables`).
- `KANBAN` — multi-axis duplicate-`stateField`, undeclared transitions in dev (in `core-data-tables`).
- `STATES` — state declaration completeness, terminal state misuse (in `core-data-tables`).
- `PREDICATES` — `evalPredicate` warnings on unknown keys / unsupported operators (in `core-actions-menu`).
- `BREADCRUMB` — `renderBC()` / route meta resolution warnings (in `core-navigation`).
- `THEME` — token resolution warnings, missing CSS variable (in `core-theming`).

Adding a new category (`AUTH`, `FORMS`, `API`, ...) requires an OpenSpec change that updates this spec, the `DevWarnCategory` union type, and the consuming validator.

### Alternatives considered

- **Per-subsystem helpers** (`manifestWarn`, `kanbanWarn`, ...). Rejected. Seven helpers means seven gates, seven prefixes, seven test surfaces. One helper with a category argument keeps the contract uniform.
- **Open category set** (any string accepted). Rejected. An open set means category names drift (`'manifest'` vs `'MANIFEST'` vs `'manifest-validator'`), tests can't assert against the full set, and the OpenSpec change requirement disappears.
- **Always-on warnings (no DEV gate)**. Rejected. Production users shouldn't see internal validator output in their console — it's noise that hints at internals and may leak field names.
- **Throw instead of warn in DEV**. Rejected for now. Throwing breaks the "module declares incomplete state but the rest of the app keeps working" contract that the prototype establishes. Throwing remains an option for follow-up changes that target stricter dev modes.

### Why `import.meta.env.DEV` and not a custom `MANIFEST_DEV_MODE` flag

`import.meta.env.DEV` is Vite's canonical build-time DEV flag, statically replaced at build time, so the entire `devWarn` body is dead-code-eliminated in production. A custom flag like `MANIFEST_DEV_MODE` would require a runtime check and would still ship the warning strings into the production bundle.

### Why context is optional and structured

`context` is the place to put the offending module / axis / state name without baking it into the message string. That keeps messages short and testable (`expect(consoleWarn).toHaveBeenCalledWith(expect.stringMatching(/^\[KANBAN\]/), { module: 'inbox', axis: 'imputacion' })`).

---

## Decision 3 — Default-blocked kanban transitions: toast.error + card-return + telemetry

### The question

The prototype's invariant (lines 510–516) is "any kanban transition not declared in `MOD_TRANSITIONS` is blocked by default". The README states the rule but does not specify exactly what the user sees, what the runtime does to the dragged card, or what telemetry signal is emitted. Three questions surface:

- What does the user see — a toast? An inline error? A silent revert?
- What happens to the card — does it stay where it landed, or return to its origin column?
- Is there a telemetry event, and what's its shape?

### The decision

When a kanban drop targets a transition not declared in the module's `transitions` map (or both source and target states are terminal without a `mode: 'modal'` declaration), the runtime SHALL:

1. **Reject the drop** — no state mutation, no `on_confirm` execution.
2. **Return the card to its origin column** with no animation glitch (the card was visually moved by the drag library; the runtime resets it on the next tick).
3. **Emit `toast.error('Transición no permitida')`** via the shared `vue-sonner` toast surface. The toast description identifies the origin and target state names (e.g., `"De PENDING a CLOSED"`). The toast follows the existing `core-error-handling` toast contract (title + description, `text-danger`, 4500ms auto-dismiss).
4. **Emit a `kanban.transition.blocked` telemetry event** with payload `{ module: string, axis: string, recordId: string, fromState: string, toState: string, reason: 'undeclared' | 'terminal-origin' | 'terminal-destination' }`. The telemetry sink is `useTelemetry().track(eventName, payload)`; apps wire the backend at bootstrap.

Terminal states are implicitly blocked as both origin (cards in terminal columns are not draggable — the drag handler is not bound) and destination (drops onto terminal columns are rejected with `reason: 'terminal-destination'`), unless the transition declares `mode: 'modal'` (in which case the closure modal — owned by `core-modals` — opens and the state change commits only on confirm).

### Alternatives considered

- **Silent revert (no toast).** Rejected. Users dragging across columns deserve immediate feedback; silent reverts feel like the drag failed, not like the transition was rejected by policy.
- **Inline error pill on the card.** Rejected. Pills compete with severity badges already on the card; a toast is the existing cross-app convention for ephemeral error feedback.
- **Block via dialog (forced acknowledgment).** Rejected. A dialog on every accidental wrong drop is over-friction. The `mode: 'modal'` escape already covers cases where an explicit dialog is genuinely required.
- **No telemetry event.** Rejected. Blocked transitions are a high-signal indicator of (a) a missing declared transition the module author should add, or (b) a UX gap where users keep trying an invalid move. Telemetry surfaces both. The `reason` discriminator lets analysts filter signal from noise.

### Why the toast text is fixed Spanish

The Ardua core operator persona uses Spanish UI strings. `'Transición no permitida'` matches the existing toast vocabulary (`'Operación no permitida'` for 403, `'No se pudo guardar'` for save failures). Apps with English UI override via i18n in a follow-up change; the contracted default is Spanish.

### Why telemetry, not just a `console.warn`

`console.warn` is a developer-side signal (visible only with the console open). Telemetry is a production-side signal (visible in dashboards). Both have their place. The `dev-mode-warn` for undeclared transitions covered by Decision 2 fires at module-registration time when the runtime detects a `'kanban'` view declared without states. The telemetry event covered here fires at user-interaction time when an actual drop is rejected. Same defect class, two different signals.

---

## Open questions

1. **Telemetry sink wiring.** The `useTelemetry()` composable is a contract; the actual backend (PostHog, Segment, custom) is wired per app. A future change may add a `core-telemetry` capability if more events accumulate.
2. **Anti-pattern catalog growth.** Seven anti-patterns is the v1.15 list. As the prototype evolves, more shapes will be named. Each addition is a new `### Requirement` (or, more likely, a scenario added to the existing register requirement) — to be decided as the catalog grows.
3. **Production-mode strictness option.** Some apps may want `devWarn` to be a `throw` in pre-production (QA) builds. Out of scope here; can be a follow-up that introduces a `STRICT` flag layered on top of `DEV`.
4. **i18n of the blocked-transition toast.** Currently fixed Spanish. A future i18n change will make the strings keyed.
