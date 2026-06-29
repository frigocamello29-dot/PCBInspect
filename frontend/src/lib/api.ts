const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

function extractDetail(text: string): string {
  try {
    const parsed = JSON.parse(text);
    const detail = parsed?.detail;
    if (typeof detail === 'string') return detail;
    // FastAPI validation errors: [{msg: "...", loc: [...], ...}]
    if (Array.isArray(detail)) {
      return detail.map((d) => d?.msg ?? String(d)).join('; ');
    }
    return text;
  } catch {
    return text;
  }
}

let isRefreshing = false;
let refreshQueue: Array<() => void> = [];

function flushQueue() {
  refreshQueue.forEach((fn) => fn());
  refreshQueue = [];
}

async function refreshTokens(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  _retry = true
): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (res.status !== 401 || !_retry) return res;

  // 401 — attempt token refresh once
  if (isRefreshing) {
    // queue this request until refresh completes
    await new Promise<void>((resolve) => refreshQueue.push(resolve));
    return apiFetch(path, init, false);
  }

  isRefreshing = true;
  const ok = await refreshTokens();
  isRefreshing = false;
  flushQueue();

  if (!ok) {
    // refresh failed — caller should handle redirect
    return res;
  }

  return apiFetch(path, init, false);
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) throw new ApiError(res.status, extractDetail(await res.text()));
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, extractDetail(await res.text()));
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const res = await apiFetch(path, { method: 'DELETE' });
  if (!res.ok) throw new ApiError(res.status, extractDetail(await res.text()));
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiUploadFile<T>(path: string, formData: FormData, _retry = true): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (res.status === 401 && _retry) {
    const ok = await refreshTokens();
    if (ok) return apiUploadFile<T>(path, formData, false);
  }

  if (!res.ok) throw new ApiError(res.status, extractDetail(await res.text()));
  return res.json();
}
