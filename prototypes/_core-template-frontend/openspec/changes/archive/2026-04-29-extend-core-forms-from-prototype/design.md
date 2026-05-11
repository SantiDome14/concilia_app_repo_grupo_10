# Design — extend-core-forms-from-prototype

## Context

This design captures the rationale behind the five new requirements added to `core-forms`. Each requirement closes a concrete gap surfaced by the `_core-template-frontend` v1.15 prototype survey (`/tmp/survey-readme-catalog.md` § `core-forms`) against the current `core-forms` baseline (`openspec/specs/core-forms/spec.md`). The design here explains **why each Vue/TS rule is what it is**, what alternatives we considered, and what tradeoffs we accepted.

The prototype expresses these patterns with imperative DOM helpers (`FORM_DD`, `FORM_DD_OPTS`, `openFormDD`, `closeFormDD`, `selectFormDD`, `updateFormDDLabel`). The Vue/TS template is declarative, reactive, and built on shadcn-vue + vee-validate + zod. The translation is not 1-to-1; it's a contract restatement in the new stack's idioms.

---

## Decision 1 — Custom Select component (no native `<select>`)

### The question

The current `core-forms` baseline says nothing about Select rendering. A developer reading the seed spec could reasonably reach for `<select>` because vee-validate works with it. The prototype is explicit that this is forbidden — but that rule is not in the contract.

### The decision

Every Select in a form or modal SHALL use the shadcn-vue `<Select>` component (or an equivalent custom portal-based Select built on `reka-ui`). Native `<select>` is forbidden inside forms and modals. The component:

- Renders the dropdown via `<Teleport to="body">` with `position: fixed` and **z-index ≥ 9999** (the prototype z-index is 9999; the modal overlay is z-index ≥ 500; this gap guarantees the Select dropdown always sits above any modal).
- Supports keyboard navigation: Up/Down to move highlight, Enter to select, Esc to close.
- Integrates with vee-validate via the shadcn-vue `<FormControl>` wrapper (the same wrapper used for `<Input>` and `<Textarea>`), so blur/submit validation timing is uniform.
- Closes on outside click, Esc, and `closeAllPortals()`-equivalent (the Vue equivalent is the Teleport's own outside-click handler plus the global Esc handler).

### Alternatives considered

- **Allow native `<select>` for "simple" cases.** Rejected. There is no objective "simple" cutoff; the rule has to be uniform or it will be re-litigated per PR. The native control also ignores DM Sans, dark surface tokens, and brand focus rings — every "simple" use breaks visual consistency.
- **Build a fully custom Select from scratch.** Rejected. shadcn-vue (reka-ui) already provides an accessible, keyboard-navigable Select with a Teleport. Building a parallel one is wasted effort and doubles the surface area to test.
- **Use `<Combobox>` everywhere.** Rejected as the default. Combobox (search + select) is the right choice for the manifest `lookup` field type, but for short option lists it adds a search input the user does not need.

### Why z-index ≥ 9999 specifically

The prototype value is exactly 9999, chosen so the dropdown always sits above modal overlays (z-index 500), drawers, and toasts. We carry the same number forward for parity and so an app migrating from the legacy prototype keeps the same stacking behavior without surprises.

### Failure modes the rule prevents

- A developer drops `<select>` into a Create modal → spec violation flagged at review.
- A developer puts the Select dropdown in `position: absolute` inside the modal → dropdown gets clipped by the modal's overflow → broken UX. The `<Teleport to="body">` rule prevents this by construction.
- Modal closes but Select dropdown stays open → broken UX. The component MUST close on the same outside-click and Esc handlers as the modal.

---

## Decision 2 — Dependent Select fields (parent → child reset)

### The question

When a Select depends on another field (the canonical example: `Cuenta` depends on `Sociedad` — `cm-soc` → `cm-cuenta` in FIN), changing the parent must (a) reset the child's value and (b) re-derive the child's options. The prototype does this via imperative `FORM_DD_OPTS[id].items` repopulation. Vue 3 needs a reactive equivalent.

### The decision

The `<Select>` component SHALL accept a `dependsOn` prop with the shape:

```ts
type DependsOn<TParent, TOption> = {
  field: string                                  // parent field name in the vee-validate form
  fetchOptions: (parentValue: TParent | null) => TOption[] | Promise<TOption[]>
}
```

When `dependsOn` is set:

- The component subscribes to the parent's value via vee-validate's `useFieldValue(field)`.
- On parent value change, the component MUST: (i) call `setFieldValue(<this-field-name>, null)` to reset the child's value (vee-validate keeps the form state consistent), (ii) invoke `fetchOptions(parentValue)` to derive the new option list (sync return is supported; async return wraps in `useQuery` or equivalent and shows the `<Skeleton>` while loading).
- The reset MUST happen even when the new parent value yields the same option list — the child's prior selection cannot be assumed valid for a new parent.

### Alternatives considered

- **Make the consumer wire the watcher manually with `watch(() => values.parent, ...)`.** Rejected. Every consumer would re-implement the same reset semantics differently. Centralizing it in the Select prop guarantees consistency and one place to test.
- **Allow `dependsOn` to be a `string[]` of multiple parents.** Considered. Deferred. The prototype has only single-parent dependencies; adding multi-parent now would over-engineer the contract before we have a real use case.
- **Reset only when the option list actually changes.** Rejected. A parent change implies the child's prior selection may no longer be semantically valid (e.g., the chosen Cuenta does not belong to the new Sociedad). Resetting unconditionally is the safe default. If a future module needs "preserve when still valid" semantics, that can be a separate prop (`preserveSelectionIfValid: boolean`) — deferred.

### Why through vee-validate's API

`setFieldValue` is the contract for mutating form state in vee-validate. Bypassing it (e.g., emitting an `update:modelValue` event without the form helper) leaves the form's `dirty`, `touched`, and `errors` state inconsistent. Going through `setFieldValue` keeps the entire form coherent.

---

## Decision 3 — Dynamic options populated before first render

### The question

When Select options come from a runtime dataset (e.g., a category list fetched from the API at modal-open), the prototype rule (lines 274–277 of the catalog) is to populate `FORM_DD_OPTS[id].items` inside `openXModal()` BEFORE calling `updateFormDDLabel(id)`. Vue 3's equivalent is a reactive query; we need to specify how it is gated and what is rendered while it loads.

### The decision

Forms / modals that need runtime-loaded options SHALL use one of two patterns:

- **Pattern A — page-level pre-fetch.** The page component fetches the options via `@tanstack/vue-query`'s `useQuery` (key: `['<resource>']`, `staleTime` per app convention) before opening the modal. The modal receives the resolved option list as a prop.
- **Pattern B — modal-scoped query enabled on open.** The modal owns the query: `useQuery({ queryKey: [...], queryFn: ..., enabled: () => isOpen.value })`. The Select renders `<Skeleton>` (the shared `Skeleton` component from `core-error-handling`) while `isPending` is true. The first render with options is the user's first sight of the field.

Either pattern MUST guarantee:

- The Select never renders a stale option list (e.g., yesterday's categories) on first paint.
- The Select never renders an empty option list followed by a flicker to the populated list.
- The form schema accommodates the loading state — either the field is required and the submit button stays disabled until options are loaded, or the field is optional and the user can submit without it.

### Alternatives considered

- **Render the Select disabled until options arrive (no Skeleton).** Rejected. A disabled Select with no visual hint that "this is loading" looks like a broken field. The `<Skeleton>` placeholder communicates "loading" without ambiguity.
- **Block the modal from opening until options are loaded.** Rejected as the default. For long-running fetches that would freeze the UI. The `<Skeleton>` pattern lets the modal open immediately and the user starts filling other fields while the Select hydrates.
- **Use Suspense.** Considered. Vue 3's `<Suspense>` boundary works but adds complexity for a single-field pattern. `useQuery` + `<Skeleton>` is the same pattern used elsewhere in the template (per `core-error-handling`).

---

## Decision 4 — State-color dot in Select items

### The question

The prototype supports `{v, l, dot?}` shape for `FORM_DD_OPTS` items where `dot` is a CSS color variable for state visual cues (`var(--green)`, etc.) — used for state-typed dropdowns (the Estado filter). The Vue equivalent must specify the prop shape, the rendered element, and the hidden-when-undeclared behavior.

### The decision

Each Select item type SHALL extend the standard `{ value, label }` shape with an optional `dotColor: string`:

```ts
type SelectOption<T = string> = {
  value: T
  label: string
  dotColor?: string  // CSS token reference: 'var(--success)' OR alias 'success' | 'warning' | 'danger' | 'info' | 'neutral'
}
```

Rendering:

- When `dotColor` is declared, the item renders a leading 8px circle (`<span>` with `inline-block`, `w-2 h-2`, `rounded-full`, background-color resolved from the alias map or the raw `var()` reference).
- When `dotColor` is undeclared, the dot is not rendered — items without a dot align with their label flush left.
- The token alias map resolves to `core-theming` semantic tokens: `success → var(--success)`, `warning → var(--warning)`, `danger → var(--danger)`, `info → var(--info)`, `neutral → var(--t-3)`. Raw `var(--*)` strings are accepted for forward-compatibility with custom tokens.

### Alternatives considered

- **Always require `dotColor` (no optional).** Rejected. Most Select fields are not state-typed (e.g., a Sociedad list does not need state colors). Forcing every item to declare a dot adds noise.
- **Allow any CSS color value (e.g., `#FF0000`).** Rejected. Hardcoded hex outside `globals.css` is forbidden by `core-theming`. The alias map plus `var(--*)` references keep the contract token-driven.
- **Render the dot via a slot instead of a prop.** Considered. Rejected as the default — a slot is more flexible but pushes consistency burden to the consumer. A typed prop is uniform across modules. (A slot may be added in a future change if a real use case emerges.)

---

## Decision 5 — Manifest dialog field types + reactive prerequisites

### The question

The action manifest engine (governed by `core-actions-menu`) renders dialog fields by `field.type`. The supported types are seven: `lookup`, `text`, `textarea`, `select`, `date`, `number`, `boolean`. Each needs a Vue/TS mapping. The manifest validator must reject any other type. Additionally, the manifest's `prerequisites` feature (a field disabled until its prereq has a value) needs a Vue/TS contract.

### The decision

Each manifest field `type` SHALL map to exactly one Vue component and integrate with vee-validate as follows:

| `type`     | Vue component                | Required props from manifest          | vee-validate tokens                                  |
|------------|------------------------------|---------------------------------------|------------------------------------------------------|
| `lookup`   | `<Select>` (with `searchable` flag) | `catalog: string` (resolved via `resolveCatalog`), `label`, `required?` | `z.string()` / `z.string().min(1)` if required        |
| `text`     | `<Input type="text">`        | `label`, `required?`, `maxLength?`    | `z.string()` / `z.string().min(1)` / `.max(N)`        |
| `textarea` | `<Textarea>`                 | `label`, `required?`, `maxLength?`    | `z.string()` / `z.string().min(1)` / `.max(N)`        |
| `select`   | `<Select>` (static `options[]`) | `label`, `required?`, `options[]`  | `z.enum([...])` derived from `options[].value`        |
| `date`     | `<DatePicker>` (`date-fns` under the hood) | `label`, `required?`, `min?`, `max?` | `z.coerce.date()` with `.min()`/`.max()` refinements |
| `number`   | `<Input type="number">`      | `label`, `required?`, `min?`, `max?`  | `z.coerce.number()` with `.min()`/`.max()`            |
| `boolean`  | `<Checkbox>`                 | `label`, `required?`                  | `z.boolean()` (defaults to `false` when unchecked)    |

The manifest validator (governed by `core-actions-menu`) MUST reject any `field.type` not in this whitelist — a manifest declaring `field.type: 'rich-text'` fails dev-mode validation with a clear message.

**Boolean settled on `<Checkbox>`** (not `<Switch>`) because: (a) the prototype's intent is "include in/exclude from a set" which is checkbox semantics, (b) `<Switch>` reads as "on/off for an ongoing system setting" which doesn't fit one-shot dialog fields, and (c) using one component avoids per-app drift.

### Reactive prerequisites

Manifest fields MAY declare:

```ts
prerequisites: { field: string, message: string }
```

The Vue field component SHALL:

- Subscribe to the prereq's value via vee-validate's `useFieldValue(prereqField)`.
- Render the field as `disabled` while the prereq value is empty (`null`, `undefined`, or empty string).
- Render a small grey hint chip next to the label with the prereq's `message` while disabled.
- Re-evaluate reactively as the user types into the prereq — the moment the prereq has a non-empty value, the field becomes enabled and the chip disappears.
- Re-disable + re-show the chip if the user later clears the prereq (e.g., the parent field is cleared back to empty).

### Alternatives considered

- **Use `<Switch>` for boolean.** Rejected. Switch communicates persistent system state, not one-time dialog input. Checkbox is the correct semantics here.
- **Render the prereq hint as a `title` tooltip on the disabled input.** Rejected as the only surface — tooltips are discoverable only on hover. The hint chip next to the label is always visible while the field is disabled, which is the user-facing requirement. (The chip's text MAY also appear in the native `title` for redundancy.)
- **Allow multiple prerequisites per field (`prerequisites[]`).** Considered. The prototype declares prerequisites as a `prerequisites[{field,message}]` array (line 374 of the catalog). The Vue contract supports the array form; the field is disabled when ANY declared prereq is empty, and the chip shows the message of the first unmet prereq (deterministic order = manifest declaration order). This keeps parity with the prototype.

---

## Cross-cutting concerns

### Z-index discipline

- Modal overlay: ≥ 500 (per `core-modals`).
- Custom Select dropdown: ≥ 9999 (this change).
- Toasts: bottom-right, separate stacking context (per `core-error-handling`).
- ActionsMenu portal: between modal and Select (no exact number specified yet — defer to `core-actions-menu`).

The 9999 ceiling for Select is intentionally far above modal overlays so Selects always work inside modals. If a future component needs to sit above Select (very unlikely), it gets its own number above 9999 in a future change.

### vee-validate integration uniformity

Every new field type defined in this change uses the shadcn-vue `<FormControl>` wrapper, which emits the standard `blur` / `change` events vee-validate listens to. Field validation runs on blur; full-form validation runs on submit (per the existing baseline). This uniformity means the new field types do NOT introduce new validation timing — they consume the existing rule.

### `<Skeleton>` reuse

The `<Skeleton>` component is owned by `core-error-handling` (per its existing requirement). This change consumes it for the dynamic-options-loading case. No new skeleton variant is introduced.

---

## Open questions

1. **Multi-parent dependent Selects.** The current contract is single-parent. If a future field genuinely depends on two parents (e.g., `Cuenta` depends on both `Sociedad` AND `Tipo`), we extend `dependsOn` to `dependsOn: { fields: string[], fetchOptions: (parentValues: Record<string, unknown>) => Option[] }` in a follow-up change.
2. **Combobox vs Select for long option lists.** The current contract uses `<Select>` for `select` and `<Select>` (with `searchable: true`) for `lookup`. If real-world list sizes exceed ~50 options, we may promote `select` to Combobox. Deferred.
3. **Async option lists for non-modal forms.** The current contract focuses on the modal-open case. Forms not opened via a modal (e.g., the Edit page in a master-detail view) follow the same `useQuery` + `<Skeleton>` pattern but the "before first render" guarantee is naturally satisfied because the query runs at component mount. No spec change needed; flagged here for clarity.
4. **`Switch` field type for module settings pages.** Settings pages often use `<Switch>` (e.g., "Enable email notifications"). This is NOT a manifest dialog field type — it is a settings-page pattern. If a `boolean-switch` type is ever added to the manifest, it gets a separate requirement.
