- Jira REQ: —
- Module: core-template (foundation)
- Tier: 1 — bloquea LEX (gestión de documentos), TRD (attachments por quote), OPS (SWIFT batch import)

# Add `core-file-upload` capability — presigned-URL upload lifecycle and batch-import orchestration

## Why

Tres frentes del `ardua-financial-core` necesitan subir archivos al backend, cada uno con un patrón hoy inventado localmente:

1. **LEX — gestión de documentos.** El módulo de documentos del cliente sube PDFs/imágenes a S3 vía presigned URLs (`requestPresignedURLs` → `uploadFileToS3` con XHR para progress → `confirmUploads`). El flujo está acoplado a `clientService.js`, no es reutilizable y no tiene retry tipado. Es el flow que más uso le da al patrón en todo el core.
2. **TRD — attachments por quote.** `quotesApi.uploadAttachment` reproduce el mismo flujo (`POST /quote/{id}/attachment` con presigned URL), también con código local y sin contrato compartido. Sus errores caen como genéricos `Error`.
3. **OPS — SWIFT batch import.** `ImportSwiftModal` no es exactamente un upload de archivo personal: es un **batch import** — el archivo se sube al backend, el backend lanza un job de parsing asíncrono (MT940 SWIFT), y el cliente debe poller el estado del job y mostrar los resultados. Es una variante del mismo patrón que necesita un sub-contrato adicional.

El paradigma del `_core-template-frontend` exige una identidad arquitectónica única para el financial-core: cualquier app que necesite subir archivos debe consumir un contrato canónico, no inventar el suyo. Esta change incorpora esa capability al template — define el ciclo end-to-end del upload (request → upload con progress → confirm), el state machine per-file, la política de retry diferenciada (recoverable vs. permanente), la orquestación batch con concurrencia acotada, y el sub-patrón de **import job** con polling para los casos donde el backend procesa el contenido subido.

Los **componentes visuales** (Dropzone, FileUploadProgress) viven en el companion change `add-dropzone-and-progress-components` para mantener este change concentrado en el contrato.

## What Changes

- **New capability `core-file-upload`** con requirements para:
  - **Presigned-URL pattern obligatorio** — la subida directa multipart al backend está prohibida. Todo upload usa el flow request → S3 → confirm.
  - **Canonical shapes** — request payload (`{ files: [{ filename, content_type, size_bytes }] }`) y response (`{ uploads: [{ url, fields, key, expires_at }] }`) son fijos. Los apps personalizan **la ruta del endpoint** y **la metadata persistente final**, nada más.
  - **State machine per-file** con estados canónicos `idle | requesting | uploading | completed | error | cancelled`.
  - **XHR-based progress** con `bytes_loaded` / `bytes_total` por file y `AbortController` para cancelación.
  - **ETag verification** — el confirm round-trip envía la ETag echo'd por S3; mismatch = falla.
  - **Retry policy diferenciada** — 5xx + network = recoverable (exponential backoff con jitter, max 3 retries); 4xx (incluye 403 por presigned expirado) = permanente (re-request necesario, no retry automático).
  - **Bounded concurrency** — default 3 uploads en paralelo; configurable.
  - **Batch import sub-pattern** — para casos donde el backend procesa el contenido (SWIFT, CSV blacklist), contractualizar el job model: upload → server crea `import_job` → client polls `GET /jobs/{id}` hasta terminal state → result table.
  - **Composable `useFileUpload()`** que expone state + actions (request/upload/cancel/retry/confirm) sin acoplarse a un endpoint específico.
- **Extensión a `core-api-layer`** — agregar requirement nuevo: endpoints que sirven file-upload SHALL exponer la triada `presignedUrls`/`confirm` en el `ENDPOINTS` registry, y para batch import el grupo SHALL incluir `createJob` + `jobStatus(id)`.
- **Skill nueva `ardua-add-file-upload`** con playbook deterministic (a definir en su propio change si decidimos cortarlo más fino; en este change no se incluye la skill).

## Capabilities

### Affected Capabilities

- `core-api-layer` — un requirement añadido para registrar endpoints de file-upload y de batch-import job en el `ENDPOINTS` registry con shape canónico.

### New Capabilities

- `core-file-upload` — net-new. 9 requirements iniciales cubriendo lifecycle, state machine, progress, retry, batch concurrency, e import-job sub-pattern.

### Cross-capability dependencies

- Compone con `core-error-handling` — los errores no recuperables del upload se propagan como `ApiError` (contrato del `core-api-layer`) y la app puede materializarlos con toast/banner según su severidad.
- Compone con `core-forms` — los componentes `Dropzone` y `FileUploadProgress` (definidos en el companion change `add-dropzone-and-progress-components`) consumen el composable `useFileUpload()` definido acá.
- Compone con `core-auth` — el upload PUT a S3 NO lleva el bearer token de Auth0 (el presigned ya autoriza); el confirm SÍ usa `apiClient` y por ende el token interceptado.

## Notes

- La capability es **storage-agnostic en el contrato**, aunque las implementaciones de referencia asumen S3 (presigned PUT con `fields` opcionales). Si el día de mañana el backend usa GCS o Azure Blob, los apps consumen el mismo contrato — el cambio queda confinado al backend.
- La spec NO contractualiza la **integración con vee-validate** para el field type `file`/`multifile` — eso vive en el companion change que toca `core-forms`.
- La spec NO contractualiza la **UI de progress** (barras, retry buttons, cancel) — esos primitivos viven en `add-dropzone-and-progress-components`.
- La spec NO trata el **resumable upload** (subir un file de 5GB con resume tras pérdida de conexión) — los presigned URLs estándar de S3 no lo soportan; si en el futuro algún módulo (ej: video upload en CLP customer-facing) lo requiere, se abre un change separado para multipart upload S3.
