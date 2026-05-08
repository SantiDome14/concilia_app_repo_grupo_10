import { ref, computed, type Ref, type ComputedRef } from 'vue';
import { ZodError } from 'zod';
import { apiClient } from '@/api/client';
import { ApiError } from '@/types/api';
import {
  importJobCreatedSchema,
  jobStatusResponseSchema,
  presignedResponseSchema,
  type ConfirmFileEntry,
  type JobStatus,
  type JobStatusResponse,
  type PresignedFileRequest,
  type PresignedResponse,
  type PresignedUpload,
  type ResolvedUseFileUploadOptions,
  type UploadFile,
  type UploadState,
  type UseFileUploadOptions,
} from '@/types/file-upload';
import { xhrUpload, XhrUploadError } from '@/lib/xhr-upload';

// ════════════════════════════════════════════════════════════════════
// useFileUpload — canonical file upload composable
// ────────────────────────────────────────────────────────────────────
// Implements the contract defined in the OpenSpec capability
// `core-file-upload`. Phases:
//   1. request — POST presignEndpoint, get { uploads: [...] }
//   2. upload — XHR PUT/POST per file with progress + abort
//   3. confirm — POST confirmEndpoint with [{ key, etag }]
//   4. (batch-import only) poll jobsEndpoint until terminal state
//
// Modules MUST consume only this composable; direct apiClient calls
// for these phases are forbidden.
// ════════════════════════════════════════════════════════════════════

interface UploadOrchestratorContext {
  files: Ref<UploadFile[]>;
  jobStatus: Ref<JobStatus | null>;
  jobResult: Ref<unknown | null>;
  jobError: Ref<{ code: string; message: string } | null>;
  resolved: ResolvedUseFileUploadOptions;
  abortControllers: Map<string, AbortController>;
}

let _idCounter = 0;
function makeId(): string {
  _idCounter += 1;
  return `f-${Date.now()}-${_idCounter}`;
}

function resolveOptions(options: UseFileUploadOptions): ResolvedUseFileUploadOptions {
  return {
    presignEndpoint: options.presignEndpoint,
    confirmEndpoint: options.confirmEndpoint,
    jobsEndpoint: options.jobsEndpoint ?? null,
    mode: options.mode ?? 'standard',
    concurrency: Math.max(1, options.concurrency ?? 3),
    queueCap: options.queueCap ?? Number.POSITIVE_INFINITY,
    accept: options.accept ?? null,
    maxSize: options.maxSize ?? null,
    maxFiles: options.maxFiles ?? null,
    retry: {
      maxAttempts: options.retry?.maxAttempts ?? 3,
      initialDelayMs: options.retry?.initialDelayMs ?? 1000,
      factor: options.retry?.factor ?? 2,
      jitter: options.retry?.jitter ?? 0.2,
    },
    poll: {
      initialDelayMs: options.poll?.initialDelayMs ?? 2000,
      factor: options.poll?.factor ?? 1.5,
      jitter: options.poll?.jitter ?? 0.2,
      capMs: options.poll?.capMs ?? 30_000,
    },
  };
}

function makeFileRecord(rawFile: File): UploadFile {
  return {
    id: makeId(),
    file: rawFile,
    filename: rawFile.name,
    sizeBytes: rawFile.size,
    contentType: rawFile.type || 'application/octet-stream',
    state: 'idle',
    bytesLoaded: 0,
    bytesTotal: rawFile.size,
    percent: 0,
    key: null,
    etag: null,
    confirmedAt: null,
    lastError: null,
    retryCount: 0,
  };
}

/** Validate a single file against `accept` / `maxSize`. Throws on rejection. */
function validateClientSide(file: File, opts: ResolvedUseFileUploadOptions): void {
  if (opts.accept && opts.accept.length > 0) {
    const matches = opts.accept.some((pattern) => {
      if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -1); // 'image/' from 'image/*'
        return file.type.startsWith(prefix);
      }
      return file.type === pattern;
    });
    if (!matches) {
      throw new ApiError(
        `Tipo no permitido (${file.type || 'desconocido'})`,
        0,
        'VALIDATION_TYPE',
      );
    }
  }
  if (opts.maxSize !== null && file.size > opts.maxSize) {
    throw new ApiError(`Excede ${opts.maxSize} bytes`, 0, 'VALIDATION_SIZE');
  }
}

/** Sleep with backoff and jitter. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withJitter(baseMs: number, jitter: number): number {
  // ±jitter fraction.
  const variance = baseMs * jitter;
  return baseMs + (Math.random() * 2 - 1) * variance;
}

/** Decide whether a phase-2 (storage upload) failure is recoverable. */
function classifyXhrFailure(error: XhrUploadError): 'recoverable' | 'expired' | 'permanent' {
  if (error.kind === 'network' || error.kind === 'timeout') return 'recoverable';
  if (error.kind === 'http') {
    if (error.status >= 500) return 'recoverable';
    if (error.status === 403) return 'expired'; // presigned URL expired
    if (error.status === 413) return 'permanent';
    return 'permanent';
  }
  // 'cancelled' is handled before classification — the file goes to 'cancelled'.
  return 'permanent';
}

/** Map an XhrUploadError to an ApiError for storage in `lastError`. */
function toApiError(error: XhrUploadError): ApiError {
  const code =
    error.kind === 'network'
      ? 'NETWORK'
      : error.kind === 'timeout'
        ? 'TIMEOUT'
        : error.status === 403
          ? 'PRESIGNED_URL_EXPIRED'
          : error.status === 413
            ? 'FILE_TOO_LARGE'
            : `HTTP_${error.status}`;
  return new ApiError(error.message, error.status, code);
}

/** Mutate a file record in place — single source of state transitions. */
function transitionFile(file: UploadFile, patch: Partial<UploadFile>): void {
  Object.assign(file, patch);
}

/** Phase 1: request presigned URLs for an entire batch. */
async function requestPresigned(
  files: UploadFile[],
  opts: ResolvedUseFileUploadOptions,
): Promise<PresignedUpload[]> {
  const payload: { files: PresignedFileRequest[] } = {
    files: files.map((f) => ({
      filename: f.filename,
      content_type: f.contentType,
      size_bytes: f.sizeBytes,
    })),
  };
  const response = await apiClient.post(opts.presignEndpoint, payload);

  // Validate the response shape with Zod. Mismatches are explicit failures.
  let parsed: PresignedResponse;
  try {
    parsed = presignedResponseSchema.parse(response.data);
  } catch (e) {
    throw new ApiError(
      'Presigned URL response did not match the canonical shape',
      response.status ?? 0,
      'PRESIGNED_RESPONSE_INVALID',
      e instanceof ZodError ? e.issues : undefined,
    );
  }

  if (parsed.uploads.length !== files.length) {
    throw new ApiError(
      `Expected ${files.length} presigned URLs, received ${parsed.uploads.length}`,
      response.status ?? 0,
      'PRESIGNED_RESPONSE_INVALID',
    );
  }

  return parsed.uploads.map((u) => ({
    url: u.url,
    fields: u.fields ?? null,
    key: u.key,
    expires_at: u.expires_at,
  }));
}

/** Phase 1 (single-file refresh) — used when a presigned URL expired mid-flight. */
async function requestSinglePresigned(
  file: UploadFile,
  opts: ResolvedUseFileUploadOptions,
): Promise<PresignedUpload> {
  const [refreshed] = await requestPresigned([file], opts);
  if (!refreshed) {
    throw new ApiError(
      'Refreshed presigned URL request returned empty list',
      0,
      'PRESIGNED_RESPONSE_INVALID',
    );
  }
  return refreshed;
}

/** Phase 2: upload a single file. Honors retry policy on recoverable failures. */
async function uploadOne(
  file: UploadFile,
  presigned: PresignedUpload,
  ctx: UploadOrchestratorContext,
): Promise<void> {
  const ac = new AbortController();
  ctx.abortControllers.set(file.id, ac);

  let attempt = 0;
  let activePresigned = presigned;

  // Reset retry counter for this PUT pass.
  transitionFile(file, { retryCount: 0, lastError: null });

  while (true) {
    if (ac.signal.aborted) {
      transitionFile(file, { state: 'cancelled' });
      ctx.abortControllers.delete(file.id);
      return;
    }

    try {
      const result = await xhrUpload({
        url: activePresigned.url,
        file: file.file,
        fields: activePresigned.fields,
        headers: { 'Content-Type': file.contentType },
        signal: ac.signal,
        onProgress: (loaded, total) => {
          const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
          transitionFile(file, { bytesLoaded: loaded, bytesTotal: total, percent });
        },
      });

      if (!result.etag) {
        // ETag missing — phase 3 cannot verify this file. Permanent.
        transitionFile(file, {
          state: 'error',
          lastError: new ApiError('Storage did not return an ETag header', 0, 'ETAG_MISSING'),
        });
        ctx.abortControllers.delete(file.id);
        return;
      }

      transitionFile(file, {
        key: activePresigned.key,
        etag: result.etag,
        bytesLoaded: file.sizeBytes,
        bytesTotal: file.sizeBytes,
        percent: 100,
      });
      ctx.abortControllers.delete(file.id);
      return;
    } catch (err) {
      if (err instanceof XhrUploadError) {
        if (err.kind === 'cancelled') {
          transitionFile(file, { state: 'cancelled' });
          ctx.abortControllers.delete(file.id);
          return;
        }
        const classification = classifyXhrFailure(err);
        const apiErr = toApiError(err);
        transitionFile(file, { lastError: apiErr });

        if (classification === 'expired') {
          // Refresh the presigned URL once; reset attempt counter.
          try {
            activePresigned = await requestSinglePresigned(file, ctx.resolved);
            attempt = 0;
            transitionFile(file, { retryCount: 0 });
            continue;
          } catch (refreshErr) {
            transitionFile(file, {
              state: 'error',
              lastError:
                refreshErr instanceof ApiError
                  ? refreshErr
                  : new ApiError(String(refreshErr), 0, 'PRESIGNED_REFRESH_FAILED'),
            });
            ctx.abortControllers.delete(file.id);
            return;
          }
        }

        if (classification === 'recoverable') {
          attempt += 1;
          transitionFile(file, { retryCount: attempt });
          if (attempt >= ctx.resolved.retry.maxAttempts) {
            transitionFile(file, { state: 'error' });
            ctx.abortControllers.delete(file.id);
            return;
          }
          const base =
            ctx.resolved.retry.initialDelayMs *
            Math.pow(ctx.resolved.retry.factor, attempt - 1);
          await delay(withJitter(base, ctx.resolved.retry.jitter));
          continue;
        }

        // Permanent — stop.
        transitionFile(file, { state: 'error' });
        ctx.abortControllers.delete(file.id);
        return;
      }
      // Unknown error type — treat as permanent.
      transitionFile(file, {
        state: 'error',
        lastError:
          err instanceof ApiError
            ? err
            : new ApiError(err instanceof Error ? err.message : String(err), 0, 'UNKNOWN'),
      });
      ctx.abortControllers.delete(file.id);
      return;
    }
  }
}

/** Drive phase 2 with bounded concurrency. */
async function runPhase2(
  files: UploadFile[],
  presignedList: PresignedUpload[],
  ctx: UploadOrchestratorContext,
): Promise<void> {
  const queue: { file: UploadFile; presigned: PresignedUpload }[] = files.map((f, i) => {
    const presigned = presignedList[i];
    if (!presigned) {
      throw new ApiError('Presigned URL list misaligned', 0, 'PRESIGNED_RESPONSE_INVALID');
    }
    return { file: f, presigned };
  });

  const concurrency = ctx.resolved.concurrency;

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) return;
      transitionFile(next.file, { state: 'uploading' });
      await uploadOne(next.file, next.presigned, ctx);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, () => worker());
  await Promise.all(workers);
}

/** Phase 3: confirm upload — standard mode (no job polling). */
async function runPhase3Standard(
  successful: UploadFile[],
  ctx: UploadOrchestratorContext,
): Promise<void> {
  if (successful.length === 0) return;
  const payload: { files: ConfirmFileEntry[] } = {
    files: successful.map((f) => ({ key: f.key as string, etag: f.etag as string })),
  };
  await apiClient.post(ctx.resolved.confirmEndpoint, payload);
  const now = new Date().toISOString();
  for (const f of successful) {
    transitionFile(f, { state: 'completed', confirmedAt: now });
  }
}

/** Phase 3 (batch-import): receive job_id and start polling. */
async function runPhase3BatchImport(
  successful: UploadFile[],
  ctx: UploadOrchestratorContext,
): Promise<void> {
  if (successful.length === 0) return;
  const payload: { files: ConfirmFileEntry[] } = {
    files: successful.map((f) => ({ key: f.key as string, etag: f.etag as string })),
  };
  const response = await apiClient.post(ctx.resolved.confirmEndpoint, payload);

  let jobCreated;
  try {
    jobCreated = importJobCreatedSchema.parse(response.data);
  } catch {
    throw new ApiError(
      'Batch-import confirm response did not include a valid job_id',
      response.status ?? 0,
      'IMPORT_JOB_RESPONSE_INVALID',
    );
  }

  ctx.jobStatus.value = jobCreated.status;
  await pollJob(jobCreated.job_id, successful, ctx);
}

/** Poll a job until it reaches a terminal state. */
async function pollJob(
  jobId: string,
  files: UploadFile[],
  ctx: UploadOrchestratorContext,
): Promise<void> {
  const { initialDelayMs, factor, jitter, capMs } = ctx.resolved.poll;
  const jobsEndpoint = ctx.resolved.jobsEndpoint;
  if (!jobsEndpoint) {
    throw new ApiError(
      'Batch-import mode requires a jobsEndpoint option',
      0,
      'JOBS_ENDPOINT_MISSING',
    );
  }

  let pollIndex = 0;
  while (true) {
    const baseDelay = Math.min(initialDelayMs * Math.pow(factor, pollIndex), capMs);
    await delay(withJitter(baseDelay, jitter));
    pollIndex += 1;

    const response = await apiClient.get(jobsEndpoint(jobId));
    let parsed: JobStatusResponse;
    try {
      parsed = jobStatusResponseSchema.parse(response.data);
    } catch {
      throw new ApiError(
        'Job status response did not match the canonical shape',
        response.status ?? 0,
        'JOB_STATUS_RESPONSE_INVALID',
      );
    }

    ctx.jobStatus.value = parsed.status;
    if (parsed.status === 'queued' || parsed.status === 'running') continue;

    // Terminal state.
    if (parsed.status === 'succeeded' || parsed.status === 'partial') {
      ctx.jobResult.value = parsed.result ?? null;
      const now = new Date().toISOString();
      for (const f of files) {
        transitionFile(f, { state: 'completed', confirmedAt: now });
      }
      return;
    }
    // failed
    ctx.jobError.value = parsed.error ?? { code: 'UNKNOWN', message: 'Job failed' };
    for (const f of files) {
      transitionFile(f, {
        state: 'error',
        lastError: new ApiError(
          parsed.error?.message ?? 'Import job failed',
          0,
          parsed.error?.code ?? 'IMPORT_JOB_FAILED',
        ),
      });
    }
    return;
  }
}

export interface UseFileUploadApi {
  files: Ref<UploadFile[]>;
  isUploading: ComputedRef<boolean>;
  progressTotal: ComputedRef<number>;
  jobStatus: Ref<JobStatus | null>;
  jobResult: Ref<unknown | null>;
  jobError: Ref<{ code: string; message: string } | null>;
  start(rawFiles: File[]): Promise<void>;
  cancel(fileId: string): void;
  retry(fileId: string): Promise<void>;
  reset(): void;
}

export function useFileUpload(options: UseFileUploadOptions): UseFileUploadApi {
  const resolved = resolveOptions(options);
  const files = ref<UploadFile[]>([]) as Ref<UploadFile[]>;
  const jobStatus = ref<JobStatus | null>(null);
  const jobResult = ref<unknown | null>(null);
  const jobError = ref<{ code: string; message: string } | null>(null);
  const abortControllers = new Map<string, AbortController>();

  const ctx: UploadOrchestratorContext = {
    files,
    jobStatus,
    jobResult,
    jobError,
    resolved,
    abortControllers,
  };

  const isUploading = computed(() =>
    files.value.some((f) => f.state === 'requesting' || f.state === 'uploading'),
  );

  const progressTotal = computed(() => {
    const inFlight = files.value.filter((f) => f.state !== 'cancelled');
    if (inFlight.length === 0) return 0;
    const totalBytes = inFlight.reduce((acc, f) => acc + f.bytesTotal, 0);
    if (totalBytes === 0) return 0;
    const loaded = inFlight.reduce((acc, f) => acc + f.bytesLoaded, 0);
    return Math.round((loaded / totalBytes) * 100);
  });

  async function start(rawFiles: File[]): Promise<void> {
    if (resolved.maxFiles !== null && rawFiles.length > resolved.maxFiles) {
      const trimmed = rawFiles.slice(0, resolved.maxFiles);
      const rejected = rawFiles.slice(resolved.maxFiles);
      const apiErr = new ApiError(
        `Excede ${resolved.maxFiles} archivos`,
        0,
        'VALIDATION_MAX_FILES',
      );
      for (const r of rejected) {
        const record = makeFileRecord(r);
        transitionFile(record, { state: 'error', lastError: apiErr });
        files.value.push(record);
      }
      rawFiles = trimmed;
    }

    // Build records and run client-side validation first.
    const accepted: UploadFile[] = [];
    for (const raw of rawFiles) {
      const record = makeFileRecord(raw);
      try {
        validateClientSide(raw, resolved);
        files.value.push(record);
        accepted.push(record);
      } catch (e) {
        transitionFile(record, {
          state: 'error',
          lastError: e instanceof ApiError ? e : new ApiError(String(e), 0, 'VALIDATION'),
        });
        files.value.push(record);
      }
    }

    if (accepted.length === 0) return;

    // Phase 1.
    for (const f of accepted) transitionFile(f, { state: 'requesting' });
    let presignedList: PresignedUpload[];
    try {
      presignedList = await requestPresigned(accepted, resolved);
    } catch (e) {
      const apiErr =
        e instanceof ApiError
          ? e
          : new ApiError(e instanceof Error ? e.message : String(e), 0, 'UNKNOWN');
      for (const f of accepted) {
        transitionFile(f, { state: 'error', lastError: apiErr });
      }
      return;
    }

    // Persist keys before phase 2 so cancel/retry can preserve them.
    accepted.forEach((f, i) => {
      const presigned = presignedList[i];
      if (presigned) transitionFile(f, { key: presigned.key });
    });

    // Phase 2.
    await runPhase2(accepted, presignedList, ctx);

    // Phase 3 — only files that reached `uploading → (post-PUT success)` and
    // have keys + etags participate. The transitionFile in uploadOne does NOT
    // mark them completed yet — that happens after confirm.
    const successful = accepted.filter(
      (f) => f.state !== 'error' && f.state !== 'cancelled' && f.etag !== null,
    );

    if (successful.length === 0) return;

    try {
      if (resolved.mode === 'batch-import') {
        await runPhase3BatchImport(successful, ctx);
      } else {
        await runPhase3Standard(successful, ctx);
      }
    } catch (e) {
      const apiErr =
        e instanceof ApiError
          ? e
          : new ApiError(e instanceof Error ? e.message : String(e), 0, 'CONFIRM_FAILED');
      for (const f of successful) {
        transitionFile(f, { state: 'error', lastError: apiErr });
      }
    }
  }

  function cancel(fileId: string): void {
    const ac = abortControllers.get(fileId);
    const file = files.value.find((f) => f.id === fileId);
    if (file && (file.state === 'requesting' || file.state === 'uploading')) {
      transitionFile(file, { state: 'cancelled' });
    }
    if (ac) {
      ac.abort();
      abortControllers.delete(fileId);
    }
  }

  async function retry(fileId: string): Promise<void> {
    const file = files.value.find((f) => f.id === fileId);
    if (!file || file.state !== 'error') return;
    // Re-issue phase 1 for this single file (URLs may have expired or never
    // existed if phase 1 failed). This is a fresh attempt.
    transitionFile(file, {
      state: 'requesting',
      retryCount: 0,
      lastError: null,
      bytesLoaded: 0,
      percent: 0,
      etag: null,
    });

    let presigned: PresignedUpload;
    try {
      presigned = await requestSinglePresigned(file, resolved);
    } catch (e) {
      transitionFile(file, {
        state: 'error',
        lastError:
          e instanceof ApiError
            ? e
            : new ApiError(e instanceof Error ? e.message : String(e), 0, 'PRESIGNED_REFRESH_FAILED'),
      });
      return;
    }
    transitionFile(file, { key: presigned.key, state: 'uploading' });
    await uploadOne(file, presigned, ctx);

    if (file.state === 'error' || file.state === 'cancelled' || !file.etag) return;
    try {
      if (resolved.mode === 'batch-import') {
        await runPhase3BatchImport([file], ctx);
      } else {
        await runPhase3Standard([file], ctx);
      }
    } catch (e) {
      transitionFile(file, {
        state: 'error',
        lastError:
          e instanceof ApiError
            ? e
            : new ApiError(e instanceof Error ? e.message : String(e), 0, 'CONFIRM_FAILED'),
      });
    }
  }

  function reset(): void {
    for (const [, ac] of abortControllers) ac.abort();
    abortControllers.clear();
    files.value = [];
    jobStatus.value = null;
    jobResult.value = null;
    jobError.value = null;
  }

  return {
    files,
    isUploading,
    progressTotal,
    jobStatus,
    jobResult,
    jobError,
    start,
    cancel,
    retry,
    reset,
  };
}

// Helper exported for use by file-upload UI primitives (Dropzone, etc).
export function _validateClientSide(file: File, opts: UseFileUploadOptions): void {
  validateClientSide(file, resolveOptions(opts));
}
// Internal — exported only for tests so they can reset the id counter.
export function _resetIdCounter(): void {
  _idCounter = 0;
}
// Re-export the canonical state type for consumers that gate UI on it.
export type { UploadState, UploadFile, JobStatus };
