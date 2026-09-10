import { browser } from '$app/environment';

/**
 * Returns API base URL: empty string in browser (to leverage Vite proxy),
 * or backend container hostname during SSR.
 */
export function getApiBase(): string {
  if (!browser) return 'http://backend:8080';
  return '';
}

/**
 * Returns headers with JSON Content-Type and optional Bearer auth token.
 */
export function getAuthHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}
