# Design — add-dropzone-and-progress-components

## Context

This design captures the rationale behind extending `core-forms` with `<Dropzone>` and `<FileUploadProgress>` as canonical UI primitives. Both components are the visual surface of the lifecycle contracted by `core-file-upload`; this change is intentionally narrow (UI only) so that the lifecycle contract stays in its own change and the UI primitives stay in the capability where every other field input lives.

The decisions below explain why the components are shaped the way they are, what alternatives were considered, and how the boundary with `core-file-upload` works.

---

## Decision 1 — One `<Dropzone>` for both `file` and `multifile`, not two components

### The question

Two field types (`file` and `multifile`) both render a drop area. Should they be two distinct components (`<FilePicker>` for single, `<Dropzone>` for multiple) or one component with a `multiple` prop?

### The decision

**One `<Dropzone>` component**, parameterised by `multiple` (default `false`) and `maxFiles` (default `1` when `multiple === false`). The `file` field type renders `<Dropzone :multiple="false" :maxFiles="1">`; the `multifile` field type renders `<Dropzone multiple :maxFiles="N">`.

### Alternatives considered

- **Two separate components.** Considered. Rejected because the only structural difference between single and multi is the `<input type="file" multiple>` boolean attribute, the `maxFiles` enforcement, and the rendering of the file list. Splitting them duplicates the drag/drop state machine, the validation pipeline, and the accessibility scaffolding — all for cosmetic purity.
- **A `<Dropzone>` wrapper around a generic `<FileInput>`.** Rejected as over-engineered. The drop zone IS the input — there is no use case (today) where the drop area and the file picker are separate components.

### Failure modes the rule prevents

- A developer reaches for a hypothetical `<FilePicker>` for single file → spec violation; both types render `<Dropzone>`.
- A developer authors a custom drop area inside their module instead of using `<Dropzone>` → visual drift; spec violation.

---

## Decision 2 — `<Dropzone>` and `<FileUploadProgress>` are siblings sharing one `useFileUpload(options)` instance

### The question

`<Dropzone>` invokes `useFileUpload(options).start(rawFiles)` and `<FileUploadProgress>` reads from `useFileUpload(options).files`. Should each component instantiate its own composable, or should the parent instantiate one and share?

### The decision

**The parent instantiates `useFileUpload(options)` once and passes the composable's references (or its `options` so each child re-instantiates against the same key) to both children.** Two patterns are accepted:

- **Pattern A — share via props.** Parent calls `const upload = useFileUpload(options)` and passes `:options="options"` plus `:files="upload.files"` (and `:start` / `:cancel` / `:retry` action refs as needed) to each child. Most explicit.
- **Pattern B — share via provide/inject.** Parent calls `provide('uploadInstance', upload)`; both children call `const upload = inject('uploadInstance')`. Useful when the components are deeply nested in a modal hierarchy.

Both patterns satisfy the contract that ONE composable instance drives both surfaces. What is forbidden is **each child instantiating `useFileUpload()` independently** with the same options — that would create two state machines, two file arrays, two retry policies, and would silently break the contract.

### Alternatives considered

- **Each component instantiates its own `useFileUpload()`.** Rejected. Would break the lifecycle: the Dropzone calls `start()` on its instance, the FileUploadProgress reads from a different empty instance. Composables are scoped per-call by Vue's design.
- **Make `useFileUpload()` a singleton at the app level.** Rejected. Multiple uploads can run in parallel (e.g. a Create modal and a comments thread both have upload affordances). One instance per logical upload context is the right cardinality.
- **Encapsulate Dropzone + FileUploadProgress in a single `<UploadField>` component.** Considered. Rejected because it conflates the input affordance (drop zone) with the display affordance (progress list); apps may want to render the progress list elsewhere (e.g. in a different region of the modal, or even in a separate modal). Keeping them as siblings preserves layout flexibility.

### Failure modes the rule prevents

- A developer reaches `useFileUpload({...sameOptions})` from both components → two parallel state machines that never synchronize → file dropped on Dropzone never appears in FileUploadProgress. Spec rejects.
- A developer mutates `files` directly inside FileUploadProgress to "fix" a stuck state → state machine corruption. Spec mandates that all transitions happen via composable actions.

---

## Decision 3 — Visual states are tokenized; no hardcoded colors or spacing

### The question

The drop zone has five canonical visual states (`idle`, `hover`, `dragging`, `rejected`, `disabled`) and the progress component has badge/progress visuals per state. Should the design tokenize all of them, or allow per-app overrides for branding consistency?

### The decision

**Every visual state SHALL resolve through `core-theming` tokens.** Hardcoded hex / rgb values, hardcoded paddings, and hardcoded font sizes are forbidden. The tokens used: `--bg-2` (subtle fill on dragging), `--border` (idle border), `--ring` (focus + hover), `--danger` (rejected + error), `--t-3` (muted text), `--success` (completed badge), and the chart-state palette for badge backgrounds where applicable.

This means the components are **brand-portable**: if a future app of the financial-core (CLP customer-facing — out of scope but illustrative) decides to swap the brand palette, the components inherit the new tokens automatically without code changes.

### Alternatives considered

- **Hardcoded brand colors.** Rejected. Breaks the promise of `core-theming` (one token system across all apps).
- **Per-app override props (`:colorIdle="..."` etc.).** Rejected. Defeats the purpose of having a canonical primitive — apps would diverge on visual contract.

### Failure modes the rule prevents

- A developer uses `bg-blue-50` on `dragging` → spec violation; review rejects.
- A developer overrides paddings to "make it look better" → visual drift across apps; spec rejects.

---

## Decision 4 — Accessibility commitments are mandatory, not nice-to-have

### The question

Drop zones are notoriously inaccessible — they often respond only to drag/drop events that screen readers cannot trigger. Should the spec require accessibility, or treat it as a recommendation?

### The decision

**Accessibility is a hard requirement.** The component SHALL render with `role="button"`, `tabindex="0"`, an `aria-label` describing the drop intent, and SHALL respond to Enter and Space key presses by opening the native file picker (full equivalence with click). The visible focus ring SHALL resolve from the `--ring` token. These are not optional.

### Alternatives considered

- **Require ARIA but not keyboard equivalence.** Rejected. ARIA without keyboard fallback is theatre — screen reader users still cannot operate the component.
- **Provide a separate "Upload from button" affordance for accessibility users.** Rejected. Two surfaces means users with disabilities follow a different code path — a code-smell for accessibility-as-afterthought. The unified component handles both.

### Failure modes the rule prevents

- A developer omits `tabindex="0"` thinking the drop zone "doesn't need keyboard focus" → spec violation.
- A developer makes Enter/Space no-ops → spec violation.

---

## Decision 5 — `<FileUploadProgress>` is display-only (no state mutations)

### The question

When the user clicks Retry on a failed file, where does the state mutation live? In the component, or in the composable?

### The decision

**`<FileUploadProgress>` is strictly display-only.** Every action button (Retry, Cancel) is a pure dispatcher that calls a composable action (`retry(fileId)`, `cancel(fileId)`); the composable owns the state transition. The component never reads-then-writes; it only reads.

### Why this matters

The state machine in `core-file-upload` (`idle → requesting → uploading → completed | error | cancelled`) is the contract. If the component could mutate state, the state machine has multiple writers, which makes audit, telemetry, and bug isolation hard. Single source of truth is the composable.

### Failure modes the rule prevents

- A developer writes `props.files[i].state = 'idle'` inside the Retry handler to "reset" the file → state machine corruption; spec rejects. Correct path: `useFileUpload().retry(fileId)`, which transitions the state internally.
- A developer adds a "Force Complete" debug button that flips a file's state to `completed` without going through phase 3 → bypasses the ETag verification. Spec rejects.

---

## Cross-capability composition

| Neighbor | What it owns | What this change owns |
|---|---|---|
| `core-file-upload` (companion change) | Lifecycle, state machine, retry policy, `useFileUpload()` composable, `ENDPOINTS` triad | UI primitives that consume the lifecycle: `<Dropzone>` (drop area + validation + invokes `start()`), `<FileUploadProgress>` (renders `files[]`, dispatches `retry`/`cancel`) |
| `core-forms` (host) | Manifest field types, validation engine, `<FormControl>`, vee-validate + zod integration | Two new field types (`file`, `multifile`) that map to `<Dropzone>`; reuses the existing `<FormControl>` wrapper |
| `core-theming` | Design tokens, palette, focus ring, semantic colors | All visual states resolve through tokens; no hardcoded values |
| `core-modals` | Modal surfaces, ClosureModal, Drawer, ModalInfo | This change does NOT restrict the surface — components work in any context where `useFileUpload()` is active. Modals are the typical, but not the only, host. |

The clean boundary between this change and `add-core-file-upload`: **lifecycle vs. visualization.** The companion change owns "how an upload works"; this change owns "how an upload looks". Both are needed for an end-to-end usable upload, but they evolve independently — a future change could swap the visual primitives without touching the lifecycle, and vice versa.

---

## Open questions

1. **Folder upload.** `<input type="file" webkitdirectory>` lets users drop a folder and uploads every file inside. Useful for LEX document ingestion. Out of scope for v1 — opens as `add-core-folder-upload` if LEX explicitly asks. Adding it later is a strict extension (new prop on `<Dropzone>`); no breaking change.
2. **File preview rendering.** The component exposes a `#preview` slot for app-specific rendering (image thumbnail, PDF icon). The spec does NOT contract a default preview because every app's domain has different file types and visual conventions. If, after the first three migrations, a common preview pattern emerges, a follow-up change can promote it to the default.
3. **Bulk row actions in `<FileUploadProgress>`.** A future app may want "Retry all errors" or "Cancel all uploading" as a header action above the list. Out of scope for v1 — the row-level actions are sufficient. Adding bulk actions later is additive (new slot or prop).
4. **Drop zone empty state vs `<EmptyState>`.** The Dropzone in idle state shows the canonical drag-or-click message. The `<FileUploadProgress>` empty state uses the shared `<EmptyState>` component from `core-error-handling`. Two different empty surfaces because the Dropzone IS the call to action; the FileUploadProgress is a passive list. Documented to avoid confusion.
5. **Inline rename / type override.** The `#actions` slot on `<FileUploadProgress>` row enables app-specific actions like inline rename or type override. The spec does NOT contract those flows because they are app-domain. If LEX needs "rename document inline before upload", that's a LEX-specific feature that uses the slot — not a template requirement.
