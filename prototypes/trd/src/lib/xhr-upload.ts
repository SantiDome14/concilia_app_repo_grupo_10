// ════════════════════════════════════════════════════════════════════
// XHR upload helper
// ────────────────────────────────────────────────────────────────────
// Phase 2 of the file-upload contract MUST use XMLHttpRequest, not
// fetch, so the browser can emit progress events. Encapsulated here
// for testability — tests can stub `globalThis.XMLHttpRequest`.
// ════════════════════════════════════════════════════════════════════

export interface XhrUploadOptions {
  url: string;
  file: Blob;
  /** Optional headers (e.g. Content-Type when storage requires it). */
  headers?: Record<string, string>;
  /** Optional form fields when storage requires POST policy.
   * When provided, the request becomes a `POST` multipart with the file
   * appended as `file`. When absent, the request is `PUT` with the raw
   * file as the body. */
  fields?: Record<string, string> | null;
  /** Abort signal — when fired, the XHR is aborted with `'cancelled'`. */
  signal?: AbortSignal;
  /** Progress callback fired on every native `xhr.upload.progress` event. */
  onProgress?: (loaded: number, total: number) => void;
}

export interface XhrUploadResult {
  status: number;
  /** ETag with surrounding quotes stripped (or `null` if header absent). */
  etag: string | null;
  /** Raw response text (rarely useful; included for diagnostics). */
  responseText: string;
}

export type XhrUploadFailureKind =
  | 'http' // status >= 400
  | 'network' // request never received a response (DNS, offline, server reset)
  | 'timeout' // browser fired the timeout event
  | 'cancelled'; // caller aborted via signal

export class XhrUploadError extends Error {
  public readonly kind: XhrUploadFailureKind;
  public readonly status: number;
  public readonly responseText: string;

  constructor(
    message: string,
    kind: XhrUploadFailureKind,
    status: number,
    responseText: string,
  ) {
    super(message);
    this.name = 'XhrUploadError';
    this.kind = kind;
    this.status = status;
    this.responseText = responseText;
  }
}

/** Strip surrounding quotes from an ETag header value. */
function stripEtagQuotes(raw: string | null): string | null {
  if (!raw) return null;
  return raw.replace(/^"+|"+$/g, '');
}

/**
 * Upload a single file via XHR.
 *
 * Resolves with `{ status, etag, responseText }` on 2xx; rejects with
 * `XhrUploadError` on any failure (HTTP, network, timeout, abort).
 */
export function xhrUpload(options: XhrUploadOptions): Promise<XhrUploadResult> {
  return new Promise<XhrUploadResult>((resolve, reject) => {
    const { url, file, fields, headers, signal, onProgress } = options;

    const useFields = fields !== null && fields !== undefined && Object.keys(fields).length > 0;
    const xhr = new XMLHttpRequest();
    xhr.open(useFields ? 'POST' : 'PUT', url, true);

    // Headers (PUT-style only — multipart sets its own Content-Type).
    if (!useFields && headers) {
      for (const [name, value] of Object.entries(headers)) {
        xhr.setRequestHeader(name, value);
      }
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event: ProgressEvent) => {
        if (event.lengthComputable) {
          onProgress(event.loaded, event.total);
        }
      };
    }

    const cleanup = (): void => {
      if (signal) signal.removeEventListener('abort', onAbort);
    };

    const onAbort = (): void => {
      try {
        xhr.abort();
      } catch {
        // ignore — abort during disconnect raises in some browsers
      }
      cleanup();
      reject(new XhrUploadError('Upload cancelled', 'cancelled', 0, ''));
    };

    if (signal) {
      if (signal.aborted) {
        // Defer to a microtask so the caller can attach `.catch` handlers.
        Promise.resolve().then(onAbort);
        return;
      }
      signal.addEventListener('abort', onAbort);
    }

    xhr.onload = (): void => {
      cleanup();
      const etag = stripEtagQuotes(xhr.getResponseHeader('ETag'));
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ status: xhr.status, etag, responseText: xhr.responseText });
      } else {
        reject(
          new XhrUploadError(
            `Upload failed with status ${xhr.status}`,
            'http',
            xhr.status,
            xhr.responseText,
          ),
        );
      }
    };

    xhr.onerror = (): void => {
      cleanup();
      reject(new XhrUploadError('Network error during upload', 'network', 0, ''));
    };

    xhr.ontimeout = (): void => {
      cleanup();
      reject(new XhrUploadError('Upload timed out', 'timeout', 0, ''));
    };

    xhr.onabort = (): void => {
      // The abort handler above already rejected; this is a safety net.
      cleanup();
    };

    if (useFields && fields) {
      const formData = new FormData();
      for (const [k, v] of Object.entries(fields)) {
        formData.append(k, v);
      }
      formData.append('file', file);
      xhr.send(formData);
    } else {
      xhr.send(file);
    }
  });
}
