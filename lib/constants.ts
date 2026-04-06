/** Same-origin in the browser (Next rewrites /api); explicit base for SSR. */
export const API_BASE_URL =
  typeof window !== "undefined"
    ? ""
    : String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
