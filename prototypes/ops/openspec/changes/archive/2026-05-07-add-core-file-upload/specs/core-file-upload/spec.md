## ADDED Requirements

### Requirement: All file uploads MUST follow the presigned-URL three-phase lifecycle

Every file upload SHALL execute three sequential phases: (1) **request** — the client asks the backend for one or more presigned URLs by sending file metadata (filename, content-type, byte size); (2) **upload** — the client `PUT`s the file bytes directly to the storage provider using the returned URL; (3) **confirm** — the client posts the storage-returned identifiers (`key` plus the `ETag` echoed by the storage response) back to the backend so it persists the file metadata against the owning record. Direct multipart upload from the client to the backend is forbidden — the backend is never the bytes-receiving target. The contract is storage-agnostic in shape; the reference implementation assumes S3-compatible presigned PUT semantics.

#### Scenario: Upload completes the three phases in order

- **GIVEN** a module needs to upload a file to a record (e.g., a document attached to a LEX client)
- **WHEN** the upload is initiated through `useFileUpload()`
- **THEN** the composable performs (1) request to the backend's presigned-URL endpoint, (2) `PUT` the file bytes to the returned storage URL, (3) confirm to the backend's confirm endpoint with `key` + `ETag` — and only after phase 3 returns success is the file considered persisted

#### Scenario: Direct multipart upload to the backend is forbidden

- **GIVEN** a developer authors a new upload flow that posts `multipart/form-data` directly to a backend endpoint
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — every upload SHALL go through the three-phase presigned-URL lifecycle

#### Scenario: Phase 3 failure leaves the file in storage but unpersisted

- **GIVEN** phases 1 and 2 succeeded and the client crashes before phase 3 fires
- **WHEN** the file lives in storage at `key` but no metadata record exists in the backend
- **THEN** the file MUST be considered orphan — the backend's storage cleanup job is responsible for sweeping unconfirmed `key`s after the configured TTL; the client SHALL NOT retry phase 3 on a subsequent session because the in-memory upload state is lost

### Requirement: Presigned-URL request and response MUST follow a canonical shape

The request payload SHALL be a JSON object with a `files` array; each entry SHALL include `filename` (string), `content_type` (string, MIME), and `size_bytes` (positive integer). The response payload SHALL be a JSON object with an `uploads` array of equal length and aligned order; each entry SHALL include `url` (string, the presigned PUT target), optional `fields` (object, additional form fields if storage requires POST policy), `key` (string, opaque storage identifier), and `expires_at` (ISO 8601 timestamp). Apps SHALL customize **the path of the endpoint** (e.g., `/document?action=request-presigned-urls` for LEX, `/quote/{id}/attachment` for TRD) but SHALL NOT diverge from the payload shapes — the composable rejects any response that does not match the contracted schema.

#### Scenario: Request payload includes the contracted file metadata

- **GIVEN** a module requests presigned URLs for two files
- **WHEN** the composable issues the POST to the configured endpoint
- **THEN** the body matches `{ files: [{ filename: "...", content_type: "...", size_bytes: N }, ...] }` with one entry per file in the same order the caller provided

#### Scenario: Response with mismatched array length is rejected

- **GIVEN** the client requested 3 presigned URLs but the backend returns `uploads` with 2 entries
- **WHEN** the composable parses the response
- **THEN** the composable throws an `ApiError` with `code: 'PRESIGNED_RESPONSE_INVALID'` and the upload state advances to `error` for all 3 files — no partial upload is attempted

#### Scenario: Apps customize the path but not the payload

- **GIVEN** TRD configures `useFileUpload({ presignEndpoint: ENDPOINTS.attachments.presigned(quoteId) })`
- **WHEN** the composable issues the request
- **THEN** the URL path is the TRD-specific one but the request body is the canonical `{ files: [...] }` shape — divergent custom payload shapes are forbidden

### Requirement: Per-file upload MUST emit progress events and support cancellation

The phase-2 PUT to storage SHALL be issued via `XMLHttpRequest` (NOT `fetch`) so the client receives `progress` events with `loaded` and `total` byte counts, and SHALL accept an `AbortSignal` so the caller can cancel an in-flight upload. The composable SHALL surface progress as a per-file `{ bytesLoaded, bytesTotal, percent }` reactive value. Cancellation triggered via the signal SHALL transition the file's state to `cancelled`, abort the XHR, and free its slot in the concurrency pool so queued files can advance.

#### Scenario: Upload exposes progress as a reactive percent

- **GIVEN** a 10 MB file is being uploaded
- **WHEN** the XHR progress event fires with `loaded=2_500_000, total=10_000_000`
- **THEN** the composable updates that file's reactive state to `{ bytesLoaded: 2_500_000, bytesTotal: 10_000_000, percent: 25 }` and consumers re-render automatically

#### Scenario: AbortSignal cancels the in-flight upload

- **GIVEN** a file is `uploading` at 40% and the user clicks Cancel on its row
- **WHEN** the consumer calls `cancel(fileId)` which triggers the file's `AbortSignal`
- **THEN** the XHR is aborted, the file's state transitions to `cancelled`, no `confirm` is issued for that file, and the freed concurrency slot allows the next queued file to start uploading

#### Scenario: `fetch` is forbidden for the storage PUT

- **GIVEN** a developer attempts to implement the storage upload using `fetch(url, { method: 'PUT', body: file })`
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — `fetch` does not expose upload progress events; XHR is the contracted transport for phase 2

### Requirement: Per-file upload MUST follow a canonical state machine

Every file in an upload batch SHALL transition through this state machine: `idle` → `requesting` → `uploading` → `completed` (terminal success) **or** `error` (re-tryable) **or** `cancelled` (terminal). Transitions are driven by the composable, not by consumers. The composable SHALL preserve the last error and storage `key` when applicable, so a subsequent `retry(fileId)` can re-issue phase 2 (or, when the URL has expired, re-issue phase 1) without losing context. Consumers SHALL NEVER mutate the state directly.

#### Scenario: Successful upload reaches `completed` after confirm

- **GIVEN** a file has finished phase 2 with a 200 response and an ETag header
- **WHEN** phase 3 confirm returns success
- **THEN** the file's state transitions `uploading → completed` and the composable exposes `{ key, etag, confirmedAt }` on the file record

#### Scenario: Upload error transitions to `error` and preserves context

- **GIVEN** a file in `uploading` state receives a 502 response from storage
- **WHEN** the XHR resolves
- **THEN** the file's state transitions to `error`, `lastError` is set to an `ApiError`, the `key` returned by phase 1 is preserved, and `retry(fileId)` is enabled — automatic retry per the retry policy may also fire

#### Scenario: Consumers cannot mutate state directly

- **GIVEN** a consumer attempts `upload.files[0].state = 'completed'` to bypass the lifecycle
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — state transitions are owned exclusively by the composable; consumers interact via `request()`, `upload()`, `cancel()`, `retry()`, `confirm()` actions only

### Requirement: Confirm phase MUST verify the storage ETag

The phase-3 confirm payload SHALL include for each file the `key` returned by phase 1 plus the `etag` echoed in the storage response's `ETag` header (without surrounding quotes). The backend uses the ETag to verify that the bytes uploaded match the bytes the client intended (rejecting mid-flight tampering). If the storage response did not include an `ETag` header for any file, the composable SHALL transition that file to `error` with `code: 'ETAG_MISSING'` and SHALL NOT issue confirm for that file.

#### Scenario: Confirm payload includes ETag per file

- **GIVEN** two files completed phase 2 with ETags `"abc"` and `"xyz"` respectively
- **WHEN** the composable issues phase 3 confirm
- **THEN** the body matches `{ files: [{ key: "...", etag: "abc" }, { key: "...", etag: "xyz" }] }`

#### Scenario: Missing ETag header blocks confirm for that file

- **GIVEN** a file's PUT response did NOT include an `ETag` header
- **WHEN** the composable evaluates phase 3 readiness for that file
- **THEN** it transitions the file's state to `error` with `code: 'ETAG_MISSING'`, omits the file from the confirm payload, and other files in the batch proceed to confirm normally

### Requirement: Retry policy MUST distinguish recoverable from permanent failures

Failures during the storage PUT or the confirm POST SHALL be categorized: 5xx responses and network errors are **recoverable** and SHALL be retried automatically with exponential backoff (initial delay 1 second, factor 2, jitter ±20%, max 3 retries); 4xx responses are **permanent** with one exception explicitly handled: 403 from the storage URL means the presigned URL has **expired**, and the composable SHALL re-issue phase 1 for that file before retrying phase 2 (counted as a fresh attempt, not a retry of the prior URL). Other 4xx responses (400, 401, 413, 415) SHALL transition the file to `error` and SHALL NOT auto-retry — manual `retry()` is still permitted but will re-issue phase 1.

#### Scenario: 502 triggers exponential backoff retry

- **GIVEN** a file's PUT returns 502
- **WHEN** the retry policy evaluates the failure
- **THEN** the composable schedules a retry after ~1 second (with jitter), and on second failure ~2 seconds, on third ~4 seconds, after which the file transitions to `error` permanently

#### Scenario: 403 on storage triggers presigned URL refresh

- **GIVEN** a file's PUT returns 403 because the presigned URL expired between request and upload
- **WHEN** the retry policy evaluates the failure
- **THEN** the composable issues a fresh phase-1 request for that single file and retries phase 2 with the new URL — this is counted as a fresh attempt, not a retry of the expired URL, and resets the retry counter for that file

#### Scenario: 413 (file too large) does not retry

- **GIVEN** a file's PUT returns 413 because the storage policy rejected the size
- **WHEN** the retry policy evaluates
- **THEN** no retry is attempted, the file transitions to `error` with `code: 'FILE_TOO_LARGE'`, and the consumer surfaces the error to the user

### Requirement: Batch upload MUST orchestrate files in parallel with bounded concurrency

When a batch of N files is uploaded, the composable SHALL execute phase 2 with a configurable concurrency cap (default `3`). Files beyond the cap wait in a queue; as a slot frees (via completion, error, or cancellation) the next queued file advances to `uploading`. Failure of one file SHALL NOT abort the others — each file's lifecycle is independent. Phase 1 (request) is a single batched call for all N files; phase 3 (confirm) is a single batched call for the subset that reached `completed`-after-PUT (i.e., phase 3 batches over successfully-uploaded files only, preserving the batch-vs-individual distinction).

#### Scenario: 10 files upload with concurrency cap 3

- **GIVEN** the consumer calls `upload([f1, f2, ..., f10])` with default concurrency
- **WHEN** the orchestrator runs
- **THEN** files f1, f2, f3 transition to `uploading` simultaneously; as f1 completes its PUT, f4 advances to `uploading`; the upload pipeline continues until all 10 are in a terminal state — at most 3 PUTs are in flight at any instant

#### Scenario: One file's failure does not abort the batch

- **GIVEN** a batch of 5 files where f3 receives a 413 (permanent failure)
- **WHEN** the orchestrator processes f3's error
- **THEN** f3 transitions to `error`, the slot is freed, queued files continue to upload, and confirm is eventually issued for the 4 successful files (f3 is excluded from confirm)

#### Scenario: Concurrency cap is configurable per call

- **GIVEN** a use case requires lower bandwidth (e.g., mobile network) and the consumer calls `upload(files, { concurrency: 1 })`
- **WHEN** the orchestrator runs
- **THEN** files upload strictly sequentially — at most one PUT is in flight at any instant

### Requirement: Batch import MUST poll for an asynchronous job until terminal state

When the upload feeds a server-side asynchronous job (canonical example: SWIFT MT940 parsing in OPS), the contract extends with a fourth phase: (4) **job lifecycle** — instead of the standard confirm, the backend creates an `import_job` and returns a `job_id`, and the client SHALL poll `GET /jobs/{job_id}` until the job reaches a terminal state (`succeeded` | `failed` | `partial`). The polling cadence SHALL be exponential-backoff bounded (initial 2 seconds, factor 1.5, jitter ±20%, capped at 30 seconds between polls). On `succeeded` or `partial`, the response payload SHALL include a `result` object the consumer renders (typically a preview/result table); on `failed`, the response SHALL include an `error` object with `code` and `message`.

#### Scenario: Batch import upload creates a job and the client polls

- **GIVEN** OPS uses `useFileUpload({ mode: 'batch-import', jobsEndpoint: ENDPOINTS.swift.jobStatus })` to upload a SWIFT file
- **WHEN** phases 1 and 2 succeed and phase 3 returns `{ job_id: "abc-123", status: "queued" }`
- **THEN** the composable starts polling `GET /jobs/abc-123` with exponential-backoff cadence; UI exposes `jobStatus` reactive state showing `queued | running | succeeded | partial | failed`

#### Scenario: Job reaches succeeded and the consumer renders the result

- **GIVEN** a batch import job is being polled and the latest poll returns `{ status: 'succeeded', result: { rows: [...], summary: {...} } }`
- **WHEN** the composable processes the response
- **THEN** polling stops, `jobStatus` transitions to `succeeded`, and the `result` payload is exposed on the upload record so the consumer renders the result table

#### Scenario: Job reaches failed and surfaces the error

- **GIVEN** a batch import job poll returns `{ status: 'failed', error: { code: 'INVALID_MT940', message: 'Block 4 missing tag :20:' } }`
- **WHEN** the composable processes the response
- **THEN** polling stops, `jobStatus` transitions to `failed`, the `error` object is exposed for the consumer, and the original storage `key` is preserved for diagnostic re-download

#### Scenario: Polling honors exponential backoff with cap

- **GIVEN** a job has been polling for several minutes
- **WHEN** consecutive polls return `{ status: 'running' }`
- **THEN** the inter-poll delay grows from ~2s → ~3s → ~4.5s → ~6.75s → … capped at 30 seconds — the client never floods the jobs endpoint

### Requirement: Composable `useFileUpload` MUST be the only consumer entry point

Modules SHALL consume the file-upload contract exclusively via the `useFileUpload(options)` composable. Direct invocation of `apiClient` for the three phases (or four for batch-import) is forbidden — the composable owns the orchestration, the state machine, the retry policy, and the cancellation lifecycle. The composable SHALL accept options for endpoint paths (`presignEndpoint`, `confirmEndpoint`, optional `jobsEndpoint`), `mode` (`'standard' | 'batch-import'`, default `'standard'`), `concurrency` (default `3`), `retry.maxAttempts` (default `3`), and validation hints (`accept` MIME list, `maxSize` bytes, `maxFiles`). It SHALL expose `files: Ref<UploadFile[]>`, `isUploading: ComputedRef<boolean>`, `progressTotal: ComputedRef<number>`, `jobStatus?: Ref<JobStatus>`, plus actions `start(rawFiles: File[])`, `cancel(fileId)`, `retry(fileId)`, and `reset()`.

#### Scenario: Module consumes only the composable

- **GIVEN** a developer is wiring a new upload flow in a LEX module
- **WHEN** the implementation is authored
- **THEN** it imports `useFileUpload` from `@/composables/useFileUpload` and calls `start(rawFiles)` — direct calls to `apiClient.post(presignedEndpoint, …)` or hand-rolled XHR for the storage PUT are forbidden

#### Scenario: Composable enforces validation hints before phase 1

- **GIVEN** a `useFileUpload({ accept: ['image/*'], maxSize: 5_000_000 })` and a user drops a 10 MB PDF
- **WHEN** `start([file])` is called
- **THEN** the composable rejects the file with state `error` and `code: 'VALIDATION'` BEFORE issuing phase 1 — invalid files never consume a presigned URL

#### Scenario: Reset clears all state

- **GIVEN** an upload batch finished (some `completed`, some `error`)
- **WHEN** the consumer calls `reset()`
- **THEN** `files` becomes empty, `isUploading` is `false`, `progressTotal` is `0`, and `jobStatus` (if applicable) is cleared — the composable is ready for a new batch
