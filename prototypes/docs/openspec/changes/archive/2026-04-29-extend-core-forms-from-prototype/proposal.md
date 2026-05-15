> Jira REQ: — (template-level gap closure derived from the `_core-template-frontend` v1.15 prototype survey)
> Module: core-template (foundation)

# Extend core-forms with custom Select, dependent fields, dynamic options, and dialog field types

## Why

The current `core-forms` capability seeds the validation engine (`vee-validate` + `zod`), the label token, the required-field marker, the submit-disabled rule, and the field-error placement. That baseline is necessary but not sufficient for the patterns documented in `prototypes/_core-template-frontend/README.md` v1.15 and exercised by the manifest engine, Inbox, Alertas, Reportes, and the example Módulo A. Five concrete gaps remain that, if left uncontracted, will be re-implemented divergently by every Ardua app:

1. **Native `<select>` is still implicitly allowed** because the spec says nothing about Select rendering. The prototype is unambiguous: forms and modals NEVER use native `<select>` (line 339 of the catalog: *"Los formularios y modales nunca usan `<select>` nativo."*) because native selects ignore design tokens (dark mode, fonts, paddings, hover states) and break visual consistency. Without a contract, agents will reach for `<select>` "because it's simpler" and the visual baseline will rot.
2. **Dependent dropdowns are not specified.** The canonical example (`Cuenta` depends on `Sociedad` in FIN — `cm-soc → cm-cuenta`) needs a deterministic reset-and-repopulate pattern. Without a contract, every module will re-invent the parent-watcher and the reset semantics differently.
3. **Dynamic options loaded on modal open are not specified.** When Select options come from a runtime dataset (`CATEGORIES` in Editar Reporte), the prototype rule is to populate options BEFORE the field renders. Vue 3 needs an equivalent rule expressed in terms of `useQuery` enable-on-open, `<Skeleton>` placeholder while loading, and a forbidden "stale or empty options on first render" anti-pattern.
4. **State-color dot in Select items is not specified.** The prototype's `FORM_DD_OPTS` items support `{v, l, dot?}` for state-typed dropdowns. The Vue equivalent (`dotColor` token reference rendered as a leading 8px circle) needs to be in the contract so the manifest engine and module-level Selects can rely on it.
5. **Manifest dialog field types are not specified.** The action manifest engine renders dialogs by `field.type` (`lookup`, `text`, `textarea`, `select`, `date`, `number`, `boolean`). Each type needs a Vue/TS mapping (`<Select>`, `<Input>`, `<Textarea>`, `<DatePicker>`, `<Checkbox>`) and a vee-validate integration recipe. Reactive prerequisites (a field disabled until its prereq has a value) are also under-specified — they appear in two prototype sections but with no Vue contract.

Closing all five gaps in the same change keeps the form-extension story coherent and lets reviewers evaluate it as one improvement to the seed contract. None of these requirements modify the existing five baseline requirements; they only ADD on top.

## What Changes

- **`core-forms`** — add five new requirements:
  - `Forms and modals MUST use a custom Select component, never native <select>` — covers the shadcn-vue / portal-based Select component, in-portal dropdown with z-index above modals (≥9999), keyboard navigation (Up/Down/Enter/Esc), `<FormControl>` integration, and the explicit native-`<select>` anti-pattern.
  - `Dependent Select fields MUST reset their value and re-derive options when the parent changes` — covers the `dependsOn: { field, fetchOptions }` prop pattern, vee-validate `useFieldValue` watcher, and the `setFieldValue(child, null)` reset to keep form state consistent.
  - `Dynamic Select options MUST be populated before the field first renders` — covers the `useQuery` enabled-on-modal-open pattern, `onBeforeMount` await, the `<Skeleton>` placeholder while loading, and the forbidden stale/empty-on-first-render anti-pattern.
  - `Select items MAY expose a state-color dot via the dotColor token` — covers the optional `dotColor: string` shape (CSS token reference like `var(--success)` or alias `'success'`), the 8px leading circle, and the hidden-when-undeclared rule.
  - `Manifest dialog fields MUST map each declared type to its Vue equivalent and integrate with vee-validate` — covers the seven supported types (`lookup`, `text`, `textarea`, `select`, `date`, `number`, `boolean`), the exact Vue component for each, the `min`/`max`/`maxLength` integration, the manifest validator's whitelist rejection of any other type, and the reactive `prerequisites: { field, message }` disable + hint-chip behavior.

## Capabilities

### Affected Capabilities

- `core-forms` — five new requirements added (custom Select, dependent fields, dynamic options, dot color, manifest dialog field types incl. reactive prerequisites)

### New Capabilities

None. This change extends the existing seed `core-forms` capability rather than introducing a new one.

### Cross-capability touch points

- `core-modals` — the custom Select must portal above the modal overlay (z-index ≥ 9999 vs modal ≥ 500). No spec change in `core-modals`; the requirement here is internal to the Select component.
- `core-actions-menu` — the manifest engine's dialog renderer is governed by `core-actions-menu`; this change defines the field-type contract that engine consumes.
- `core-theming` — the `dotColor` references the semantic palette (`--success`, `--warning`, `--danger`, `--info`). No spec change; this change just consumes the existing tokens.

## Notes

- This change is artifact-only at the spec level. Implementation of the custom `<Select>` component, the `dependsOn` prop, the dialog renderer, and the vee-validate integration recipes happens in a subsequent OpenSpec change (slug TBD) when the first Ardua core app starts migration.
- After this change is archived, `core-forms` will carry 10 requirements (the original 5 baseline + 5 new). Total Tier 2 seed scenarios will grow accordingly.
- The native `<select>` ban is normative. Any PR that introduces `<select>` inside a form or modal MUST be rejected at review.
