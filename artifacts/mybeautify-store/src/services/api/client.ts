/**
 * Core HTTP Request Client for Spring Boot API backend
 * Context path: /api (with HttpOnly Cookie support & silent background refresh)
 */

import { STORAGE_KEYS } from '@/constants';
import { recordApiDiagnosticError } from '@/services/diagnostics/diagnosticStore';

if (typeof window !== 'undefined') {
  (window as any).__malkaz_record_diagnostic = recordApiDiagnosticError;
}

const DEFAULT_API_BASE_URL = 'https://api.fashionmalkaz.com/api';

export function getApiBaseUrl(): string {
  const envUrl =
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL);
  const base = envUrl || DEFAULT_API_BASE_URL;
  return base.replace(/\/+$/, '');
}

export function buildApiUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const baseUrl = getApiBaseUrl();
  let path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (baseUrl.endsWith('/api') && (path === '/api' || path.startsWith('/api/'))) {
    path = path.slice(4) || '/';
  }

  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

// In-memory token cache (tab isolation / security)
let memoryAccessToken: string | null = null;

export function getAuthToken(): string | null {
  return memoryAccessToken || sessionStorage.getItem(STORAGE_KEYS.TOKEN) || localStorage.getItem(STORAGE_KEYS.TOKEN);
}

export function setAuthToken(token: string | null, remember = false): void {
  memoryAccessToken = token;
  if (token) {
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, token);
    if (remember) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
    }
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }
}

// Backward compatibility exports taaki components break na hon
export function getRefreshToken(): string | null {
  return sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

export function setRefreshToken(refreshToken: string | null, remember = false): void {
  if (refreshToken) {
    sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    if (remember) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    } else {
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    }
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  }
}

type TokenRefreshResult =
  | { status: 'refreshed'; token: string }
  | { status: 'invalid' }
  | { status: 'unavailable' };

let refreshPromise: Promise<TokenRefreshResult> | null = null;

async function attemptTokenRefresh(): Promise<TokenRefreshResult> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const url = buildApiUrl('/auth/refresh');
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setAuthToken(null);
          return { status: 'invalid' };
        }
        return { status: 'unavailable' };
      }

      const resData = await res.json().catch(() => null);
      const data = (resData && typeof resData === 'object' && 'data' in resData) ? resData.data : resData;

      const newAccessToken = data?.accessToken || data?.token || null;

      if (newAccessToken) {
        const remember = Boolean(localStorage.getItem(STORAGE_KEYS.TOKEN));
        setAuthToken(newAccessToken, remember);
        return { status: 'refreshed', token: newAccessToken };
      }

      return { status: 'unavailable' };
    } catch (error) {
      recordApiDiagnosticError({
        status: null,
        statusText: 'Refresh Network Failure',
        method: 'POST',
        endpoint: '/auth/refresh',
        errorMessage: error instanceof Error ? error.message : 'Token refresh request failed.',
        isNetworkError: true,
      });
      return { status: 'unavailable' };
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = buildApiUrl(endpoint);
  const method = (options.method || 'GET').toUpperCase();
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
    });
  } catch (netErr: any) {
    const errorMsg = netErr?.message || 'Network error: could not connect to backend at ' + getApiBaseUrl();
    const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
    recordApiDiagnosticError({
      status: null,
      statusText: 'Network Failure',
      method,
      endpoint,
      errorMessage: errorMsg,
      durationMs: duration,
      isNetworkError: true,
    });
    throw new Error(errorMsg);
  }

  const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/register') || endpoint.includes('/auth/refresh');

  if (res.status === 401 && !isAuthEndpoint) {
    const refreshResult = await attemptTokenRefresh();
    if (refreshResult.status === 'refreshed') {
      headers.set('Authorization', `Bearer ${refreshResult.token}`);
      try {
        res = await fetch(url, {
          ...options,
          credentials: 'include',
          headers,
        });
      } catch (retryErr: any) {
        throw new Error(retryErr?.message || 'Network error on retried request');
      }
      if (res.status === 401) {
        setAuthToken(null);
      }
    } else if (refreshResult.status === 'invalid') {
      setAuthToken(null);
    }
  }

  const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
  const correlationId = res.headers.get('x-correlation-id') || res.headers.get('x-request-id');
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = data?.message || data?.error || (typeof data === 'string' ? data : null) || `Request failed with status ${res.status}`;
    recordApiDiagnosticError({
      status: res.status,
      statusText: res.statusText || `HTTP ${res.status}`,
      method,
      endpoint,
      errorMessage: msg,
      correlationId,
      durationMs: duration,
      isNetworkError: false,
    });
    throw new Error(msg);
  }

  if (data && typeof data === 'object' && 'success' in data && data.success === false) {
    recordApiDiagnosticError({
      status: res.status,
      statusText: 'Operation Failed',
      method,
      endpoint,
      errorMessage: data.message || 'Operation failed',
      correlationId,
      durationMs: duration,
      isNetworkError: false,
    });
    throw new Error(data.message || 'Operation failed');
  }

  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return data.data as T;
  }

  return data as T;
}