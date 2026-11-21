import { API_URL } from './config';

/**
 * Thin fetch client for the Edureone FastAPI backend.
 *
 * Mirrors the web app's axios interceptors (src/api/axios.js):
 *   Authorization: Bearer <student token>
 *   X-Institute-UUID: the institute in the student token
 *   X-Student-UUID:   the signed-in student (student portal scope)
 *   X-Session-Year:   the student's academic session
 * A 401 on any authenticated call signs the student out (student tokens are
 * not refreshable, same as the web portal).
 */
export type ApiContext = {
  token: string | null;
  instituteUuid?: string | null;
  studentUuid?: string | null;
  sessionYear?: string | null;
};

let context: ApiContext = { token: null };
let onUnauthorized: (() => void) | null = null;

export const setApiContext = (next: ApiContext) => {
  context = next;
};
export const getApiContext = () => context;
export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;
type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Query;
  body?: unknown;
  form?: FormData;
  auth?: boolean;
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** Do not sign the student out on 401 (optional endpoints such as push registration). */
  ignore401?: boolean;
};

export function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (context.token) headers.Authorization = `Bearer ${context.token}`;
  if (context.instituteUuid) headers['X-Institute-UUID'] = context.instituteUuid;
  if (context.studentUuid) headers['X-Student-UUID'] = context.studentUuid;
  if (context.sessionYear) headers['X-Session-Year'] = context.sessionYear;
  return headers;
}

export function buildUrl(path: string, query?: Query) {
  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;
  const parts = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `${url}${url.includes('?') ? '&' : '?'}${parts.join('&')}` : url;
}

export function errorMessage(data: unknown, fallback: string): string {
  const d = data as any;
  if (!d) return fallback;
  if (typeof d.detail === 'string') return d.detail;
  if (typeof d.detail?.message === 'string') return d.detail.message;
  if (Array.isArray(d.detail) && d.detail[0]?.msg) return String(d.detail[0].msg).replace(/^Value error, /, '');
  if (typeof d.message === 'string') return d.message;
  return fallback;
}

export async function request<T = any>(path: string, options: Options = {}): Promise<T> {
  const { method = 'GET', query, body, form, auth = true, timeoutMs = 30000 } = options;
  if (!API_URL) throw new ApiError('The app is not configured with an API address.', 0, null);

  const headers: Record<string, string> = { Accept: 'application/json', ...(auth ? authHeaders() : {}), ...options.headers };
  let payload: BodyInit | undefined;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), { method, headers, body: payload, signal: controller.signal });
  } catch (e: any) {
    throw new ApiError(
      e?.name === 'AbortError' ? 'The server took too long to respond. Please try again.' : 'No internet connection. Check your network and try again.',
      0,
      null,
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && auth && context.token && !options.ignore401) onUnauthorized?.();
    const fallback =
      response.status === 401 ? 'Your session has expired. Please sign in again.'
      : response.status === 403 ? 'You do not have access to this information.'
      : response.status >= 500 ? 'The server had a problem. Please try again shortly.'
      : 'Request failed.';
    throw new ApiError(errorMessage(data, fallback), response.status, data);
  }
  return data as T;
}

export const api = {
  get: <T = any>(path: string, query?: Query, opts: Omit<Options, 'method' | 'query'> = {}) => request<T>(path, { ...opts, query }),
  post: <T = any>(path: string, body?: unknown, opts: Omit<Options, 'method' | 'body'> = {}) => request<T>(path, { ...opts, method: 'POST', body }),
};

/** Unwrap `{ success, data }` envelopes while tolerating bare payloads. */
export function unwrap<T = any>(res: any): T {
  if (res && typeof res === 'object' && !Array.isArray(res) && 'data' in res) return res.data as T;
  return res as T;
}

export function asArray<T = any>(value: any, keys: string[] = []): T[] {
  if (Array.isArray(value)) return value;
  for (const key of keys) if (Array.isArray(value?.[key])) return value[key];
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}
