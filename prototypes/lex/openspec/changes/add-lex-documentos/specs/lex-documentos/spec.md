## ADDED Requirements

### Requirement: Upload MUST follow the three-step request-presigned / S3 PUT / confirm flow

The upload flow SHALL execute three sequential operations: (1) `POST /document?action=request-presigned-urls` with `{ client_id, files: [{ name, size, mime_type, parent_id }] }` returning per-file `{ document_id, upload_url, expires_at }`; (2) parallel `PUT upload_url` directly to S3 with the file body, monitoring upload progress via XHR `progress` events; (3) `POST /document?action=confirm-uploads` with `{ client_id, uploads: [{ document_id }] }`. The shared API client (`core-api-layer`) is used for steps 1 and 3; step 2 SHALL bypass the axios instance and use a raw XHR per file because the URL points to S3, not the Lex backend, and the request MUST NOT carry the Auth0 token.

#### Scenario: Three-step happy path

- **GIVEN** a user drops one PDF into the modal
- **WHEN** the upload runs
- **THEN** the network log shows, in order, one `POST /document?action=request-presigned-urls`, one `PUT` to the S3 URL with no `Authorization` header, and one `POST /document?action=confirm-uploads`

#### Scenario: S3 step does not carry the Auth0 token

- **GIVEN** the presigned URL was returned in step 1
- **WHEN** the browser fires the XHR PUT to S3
- **THEN** the request headers contain no `Authorization` header (the XHR is not routed through the axios instance with `setAccessTokenGetter`)

#### Scenario: confirm-uploads is not fired if any S3 PUT fails

- **GIVEN** two files are uploading in parallel and one S3 PUT returns 403 (URL expired)
- **WHEN** the failure surfaces
- **THEN** step 3 is NOT fired with the failed file; the modal surfaces a per-file error and the user can retry the failed file individually

---

### Requirement: Multi-file upload modal MUST show per-file progress with cancel and retry

The `MultiFileUploadModal` SHALL render one row per file with: filename, size in human-readable units, status icon (`uploading` / `success` / `failed` / `cancelled`), a progress bar wired to the XHR `progress` event, a `Cancelar` action that aborts the XHR, and a `Reintentar` action that re-runs the three-step flow for the failed file only. Multiple files MAY upload in parallel; the modal SHALL cap concurrency at 3. The modal SHALL block its primary `Cargar` button while any file is `uploading`. Closing the modal while uploads are in flight SHALL prompt for confirmation per `core-modals` Requirement "Confirmation dialogs MUST follow the destructive action pattern".

#### Scenario: Progress bar tracks XHR progress

- **GIVEN** a 10 MB file is uploading and 4 MB have transferred
- **WHEN** the progress event fires
- **THEN** the row's progress bar fills to 40% and the row text reads `4.0 MB / 10.0 MB`

#### Scenario: Cancel aborts the XHR

- **GIVEN** a file is at 30% progress
- **WHEN** the user clicks `Cancelar` for that file
- **THEN** the XHR is aborted, the row status becomes `cancelled`, no `confirm-uploads` request is fired for that document, and the row offers `Reintentar`

#### Scenario: Retry re-runs the three-step flow for one file

- **GIVEN** a file failed at the S3 PUT step
- **WHEN** the user clicks `Reintentar` for that file
- **THEN** a fresh `request-presigned-urls` is fired (just for that file), the new presigned URL is used for the PUT, and the modal shows the row at 0% and counting up

#### Scenario: Closing the modal during upload prompts for confirmation

- **GIVEN** at least one file is `uploading`
- **WHEN** the user clicks the modal close icon
- **THEN** a destructive confirmation dialog opens with the message `Hay subidas en curso · ¿Cancelar todas?`; only after confirm do the in-flight XHRs abort and the modal closes

---

### Requirement: Documentos tab MUST render a folder tree based on parent_id

The Documentos tab SHALL render a hierarchical tree where each `Document` whose `mime_type='application/x-folder'` (or equivalent backend marker) is a folder node and every other Document is a file row. Children are resolved via the `parent_id` field. The tree SHALL support expand/collapse; expansion state SHALL persist for the duration of the page mount but SHALL NOT persist across reloads. Each folder node SHALL show an item count `(N)` next to its label. Files SHALL display: name, size, type icon, upload date (formatted `dd/MM/yyyy`), uploader name, plus row Acciones (Descargar, Editar, Eliminar).

#### Scenario: Tree renders nested folders correctly

- **GIVEN** a tree with root → "Identidad" folder → 3 files, root → "Comprobantes" folder → 1 sub-folder → 2 files
- **WHEN** the tab mounts
- **THEN** the visible structure is two collapsed top-level folders with counts `(3)` and `(3)`; expanding `Comprobantes` reveals the sub-folder with count `(2)`

#### Scenario: Empty folder shows the placeholder

- **GIVEN** a folder with no children
- **WHEN** the user expands it
- **THEN** the body renders `<EmptyState>` with description `Sin documentos en esta carpeta` (per `core-error-handling`)

#### Scenario: Expansion state does not persist across reloads

- **GIVEN** the user has expanded two folders
- **WHEN** the user hard-reloads the page
- **THEN** the tree is rendered with all folders collapsed at root level

---

### Requirement: Document metadata MUST be editable via FormDocument / EditDocumentForm

The metadata fields exposed for edit SHALL be `name`, `type`, `description`. The Editar action SHALL open the `EditDocumentForm` per `core-modals` Requirement "Edit modals MUST transition from the Detail modal" — preceded by a Detail modal showing the document's current metadata. The form SHALL validate via vee-validate + zod with a 500-character cap on `description`. On submit it SHALL call `PATCH /document/:id` and refetch the tab. The CUIT-equivalent invariant: the file content (S3 object) is not editable through this form — only the metadata. To replace the file content, the user MUST upload a new document and delete the old one.

#### Scenario: Editar opens Detail then Edit

- **GIVEN** a user clicks `Editar` on a file row
- **WHEN** the action fires
- **THEN** the Detail modal opens first showing the read-only metadata; clicking `Editar` inside it transitions to the Edit form

#### Scenario: Description respects the 500-character cap

- **GIVEN** the user types 510 characters into the `description` field
- **WHEN** the input handles the keystroke at character 501
- **THEN** the input visually caps at 500 characters and an inline counter reads `500 / 500`

#### Scenario: Successful patch closes the Edit modal and refetches

- **GIVEN** the form is valid and `name='Pasaporte titular'`
- **WHEN** the user submits
- **THEN** `PATCH /document/:id` is called, the modal closes on 200, the `['lex','documents',clientId]` query refetches, and a toast `Documento actualizado` is shown

---

### Requirement: Download MUST request a fresh presigned URL on each click

The `Descargar` action SHALL fire `GET /document/:id?action=request-download-url`, then trigger a browser download from the returned signed URL. The frontend MUST NOT cache presigned download URLs across clicks because they expire. The browser SHALL navigate to the URL via an anchor with `download` attribute set to the document `name` so the browser preserves the original filename. Download SHALL be available to all roles authorised to view the tab (so `VIEWER_LEX` and `ADMIN_LEX` MAY download, `COMMERCIAL_LEX` MAY NOT view the tab and therefore cannot download per `lex-roles`).

#### Scenario: Each Descargar click requests a new presigned URL

- **GIVEN** the user clicked `Descargar` on a file 5 minutes ago and clicks it again
- **WHEN** the second click is handled
- **THEN** a fresh `GET /document/:id?action=request-download-url` request fires; the previous URL is not reused

#### Scenario: VIEWER_LEX can download

- **GIVEN** a VIEWER_LEX user opens `/clientes/:id?tab=documentos`
- **WHEN** the user clicks `Descargar`
- **THEN** the request fires successfully and the file downloads with its original filename

#### Scenario: COMMERCIAL_LEX cannot reach the download

- **GIVEN** a COMMERCIAL_LEX user opens `/clientes/:id?tab=documentos`
- **WHEN** the page mounts
- **THEN** the "Acceso restringido" placeholder renders per `lex-roles`; no Descargar action is reachable

---

### Requirement: Delete MUST go through the destructive confirmation pattern and refetch

The `Eliminar` action SHALL open a destructive confirmation dialog per `core-modals` showing the document `name`, the verb-specific action label `Eliminar`, ghost `Cancelar` on the left, danger-variant `Eliminar` on the right. Confirmation SHALL fire `DELETE /document/:id`. On success the dialog closes, the tree refetches, and a toast `Documento eliminado` is shown. Deleting a folder with children SHALL be blocked at the UI by surfacing a toast `La carpeta no está vacía` after the backend rejects the request with 409. The Eliminar action MUST be hidden for `VIEWER_LEX` users per `lex-roles`.

#### Scenario: Confirmation shows the document name

- **GIVEN** an ADMIN_LEX user clicks `Eliminar` on a file named `pasaporte.pdf`
- **WHEN** the dialog opens
- **THEN** the dialog body contains `pasaporte.pdf` and the action label is `Eliminar`

#### Scenario: Folder-not-empty surface

- **GIVEN** the user attempts to delete a folder with 3 files
- **WHEN** the API returns 409 with `code='folder_not_empty'`
- **THEN** the dialog closes, no row is removed, and a toast `La carpeta no está vacía` is surfaced

#### Scenario: Eliminar hidden for VIEWER_LEX

- **GIVEN** a VIEWER_LEX user opens a file row Acciones menu
- **WHEN** the menu renders
- **THEN** the `Eliminar` item is not present
