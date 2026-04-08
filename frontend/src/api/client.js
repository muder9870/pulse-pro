/**
 * Standardized API Client for Pulse Pro
 * Handles base URL, common headers, error parsing, and response normalization.
 * 
 * Base URL Configuration:
 * - Development: Uses Vite proxy (vite.config.js) → '/api' → http://localhost:5000
 * - Production: Uses VITE_API_URL env var (set in Dockerfile or hosting platform)
 * - Default: '/api' (relative, works with same-origin deployment)
 */

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  constructor(baseUrl = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
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
}

export const api = new ApiClient(BASE_URL);
