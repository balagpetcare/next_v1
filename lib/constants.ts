/** Same-origin in the browser (Next rewrites /api); explicit base for SSR. */
export const API_BASE_URL =
  typeof window !== "undefined"
    ? ""
    : String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

/** Resolve API base for fetch: never use cross-origin production URL in the browser. */
export function resolveClientApiBase(): string {
  return API_BASE_URL;
}
