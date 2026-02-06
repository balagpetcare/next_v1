// Base API host (no trailing slash). Example: http://localhost:3000
const API_BASE = String(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

export async function ownerGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { method: "GET", credentials: "include" });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(j?.message || `Request failed (${res.status})`);
  return j;
}

export async function ownerPost<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body || {}),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = j?.message || j?.error || `Request failed (${res.status})`;
    const error = new Error(errorMsg);
    (error as any).status = res.status;
    (error as any).response = j;
    throw error;
  }
  return j;
}

export async function ownerPut<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body || {}),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(j?.message || `Request failed (${res.status})`);
  return j;
}

export async function ownerPatch<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body || {}),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = j?.message || j?.error || `Request failed (${res.status})`;
    const error = new Error(errorMsg);
    (error as any).status = res.status;
    (error as any).response = j;
    throw error;
  }
  return j;
}

export async function ownerDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(j?.message || `Request failed (${res.status})`);
  return j;
}

/** Multipart upload helper (FormData). Do NOT set Content-Type manually. */
export async function ownerUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(j?.message || `Request failed (${res.status})`);
  return j;
}
