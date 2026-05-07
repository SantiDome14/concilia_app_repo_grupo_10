# Tasks — add-lex-documentos

This change creates the `lex-documentos` capability — the Documentos tab + S3 presigned-URL upload flow. It is a NEW capability with one delivered artifact: the spec at `openspec/specs/lex-documentos/spec.md` (materialised by `openspec archive`). Implementation tasks (sections 2–4) are aspirational checkboxes. Implementation MAY ship inside this same change folder, OR be split into a follow-up `implement-lex-documentos` change. Validation gates and archive (sections 5–6) are mandatory in either case.

## 1. Spec deltas (mandatory — this change blocks on these)

- [x] `specs/lex-documentos/spec.md` — ADDED Requirements: 6 requirements, 19 scenarios. Cover: three-step upload with explicit no-Auth0-to-S3, multi-file modal with per-file controls + concurrency cap, folder tree based on `parent_id` with non-persisted expansion, Detail→Edit metadata flow, fresh presigned URL per download, destructive delete with folder-not-empty.
- [ ] Run `openspec validate add-lex-documentos --strict` and confirm the change validates.
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline + the new capability validate together.

## 2. TypeScript types and orchestrator (aspirational)

### 2.1 Types

- [ ] `src/lex/documentos/types.ts` — `Document` (`id`, `client_id`, `parent_id`, `name`, `size`, `mime_type`, `description`, `uploaded_by`, `uploaded_at`), `DocumentTreeNode`, `UploadProgress`, `MimeType` union.

### 2.2 Orchestrator

- [ ] `src/lex/documentos/api.ts`:
  - `requestPresignedUrls(clientId, files)` → `{ document_id, upload_url, expires_at }[]` via shared axios.
  - `uploadToS3(file, presignedUrl, onProgress)` → raw XHR PUT, NO Authorization header.
  - `confirmUploads(clientId, documentIds)` via shared axios.
  - `editDocument(id, payload)`, `deleteDocument(id)`, `requestDownloadUrl(id)`.

### 2.3 Composable

- [ ] `src/lex/documentos/useDocumentUpload.ts` — orchestrates the three-step flow with concurrency cap of 3, per-file abort controllers, retry queue.

## 3. Components (aspirational)

- [ ] `src/lex/documentos/MultiFileUploadModal.vue` — drop zone, per-file rows (filename + size + status icon + progress bar + Cancel/Retry), block primary CTA while any file uploading, destructive confirm on close-during-upload.
- [ ] `src/lex/documentos/DocumentTree.vue` — recursive tree component using `parent_id`; expand/collapse local state; folder counts `(N)`; EmptyState when empty.
- [ ] `src/lex/documentos/DocumentRow.vue` — file row with name, size, type icon, upload date, uploader, Acciones (Descargar, Editar, Eliminar).
- [ ] `src/lex/documentos/EditDocumentForm.vue` — Detail → Edit modal transition; vee-validate + zod; 500-char description with counter.
- [ ] `src/lex/documentos/CreateFolderModal.vue` — Create modal for new folders.
- [ ] Wire delete via `core-modals` destructive confirmation, including the 409 folder-not-empty toast.

## 4. Tests (aspirational)

- [ ] `src/lex/documentos/api.spec.ts` — three-step orchestrator + verifies S3 PUT has no Authorization header.
- [ ] `src/lex/documentos/useDocumentUpload.spec.ts` — concurrency cap of 3, per-file cancel + retry, fresh presigned URL on retry.
- [ ] `src/lex/documentos/DocumentTree.spec.ts` — nested folder rendering, counts, expansion state non-persisted across remounts.
- [ ] `src/lex/documentos/EditDocumentForm.spec.ts` — Detail → Edit transition, 500-char cap.
- [ ] Coverage on `api.ts` ≥ 95%; on `useDocumentUpload.ts` ≥ 95%; on components ≥ 80%.

## 5. Validation gates (mandatory)

- [ ] `openspec validate add-lex-documentos --strict` passes.
- [ ] `openspec validate --all --strict` passes.
- [ ] If implementation tasks (2–4) are completed in this change: `npm run lint`, `npm run type-check`, `npm run test:run`, `npm run build:qa` all pass.
- [ ] If implementation is deferred: confirm a follow-up change `implement-lex-documentos` is opened with sections 2–4 as its scope.

## 6. Archive

- [ ] After all mandatory gates pass, run `openspec archive add-lex-documentos`.
- [ ] Confirm the CLI applies the ADDED Requirements into a new baseline `openspec/specs/lex-documentos/spec.md` and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-lex-documentos/`.
- [ ] Final commit with conventional message: `specs: add lex-documentos — Documentos tab + S3 presigned-URL upload flow`.
