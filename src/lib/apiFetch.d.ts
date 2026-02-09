/**
 * Type declarations for apiFetch.js
 */
export function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T>;
