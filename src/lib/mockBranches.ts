/**
 * Mock branch API for owner branches (list, create, get, update, toggle).
 * Can be replaced later with real API client.
 */

export interface BranchRecord {
  id: number;
  name: string;
  typeCodes: string[];
  branchPhone?: string;
  branchEmail?: string;
  addressText?: string;
  status?: string;
  organizationId?: number;
  [key: string]: unknown;
}

const store: Map<number, BranchRecord> = new Map();
let nextId = 1;

export async function listBranches(): Promise<BranchRecord[]> {
  return Array.from(store.values());
}

export async function createBranch(data: Partial<BranchRecord> & Pick<BranchRecord, "name">): Promise<BranchRecord> {
  const id = nextId++;
  const branch: BranchRecord = {
    ...data,
    id,
    name: data.name,
    typeCodes: data.typeCodes ?? [],
  };
  store.set(id, branch);
  return branch;
}

export async function getBranch(id: string): Promise<BranchRecord | null> {
  const n = parseInt(id, 10);
  if (!Number.isFinite(n)) return null;
  return store.get(n) ?? null;
}

export async function updateBranch(id: string, data: Partial<BranchRecord>): Promise<BranchRecord | null> {
  const existing = await getBranch(id);
  if (!existing) return null;
  const updated = { ...existing, ...data };
  store.set(existing.id, updated);
  return updated;
}

export async function toggleBranchStatus(id: string): Promise<BranchRecord | null> {
  const existing = await getBranch(id);
  if (!existing) return null;
  const status = existing.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
  return updateBranch(id, { status });
}
