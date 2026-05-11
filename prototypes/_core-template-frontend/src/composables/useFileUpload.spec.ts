import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { nextTick } from 'vue';
import type * as xhrModule from '@/lib/xhr-upload';

// ─── Module mocks (must be hoisted before importing the composable) ───
vi.mock('@/api/client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('@/lib/xhr-upload', async () => {
  type XhrUploadModule = typeof xhrModule;
  const actual = await vi.importActual<XhrUploadModule>('@/lib/xhr-upload');
  return {
    ...actual,
    xhrUpload: vi.fn(),
  };
});

// Imports happen AFTER the mocks above so the composable picks the mocked deps.
import { apiClient } from '@/api/client';
import { xhrUpload, XhrUploadError } from '@/lib/xhr-upload';
import { useFileUpload, _resetIdCounter } from './useFileUpload';
import { ApiError } from '@/types/api';

const post = apiClient.post as Mock;
const get = apiClient.get as Mock;
const xhrMock = xhrUpload as unknown as Mock;

function makeFile(name = 'doc.pdf', type = 'application/pdf', sizeBytes = 1024): File {
  const blob = new Blob(['x'.repeat(sizeBytes)], { type });
  return new File([blob], name, { type });
}

function presigned(uploads: Array<{ url?: string; key?: string }>): { data: { uploads: unknown[] } } {
  return {
    data: {
      uploads: uploads.map((u, i) => ({
        url: u.url ?? `https://storage.test/u${i}`,
        fields: null,
        key: u.key ?? `key-${i}`,
        expires_at: '2099-01-01T00:00:00Z',
      })),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  _resetIdCounter();
});

describe('useFileUpload — three-phase lifecycle', () => {
  it('runs request → upload → confirm and lands in `completed`', async () => {
    post.mockResolvedValueOnce(presigned([{ key: 'k1' }]));
    xhrMock.mockResolvedValueOnce({ status: 200, etag: 'abc', responseText: '' });
    post.mockResolvedValueOnce({ data: { ok: true } });

    const upload = useFileUpload({
      presignEndpoint: '/documents/presigned-urls',
      confirmEndpoint: '/documents/confirm',
    });

    await upload.start([makeFile()]);

    expect(post).toHaveBeenNthCalledWith(1, '/documents/presigned-urls', expect.any(Object));
    expect(xhrMock).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenNthCalledWith(2, '/documents/confirm', {
      files: [{ key: 'k1', etag: 'abc' }],
    });
    expect(upload.files.value[0]?.state).toBe('completed');
    expect(upload.files.value[0]?.confirmedAt).toBeTruthy();
  });

  it('rejects responses with mismatched length as PRESIGNED_RESPONSE_INVALID', async () => {
    // Asked for 2 files; backend returns 1 upload entry.
    post.mockResolvedValueOnce(presigned([{ key: 'k1' }]));

    const upload = useFileUpload({
      presignEndpoint: '/documents/presigned-urls',
      confirmEndpoint: '/documents/confirm',
    });

    await upload.start([makeFile('a.pdf'), makeFile('b.pdf')]);

    for (const f of upload.files.value) {
      expect(f.state).toBe('error');
      expect(f.lastError?.code).toBe('PRESIGNED_RESPONSE_INVALID');
    }
    expect(xhrMock).not.toHaveBeenCalled();
  });
});

describe('useFileUpload — client-side validation', () => {
  it('rejects files failing the `accept` filter without consuming a presigned URL', async () => {
    const upload = useFileUpload({
      presignEndpoint: '/documents/presigned-urls',
      confirmEndpoint: '/documents/confirm',
      accept: ['application/pdf'],
    });

    await upload.start([makeFile('a.png', 'image/png')]);

    expect(post).not.toHaveBeenCalled();
    expect(xhrMock).not.toHaveBeenCalled();
    expect(upload.files.value[0]?.state).toBe('error');
    expect(upload.files.value[0]?.lastError?.code).toBe('VALIDATION_TYPE');
  });

  it('rejects files exceeding `maxSize`', async () => {
    const upload = useFileUpload({
      presignEndpoint: '/documents/presigned-urls',
      confirmEndpoint: '/documents/confirm',
      maxSize: 100,
    });

    await upload.start([makeFile('big.pdf', 'application/pdf', 5_000)]);

    expect(post).not.toHaveBeenCalled();
    expect(upload.files.value[0]?.state).toBe('error');
    expect(upload.files.value[0]?.lastError?.code).toBe('VALIDATION_SIZE');
  });

  it('caps the batch at `maxFiles` and rejects the overflow', async () => {
    post.mockResolvedValueOnce(presigned([{ key: 'k1' }]));
    xhrMock.mockResolvedValueOnce({ status: 200, etag: 'e', responseText: '' });
    post.mockResolvedValueOnce({ data: { ok: true } });

    const upload = useFileUpload({
      presignEndpoint: '/documents/presigned-urls',
      confirmEndpoint: '/documents/confirm',
      maxFiles: 1,
    });

    await upload.start([makeFile('a.pdf'), makeFile('b.pdf')]);

    expect(upload.files.value).toHaveLength(2);
    const errored = upload.files.value.find((f) => f.lastError?.code === 'VALIDATION_MAX_FILES');
    expect(errored).toBeDefined();
    const completed = upload.files.value.find((f) => f.state === 'completed');
    expect(completed).toBeDefined();
  });
});

describe('useFileUpload — ETag verification', () => {
  it('marks file as error with code ETAG_MISSING when storage returned no ETag', async () => {
    post.mockResolvedValueOnce(presigned([{ key: 'k1' }]));
    xhrMock.mockResolvedValueOnce({ status: 200, etag: null, responseText: '' });
    // confirm should NOT be called since the file failed.

    const upload = useFileUpload({
      presignEndpoint: '/documents/presigned-urls',
      confirmEndpoint: '/documents/confirm',
    });

    await upload.start([makeFile()]);

    expect(upload.files.value[0]?.state).toBe('error');
    expect(upload.files.value[0]?.lastError?.code).toBe('ETAG_MISSING');
    // `post` was called once for phase 1; phase 3 (confirm) should NOT fire.
    expect(post).toHaveBeenCalledTimes(1);
  });
});

describe('useFileUpload — retry policy', () => {
  it('retries a 502 (recoverable) up to maxAttempts then transitions to error', async () => {
    post.mockResolvedValueOnce(presigned([{ key: 'k1' }]));
    xhrMock.mockRejectedValue(new XhrUploadError('boom', 'http', 502, ''));

    const upload = useFileUpload({
      presignEndpoint: '/documents/presigned-urls',
      confirmEndpoint: '/documents/confirm',
      retry: { maxAttempts: 2, initialDelayMs: 1, factor: 1, jitter: 0 },
    });

    await upload.start([makeFile()]);

    expect(upload.files.value[0]?.state).toBe('error');
    expect(xhrMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a 413 (permanent failure)', async () => {
    post.mockResolvedValueOnce(presigned([{ key: 'k1' }]));
    xhrMock.mockRejectedValue(new XhrUploadError('too big', 'http', 413, ''));

    const upload = useFileUpload({
      presignEndpoint: '/documents/presigned-urls',
      confirmEndpoint: '/documents/confirm',
      retry: { maxAttempts: 5, initialDelayMs: 1, factor: 1, jitter: 0 },
    });

    await upload.start([makeFile()]);

    expect(upload.files.value[0]?.state).toBe('error');
    expect(upload.files.value[0]?.lastError?.code).toBe('FILE_TOO_LARGE');
    expect(xhrMock).toHaveBeenCalledTimes(1);
  });

  it('refreshes the presigned URL on 403 (expired) without burning the retry counter', async () => {
    // Phase 1 (initial) → presigned URL #1.
    post.mockResolvedValueOnce(presigned([{ key: 'k1', url: 'https://storage.test/expired' }]));
    // First XHR fails with 403 (expired).
    xhrMock.mockRejectedValueOnce(new XhrUploadError('expired', 'http', 403, ''));
    // Phase 1 (refresh) → presigned URL #2.
    post.mockResolvedValueOnce(presigned([{ key: 'k1-fresh', url: 'https://storage.test/fresh' }]));
    // Second XHR (after refresh) succeeds.
    xhrMock.mockResolvedValueOnce({ status: 200, etag: 'abc', responseText: '' });
    // Phase 3 confirm.
    post.mockResolvedValueOnce({ data: { ok: true } });

    const upload = useFileUpload({
      presignEndpoint: '/documents/presigned-urls',
      confirmEndpoint: '/documents/confirm',
      retry: { maxAttempts: 1, initialDelayMs: 1, factor: 1, jitter: 0 },
    });

    await upload.start([makeFile()]);

    expect(upload.files.value[0]?.state).toBe('completed');
    expect(post).toHaveBeenCalledTimes(3); // initial presign + refresh presign + confirm
    expect(xhrMock).toHaveBeenCalledTimes(2);
  });
});

describe('useFileUpload — concurrency', () => {
  it('caps concurrent uploads at `concurrency` slots', async () => {
    const fileCount = 5;
    const concurrency = 2;
    post.mockResolvedValueOnce(presigned(Array.from({ length: fileCount }, (_, i) => ({ key: `k${i}` }))));

    let inFlight = 0;
    let observedMax = 0;
    xhrMock.mockImplementation(async () => {
      inFlight += 1;
      observedMax = Math.max(observedMax, inFlight);
      // Yield a microtask so the orchestrator schedules the next worker.
      await Promise.resolve();
      inFlight -= 1;
      return { status: 200, etag: 'e', responseText: '' };
    });

    post.mockResolvedValueOnce({ data: { ok: true } }); // confirm

    const upload = useFileUpload({
      presignEndpoint: '/documents/presigned-urls',
      confirmEndpoint: '/documents/confirm',
      concurrency,
    });

    await upload.start(
      Array.from({ length: fileCount }, (_, i) => makeFile(`f${i}.pdf`)),
    );

    expect(observedMax).toBeLessThanOrEqual(concurrency);
    expect(upload.files.value.every((f) => f.state === 'completed')).toBe(true);
  });

  it('does not abort the batch when one file fails', async () => {
    post.mockResolvedValueOnce(
      presigned([{ key: 'k0' }, { key: 'k1' }, { key: 'k2' }]),
    );

    let call = 0;
    xhrMock.mockImplementation(async () => {
      const i = call;
      call += 1;
      if (i === 1) {
        // Middle file fails permanently.
        throw new XhrUploadError('too big', 'http', 413, '');
      }
      return { status: 200, etag: `e${i}`, responseText: '' };
    });

    post.mockResolvedValueOnce({ data: { ok: true } }); // confirm with the 2 successful files

    const upload = useFileUpload({
      presignEndpoint: '/documents/presigned-urls',
      confirmEndpoint: '/documents/confirm',
      concurrency: 3,
    });

    await upload.start([makeFile('a'), makeFile('b'), makeFile('c')]);

    const states = upload.files.value.map((f) => f.state).sort();
    expect(states).toEqual(['completed', 'completed', 'error']);
    // The confirm phase received 2 entries (the 2 successful uploads).
    const confirmCall = post.mock.calls.find(([url]) => url === '/documents/confirm');
    expect(confirmCall?.[1]).toEqual({
      files: [
        expect.objectContaining({ key: 'k0' }),
        expect.objectContaining({ key: 'k2' }),
      ],
    });
  });
});

describe('useFileUpload — cancel and reset', () => {
  it('cancels an in-flight upload via cancel(fileId)', async () => {
    post.mockResolvedValueOnce(presigned([{ key: 'k0' }]));

    let resolveXhr!: () => void;
    let rejectXhr!: (e: unknown) => void;
    const xhrPromise = new Promise<{ status: number; etag: string; responseText: string }>(
      (res, rej) => {
        resolveXhr = () => res({ status: 200, etag: 'e', responseText: '' });
        rejectXhr = rej;
      },
    );
    xhrMock.mockImplementation((opts: { signal?: AbortSignal }) => {
      opts.signal?.addEventListener('abort', () => {
        rejectXhr(new XhrUploadError('cancelled', 'cancelled', 0, ''));
      });
      return xhrPromise;
    });

    const upload = useFileUpload({
      presignEndpoint: '/documents/presigned-urls',
      confirmEndpoint: '/documents/confirm',
    });

    const startPromise = upload.start([makeFile()]);

    // Wait long enough for phase 1 to resolve and phase 2 to start.
    await nextTick();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const f = upload.files.value[0];
    if (!f) throw new Error('file not in state');
    upload.cancel(f.id);
    resolveXhr(); // ensure the test can finish even if abort handling failed
    await startPromise;

    expect(upload.files.value[0]?.state).toBe('cancelled');
  });

  it('reset clears all files and job state', async () => {
    post.mockResolvedValueOnce(presigned([{ key: 'k0' }]));
    xhrMock.mockResolvedValueOnce({ status: 200, etag: 'e', responseText: '' });
    post.mockResolvedValueOnce({ data: { ok: true } });

    const upload = useFileUpload({
      presignEndpoint: '/documents/presigned-urls',
      confirmEndpoint: '/documents/confirm',
    });

    await upload.start([makeFile()]);
    expect(upload.files.value).toHaveLength(1);
    expect(upload.isUploading.value).toBe(false);

    upload.reset();
    expect(upload.files.value).toHaveLength(0);
    expect(upload.jobStatus.value).toBeNull();
  });
});

describe('useFileUpload — batch-import mode', () => {
  it('starts polling on phase 3 and reaches `succeeded` with a result', async () => {
    post.mockResolvedValueOnce(presigned([{ key: 'k0' }]));
    xhrMock.mockResolvedValueOnce({ status: 200, etag: 'e', responseText: '' });
    // Phase 3 returns job_id.
    post.mockResolvedValueOnce({ data: { job_id: 'j1', status: 'queued' } });
    // Polls.
    get.mockResolvedValueOnce({ data: { status: 'running' } });
    get.mockResolvedValueOnce({ data: { status: 'succeeded', result: { rows: 42 } } });

    const upload = useFileUpload({
      presignEndpoint: '/swift/presigned-urls',
      confirmEndpoint: '/swift/confirm',
      jobsEndpoint: (id) => `/swift/jobs/${id}`,
      mode: 'batch-import',
      poll: { initialDelayMs: 1, factor: 1, jitter: 0, capMs: 1 },
    });

    await upload.start([makeFile('mt940.txt', 'text/plain')]);

    expect(upload.jobStatus.value).toBe('succeeded');
    expect(upload.jobResult.value).toEqual({ rows: 42 });
    expect(upload.files.value[0]?.state).toBe('completed');
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('exposes job error on `failed` and marks files as error', async () => {
    post.mockResolvedValueOnce(presigned([{ key: 'k0' }]));
    xhrMock.mockResolvedValueOnce({ status: 200, etag: 'e', responseText: '' });
    post.mockResolvedValueOnce({ data: { job_id: 'j1', status: 'queued' } });
    get.mockResolvedValueOnce({
      data: { status: 'failed', error: { code: 'INVALID_MT940', message: 'Block 4 missing' } },
    });

    const upload = useFileUpload({
      presignEndpoint: '/swift/presigned-urls',
      confirmEndpoint: '/swift/confirm',
      jobsEndpoint: (id) => `/swift/jobs/${id}`,
      mode: 'batch-import',
      poll: { initialDelayMs: 1, factor: 1, jitter: 0, capMs: 1 },
    });

    await upload.start([makeFile('mt940.txt', 'text/plain')]);

    expect(upload.jobStatus.value).toBe('failed');
    expect(upload.jobError.value).toEqual({ code: 'INVALID_MT940', message: 'Block 4 missing' });
    expect(upload.files.value[0]?.state).toBe('error');
    expect(upload.files.value[0]?.lastError).toBeInstanceOf(ApiError);
  });
});
