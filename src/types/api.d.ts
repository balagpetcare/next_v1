/**
 * Shared API response shapes for type-safe apiFetch usage.
 */
export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  items?: T[];
  message?: string;
  error?: string;
}
