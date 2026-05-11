# Design — add-core-dynamic-forms

## Context

This design captures the rationale behind opening `core-dynamic-forms` as a new capability and binding it tightly to the type registry of `core-actions-manifest`. The decisions explain why one registry serves both build-time and runtime forms, why conditional visibility is part of the schema and not consumer logic, and what is deliberately out of scope for v1.

---

## Decision 1 — One type registry, not two

### The question

`core-actions-manifest` already has a registry of `type → component` for build-time manifests. Should runtime forms (where the schema arrives over the wire) consume that registry, or have their own?

### The decision

**One registry shared by both modes.** Apps register types once at bootstrap; both build-time manifests and runtime forms resolve types against the same Map.

### Why

- **Single source of truth.** A custom type like `account-tag` registered at bootstrap is valid in every form context — apps don't have to remember "did I register this for build-time only or runtime only?".
- **Drift prevention.** With two registries, a type defined in one but not the other produces silent rendering differences. With one registry, the situation is impossible.
- **Easier onboarding.** A developer learning the system sees "one registry" not "two parallel registries with subtle differences".

### Alternatives considered

- **Parallel registries (build-time and runtime).** Rejected. Drift and cognitive overhead outweigh any benefit.
- **No registry — runtime resolves by `import()` at runtime.** Rejected. Dynamic imports per-field are slow and error-prone; the registry is the right abstraction.

### Failure modes the rule prevents

- A custom type renders correctly in build-time but fails at runtime → eliminated by shared registry.

---

## Decision 2 — Schema validation is mandatory; failures render `<EmptyState>`

### The question

A runtime schema arrives from the backend. What happens when it's malformed (e.g., type not in registry, select without options, missing required fields)?

### The decision

**Validate against a canonical Zod shape on every schema receipt. On failure, render `<EmptyState>` instead of attempting partial rendering.** The validation error is logged via `console.warn` for diagnostics.

### Why

- **Partial rendering is worse than no rendering.** A form with 3 fields where 2 render correctly and 1 silently doesn't is confusing. A form that doesn't render at all is unambiguous.
- **The backend is fallible.** Schema regressions, deployment skew, A/B test issues all produce malformed schemas eventually. The client absorbs that gracefully.
- **EmptyState is the canonical "nothing to show" surface.** Aligning with it is consistency.

### Alternatives considered

- **Partial rendering with errors per-field.** Rejected for confusing UX.
- **Throw, let the consumer's error boundary catch.** Rejected — too heavy-handed; takes down the surrounding UI.
- **Silent skip of bad fields.** Rejected — a user filling 3 of 4 fields doesn't know the 4th was silently dropped.

### Failure modes the rule prevents

- A backend regression silently breaks form submission for users → eliminated; users see EmptyState and report.
- A form renders partially and the user submits incomplete data → eliminated; nothing renders until the schema validates.

---

## Decision 3 — `conditional` is part of the schema, not consumer logic

### The question

Conditional visibility ("show field B only when field A is X") could be expressed in two ways:

1. **In the schema.** Backend declares `conditional: { field, value }`; the engine evaluates reactively.
2. **In consumer code.** Consumer subscribes to the form state and toggles fields imperatively.

### The decision

**In the schema.** The engine evaluates reactively.

### Why

- **The schema is the source of truth.** If the backend says "show this field only when side=BUY", that's a backend rule; the consumer shouldn't need to know it.
- **Hidden field values must be excluded from submit.** The engine handles this consistently. Consumer code would have to remember.
- **Same pattern as build-time manifests.** Build-time manifests can already declare conditional logic; runtime extends it.

### Alternatives considered

- **Consumer-side conditional logic.** Rejected for the reasons above.
- **Both modes (schema-declared + consumer-overrideable).** Rejected as over-engineered. If the backend's conditional rule is wrong, the right fix is on the backend, not the consumer.

### Failure modes the rule prevents

- Hidden field's stale value submitted to the backend → eliminated; engine excludes hidden fields.
- Consumer code drifting from backend's intended visibility → eliminated; one source of truth.

---

## Decision 4 — Composable + Component split, both contracted

### The question

Should the capability expose only `<DynamicForm>` (component), only `useDynamicForm` (composable), or both?

### The decision

**Both.** `<DynamicForm>` for declarative rendering; `useDynamicForm` for consumers that need imperative control (e.g., custom submit flow, integration with a wizard step, programmatic validation).

### Why

- **Component-first for the common case.** 90% of consumers want "render a form from this schema, give me submit". `<DynamicForm>` is the right abstraction.
- **Composable for the edge cases.** A wizard step that's a runtime form, an admin tool that needs custom validation orchestration. The composable lets those exist without rebuilding the resolution + validation logic.

### Alternatives considered

- **Component-only.** Rejected — limits flexibility for edge cases.
- **Composable-only.** Rejected — every consumer would have to wire `<FormControl>` plumbing themselves.

### Failure modes the rule prevents

- A wizard step that's runtime-schema-driven has to reimplement the form rendering → eliminated; the wizard step uses `<DynamicForm>` inside.

---

## Decision 5 — Out of scope: regex validation, field groups, runtime localization, schema versioning

### Why each is out

- **Regex validation runtime.** Adding `.refine(regex)` rules from the backend is a security surface (regex DoS). Out of v1; if real demand appears, contract a vetted whitelist of regex patterns.
- **Field groups / sections.** Runtime grouping (collapsible sections) doubles the schema complexity. Apps that need sections compose multiple `<DynamicForm>` instances side by side.
- **Runtime localization.** Backend ships labels in the user's language. The component does not translate. If multi-locale becomes a real need, a separate `core-i18n` capability covers it.
- **Schema versioning.** When the backend changes a schema, old client codes might not understand new fields. The current contract: validate on receipt; reject if unrecognized type. If schema versioning becomes a need, a separate change adds `version` field to FieldConfig.

---

## Cross-capability composition

| Neighbor | Owns | This change owns |
|---|---|---|
| `core-actions-manifest` | Build-time manifest engine, type registry singleton | Mandate that the registry is shared with runtime |
| `core-forms` | Field types, validation, `<FormControl>`, vee-validate + zod | DynamicForm component contract |
| `core-error-handling` | Toasts, banners, EmptyState, Skeleton | Schemas malformed render `<EmptyState>`; loading is `<Skeleton>` (consumer-side) |
| `core-api-layer` | Axios client, ApiError | Schema fetch is a regular HTTP call; this capability does NOT contract the fetch — apps fetch and pass the schema |

The clearest boundary: **`core-actions-manifest` owns the engine and registry; `core-dynamic-forms` owns the runtime consumer surface (`useDynamicForm` + `<DynamicForm>`).**

---

## Open questions

1. **Schema versioning.** When the backend evolves schemas across releases, how does the client tolerate unrecognized fields? For v1 the answer is "reject the schema entirely". If gradual rollout demands it, the contract can extend with `unknownFields: 'reject' | 'skip'` policy in a future change.
2. **Server-rendered defaults.** A `defaults` field in `FieldConfig` is supported. If apps need defaults that depend on other fields ("if `side === 'BUY'`, default `volume` to 100"), out of v1 — the consumer pre-populates `formState` before mounting.
3. **Backend-driven field reordering.** The schema's array order IS the rendering order. If a future feature needs reordering by some other criteria (alphabetical, importance), it's app-side composition (sort the schema before passing).
4. **Multi-record forms.** Runtime schemas could in principle describe a list of records (each row a runtime sub-form). Out of v1; the contract is single-record. Row-of-records is `<DynamicKeyValueFields>` territory or a future composite.
5. **Validation across fields.** vee-validate supports cross-field validation via composed Zod schemas. The runtime contract derives per-field schemas; cross-field rules at runtime are NOT supported — out of v1. If an app needs `volume <= max_volume`, the rule lives in the consumer's `onSubmit` handler.
