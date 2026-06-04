import type { BranchOption } from "../../price-master/_lib/priceMasterTypes";

export function pickOrgId(me: unknown): number | null {
  const m = me as Record<string, unknown>;
  const orgs = (m.organizations ?? (m.data as Record<string, unknown>)?.organizations) as { id?: number }[] | undefined;
  const id = orgs?.[0]?.id;
  return id != null && Number.isFinite(Number(id)) ? Number(id) : null;
}

export function permissionSetFromAuthMe(authMe: unknown): Set<string> {
  const a = authMe as Record<string, unknown> | null | undefined;
  const raw = a?.permissions;
  return new Set(Array.isArray(raw) ? raw.map((p) => String(p)) : []);
}

export function normalizeBranches(payload: unknown): BranchOption[] {
  const p = payload as Record<string, unknown>;
  const raw = (p?.data ?? p) as unknown;
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .map((b) => {
      const o = b as { id?: number; name?: string };
      return o.id != null ? { id: Number(o.id), name: String(o.name ?? `Branch ${o.id}`) } : null;
    })
    .filter(Boolean) as BranchOption[];
}
