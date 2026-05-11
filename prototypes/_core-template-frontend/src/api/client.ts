import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import { ApiError } from '@/types/api';

// ════════════════════════════════════════════════════════════════════
// HTTP client — Axios instance with Auth0 + error interceptors
// ────────────────────────────────────────────────────────────────────
// The Auth0 token getter is injected at bootstrap (see plugins/auth0.ts)
// via `setAccessTokenGetter()`. This keeps the client free of Vue deps
// and makes it trivial to mock in tests.
// ════════════════════════════════════════════════════════════════════

type TokenGetter = () => Promise<string | undefined>;

let getAccessToken: TokenGetter = async () => undefined;

/** Called once at app bootstrap by the Auth0 plugin. */
export function setAccessTokenGetter(getter: TokenGetter): void {
  getAccessToken = getter;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  timeout: env.VITE_API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor: attach bearer token ─────────────────────
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  try {
    const token = await getAccessToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
  } catch {
    // Silently skip token attachment if Auth0 is unavailable
    // (e.g. during local dev without Auth0 configured).
  }
  return config;
});

// ─── Response interceptor: normalize errors into ApiError ─────────
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; code?: string; details?: unknown }>) => {
    if (error.response) {
      const { status, data } = error.response;
      throw new ApiError(
        data?.message ?? error.message ?? 'Request failed',
        status,
        data?.code ?? 'UNKNOWN',
        data?.details,
      );
    }
    if (error.request) {
      throw new ApiError('Network error — no response received', 0, 'NETWORK');
    }
    throw new ApiError(error.message, 0, 'UNKNOWN');
  },
);
