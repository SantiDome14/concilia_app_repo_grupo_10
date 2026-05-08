> Jira REQ: — (no ticket; capability scoping for the Lex migration from `core-lex-frontend` legacy)
> Module: LEX

# Add lex-documentos — Documentos tab + S3 presigned-URL upload flow

## Why

The Documentos tab on `/clientes/:id` is one of the most complex surfaces in Lex: it manages the document vault for each Cliente via a three-step S3-presigned-URL upload (`request-presigned-urls` → parallel S3 PUT with progress → `confirm-uploads`), it renders a folder hierarchy via `parent_id`, and it gates visibility with the strictest role rule in `lex-roles` (`COMMERCIAL_LEX` is denied entirely, not just write — these documents contain compliance-sensitive material outside their scope). The legacy implementation orchestrates the upload across `clientService.js`, `MultiFileUploadModal.vue`, and `Documents.vue`, and routes the S3 PUT through `axios` by accident — including the Auth0 token in headers that S3 rejects, causing failures that are silently retried.

The new spec locks: the three-step contract with explicit "no Auth0 token to S3" rule, per-file progress + cancel + retry semantics, the folder tree contract, the metadata edit form, the fresh-presigned-URL-per-download rule, and the destructive delete with folder-not-empty handling. Server-side virus scanning and document retention are explicitly out of scope.

## What Changes

- Create the `lex-documentos` capability. New spec at `openspec/specs/lex-documentos/spec.md` (materialised via archive) with 6 requirements covering: (a) three-step upload contract with raw XHR for the S3 PUT (no Auth0 token); (b) MultiFileUploadModal with per-file progress, cancel, retry, concurrency cap of 3, and close-during-upload confirmation; (c) folder tree based on `parent_id` with expand state non-persisted; (d) metadata edit via Detail→Edit modal transition with 500-char description cap; (e) Descargar requests a fresh presigned URL each click and preserves filename; (f) destructive delete with folder-not-empty surface.
- Define the typed surface. `src/lex/documentos/api.ts` (the three-step orchestrator + edit + delete + download), `src/lex/documentos/MultiFileUploadModal.vue`, `src/lex/documentos/DocumentTree.vue`, `src/lex/documentos/EditDocumentForm.vue`, `src/lex/documentos/types.ts` (`Document`, `DocumentTreeNode`, `UploadProgress`).
- Integrate with sibling capabilities — referenced, not edited:
  - `core-modals` — Detail → Edit transition; destructive confirmation for delete and for closing during in-flight uploads.
  - `core-forms` — vee-validate + zod for metadata fields, 500-char counter on description.
  - `core-error-handling` — empty state copy, network error toast, 401 global handler.
  - `core-api-layer` — request-presigned and confirm-uploads go through the shared axios; the S3 PUT explicitly does NOT.
  - `lex-cliente-detalle` — owns the tabbed shell that hosts this surface.
  - `lex-roles` — `COMMERCIAL_LEX` denied entirely; `VIEWER_LEX` may view + download but not upload/edit/delete.

## Capabilities

### Affected Capabilities

None modified by this change.

### New Capabilities

- `lex-documentos` (Lex transversal; document vault) — 6 requirements, 19 scenarios.

### Non-capability artifacts

- `src/lex/documentos/api.ts` — orchestrator + endpoints.
- `src/lex/documentos/MultiFileUploadModal.vue` — multi-file upload modal.
- `src/lex/documentos/DocumentTree.vue` — folder tree.
- `src/lex/documentos/EditDocumentForm.vue` — metadata edit.
- `src/lex/documentos/types.ts` — `Document`, `DocumentTreeNode`, `UploadProgress`, `MimeType`.
