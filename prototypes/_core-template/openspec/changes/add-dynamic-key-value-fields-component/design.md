# Design — add-dynamic-key-value-fields-component

## Context

This design covers `<DynamicKeyValueFields>` — the canonical primitive for capturing a variable-length list of key-value rows. The component is small in surface but its visual mechanics (drag reorder, duplicate detection, per-row validation) deserve explicit decisions to keep apps consistent.

---

## Decision 1 — vueuse/useDraggable, not a third-party drag-drop library

### The question

Drag-and-drop libraries for reorder are abundant: `vue-draggable`, `sortablejs`, `@dnd-kit`. Should the component adopt one?

### The decision

**vueuse/useDraggable.** Already a dep transitive in the template ecosystem; lightweight; covers the reorder case directly.

### Why

- **Bundle.** `vue-draggable-next` (the maintained Vue 3 fork) adds ~10 KB; useDraggable is ~1 KB.
- **API surface.** The reorder use case is "drag a row up or down within a list". Heavy libraries cover cross-list, nested, autoscroll, etc. — features the spec deliberately doesn't include.
- **Token consistency.** External DnD libraries ship their own DOM mutation and CSS classes; integrating with `core-theming` requires overrides. Hand-rolled with vueuse gives full control.

### Failure modes the rule prevents

- Bundle bloat from a comprehensive DnD library that the spec doesn't actually need → eliminated.

---

## Decision 2 — `duplicateKeyPolicy: 'warn' | 'reject' | 'allow'`

### The question

When the user enters two rows with the same `key`, what should happen?

### The decision

**Three policies; the consumer chooses.**

- **`warn` (default).** Show a warning chip; submission is allowed. Useful when the backend handles duplicates idempotently or when "last write wins" is acceptable.
- **`reject`.** Treat as a validation error; block submission. Useful when each key must be unique by domain rule (OPS instruction attributes likely fall here).
- **`allow`.** Silent — duplicates are valid. Useful for log-style data where multiple entries with the same key are meaningful.

### Why three policies instead of one

- `warn` alone is too permissive for cases where uniqueness matters.
- `reject` alone is too strict for cases where duplicates have meaning.
- `allow` alone removes signaling.

The three covers the use cases without forcing one mental model on every consumer.

### Failure modes the rule prevents

- A consumer wants strict uniqueness but the component allows duplicates silently → spec offers `reject`.
- A consumer wants log-style with duplicates as data points but the component rejects → spec offers `allow`.

---

## Decision 3 — `index` field reassigned on every reorder

### The question

When rows are reordered (or removed), does `index` track the original creation order or the current visual position?

### The decision

**Current visual position.** `index` is reassigned consistently after every reorder and remove.

### Why

- **Backend persistence.** Some backends store `index_order` per row to preserve visual order. The component's output should match that semantic directly.
- **Consumer simplicity.** A consumer reading `attributes[0].index` always gets `0`, regardless of when that row was created. No mental model around "creation index" vs. "display index".

### Alternatives considered

- **`index` as creation timestamp.** Rejected — backends almost never need it; it's metadata that diverges from visual order.
- **No `index` field.** Considered. Rejected because the array's natural order is enough at runtime, but persistence layers benefit from an explicit field.

### Failure modes the rule prevents

- A consumer relies on `index` and gets stale values after reorder → eliminated by reassignment policy.

---

## Decision 4 — Edit-in-place, not edit-in-dialog

### The question

Some apps render add/edit of structured rows via a separate dialog ("Add attribute" opens a modal with key + value fields). Should `<DynamicKeyValueFields>` work that way?

### The decision

**Edit-in-place.** Every row is editable directly in the list; no separate dialog.

### Why

- **The component's UX is "build a list iteratively".** Adding a row should be one click, not "click Add → modal opens → fill → click Confirm → modal closes".
- **Modals interrupt the flow.** When building 10 attributes, opening 10 modals is friction.
- **Validation visibility.** Errors render below each field directly. In a dialog flow, errors live in the dialog and the user has to remember which row had the issue.

### Failure modes the rule prevents

- A consumer wants modal-driven editing → spec doesn't accommodate, but the consumer can build that themselves outside this component (literally a different component).

---

## Decision 5 — Custom valueType lets the component compose with the rest of `core-forms`

### The question

What if a row's `value` is not just text but a structured field (a money amount, a date, a select)?

### The decision

**The component accepts `valueType: ManifestFieldType`.** Any field type contracted in `core-forms` (text, number, date, money, select, otp, …) can be the value column of every row.

### Why

- **One component, many use cases.** Without this, every variation needs a different component.
- **Aligns with manifest engine.** The manifest engine already maps field types to components; the same mapping applies inside the dynamic list.

### Failure modes the rule prevents

- A consumer needs money values but the component is text-only → fixed by `valueType: 'money'`.

### Open consideration

The spec exposes `keyType: 'text' | 'select'` (binary) but `valueType` is open. Asymmetry is intentional: `key` is almost always free-text or a constrained dropdown; `value` has much wider variation.

---

## Cross-capability composition

| Neighbor | Owns | This change owns |
|---|---|---|
| `core-forms` | Field types, validation, `<FormControl>` | DynamicKeyValueFields contract; `key-value-array` field type |
| `core-theming` | Tokens | Drag handle, hover states, focus rings resolve through tokens |
| `core-actions-manifest` | Manifest engine, dialog field type registry | `key-value-array` enters the registry |

---

## Open questions

1. **Autocomplete on key inputs.** Suggesting keys already used elsewhere in the array. Out of v1; nice-to-have.
2. **Cross-component drag.** Moving rows between two `<DynamicKeyValueFields>` instances (e.g., "Active attributes" and "Archived attributes"). Out of v1; not contracted.
3. **Bulk paste.** Pasting `key1=value1\nkey2=value2` to populate multiple rows. Out of v1; if OPS demands, abre como extension.
4. **Validation against a fixed key vocabulary.** When the backend has a closed list of acceptable keys, the consumer can pass `keyType: 'select'` with `keyOptions`. If the closed list comes from runtime (e.g., backend-fetched), `core-dynamic-forms` (separate change) covers that.
5. **Drag handle accessibility.** Spec mandates focus ring on drag handle but doesn't yet contract keyboard reorder (`Space` to grab, arrow keys to move). Worth verifying during implementation; if not present, a follow-up change adds it.
