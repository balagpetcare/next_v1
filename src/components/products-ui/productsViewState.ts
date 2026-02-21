/**
 * Persist products list view preferences per user + role + scope (localStorage).
 * Key: products:view:{userId}:{role}:{orgId}:{branchId?}
 */

export type ViewMode = "table" | "grid";
export type Density = "compact" | "comfortable";

export type ProductsViewState = {
  viewMode: ViewMode;
  density: Density;
  pageSize: number;
};

const DEFAULT_STATE: ProductsViewState = {
  viewMode: "table",
  density: "comfortable",
  pageSize: 20,
};

const PREFIX = "products:view:";

function storageKey(userId: string | number, role: string, orgId?: string | number, branchId?: string | number | null): string {
  const parts = [PREFIX, String(userId), String(role), String(orgId ?? "")];
  if (branchId != null && branchId !== "") parts.push(String(branchId));
  return parts.join(":");
}

export function getProductsViewState(
  userId: string | number | null | undefined,
  role: string,
  orgId?: string | number | null,
  branchId?: string | number | null
): ProductsViewState {
  if (typeof window === "undefined") return { ...DEFAULT_STATE };
  if (userId == null || userId === "") return { ...DEFAULT_STATE };
  try {
    const key = storageKey(userId, role, orgId ?? undefined, branchId);
    const raw = window.localStorage.getItem(key);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<ProductsViewState>;
    return {
      viewMode: parsed.viewMode === "grid" ? "grid" : DEFAULT_STATE.viewMode,
      density: parsed.density === "compact" ? "compact" : DEFAULT_STATE.density,
      pageSize: typeof parsed.pageSize === "number" && parsed.pageSize > 0 ? parsed.pageSize : DEFAULT_STATE.pageSize,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function setProductsViewState(
  userId: string | number | null | undefined,
  role: string,
  state: Partial<ProductsViewState>,
  orgId?: string | number | null,
  branchId?: string | number | null
): void {
  if (typeof window === "undefined" || userId == null || userId === "") return;
  try {
    const key = storageKey(userId, role, orgId ?? undefined, branchId);
    const current = getProductsViewState(userId, role, orgId, branchId);
    const next = { ...current, ...state };
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore
  }
}
