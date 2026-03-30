/**
 * Generic API response type used across all route handlers and client fetch wrappers.
 *
 * Success: { ok: true; [payload fields] }
 * Failure: { ok: false; error: string; message?: string }
 *
 * Usage:
 *   type MyResponse = ApiResponse<{ post: Post }>
 *   // → { ok: true; post: Post } | { ok: false; error: string; message?: string }
 */
export type ApiResponse<T extends Record<string, unknown> = Record<string, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: string; message?: string };
