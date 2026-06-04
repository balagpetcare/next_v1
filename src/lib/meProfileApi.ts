/**
 * Client helpers for enterprise /api/v1/me/* profile hub (cookie session).
 * Uses same-origin /api in browser so Next rewrites forward to backend.
 */

const PREFIX = "/api/v1/me";

async function parseJson(res: Response) {
  return res.json().catch(() => ({}));
}

/** Thrown on failed /api/v1/me/* requests when the API returns structured errors. */
export class MeApiError extends Error {
  readonly code?: string;
  readonly meta?: Record<string, unknown>;
  readonly httpStatus: number;

  constructor(
    message: string,
    opts?: { code?: string; meta?: Record<string, unknown>; httpStatus?: number }
  ) {
    super(message);
    this.name = "MeApiError";
    this.code = opts?.code;
    this.meta = opts?.meta;
    this.httpStatus = opts?.httpStatus ?? 0;
  }
}

function throwIfMeFailed(res: Response, j: Record<string, unknown>) {
  if (res.ok) return;
  const msg = (j.message as string) || `Request failed (${res.status})`;
  throw new MeApiError(msg, {
    code: typeof j.code === "string" ? j.code : undefined,
    meta: typeof j.meta === "object" && j.meta !== null ? (j.meta as Record<string, unknown>) : undefined,
    httpStatus: res.status,
  });
}

export async function meGet<T>(path: string): Promise<T> {
  const res = await fetch(`${PREFIX}${path}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const j = (await parseJson(res)) as Record<string, unknown>;
  throwIfMeFailed(res, j);
  return j as T;
}

export async function mePatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${PREFIX}${path}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const j = (await parseJson(res)) as Record<string, unknown>;
  throwIfMeFailed(res, j);
  return j as T;
}

export async function mePost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${PREFIX}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const j = (await parseJson(res)) as Record<string, unknown>;
  throwIfMeFailed(res, j);
  return j as T;
}

/** Multipart POST (e.g. profile photo). Do not set Content-Type — browser sets boundary. */
export async function mePostForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${PREFIX}${path}`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const j = (await parseJson(res)) as Record<string, unknown>;
  throwIfMeFailed(res, j);
  return j as T;
}

export async function meDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${PREFIX}${path}`, {
    method: "DELETE",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const j = (await parseJson(res)) as Record<string, unknown>;
  throwIfMeFailed(res, j);
  return j as T;
}
