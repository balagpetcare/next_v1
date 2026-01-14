const base =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

async function parseError(res: Response): Promise<never> {
  let msg = `Request failed (${res.status})`;
  try {
    const j = await res.json();
    if (j?.message) msg = j.message;
  } catch {}
  throw new Error(msg);
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function apiPost<T>(path: string, body?: any): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function apiPatch<T>(path: string, body?: any): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) return parseError(res);
  return res.json();
}
