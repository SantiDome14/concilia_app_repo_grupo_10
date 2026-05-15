import { z } from 'zod';
import type { ApiError } from './api';

// ════════════════════════════════════════════════════════════════════
// File upload — types and Zod schemas
// ────────────────────────────────────────────────────────────────────
// Implements the contract defined in `core-file-upload`:
//   request → upload (XHR) → confirm → (optional) job poll
// Every consumer reaches this through the `useFileUpload` composable;
// nothing here should be imported by modules directly.
// ════════════════════════════════════════════════════════════════════

/** Per-file canonical state machine. */
export type UploadState =
  | 'idle'
  | 'requesting'
  | 'uploading'
  | 'completed'
  | 'error'
  | 'cancelled';

/** Job status returned by batch-import polling endpoints. */
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'partial' | 'failed';

/** Mode of the upload pipeline. */
export type UploadMode = 'standard' | 'batch-import';

/** Internal record tracked per file inside the composable. */
export interface UploadFile {
  /** Stable id assigned at `start()` time. */
  id: string;
  /** The native File object (kept for retry / preview). */
  file: File;
  /** Display name (defaults to `file.name`). */
  filename: string;
  /** Size in bytes. */
  sizeBytes: number;
  /** MIME type as reported by the browser. */
  contentType: string;
  /** Current state per the canonical machine. */
  state: UploadState;
  /** Bytes uploaded so far (only meaningful while `state === 'uploading'`). */
  bytesLoaded: number;
  /** Total bytes (== sizeBytes; mirrored for symmetry with XHR progress events). */
  bytesTotal: number;
  /** Computed percent, 0-100. */
  percent: number;
  /** Storage key returned by phase 1 (preserved across retries). */
  key: string | null;
  /** ETag echoed by the storage response on phase 2 success. */
  etag: string | null;
  /** Confirm timestamp (ISO 8601), populated after phase 3 success. */
  confirmedAt: string | null;
  /** Last error captured. */
  lastError: ApiError | null;
  /** Number of automatic retries already attempted on the current phase. */
  retryCount: number;
}

/** Phase 1 request payload — one entry per file. */
export interface PresignedFileRequest {
  filename: string;
  content_type: string;
  size_bytes: number;
}

/** Phase 1 response — one entry per file, aligned to request order. */
export interface PresignedUpload {
  url: string;
  fields: Record<string, string> | null;
  key: string;
  expires_at: string;
}

/** Zod schema validating the entire phase 1 response. */
export const presignedResponseSchema = z.object({
  uploads: z.array(
    z.object({
      url: z.string().url(),
      fields: z.record(z.string()).nullable().optional().default(null),
      key: z.string().min(1),
      expires_at: z.string(),
    }),
  ),
});

export type PresignedResponse = z.infer<typeof presignedResponseSchema>;

/** Phase 3 confirm request — one entry per successfully-uploaded file. */
export interface ConfirmFileEntry {
  key: string;
  etag: string;
}

/** Phase 3 confirm response (standard mode). The shape is app-specific so we
 * accept anything; the composable never reads it beyond signaling success. */
export type ConfirmStandardResponse = unknown;

/** Phase 3 confirm response (batch-import mode). */
export const importJobCreatedSchema = z.object({
  job_id: z.string().min(1),
  status: z.enum(['queued', 'running']),
});

export type ImportJobCreatedResponse = z.infer<typeof importJobCreatedSchema>;

/** Phase 4 — job status poll response. */
export const jobStatusResponseSchema = z.object({
  status: z.enum(['queued', 'running', 'succeeded', 'partial', 'failed']),
  result: z.unknown().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
});

export type JobStatusResponse = z.infer<typeof jobStatusResponseSchema>;

/** Options accepted by `useFileUpload`. */
export interface UseFileUploadOptions {
  /** Endpoint path for phase 1 (presigned URLs request). */
  presignEndpoint: string;
  /** Endpoint path for phase 3 (confirm). */
  confirmEndpoint: string;
  /** Endpoint *function* that builds the job-status URL given a job id.
   * Required only when `mode === 'batch-import'`. */
  jobsEndpoint?: (jobId: string) => string;
  /** Default `'standard'`. */
  mode?: UploadMode;
  /** Max files in flight simultaneously (default 3). */
  concurrency?: number;
  /** Retry policy. */
  retry?: {
    /** Max automatic retry attempts per file (default 3). */
    maxAttempts?: number;
    /** Initial delay in ms (default 1000). */
    initialDelayMs?: number;
    /** Multiplicative factor (default 2). */
    factor?: number;
    /** Jitter ±fraction (default 0.2). */
    jitter?: number;
  };
  /** Polling cadence (batch-import mode only). */
  poll?: {
    initialDelayMs?: number;
    factor?: number;
    jitter?: number;
    capMs?: number;
  };
  /** Accepted MIME types (e.g. `['application/pdf', 'image/*']`). */
  accept?: string[];
  /** Max file size in bytes (per file). */
  maxSize?: number;
  /** Max number of files in a single batch. */
  maxFiles?: number;
  /** Bounded queue size — defaults to `Infinity`. Mostly for safety in tests. */
  queueCap?: number;
}

/** Resolved options with defaults applied (internal). */
export interface ResolvedUseFileUploadOptions
  extends Required<Omit<UseFileUploadOptions, 'jobsEndpoint' | 'accept' | 'maxSize' | 'maxFiles' | 'retry' | 'poll'>> {
  jobsEndpoint: ((jobId: string) => string) | null;
  accept: string[] | null;
  maxSize: number | null;
  maxFiles: number | null;
  retry: Required<NonNullable<UseFileUploadOptions['retry']>>;
  poll: Required<NonNullable<UseFileUploadOptions['poll']>>;
}
