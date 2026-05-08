# Tasks — add-dropzone-and-progress-components

This change is a **contract-only** extension of `core-forms`: one MODIFIED requirement (extend the manifest field whitelist from 7 to 9 values) plus two ADDED requirements (Dropzone component + FileUploadProgress component). No application code is implemented in this change. The actual `<Dropzone>` and `<FileUploadProgress>` Vue components, the `<input type="file">` plumbing, the dragenter/dragover state machine, and the slots will be implemented in subsequent OpenSpec changes when the LEX, TRD, and OPS migrations begin to consume the contract.

## 1. Spec deltas

- [ ] `specs/core-forms/spec.md` — MODIFIED Requirement: `Manifest dialog fields MUST map each declared type to its Vue equivalent and integrate with vee-validate` (whitelist extended from 7 to 9 values; +`file`, +`multifile`; existing 6 scenarios preserved + 2 new)
- [ ] `specs/core-forms/spec.md` — ADDED Requirement: `Dropzone component MUST consume useFileUpload and expose drag-drop affordances with client-side validation` (≥5 scenarios)
- [ ] `specs/core-forms/spec.md` — ADDED Requirement: `FileUploadProgress component MUST render the per-file state machine of the upload composable` (≥4 scenarios)

## 2. Validation gates

- [ ] Run `openspec validate add-dropzone-and-progress-components --strict` and confirm the change validates
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline specs (including the modified `core-forms`) still validate
- [ ] `npm run lint` passes (no source code changes — should be a no-op)
- [ ] `npm run type-check` passes (no source code changes — should be a no-op)
- [ ] `npm run test:run` passes (no source code changes — should be a no-op)
- [ ] `npm run spec:check` passes
- [ ] `npm run build:qa` passes

## 3. Documentation cross-references

- [ ] Verify `proposal.md` references the companion `add-core-file-upload` change for the `useFileUpload()` composable that both components consume
- [ ] Verify `design.md` documents the boundary between `<Dropzone>` (form input field; this change) and `<FileUploadProgress>` (display companion; this change), and how both bind to a single `useFileUpload(options)` instance shared by the parent
- [ ] Verify `design.md` records the rationale for one component for both `file` and `multifile` (vs. two separate components) and the rationale for keeping resumable / pausable / folder uploads explicitly out of scope for v1
- [ ] Verify `design.md` documents the accessibility commitments (`role="button"`, `tabindex="0"`, `aria-label`, Enter/Space keyboard equivalence to click)

## 4. Archive

- [ ] After all validation gates pass and the companion `add-core-file-upload` change is archived, run `openspec archive add-dropzone-and-progress-components`
- [ ] Confirm the CLI applies the modified + added requirements into the baseline (`openspec/specs/core-forms/spec.md`) and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-dropzone-and-progress-components/`
- [ ] Final commit with conventional message: `specs: add Dropzone and FileUploadProgress UI primitives to core-forms`
