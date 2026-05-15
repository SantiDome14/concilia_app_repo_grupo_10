> Jira REQ: — (no Jira ticket; template-level capability extension derived from `prototypes/_core-template-frontend/` v1.15)
> Module: core-template (foundation)

# Extend core-error-handling with anti-pattern register and dev-mode warnings

## Why

The current `core-error-handling` baseline contractualizes the **runtime** error surfaces every Ardua core app needs from day one — toasts via `vue-sonner`, the shared `EmptyState` component, the shared `Skeleton` component, the 401 / 403 / network / 5xx flows, the global `app.config.errorHandler` boundary, and the persistent alert-banner pattern added by `strengthen-core-ui-patterns`. That coverage is correct for what the user sees at runtime, but it leaves three gaps that the v1.15 reference prototype (`prototypes/_core-template-frontend/`) treats as first-class and that every Ardua core module will need the moment it starts wiring real lifecycle, multi-axis kanban, or manifest-driven actions:

1. **No normative anti-pattern register.** The README catalogs seven anti-patterns explicitly (mixing segmentation with filters, granular filters in L1, period as separate category, per-row "Ver detalle" duplicating row-click, `'kanban'` declared without states, two axes sharing the same `stateField`, missing `stopPropagation` on the actions cell). These are real defects we have already seen agents introduce in adjacent prototypes — but they live as prose callouts, not as enforceable contracts. Without a register, reviewers and dev-mode validators have no canonical list to point to when rejecting a PR or emitting a console warning.
2. **No unified dev-mode warning surface.** The prototype's `MANIFEST_DEV_MODE`, the kanban-without-states warning, and the multi-axis duplicate-`stateField` warning each call `console.warn` directly with ad-hoc prefixes. Without a single helper and a fixed set of categories, every new validator will invent its own prefix, tests cannot assert against a stable contract, and production builds risk leaking dev noise. We need one canonical helper (`devWarn(category, message, context?)`), one fixed category list (`MANIFEST`, `VIEWS`, `KANBAN`, `STATES`, `PREDICATES`, `BREADCRUMB`, `THEME`), and one gate (`import.meta.env.DEV`) so warnings are silenced in production and adding a new category requires an OpenSpec change.
3. **No contract for default-blocked transitions.** The companion `core-data-tables` change (`extend-core-data-tables-from-prototype`) introduces declarative kanban states and transitions. The prototype's invariant — "any transition not declared in the module's `transitions` map is blocked by default" — is the correctness backbone of the state-machine subsystem. Without an error-handling contract for what "blocked" looks like (toast text, card-return behavior, telemetry event), agents will surface different errors in different modules (visual drift) or worse, swallow the block silently (correctness gap).

Closing these three gaps in `core-error-handling` keeps the error / non-applicable / dev-validation story unified in one capability: every defective shape now has a contracted surface (PR review, dev-mode warning, runtime toast + telemetry) and a contracted helper to emit it.

## What Changes

- **`core-error-handling`** — add three new requirements covering: (a) the **anti-pattern register** that names seven prohibited shapes, rationalizes each in one sentence, and tags each with where it surfaces (`PR-review`, `dev-mode-warn`, `runtime-error`); (b) the **unified `devWarn(category, message, context?)` helper** with the fixed seven-category list, the `import.meta.env.DEV` gate, and the rule that adding a new category requires an OpenSpec change; (c) the **default-blocked transitions** contract that defines what happens at runtime when a kanban drag targets an undeclared transition — `toast.error('Transición no permitida')`, card returns to its origin column, and a `kanban.transition.blocked` telemetry event is emitted with origin and target state.
- **No changes** to other capabilities. `core-data-tables` (separate change) declares the state-machine shape (`MOD_STATES`, `MOD_TRANSITIONS`, `MOD_AXES`); `core-layout` already owns the three-level control framework; `core-actions-menu` already owns the per-row actions cell `stopPropagation` invariant. The three additions to `core-error-handling` complete the defect-detection surface inventory by composing with — not duplicating — those neighbors.

## Capabilities

### Affected Capabilities

- `core-error-handling` — three new requirements added (anti-pattern register, `devWarn` helper, default-blocked transitions)

### New Capabilities

None. This change extends an existing Tier 2 (seed) capability.

### Cross-capability dependencies

- Depends on `core-data-tables` (`extend-core-data-tables-from-prototype`) for the state-machine declarations (`MOD_STATES`, `MOD_TRANSITIONS`, `MOD_AXES`, `stateField`) that the default-blocked-transition contract reacts to.
- Composes with `core-layout` (`extend-core-layout-from-prototype`) — three of the seven anti-patterns (segmentation/filter mixing, granular filters in L1, period-as-separate-category) reference invariants owned by `core-layout`; this change names them as anti-patterns but the structural rules remain in `core-layout`.
- Composes with `core-actions-menu` — one anti-pattern ("per-row Acciones button repeating the row-click behavior") references the `stopPropagation` contract owned by `core-actions-menu`; this change adds the dev-mode warning that fires when row click and Action menu fire concurrently, but the structural rule remains in `core-actions-menu`.
- Composes with `core-modals` (`extend-core-modals-from-prototype`) — the closure modal contract (`mode: 'modal'`) is the only escape from the terminal-state default-block rule covered here.

## Notes

- All Vue / TypeScript artifacts use `<script setup>` PascalCase for components and camelCase for composables / helpers: `devWarn()`, `toast.error()`, `import.meta.env.DEV`, `useTelemetry()`, `kanban.transition.blocked`. The `devWarn` helper lives in `src/lib/devWarn.ts` and is the only sanctioned `console.warn` surface across the template — direct `console.warn` calls in template code are forbidden once this change is archived.
- The seven categories (`MANIFEST`, `VIEWS`, `KANBAN`, `STATES`, `PREDICATES`, `BREADCRUMB`, `THEME`) are exported as a `const` union type so TypeScript rejects unknown categories at compile time. Adding an eighth category requires editing this spec, the union type, and adding a justification in a follow-up OpenSpec change.
- The `kanban.transition.blocked` telemetry event is the first concrete telemetry contract in the template. The telemetry sink is provider-agnostic (`useTelemetry()` composable) — apps wire their backend (PostHog, Segment, custom) at bootstrap; the event name and payload shape are the contract this change owns.
