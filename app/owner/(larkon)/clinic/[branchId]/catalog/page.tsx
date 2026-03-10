"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import {
  ownerClinicItemsList,
  ownerClinicItemById,
  ownerClinicItemCreate,
  ownerClinicItemActivate,
  ownerClinicItemDeactivate,
  ownerClinicItemCategoryTree,
} from "@/app/owner/_lib/ownerApi";
import CatalogControlHeader from "@/app/owner/_components/clinic/catalog/CatalogControlHeader";
import CatalogKpiCards from "@/app/owner/_components/clinic/catalog/CatalogKpiCards";
import CatalogToolbar from "@/app/owner/_components/clinic/catalog/CatalogToolbar";
import CatalogItemsTable from "@/app/owner/_components/clinic/catalog/CatalogItemsTable";
import CatalogItemDetailDrawer from "@/app/owner/_components/clinic/catalog/CatalogItemDetailDrawer";
import CatalogTemplatesTab from "@/app/owner/_components/clinic/catalog/CatalogTemplatesTab";
import CatalogImportTab from "@/app/owner/_components/clinic/catalog/CatalogImportTab";
import {
  type ClinicalItemRow,
  type CatalogFilters,
  type CatalogKpiStats,
  DEFAULT_CATALOG_FILTERS,
  DOMAIN_BADGE,
} from "@/app/owner/_components/clinic/catalog/catalogConstants";

type CategoryNode = {
  id: number;
  name: string;
  parentId: number | null;
  domainType: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { items: number };
  children: CategoryNode[];
};

function flattenTree(nodes: CategoryNode[], acc: CategoryNode[] = []): CategoryNode[] {
  for (const n of nodes) {
    acc.push(n);
    if (n.children?.length) flattenTree(n.children, acc);
  }
  return acc;
}

function flattenCategoriesForSelect(nodes: CategoryNode[], prefix = ""): { id: number; name: string }[] {
  const out: { id: number; name: string }[] = [];
  for (const n of nodes) {
    out.push({ id: n.id, name: prefix ? `${prefix} › ${n.name}` : n.name });
    if (n.children?.length) out.push(...flattenCategoriesForSelect(n.children, prefix ? `${prefix} › ${n.name}` : n.name));
  }
  return out;
}

function CategoryTreeList({ node, level }: { node: CategoryNode; level: number }) {
  return (
    <>
      <div
        className="py-2 border-bottom border-light d-flex align-items-center"
        style={{ paddingLeft: `${level * 16}px` }}
      >
        <span className="fw-medium">{node.name}</span>
        {node.domainType && <span className="badge bg-secondary-subtle text-secondary-emphasis ms-2 radius-8">{node.domainType}</span>}
        {node._count != null && <span className="text-muted small ms-2">({node._count.items} items)</span>}
      </div>
      {node.children?.length ? node.children.map((child) => <CategoryTreeList key={child.id} node={child} level={level + 1} />) : null}
    </>
  );
}

export default function ClinicCatalogPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [data, setData] = useState<{ items: ClinicalItemRow[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>({
    items: [],
    pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
  });
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_CATALOG_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "items" | "categories" | "templates" | "import" | "linkages" | "audit">("items");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerItemId, setDrawerItemId] = useState<number | null>(null);
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const loadItems = useCallback(async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError("");
      const res = await ownerClinicItemsList(branchId, {
        page: 1,
        limit: 100,
        search: filters.search.trim() || undefined,
        domainType: filters.domainType || undefined,
        categoryId: filters.categoryId ? parseInt(filters.categoryId, 10) : undefined,
        isActive: filters.isActive === "true" ? true : filters.isActive === "false" ? false : undefined,
      });
      const items = (res.items ?? []) as ClinicalItemRow[];
      setData({ items, pagination: res.pagination ?? { page: 1, limit: 100, total: items.length, totalPages: 1 } });
    } catch (e) {
      setError((e as Error)?.message || "Failed to load catalog");
      setData({ items: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } });
    } finally {
      setLoading(false);
    }
  }, [branchId, filters.search, filters.domainType, filters.categoryId, filters.isActive]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => ({ ...f, search: searchInput })), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!branchId) return;
    setCategoriesLoading(true);
    ownerClinicItemCategoryTree(branchId)
      .then((tree) => setCategoryTree((tree ?? []) as CategoryNode[]))
      .catch(() => setCategoryTree([]))
      .finally(() => setCategoriesLoading(false));
  }, [branchId]);

  const categoryOptions = useMemo(() => flattenCategoriesForSelect(categoryTree), [categoryTree]);

  const filteredAndSortedItems = useMemo(() => {
    let list = [...data.items];
    if (filters.hasUsageTemplate === "true") {
      list = list.filter((r) => !!r.consumableProfile?.usageNoteTemplate?.trim());
    } else if (filters.hasUsageTemplate === "false") {
      list = list.filter((r) => !r.consumableProfile?.usageNoteTemplate?.trim());
    }
    if (filters.sort === "name") list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    else if (filters.sort === "updated_desc") list.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    else if (filters.sort === "updated_asc") list.sort((a, b) => (a.updatedAt || "").localeCompare(b.updatedAt || ""));
    return list;
  }, [data.items, filters.hasUsageTemplate, filters.sort]);

  const kpiStats = useMemo((): CatalogKpiStats => {
    const items = data.items;
    return {
      total: items.length,
      active: items.filter((r) => r.isActive !== false).length,
      procedureLinked: items.filter((r) => r.consumableProfile?.procedureLinked === true).length,
      sterile: items.filter((r) => r.consumableProfile?.sterileRequired === true || r.instrumentProfile?.sterilizationRequired === true).length,
      wastageTracked: items.filter((r) => r.consumableProfile?.wastageTrackRequired === true).length,
      incompleteOrAlerts: items.filter((r) => {
        const noUnit = !r.baseUnit?.trim() && !r.consumableProfile?.issueUnit?.trim();
        const inactive = r.isActive === false;
        return noUnit || inactive;
      }).length,
    };
  }, [data.items]);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_CATALOG_FILTERS);
    setSearchInput("");
  }, []);

  const handleDuplicate = useCallback(
    async (row: ClinicalItemRow) => {
      if (!branchId) return;
      try {
        const full = await ownerClinicItemById(branchId, row.id);
        if (!full || typeof full !== "object") return;
        const payload: Record<string, unknown> = {
          name: (full.name as string) ? `${full.name} (copy)` : "New item",
          domainType: full.domainType,
          categoryId: full.categoryId ?? undefined,
          baseUnit: full.baseUnit ?? undefined,
          description: full.description ?? undefined,
          brandName: full.brandName ?? undefined,
          manufacturerName: full.manufacturerName ?? undefined,
          medicineProfile: full.medicineProfile ?? undefined,
          consumableProfile: full.consumableProfile ?? undefined,
          instrumentProfile: full.instrumentProfile ?? undefined,
        };
        await ownerClinicItemCreate(branchId, payload);
        setDrawerItemId(null);
        toast.success("Item duplicated.");
        loadItems();
      } catch (e) {
        setError((e as Error)?.message || "Duplicate failed");
      }
    },
    [branchId, loadItems]
  );

  const handleActivate = useCallback(
    async (row: ClinicalItemRow) => {
      if (!branchId) return;
      try {
        await ownerClinicItemActivate(branchId, row.id);
        setDrawerItemId(null);
        toast.success("Item activated.");
        loadItems();
      } catch (e) {
        setError((e as Error)?.message || "Activate failed");
      }
    },
    [branchId, loadItems]
  );

  const handleDeactivate = useCallback(
    async (row: ClinicalItemRow) => {
      if (!branchId) return;
      try {
        await ownerClinicItemDeactivate(branchId, row.id);
        setDrawerItemId(null);
        toast.success("Item deactivated.");
        loadItems();
      } catch (e) {
        setError((e as Error)?.message || "Deactivate failed");
      }
    },
    [branchId, loadItems]
  );

  if (!branchId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch.</div>
      </div>
    );
  }

  const base = `/owner/clinic/${branchId}/catalog`;
  const tabs = [
    { key: "overview" as const, label: "Overview", icon: "ri-dashboard-line" },
    { key: "items" as const, label: "Items", icon: "ri-archive-line" },
    { key: "categories" as const, label: "Categories", icon: "ri-folder-line" },
    { key: "templates" as const, label: "Templates", icon: "ri-file-text-line" },
    { key: "import" as const, label: "Import", icon: "ri-upload-2-line" },
    { key: "linkages" as const, label: "Linkages", icon: "ri-link" },
    { key: "audit" as const, label: "Audit", icon: "ri-file-list-3-line" },
  ];

  return (
    <div className="dashboard-main-body">
      <CatalogControlHeader branchId={branchId} />

      {error && (
        <div className="alert alert-danger radius-12 mb-3 d-flex align-items-center">
          <i className="ri-error-warning-line me-2" aria-hidden />
          {error}
          <button type="button" className="btn-close ms-auto" onClick={() => setError("")} aria-label="Dismiss" />
        </div>
      )}

      <CatalogKpiCards stats={kpiStats} />

      <CatalogToolbar
        filters={filters}
        onFiltersChange={setFilters}
        categoryOptions={categoryOptions}
        onReset={handleResetFilters}
      />

      <ul className="nav nav-tabs nav-tabs-card mb-3" role="tablist">
        {tabs.map((tab) => (
          <li key={tab.key} className="nav-item" role="presentation">
            <button
              type="button"
              className={`nav-link radius-12 me-1 ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
              role="tab"
              aria-selected={activeTab === tab.key}
            >
              <i className={`${tab.icon} me-1`} aria-hidden />
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      {activeTab === "overview" && (
        <div className="card radius-12">
          <div className="card-body">
            <h6 className="mb-3">Catalog quality</h6>
            <div className="row g-3">
              <div className="col-6 col-md-4">
                <div className="p-3 bg-light rounded-3">
                  <div className="small text-muted">Domain distribution</div>
                  <div className="d-flex flex-wrap gap-1 mt-1">
                    {Object.keys(DOMAIN_BADGE).map((d) => (
                      <span key={d} className="badge bg-secondary-subtle text-secondary-emphasis radius-8">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-4">
                <div className="p-3 bg-light rounded-3">
                  <div className="small text-muted">Inactive items</div>
                  <div className="fs-5 fw-semibold">{kpiStats.active === 0 ? 0 : data.items.length - kpiStats.active}</div>
                </div>
              </div>
              <div className="col-6 col-md-4">
                <div className="p-3 bg-light rounded-3">
                  <div className="small text-muted">Items missing units</div>
                  <div className="fs-5 fw-semibold">
                    {data.items.filter((r) => !r.baseUnit?.trim() && !r.consumableProfile?.issueUnit?.trim()).length}
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-4">
                <div className="p-3 bg-light rounded-3">
                  <div className="small text-muted">Items not linked</div>
                  <div className="fs-5 fw-semibold">
                    {data.items.filter((r) => (r._count?.packageItems ?? 0) === 0).length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "items" && (
        <div role="tabpanel" aria-label="Catalog items">
          {loading ? (
            <div className="card radius-12">
              <div className="card-body text-center py-5">
                <div className="spinner-border text-primary" role="status" />
                <p className="text-muted mt-2 mb-0">Loading catalog…</p>
              </div>
            </div>
          ) : filteredAndSortedItems.length === 0 ? (
            <div className="card radius-12">
              <div className="card-body text-center py-5">
                <i className="ri-archive-line fs-1 text-muted d-block mb-3" aria-hidden />
                <h5 className="mb-2">No catalog items yet</h5>
                <p className="text-muted small mb-4">Add clinical items for packages and procedures.</p>
                <Link href={`${base}/new`} className="btn btn-primary radius-12">
                  <i className="ri-add-line me-1" /> Create your first item
                </Link>
              </div>
            </div>
          ) : (
            <div className="card radius-12">
              <div className="card-body p-0">
                <CatalogItemsTable
                  branchId={branchId}
                  items={filteredAndSortedItems}
                  onRowClick={(row) => setDrawerItemId(row.id)}
                  onActionSuccess={loadItems}
                  onDuplicate={handleDuplicate}
                  onActivate={handleActivate}
                  onDeactivate={handleDeactivate}
                />
              </div>
              {data.pagination.totalPages > 1 && (
                <div className="card-footer text-muted small">
                  Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
                </div>
              )}
            </div>
          )}

          <CatalogItemDetailDrawer
            branchId={branchId}
            itemId={drawerItemId}
            show={drawerItemId !== null}
            onHide={() => setDrawerItemId(null)}
            onUpdated={loadItems}
            linkageCount={drawerItemId ? filteredAndSortedItems.find((r) => r.id === drawerItemId)?._count?.packageItems : undefined}
          />
        </div>
      )}

      {activeTab === "categories" && (
        <div className="card radius-12">
          <div className="card-body">
            <p className="text-muted small mb-3">Manage hierarchical categories for clinical items. Item counts and domain are shown per category.</p>
            <Link href={`${base}/categories`} className="btn btn-primary radius-12">
              <i className="ri-folder-line me-1" /> Manage categories
            </Link>
            {categoriesLoading ? (
              <div className="mt-4 text-center text-muted small">Loading categories…</div>
            ) : categoryTree.length > 0 ? (
              <div className="mt-4">
                {categoryTree.map((node) => (
                  <CategoryTreeList key={node.id} node={node} level={0} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {activeTab === "templates" && (
        <CatalogTemplatesTab branchId={branchId} />
      )}

      {activeTab === "import" && (
        <CatalogImportTab branchId={branchId} />
      )}

      {activeTab === "linkages" && (
        <div className="card radius-12">
          <div className="card-body">
            <p className="text-muted small mb-3">Items and where they are used (packages).</p>
            {loading ? (
              <div className="text-center py-4 text-muted small">Loading…</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead className="table-light">
                    <tr>
                      <th>Item</th>
                      <th>Code</th>
                      <th className="text-center">Used in packages</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedItems
                      .filter((r) => (r._count?.packageItems ?? 0) > 0)
                      .map((r) => (
                        <tr key={r.id}>
                          <td>{r.name}</td>
                          <td><code className="small">{r.itemCode}</code></td>
                          <td className="text-center">{r._count?.packageItems ?? 0}</td>
                          <td>
                            <Link href={`/owner/clinic/${branchId}/packages`} className="btn btn-sm btn-outline-secondary radius-8">View packages</Link>
                          </td>
                        </tr>
                      ))}
                    {filteredAndSortedItems.every((r) => (r._count?.packageItems ?? 0) === 0) && (
                      <tr>
                        <td colSpan={4} className="text-muted text-center py-4">No package linkages yet. Link items from package edit.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <i className="ri-file-list-3-line fs-1 text-muted d-block mb-3" aria-hidden />
            <p className="text-muted mb-3">Catalog item change history is available in the admin Clinical Catalog audit.</p>
            <a href="/admin/clinical-catalog" className="btn btn-outline-primary radius-12" target="_blank" rel="noopener noreferrer">
              Open Admin Clinical Catalog
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
