"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { apiFetch } from "@/src/lib/apiFetch";
import { useMe } from "@/src/lib/useMe";
import ProductsTable from "./_components/ProductsTable";
import {
  ProductsPageHeader,
  ProductsKpiStrip,
  ProductsFiltersPanel,
  ProductsGrid,
  ProductDetailsDrawer,
  BulkActionBar,
  ProductsEmptyState,
  ProductsLoadingSkeleton,
  getProductsCapabilities,
  buildBulkActions,
  getProductsViewState,
  setProductsViewState,
  type ProductListItem,
  type ProductsFiltersState,
  type ProductsKpiStats,
  type ViewMode,
} from "@/src/components/products-ui";
import { Pagination } from "@/src/components/common/Pagination";

const DEFAULT_FILTERS: ProductsFiltersState = {
  search: "",
  status: "",
  approvalStatus: "",
  categoryId: "",
  brandId: "",
  sort: "updated_desc",
};

type CategoryNode = { id: number; name: string; slug: string; parentId: number | null; children?: CategoryNode[] };
type Brand = { id: number; name: string };

function flattenCategories(nodes: CategoryNode[]): { id: number; name: string }[] {
  const out: { id: number; name: string }[] = [];
  function walk(list: CategoryNode[], prefix = "") {
    if (!Array.isArray(list)) return;
    for (const n of list) {
      out.push({ id: n.id, name: prefix ? `${prefix} › ${n.name}` : n.name });
      if (n.children?.length) walk(n.children, prefix ? `${prefix} › ${n.name}` : n.name);
    }
  }
  walk(nodes);
  return out;
}

export default function OwnerProductsPage() {
  const { me } = useMe("owner-products");
  const userId = (me as { user?: { id?: number }; id?: number })?.user?.id ?? (me as { id?: number })?.id;
  const role = ((me as { role?: string })?.role ?? "OWNER").toUpperCase();
  const orgId = (me as { orgId?: number })?.orgId ?? null;

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState<ProductsFiltersState>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [drawerProductId, setDrawerProductId] = useState<number | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductListItem | null>(null);
  const [formData, setFormData] = useState({ name: "", status: "ACTIVE", variants: [] as Array<{ sku: string; title: string }> });
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const viewState = getProductsViewState(userId ?? null, role, orgId, null);
  const [viewMode, setViewModeState] = useState<ViewMode>(viewState.viewMode);
  const [density, setDensityState] = useState<"compact" | "comfortable">(viewState.density);
  const [pageSize, setPageSize] = useState(viewState.pageSize);

  useEffect(() => {
    const vs = getProductsViewState(userId ?? null, role, orgId, null);
    setViewModeState(vs.viewMode);
    setDensityState(vs.density);
    setPageSize(vs.pageSize);
  }, [userId, role, orgId]);

  const setViewMode = useCallback(
    (mode: ViewMode) => {
      setViewModeState(mode);
      setProductsViewState(userId ?? null, role, { viewMode: mode }, orgId, null);
    },
    [userId, role, orgId]
  );
  const setDensity = useCallback(
    (d: "compact" | "comfortable") => {
      setDensityState(d);
      setProductsViewState(userId ?? null, role, { density: d }, orgId, null);
    },
    [userId, role, orgId]
  );

  const capabilities = useMemo(() => getProductsCapabilities(me as Record<string, unknown>), [me]);
  const bulkActions = useMemo(
    () => buildBulkActions(capabilities, { hasBulkStatusEndpoint: false, hasBulkExport: true }),
    [capabilities]
  );

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(pagination.page));
      params.set("limit", String(pageSize));
      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      if (filters.approvalStatus) params.set("approvalStatus", filters.approvalStatus);
      if (filters.categoryId) params.set("categoryId", filters.categoryId);
      if (filters.brandId) params.set("brandId", filters.brandId);
      if (filters.sort) params.set("sort", filters.sort);
      const res = (await apiFetch(`/api/v1/products?${params.toString()}`)) as {
        data?: ProductListItem[];
        items?: ProductListItem[];
        pagination?: { page: number; limit: number; total: number; totalPages: number };
      };
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.items) ? res.items : [];
      const pag = res?.pagination ?? { page: 1, limit: pageSize, total: list.length, totalPages: 1 };
      setProducts(list as ProductListItem[]);
      setPagination({ page: pag.page, limit: pag.limit, total: pag.total, totalPages: Math.max(1, pag.totalPages) });
      setError(null);
    } catch (e: unknown) {
      setError((e as Error)?.message || "Failed to load products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pageSize, filters.search, filters.status, filters.approvalStatus, filters.categoryId, filters.brandId, filters.sort]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput }));
      setPagination((p) => (p.page === 1 ? p : { ...p, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const applySearchNow = useCallback(() => {
    setFilters((f) => ({ ...f, search: searchInput }));
    setPagination((p) => ({ ...p, page: 1 }));
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [catRes, brandRes] = await Promise.all([
          apiFetch("/api/v1/meta/categories").catch(() => null),
          apiFetch("/api/v1/meta/brands").catch(() => null),
        ]);
        if (cancelled) return;
        let catData: CategoryNode[] = [];
        if (catRes && Array.isArray((catRes as { data?: CategoryNode[] })?.data)) catData = (catRes as { data: CategoryNode[] }).data;
        else if (Array.isArray(catRes)) catData = catRes as CategoryNode[];
        let brandData: Brand[] = [];
        if (brandRes && Array.isArray((brandRes as { data?: Brand[] })?.data)) brandData = (brandRes as { data: Brand[] }).data;
        else if (Array.isArray(brandRes)) brandData = brandRes as Brand[];
        setCategories(catData);
        setBrands(brandData);
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const kpiStats: ProductsKpiStats = useMemo(() => {
    const total = pagination.total;
    let active = 0, inactive = 0, draft = 0, pendingApproval = 0;
    products.forEach((p) => {
      if (p.status === "ACTIVE") active++;
      else inactive++;
      const a = p.approvalStatus ?? "DRAFT";
      if (a === "DRAFT") draft++;
      else if (a === "PENDING_APPROVAL") pendingApproval++;
    });
    return {
      total,
      active: total > 0 ? active : 0,
      inactive: total > 0 ? inactive : 0,
      lowStock: -1,
      draft: total > 0 ? draft : -1,
      pendingApproval: total > 0 ? pendingApproval : -1,
    };
  }, [pagination.total, products]);

  const handleToggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) setSelectedIds(new Set(products.map((p) => p.id)));
    else setSelectedIds(new Set());
  }, [products]);

  const handleBulkAction = useCallback(
    async (actionId: string) => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      setBulkLoading(true);
      try {
        if (actionId === "submit_approval") {
          for (const id of ids) {
            await apiFetch(`/api/v1/products/${id}/submit-for-approval`, { method: "POST" });
          }
          loadProducts();
          setSelectedIds(new Set());
        } else if (actionId === "publish") {
          for (const id of ids) {
            await apiFetch(`/api/v1/products/${id}/publish`, { method: "POST" });
          }
          loadProducts();
          setSelectedIds(new Set());
        } else if (actionId === "export") {
          const rows = products.filter((p) => ids.includes(p.id));
          const headers = ["id", "name", "slug", "status", "approvalStatus"];
          const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => JSON.stringify((r as Record<string, unknown>)[h] ?? "")).join(","))].join("\n");
          const blob = new Blob([csv], { type: "text/csv" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "products.csv";
          a.click();
          URL.revokeObjectURL(a.href);
        }
      } catch (e: unknown) {
        console.error("Bulk action error:", e);
      } finally {
        setBulkLoading(false);
      }
    },
    [selectedIds, products, loadProducts]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm("Are you sure you want to delete this product?")) return;
      try {
        await apiFetch(`/api/v1/products/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" } });
        loadProducts();
        setDrawerProductId(null);
      } catch (e: unknown) {
        alert((e as Error)?.message || "Failed to delete");
      }
    },
    [loadProducts]
  );

  const handleQuickAdd = useCallback(() => {
    setEditingProduct(null);
    setFormData({ name: "", status: "ACTIVE", variants: [] });
    setShowQuickAdd(true);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        if (editingProduct) {
          await apiFetch(`/api/v1/products/${editingProduct.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: formData.name, status: formData.status }),
          });
        } else {
          await apiFetch("/api/v1/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: formData.name,
              status: formData.status,
              variants: formData.variants.filter((v) => v.sku && v.title),
            }),
          });
        }
        setShowQuickAdd(false);
        setEditingProduct(null);
        setFormData({ name: "", status: "ACTIVE", variants: [] });
        loadProducts();
      } catch (e: unknown) {
        alert((e as Error)?.message || "Failed to save product");
      }
    },
    [editingProduct, formData, loadProducts]
  );

  const handleEdit = useCallback((product: ProductListItem) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      status: product.status,
      variants: product.variants?.map((v) => ({ sku: v.sku, title: v.title })) ?? [],
    });
    setShowQuickAdd(true);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSearchInput("");
    setPagination((p) => ({ ...p, page: 1 }));
  }, []);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div className="dashboard-main-body">
      <div className="row g-3">
        <div className="col-12">
          <ProductsPageHeader
            title="Products"
            total={pagination.total}
            visibleCount={products.length}
            onAdd={handleQuickAdd}
            addLabel="+ Add Product"
            exportOnClick={() => handleBulkAction("export")}
            exportLabel="Export"
          />

          <ProductsKpiStrip stats={kpiStats} role={role} loading={loading} className="mb-3" />

          <ProductsFiltersPanel
            filters={filters}
            onFiltersChange={(partial) => {
              setFilters((f) => ({ ...f, ...partial }));
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            categories={flattenCategories(categories)}
            brands={brands}
            onReset={resetFilters}
            search={searchInput}
            onSearchChange={setSearchInput}
            onSearchSubmit={applySearchNow}
            searchPlaceholder="Search name, SKU…"
            viewMode={viewMode}
            setViewMode={setViewMode}
            density={density}
            setDensity={setDensity}
          />

          {error && (
            <div className="alert alert-danger radius-12 d-flex align-items-center justify-content-between" role="alert">
              <span>{error}</span>
              <button type="button" className="btn btn-sm btn-outline-danger radius-12" onClick={loadProducts}>
                Retry
              </button>
            </div>
          )}

          {selectedIds.size > 0 && (
            <BulkActionBar
              selectedIds={Array.from(selectedIds)}
              actions={bulkActions}
              onAction={handleBulkAction}
              onClear={() => setSelectedIds(new Set())}
              loading={bulkLoading}
              className="mb-2"
            />
          )}

          <div className="card radius-12 border">
            <div className="card-body">
              {loading ? (
                <ProductsLoadingSkeleton rows={8} mode={viewMode} />
              ) : products.length === 0 ? (
                <ProductsEmptyState
                  title="No products found"
                  message="Create your first product or browse the master catalog to add pre-configured products."
                  primaryLabel="Create product"
                  onPrimary={handleQuickAdd}
                  secondaryLabel="Browse catalog"
                  secondaryHref="/owner/products/master-catalog"
                  resetLabel="Reset filters"
                  onReset={resetFilters}
                />
              ) : viewMode === "grid" ? (
                <ProductsGrid
                  items={products}
                  onCardClick={setDrawerProductId}
                  selectedIds={selectedIds}
                  onSelectionChange={(id, selected) => handleToggleSelect(id)}
                  getProductLink={(id) => `/owner/products/${id}`}
                  getEditLink={(id) => `/owner/products/${id}/edit`}
                  onDelete={capabilities.canDeleteProduct ? handleDelete : undefined}
                  canDelete={capabilities.canDeleteProduct}
                />
              ) : (
                <div className="products-table-wrapper">
                <ProductsTable
                  products={products}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onSelectAll={handleSelectAll}
                  onOpenQuickView={setDrawerProductId}
                  onDelete={handleDelete}
                  isMobile={isMobile}
                />
                </div>
              )}

              {!loading && pagination.totalPages > 1 && (
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-3 pt-3 border-top">
                  <div className="d-flex align-items-center gap-2">
                    <span className="small text-muted">Page {pagination.page} of {pagination.totalPages}</span>
                    <select
                      className="form-select form-select-sm radius-12"
                      style={{ width: "auto" }}
                      value={pageSize}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setPageSize(v);
                        setProductsViewState(userId ?? null, role, { pageSize: v }, orgId, null);
                        setPagination((p) => ({ ...p, page: 1, limit: v }));
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
                    align="end"
                    ariaLabel="Products pagination"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ProductDetailsDrawer
        productId={drawerProductId}
        open={drawerProductId !== null}
        onClose={() => setDrawerProductId(null)}
        getProductLink={(id) => `/owner/products/${id}`}
        getEditLink={(id) => `/owner/products/${id}/edit`}
        getVariantsLink={(id) => `/owner/products/${id}/variants`}
        getPricingLink={(id) => `/owner/products/${id}/pricing`}
        getLocationsLink={(id) => `/owner/products/${id}/locations`}
        permissions={capabilities}
        onUpdated={loadProducts}
      />

      {showQuickAdd && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowQuickAdd(false)}
        >
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h6 className="modal-title">{editingProduct ? "Edit Product" : "Add Product"}</h6>
                <button type="button" className="btn-close" onClick={() => setShowQuickAdd(false)} />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Product Name *</label>
                    <input
                      type="text"
                      className="form-control radius-12"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select radius-12"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <label className="form-label mb-0">Variants</label>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary radius-12"
                        onClick={() => setFormData({ ...formData, variants: [...formData.variants, { sku: "", title: "" }] })}
                      >
                        <i className="ri-add-line me-1" /> Add Variant
                      </button>
                    </div>
                    {formData.variants.map((variant, index) => (
                      <div key={index} className="card radius-12 mb-2">
                        <div className="card-body p-3">
                          <div className="row g-2">
                            <div className="col-5">
                              <input
                                type="text"
                                className="form-control form-control-sm radius-12"
                                placeholder="SKU"
                                value={variant.sku}
                                onChange={(e) => {
                                  const u = [...formData.variants];
                                  u[index] = { ...u[index], sku: e.target.value };
                                  setFormData({ ...formData, variants: u });
                                }}
                              />
                            </div>
                            <div className="col-5">
                              <input
                                type="text"
                                className="form-control form-control-sm radius-12"
                                placeholder="Title"
                                value={variant.title}
                                onChange={(e) => {
                                  const u = [...formData.variants];
                                  u[index] = { ...u[index], title: e.target.value };
                                  setFormData({ ...formData, variants: u });
                                }}
                              />
                            </div>
                            <div className="col-2">
                              <button
                                type="button"
                                className="btn btn-sm btn-light radius-12 w-100"
                                onClick={() => setFormData({ ...formData, variants: formData.variants.filter((_, i) => i !== index) })}
                              >
                                <i className="ri-delete-bin-line" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {formData.variants.length === 0 && (
                      <p className="text-muted small">No variants. Product will be created without variants.</p>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary radius-12" onClick={() => setShowQuickAdd(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary radius-12">
                    {editingProduct ? "Update" : "Create"} Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
