# Tasks — add-core-file-upload

This change is a **contract-only** addition of the new `core-file-upload` capability plus a single `ADDED Requirement` to `core-api-layer`. No application code is implemented in this change. The actual `useFileUpload()` composable, the `apiClient` extensions for XHR-based PUT, the state-machine helpers, and the polling utilities will be implemented in subsequent OpenSpec changes when the LEX, TRD, and OPS migrations begin to consume the contract.

## 1. Spec deltas

- [ ] `specs/core-file-upload/spec.md` — NEW capability with 9 requirements:
  - [ ] `All file uploads MUST follow the presigned-URL three-phase lifecycle` (≥3 scenarios)
  - [ ] `Presigned-URL request and response MUST follow a canonical shape` (≥3 scenarios)
  - [ ] `Per-file upload MUST emit progress events and support cancellation` (≥3 scenarios)
  - [ ] `Per-file upload MUST follow a canonical state machine` (≥3 scenarios)
  - [ ] `Confirm phase MUST verify the storage ETag` (≥2 scenarios)
  - [ ] `Retry policy MUST distinguish recoverable from permanent failures` (≥3 scenarios)
  - [ ] `Batch upload MUST orchestrate files in parallel with bounded concurrency` (≥3 scenarios)
  - [ ] `Batch import MUST poll for an asynchronous job until terminal state` (≥4 scenarios)
  - [ ] `Composable useFileUpload MUST be the only consumer entry point` (≥3 scenarios)
- [ ] `specs/core-api-layer/spec.md` — ADDED Requirement: `Endpoint groups that serve file uploads MUST register the canonical triad in ENDPOINTS` (≥3 scenarios)

## 2. Validation gates

- [ ] Run `openspec validate add-core-file-upload --strict` and confirm the change validates
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline specs (including the modified `core-api-layer`) still validate
- [ ] `npm run lint` passes (no source code changes — should be a no-op)
- [ ] `npm run type-check` passes (no source code changes — should be a no-op)
- [ ] `npm run test:run` passes (no source code changes — should be a no-op)
- [ ] `npm run spec:check` passes
- [ ] `npm run build:qa` passes

## 3. Documentation cross-references

- [ ] Verify `proposal.md` references the companion `add-dropzone-and-progress-components` change for the UI primitives that consume `useFileUpload()`
- [ ] Verify `design.md` documents the boundary between `core-file-upload` (lifecycle, state machine, retry, batch import) and `core-api-layer` (transport, ApiError, retry policy for queries — not for uploads)
- [ ] Verify `design.md` records the rationale for XHR vs. fetch (progress events) and the rationale for two-mode composable (`'standard'` vs. `'batch-import'`)
- [ ] Verify `design.md` lists the open questions on resumable uploads (out of scope for v1) and on storage-provider portability

## 4. Archive

- [ ] After all validation gates pass, run `openspec archive add-core-file-upload`
- [ ] Confirm the CLI applies the new capability (`openspec/specs/core-file-upload/spec.md`) and the modified `core-api-layer` requirement, then moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-core-file-upload/`
- [ ] Final commit with conventional message: `specs: add core-file-upload capability with presigned-URL lifecycle and batch-import polling`
