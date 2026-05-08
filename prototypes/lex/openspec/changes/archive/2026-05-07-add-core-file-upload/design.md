# Design — add-core-file-upload

## Context

This design captures the rationale behind the new `core-file-upload` capability and the single `ADDED Requirement` to `core-api-layer`. The capability formalises a pattern that all three target migrations (LEX documents, TRD attachments, OPS SWIFT batch import) implement locally today, each with subtle divergences. The design choices below explain why the contract is shaped the way it is, what alternatives were considered and rejected, and how the contract composes with neighbouring capabilities.

The end goal is a **single ingress for files into the financial-core** so that any future module that needs to upload a file consumes a contracted lifecycle rather than reinventing the request → upload → confirm flow.

---

## Decision 1 — Three-phase lifecycle (request → upload → confirm) is the only contracted pathway

### The question

Three viable patterns existed for sending files from a browser to backend storage:

1. **Multipart upload to backend.** The browser POSTs `multipart/form-data` to a backend endpoint, the backend buffers the file, validates, and writes to storage. Simple but couples the backend to throughput, memory, and request-timeout limits — a 100 MB file blocks a backend worker for the full upload duration.
2. **Direct upload via presigned URLs.** The backend signs a temporary URL granting the client permission to PUT directly to storage. The client uploads to storage, then notifies the backend so it persists metadata. Decouples backend from throughput; the standard for S3 / GCS / Azure Blob.
3. **Resumable upload (e.g., S3 multipart upload, GCS resumable session).** The client divides the file into parts and uploads them independently, with resume support if the connection drops. Heavier in protocol; appropriate for very large files (~ > 100 MB) and unstable networks.

### The decision

The contract mandates **pattern 2 (presigned-URL three-phase lifecycle)** as the only contracted upload pathway. Pattern 1 is forbidden; pattern 3 is out of scope for v1 (revisit if a CLP customer-facing module ever needs to upload videos or comparable large blobs).

The three phases are explicit:

1. **Phase 1 — request.** `POST {presignEndpoint}` with `{ files: [{ filename, content_type, size_bytes }, ...] }`. Returns `{ uploads: [{ url, fields?, key, expires_at }, ...] }`.
2. **Phase 2 — upload.** `PUT {url}` with the file bytes (or `POST {url}` with `fields` + bytes when storage requires POST policy). Storage returns 200 with `ETag` header.
3. **Phase 3 — confirm.** `POST {confirmEndpoint}` with `{ files: [{ key, etag }, ...] }`. Backend persists the file metadata against the owning record.

### Alternatives considered

- **Pattern 1 (multipart to backend) only.** Rejected. Backend becomes a throughput bottleneck. Every file blocks a worker for the upload duration. 100 MB files at slow upstreams = minutes of worker time. Storage is the right place to absorb bytes — pattern 2 outsources that.
- **Pattern 1 alongside pattern 2 ("either is fine").** Rejected. Two patterns means two error surfaces, two retry policies, two progress mechanisms. The whole point of the template is one contract.
- **Pattern 3 (resumable) as default.** Rejected for v1. Backoffice files are typically PDFs / spreadsheets / SWIFT files in the < 10 MB range. Resumable adds protocol complexity (parts, manifests, abandon detection) that pays off only at large sizes or unstable networks. If we later contract pattern 3, it lives as a separate `core-resumable-upload` capability rather than retrofitting this one.

### Failure modes the rule prevents

- A developer adds a `multipart/form-data` upload to a backend endpoint → spec violation; no exception.
- A developer skips phase 3 (uploads to S3 and assumes the backend will pick it up) → orphan file in storage; the backend's storage cleanup job sweeps unconfirmed `key`s after TTL.
- A developer treats the storage URL as a stable endpoint (e.g., caches it across sessions) → URL expires; phase 1 must be re-issued. The contract makes this explicit (`expires_at` is part of the response shape).

---

## Decision 2 — XHR (not fetch) for the storage PUT

### The question

The Fetch API is the modern transport everyone reaches for in new code. But it has one critical gap relevant here: **it does not expose upload-progress events**. `XMLHttpRequest`, the older API, exposes `xhr.upload.onprogress` with `loaded` and `total` byte counts.

### The decision

**XHR is the contracted transport for phase 2 (storage PUT).** The composable's internal implementation uses XHR; consumers never see the difference. Phase 1 and phase 3 use the standard `apiClient` (axios over fetch / XHR — axios chooses).

### Alternatives considered

- **Fetch with `ReadableStream` and a custom progress wrapper.** Considered. The Streams-based pattern (`ReadableStream` reading the file in chunks, emitting progress on each chunk) works but is significantly more complex than `xhr.upload.onprogress`, and browser support for upload streams is uneven (Safari historically lagged). The simplicity of XHR wins.
- **No progress events.** Rejected. UX requirement: users uploading multi-MB files need visible feedback. A spinner without progress on a 50 MB upload over a slow connection is unacceptable.
- **Server-Sent Events for progress.** Rejected. The browser already knows the bytes it's sending — round-tripping that information through the server is wasteful and lossy.

### Failure modes the rule prevents

- A developer reaches for `fetch(url, { method: 'PUT', body: file })` because it's the modern API → no progress, broken UX. Spec rejects.
- A developer rolls a custom Streams-based progress reporter and ships it inconsistent across browsers → spec rejects; XHR is the contracted path.

---

## Decision 3 — Two modes: `standard` and `batch-import`

### The question

LEX documents and TRD attachments share the same end-state: file is in storage, metadata row is in the database, owning record links to it. Phase 3 confirm finalises the metadata persistence and the upload is done.

OPS SWIFT import is structurally different: phase 3 doesn't persist a file row — it spawns an **asynchronous job** that parses the file's content and either succeeds, fails, or partially completes. The client needs to poll until the job is in a terminal state. This is conceptually a fourth phase, not a variant of phase 3.

Should the contract encode this difference, and how?

### The decision

The composable accepts a `mode` option:

- `mode: 'standard'` (default) — phase 3 confirm is the terminal phase; on 200 the upload is `completed`.
- `mode: 'batch-import'` — phase 3 confirm returns `{ job_id, status: 'queued' }` and the composable transitions into a polling loop on `jobsEndpoint` until terminal state. Reactive `jobStatus` is exposed; the consumer renders the result table when `succeeded` or `partial`.

Both modes share phases 1, 2, the state machine, the retry policy, the cancellation contract, and the bounded concurrency. Only the meaning of phase 3 and the optional polling phase differ.

### Alternatives considered

- **Two separate composables (`useFileUpload` and `useBatchImport`).** Considered. Rejected because it duplicates phases 1, 2, and the orchestration. Code drift between the two would be painful and inconsistencies would surface in the migration of OPS (which uses both: file-attached audit logs alongside SWIFT imports).
- **Always poll, even in standard mode (just always returns `succeeded` instantly for non-job uses).** Rejected. The polling overhead is wasteful and the API contract should be honest about whether the resource is synchronous-confirm or asynchronous-job.
- **Job lifecycle as a separate concern owned by a hypothetical `core-job-runner` capability.** Considered. Rejected for v1 because the only known consumer of jobs in the financial-core today is batch-import. Extracting a generic job-runner capability is premature. If, in the future, OPS or any app accumulates more async-job patterns (export jobs, reconciliation jobs, recompute jobs), the polling lifecycle moves out into `core-job-runner` and `core-file-upload` keeps only the file phases — but that's a future change.

### Failure modes the rule prevents

- A developer implements SWIFT import as `mode: 'standard'` and the UI never shows the job result → spec violation; SWIFT consumers MUST use `mode: 'batch-import'`.
- A developer implements LEX documents as `mode: 'batch-import'` to "future-proof" → spec violation; standard mode is correct because there is no asynchronous job and polling adds noise.

---

## Decision 4 — Retry policy: 5xx and network = recoverable; 4xx = permanent (with 403 exception)

### The question

The `core-api-layer` baseline specifies a retry policy for `@tanstack/vue-query` queries: skip 401/403/404; retry 5xx and network up to N times. That policy applies to **read queries**, not to **uploads**. Uploads have a different cost profile (large bytes already transmitted) and different failure semantics (presigned URL expiration is a real and recoverable case that masks as a permanent 403).

### The decision

A separate retry policy lives inside `useFileUpload`:

- **Recoverable (auto-retry with exponential backoff):** 5xx responses and network failures during phase 2 or phase 3. Initial delay 1 second, factor 2, jitter ±20%, max 3 retries.
- **Permanent (no auto-retry; user-triggered retry permitted):** 400, 401, 413, 415 — these are protocol-level rejections that won't fix themselves on a re-attempt of the same URL.
- **Special case (auto-retry with phase 1 refresh):** 403 on the storage PUT means the presigned URL has expired. The composable issues a fresh phase 1 for that single file and retries phase 2 with the new URL. Counted as a fresh attempt, not a retry of the expired URL.

### Alternatives considered

- **Reuse the `core-api-layer` query policy.** Rejected. That policy explicitly skips 403, which is wrong for uploads (403 = expired URL = recoverable via re-presign).
- **No auto-retry, only user-triggered.** Considered. Rejected because transient network errors (mid-upload disconnect on a flaky cell connection) are common and re-clicking 10 retry buttons is bad UX.
- **Always re-issue phase 1 on any failure.** Rejected. Phase 1 has a cost (presigned-URL signing is server work, and over-issuing wastes URLs). Re-presign only when the URL itself is the failure cause.

### Failure modes the rule prevents

- A developer turns off auto-retry to "be safe" → user has to click retry on every flaky network → bad UX. Spec mandates auto-retry for recoverable categories.
- A developer treats 403 as permanent → uploads silently fail when URLs expire mid-transfer. Spec mandates phase-1 refresh on 403.
- A developer auto-retries 413 (file too large) → infinite loop. Spec mandates permanent classification for 413.

---

## Decision 5 — Bounded concurrency (default 3)

### The question

When uploading 10 files, what's the right parallelism? Sequential is slow; full-fanout (all 10 in flight) saturates the user's upstream and wastes their bandwidth budget on TLS handshakes if the connection has limited concurrent streams.

### The decision

**Default concurrency = 3.** Configurable per call.

### Alternatives considered

- **Sequential (concurrency = 1).** Rejected for default. A user uploading 10 small documents waits unnecessarily long.
- **Fully parallel (concurrency = N).** Rejected for default. Saturates upstream, makes per-file progress confusing (10 bars at 5% is psychologically worse than 3 bars at 60%), and risks browser per-host connection limits.
- **Adaptive (start at 1, ramp up).** Considered. Rejected for v1 — added complexity for marginal benefit. 3 is a reasonable middle ground that matches typical browser per-host concurrency anyway.

The configurability lets specific use cases override (mobile = 1, bulk admin upload = 5, etc.) without affecting the default.

---

## Decision 6 — Composable as the only entry point

### The question

Should modules be allowed to invoke `apiClient` directly for the three phases, or must they go through `useFileUpload()`?

### The decision

**`useFileUpload()` is the only consumer entry point.** Direct `apiClient` calls for the upload phases are forbidden. The composable owns the orchestration, the state machine, the retry policy, and the cancellation lifecycle.

### Why this matters

The state machine, retry, concurrency, and cancellation are not pieces a module developer should re-implement. Each is subtle and the cost of a bug (orphaned files, double-charges, lost user data) is high. Concentrating the contract in the composable means: one place to audit, one place to fix bugs, one place to extend.

The composable accepts options for everything an app needs to differ on (endpoint paths, mode, concurrency, validation hints). If an app finds it cannot express its use case via options, that is a signal to extend the composable, not to bypass it.

### Failure modes the rule prevents

- A developer writes a quick "I just need to upload one file, the composable seems heavy" and reinvents phase 1+2+3 → spec violation. The composable handles single-file upload identically to multi-file (`start([oneFile])`).
- A developer adds business logic between the phases (e.g., "show a confirmation modal between phase 2 and phase 3") → spec violation. Inter-phase orchestration belongs to the composable; UX between phases is achieved via reactive state observation (`watch(files, ...)`), not by interleaving.

---

## Cross-capability composition

| Neighbor | What it owns | What `core-file-upload` owns |
|---|---|---|
| `core-api-layer` | `apiClient` axios instance, `setAccessTokenGetter`, `ApiError`, query retry policy, `ENDPOINTS` registry | The triad keys (`presignedUrls`, `confirm`, `createJob?`, `jobStatus?`) inside resource groups; the upload phases use `apiClient` for phases 1 and 3 |
| `core-error-handling` | Toasts, banners, `EmptyState`, `Skeleton` | Surfacing upload errors via `ApiError` — the consumer chooses toast vs. banner per its UX |
| `core-forms` | Field types, validation, vee-validate + zod integration | Companion change `add-dropzone-and-progress-components` adds `file`/`multifile` field types; this change does NOT touch core-forms directly |
| `core-auth` | Auth0 integration, `setAccessTokenGetter`, capabilities composable | Phase 2 (storage PUT) runs WITHOUT the bearer token — the presigned URL already authorises; phase 1 and phase 3 go through `apiClient` and inherit the token |

The clearest boundary lives between this capability and `core-api-layer`: `core-api-layer` owns the **transport** (how requests carry tokens, how errors normalize, how queries retry), while `core-file-upload` owns the **lifecycle** (the three phases, the state machine, the upload-specific retry policy that differs from the query policy).

---

## Open questions

1. **Storage provider portability.** The contract is shape-agnostic but the reference implementation assumes S3-compatible presigned PUT (URL + optional `fields` for POST policy). If the backend ever swaps to GCS or Azure Blob, the optional `fields` and the `ETag` semantics need a closer look. Decision deferred — current contract handles S3 cleanly and adapts to the others with backend-side adjustments.
2. **Resumable uploads.** Out of scope for v1. If a future module (likely CLP customer-facing for video uploads, or a backoffice module that ingests very large reconciliation files) needs resumability, a separate `core-resumable-upload` capability is opened. The two coexist.
3. **Encryption-at-rest with client-side keys.** Some compliance contexts demand the client encrypt before upload (so storage never sees plaintext). Out of scope for v1. If LEX or any module ever needs it, the contract extends with an optional pre-PUT encryption hook.
4. **Virus scanning lag.** Some backends scan uploaded files asynchronously after confirm and surface the "ready for use" state on a delay. The current contract treats `completed` as terminal; if a use case needs a post-confirm "scan succeeded" gate, the `mode: 'batch-import'` shape is the right model — the scan becomes a job. Document this explicitly when the use case appears.
5. **Composable name.** `useFileUpload` reads slightly off when used for batch-import (which is broader than "file upload"). Considered `useFileTransfer`, `useUploadJob`, `useFileLifecycle`. Settled on `useFileUpload` because (a) batch-import is the minority case and (b) the alternative names hide the file-upload origin. Revisit if batch-import becomes the dominant mode.
6. **Telemetry hooks.** The composable could expose lifecycle events (started, phase-completed, retry-attempted, finished) for observability. Not in v1 — apps can `watch()` reactive state today. If telemetry becomes structured (e.g., feeding a metrics dashboard), a follow-up change adds typed events.
