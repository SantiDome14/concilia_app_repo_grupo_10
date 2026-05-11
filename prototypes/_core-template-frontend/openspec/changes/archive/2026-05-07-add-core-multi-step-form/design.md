# Design — add-core-multi-step-form

## Context

This design captures the rationale behind opening `core-multi-step-form` as a new capability rather than extending `core-forms`. The capability formalises a pattern that TRD's legacy `QuoteForm` (3,048 LOC) implements as a single monolith with implicit phases, that OPS could benefit from for the InstructionForm + attributes flow, and that LEX may adopt for long forms split into logical sections. The decisions below explain the contract shape, the chosen trade-offs, and what this capability deliberately does NOT cover.

---

## Decision 1 — Open as a new capability, not extend `core-forms`

### The question

Could the wizard be expressed as a few additional requirements inside `core-forms`?

### The decision

**No — opens as a separate capability.**

### Why

`core-forms` contracts the per-field surface: validation engine, label conventions, error rendering, manifest field type mapping, dependent fields, dropzone, etc. Its scope is "what a single form looks like". A wizard is a **composition of forms** — multiple forms presented one at a time, with global progression state. Mixing the two contracts dilutes both: `core-forms` gets harder to reason about (when does a "form" become "a step in a wizard"?), and the wizard's distinctive concerns (visibility, navigation, persistence) get diluted across the wider field-level contract.

A separate capability also lets the wizard evolve independently — adding parallel steps, multi-page wizards, or step branching in the future doesn't pollute `core-forms`.

### Cross-capability composition

Each step of a wizard internally is a `core-forms`-conforming form: vee-validate `<Form>` with a `validationSchema`, label conventions, error rendering. The wizard wraps those forms with orchestration; the orchestration is the contract of this new capability.

---

## Decision 2 — Step registry as data, not as a router

### The question

Should the wizard be expressed as a router (each step is a route, browser back/forward navigates the wizard) or as a data registry (steps are an array, the wizard manages its own current-step state)?

### The decision

**Data registry.** Steps are an array of `WizardStep` typed entries; navigation is internal to the wizard composable.

### Why

- **Wizards live inside containers** — typically a Create modal, sometimes a Drawer, occasionally a full-page route. Forcing the wizard to use the router constrains its host. A modal can't (cleanly) host nested routes.
- **Wizard state is ephemeral** — even when persisted to sessionStorage, the user is unlikely to bookmark `/inbox/create-quote/step-3`. URL-driven step state adds complexity without proportional value.
- **Conditional visibility** is hard to express in a router (routes are static; visibility is reactive on form state).

### Alternatives considered

- **`vue-router` nested routes per step.** Rejected for the reasons above.
- **Hybrid: router-driven but containerless.** Considered; rejected because it forces the consuming app to wire route guards every time it opens a wizard.

### Failure modes the rule prevents

- A wizard inside a modal can't accidentally hijack the URL on transitions.
- The wizard can be hosted anywhere a Vue component can mount.

---

## Decision 3 — `enabledWhen(formState)` as predicate, not as enum

### The question

Conditional step visibility could be expressed via a predicate function or via a static "this step depends on this enum value" declaration.

### The decision

**Predicate function.** Each step optionally declares `enabledWhen(formState): boolean`.

### Why

The TRD case (CCC inserts an extra step) is a discriminator on `operation === 'CCC'`. Other cases may need cross-field logic ("show this step when amount > limit" or "show this step when both client.type and currency match certain values"). A predicate covers all cases; an enum declaration would only cover the simplest.

### Alternatives considered

- **Static `dependsOn: { field: string, value: any }` declaration.** Rejected — covers maybe 60% of real cases; the other 40% need predicates anyway.
- **Both (declare statically when possible, predicate fallback).** Considered; rejected as over-engineered. One uniform mechanism is cleaner than two.

### Failure modes the rule prevents

- A developer writes complex inline visibility logic in the component, divorced from the step registry → registry no longer reflects truth. Spec mandates `enabledWhen` is the only visibility surface.

---

## Decision 4 — sessionStorage for persistence, NOT localStorage / IndexedDB / server

### The question

Where does the wizard state live across page reloads / re-mounts?

### The decision

**`sessionStorage` keyed by `wizard:${wizardId}`.** Cleared on submit success or `reset()`. No localStorage, no IndexedDB, no server-side drafts.

### Why sessionStorage

- **Survives page reload** — the typical "I refreshed my browser" doesn't reset the wizard.
- **Doesn't survive tab close** — a half-finished wizard from yesterday isn't sitting in a user's storage waiting to be re-opened in a confusing state.
- **Doesn't share across tabs** — opening the same wizard in two tabs gives two independent instances (correct behavior; otherwise editing in one tab corrupts the other).
- **Cheap and synchronous** — no async hydration code.

### Why not localStorage

Wizards left in localStorage rot. A user opens TRD, starts a quote, gets distracted, closes the tab. Two weeks later they re-open the quote wizard and a stale half-completed quote pops up. Confusing at best, dangerous at worst (data referenced in the partial state may have been deleted server-side).

### Why not IndexedDB

Overkill for the size (a few KB at most). Async hydration adds complexity. No use case for full-text search or large blobs.

### Why not server-side drafts

A separate concern (`core-form-drafts` capability if it ever opens). Server drafts mean: explicit "Save Draft" button, server endpoint, draft list UI, ownership rules, expiration policy. None of that is in scope here. The wizard's persistence is for the **in-flight** state across reloads, not for "save and come back tomorrow".

### Failure modes the rule prevents

- Stale data in localStorage causing confusion → eliminated by sessionStorage.
- Two tabs editing the same wizard fighting each other → eliminated (each tab has its own session).

---

## Decision 5 — Linear with conditional visibility, NOT parallel or branching

### The question

Should the wizard support steps that can be edited in any order (parallel), or strictly one-at-a-time (linear)?

### The decision

**Strictly linear.** One current step at a time. Steps can be hidden conditionally, but there is always one current step.

### Why

- **Cognitive load.** Parallel steps look like a static form with regions. A user looking at three "current" panels doesn't perceive a wizard.
- **Validation gating.** Linear means "you can't proceed until this is valid"; parallel means "you can submit when all panels are valid" — that's just a regular form with sections.
- **Indicator semantics.** A progress indicator with three current steps is meaningless.

### Alternatives considered

- **Parallel mode behind an option.** Considered. Rejected because if you want parallel, you want a regular form. The wizard is for sequential.
- **Branching tree (step 3 leads to step 4a or 4b).** Considered. Rejected because conditional visibility (`enabledWhen`) covers this case: declare both 4a and 4b in the registry, gate them with `enabledWhen`. The runtime structure becomes effectively a tree without complicating the contract.

### Failure modes the rule prevents

- A wizard that shows three "current" steps in parallel — incoherent UX. Spec rejects.

---

## Decision 6 — `revisitable: false` as opt-in for one-way checkpoints

### The question

Should every step always be revisitable (back-navigate-able), or should some be one-way?

### The decision

**Default revisitable, opt-out per step.** A step declaring `revisitable: false` becomes a one-way checkpoint: once the user advances past, back-navigation skips it.

### Why

The canonical case is "Confirm" — a final step where the user reviewed and committed; clicking Back from a hypothetical step after Confirm shouldn't re-edit the confirmation. Another case is a step that triggers a side effect (sends a verification code via SMS) — re-visiting it would re-trigger the side effect.

### Alternatives considered

- **All steps always revisitable.** Rejected for the side-effect case.
- **Block back-navigation entirely.** Rejected — too restrictive for the common case where users want to go back and edit.

### Failure modes the rule prevents

- A wizard that re-sends an SMS every time the user presses Back → security / spam issue. Spec lets the SMS step be marked `revisitable: false`.

---

## Cross-capability composition

| Neighbor | What it owns | What `core-multi-step-form` owns |
|---|---|---|
| `core-forms` | Per-field validation, label conventions, manifest field types, dependent fields, dropzone | Wizard composition: registry, navigation, persistence, conditional visibility |
| `core-modals` | Modal flows (Create, Detail, Edit, Confirmation, Drawer, ClosureModal) | Wizards live inside modals frequently; the spec does NOT contract the modal — apps host the wizard wherever it fits |
| `core-theming` | Design tokens, palette, focus ring, semantic colors | Progress indicator visual states (`completed`, `current`, `upcoming`, `disabled`, `error`) resolve through tokens |
| `core-error-handling` | Toasts, banners, EmptyState, Skeleton | Wizard surface errors (validation failures, persistence corruption) via the existing surfaces; not contracted here |

The cleanest boundary: **`core-forms` is per-step internals, `core-multi-step-form` is wizard externals.** A wizard step's body is a regular `<Form>` honoring `core-forms` rules. The wizard wraps those forms with everything that crosses step boundaries.

---

## Open questions

1. **Server-side drafts.** A separate capability (`core-form-drafts`) when a real use case appears. The current sessionStorage persistence is for in-flight; not for cross-session.
2. **Wizard inside wizard (nested wizards).** Out of scope. If a step's body becomes complex enough to need its own wizard, that's a sign the parent wizard is too granular — the steps should restructure. Nested wizards introduce indicator confusion (which indicator are we updating?) and persistence key collisions.
3. **Async step validation (e.g., hit the server to verify before advancing).** The composable's `next()` action SHOULD support a Promise return — if the step's validation runs an async check, `next()` awaits it before transitioning. Documented behavior; spec does NOT require it explicitly because the existing per-step `<Form>` already handles async validators via vee-validate.
4. **Step "skip" without filling.** Some flows have optional steps the user can skip ("Add comments? You can skip this"). Out of v1 — for now, optional content lives WITHIN a step (e.g. a checkbox "I don't have additional comments" that satisfies validation). If real use cases prove insufficient, adds as `optional: true` flag on the step entry.
5. **Wizard analytics.** Hooks for `onStepEnter(stepId)` / `onStepExit(stepId)` for telemetry. Out of v1 — apps `watch(currentStep)` themselves. Promote if telemetry becomes structured.
6. **Wizard inside Drawer / ClosureModal.** Should work as-is because wizards are container-agnostic, but worth validating during the first migration. Documented as a verification step in the post-archive checklist when this is consumed.
