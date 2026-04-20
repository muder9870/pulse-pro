/**
 * Standardized API Client for Pulse Pro
 * Handles base URL, common headers, error parsing, and response normalization.
 * 
 * Base URL Configuration:
 * - Development: Uses Vite proxy (vite.config.js) → '/api' → http://localhost:5000
 * - Production: Uses VITE_API_URL env var (set in Dockerfile or hosting platform)
 * - Default: '/api' (relative, works with same-origin deployment)
 */

const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

/**
 * Normalize path so callers may pass `/foo` or `/api/foo` (legacy).
 * Result always starts with `/` and is relative to the API base (no `/api` prefix).
 */
function normalizeApiPath(path) {
  if (path == null || path === '') return '/';
  let p = typeof path === 'string' && path.startsWith('/') ? path : `/${path}`;
  if (p === '/api' || p.startsWith('/api/')) {
    p = p.slice(4) || '/';
  }
  if (!p.startsWith('/')) p = `/${p}`;
  return p;
}

/** Full URL for an API path, honoring `VITE_API_URL` (same-origin `/api` or absolute backend URL). */
export function buildApiUrl(path) {
  return `${BASE_URL}${normalizeApiPath(path)}`;
}

/** `fetch` wrapper using the same base URL as `api` client. */
export function apiFetch(path, options = {}) {
  return fetch(buildApiUrl(path), options);
}

class ApiClient {
  constructor(baseUrl = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${normalizeApiPath(endpoint)}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `API Error: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Request Failed [${url}]:`, error);
      throw error;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: body != null ? JSON.stringify(body) : undefined,
    });
  }
}

export const api = new ApiClient(BASE_URL);
