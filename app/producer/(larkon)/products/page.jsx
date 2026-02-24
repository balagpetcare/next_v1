"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { useToast } from "@/src/hooks/useToast";
import { producerProductsList, producerFactoriesList } from "../../_lib/producerApi";
import ProducerTableSkeleton from "../../_components/ProducerTableSkeleton";
import ProducerPageShell from "../../_components/ProducerPageShell";
import ProducerSectionCard from "../../_components/ProducerSectionCard";
import ProducerEmptyState from "../../_components/ProducerEmptyState";
import { getErrorMessage } from "../../_lib/errors";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "status", label: "Status" },
];

const SAVED_VIEWS_KEY = "producer_products_saved_views";
const DEFAULT_PAGE_SIZE = 20;

function StatusBadge({ status }) {
  const s = status || "DRAFT";
  const cls =
    s === "APPROVED" || s === "ACTIVE"
      ? "bg-success"
      : s === "SUBMITTED" || s === "UNDER_REVIEW"
        ? "bg-info"
        : s === "REJECTED"
          ? "bg-danger"
          : s === "DRAFT"
            ? "bg-secondary"
            : "bg-secondary";
  return <span className={`badge ${cls}`}>{s.replace(/_/g, " ")}</span>;
}

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

export default function ProducerProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [factories, setFactories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState(() => searchParams?.get("view") || "table"); // grid | table

  // URL-driven state (initial from URL)
  const [q, setQ] = useState(() => searchParams?.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState(() => searchParams?.get("status") ?? "");
  const [categoryFilter, setCategoryFilter] = useState(() => searchParams?.get("category") ?? "");
  const [brandFilter, setBrandFilter] = useState(() => searchParams?.get("brand") ?? "");
  const [factoryFilter, setFactoryFilter] = useState(() => searchParams?.get("factoryId") ?? "");
  const [dateFrom, setDateFrom] = useState(() => searchParams?.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(() => searchParams?.get("dateTo") ?? "");
  const [needsAction, setNeedsAction] = useState(() => searchParams?.get("needsAction") === "1");
  const [sort, setSort] = useState(() => searchParams?.get("sort") || "newest");
  const [page, setPage] = useState(() => Math.max(1, parseInt(searchParams?.get("page") || "1", 10)));
  const [savedViews, setSavedViews] = useState([]);

  const debouncedQ = useDebounce(q, 400);
  const cacheKeyRef = useRef(null);
  const lastDataRef = useRef(null);

  // Sync URL when filters/page/sort change
  const updateUrl = useCallback(
    (updates = {}) => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      const qq = updates.q !== undefined ? updates.q : q;
      const st = updates.status !== undefined ? updates.status : statusFilter;
      const cat = updates.category !== undefined ? updates.category : categoryFilter;
      const br = updates.brand !== undefined ? updates.brand : brandFilter;
      const fac = updates.factoryId !== undefined ? updates.factoryId : factoryFilter;
      const df = updates.dateFrom !== undefined ? updates.dateFrom : dateFrom;
      const dt = updates.dateTo !== undefined ? updates.dateTo : dateTo;
      const na = updates.needsAction !== undefined ? updates.needsAction : needsAction;
      const so = updates.sort !== undefined ? updates.sort : sort;
      const p = updates.page !== undefined ? updates.page : page;

      if (qq) params.set("q", qq);
      else params.delete("q");
      if (st) params.set("status", st);
      else params.delete("status");
      if (cat) params.set("category", cat);
      else params.delete("category");
      if (br) params.set("brand", br);
      else params.delete("brand");
      if (fac) params.set("factoryId", fac);
      else params.delete("factoryId");
      if (df) params.set("dateFrom", df);
      else params.delete("dateFrom");
      if (dt) params.set("dateTo", dt);
      else params.delete("dateTo");
      if (na) params.set("needsAction", "1");
      else params.delete("needsAction");
      if (so && so !== "newest") params.set("sort", so);
      else params.delete("sort");
      if (p > 1) params.set("page", String(p));
      else params.delete("page");
      if (viewMode) params.set("view", viewMode);
      router.replace(`/producer/products?${params.toString()}`, { scroll: false });
    },
    [
      q,
      statusFilter,
      categoryFilter,
      brandFilter,
      factoryFilter,
      dateFrom,
      dateTo,
      needsAction,
      sort,
      page,
      viewMode,
      router,
      searchParams,
    ]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await producerProductsList({});
      const list = Array.isArray(res) ? res : [];
      lastDataRef.current = list;
      setItems(list);
    } catch (e) {
      if (e?.status === 401) {
        router.replace("/producer/login?from=/producer/products");
        return;
      }
      if (e?.status === 403) {
        setItems([]);
        toast.error("You don't have access to products.");
        return;
      }
      setItems([]);
      toast.error(getErrorMessage(e, "Failed to load products"));
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    producerFactoriesList()
      .then((list) => setFactories(Array.isArray(list) ? list : []))
      .catch(() => setFactories([]));
  }, []);

  // Load saved views from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage?.getItem(SAVED_VIEWS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setSavedViews(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSavedViews([]);
    }
  }, []);

  const hasActiveFilters =
    debouncedQ ||
    statusFilter ||
    categoryFilter ||
    brandFilter ||
    factoryFilter ||
    dateFrom ||
    dateTo ||
    needsAction;

  const filtered = useMemo(() => {
    let list = [...items];
    const term = (debouncedQ || "").trim().toLowerCase();
    if (term) {
      list = list.filter(
        (p) =>
          (p.productName || "").toLowerCase().includes(term) ||
          (p.brandName || "").toLowerCase().includes(term) ||
          (p.sku || "").toLowerCase().includes(term) ||
          String(p.id).includes(term) ||
          (p.barcode || "").toLowerCase().includes(term)
      );
    }
    if (statusFilter) {
      list = list.filter((p) => (p.status || "DRAFT") === statusFilter);
    }
    if (categoryFilter) {
      list = list.filter((p) => (p.productType || "") === categoryFilter);
    }
    if (brandFilter) {
      list = list.filter(
        (p) => (p.brandName || "").toLowerCase() === brandFilter.toLowerCase()
      );
    }
    if (factoryFilter) {
      list = list.filter((p) => Number(p.factoryId) === Number(factoryFilter));
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      list = list.filter((p) => {
        const d = p.submittedAt ? new Date(p.submittedAt) : new Date(p.createdAt);
        return d >= from;
      });
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter((p) => {
        const d = p.submittedAt ? new Date(p.submittedAt) : new Date(p.createdAt);
        return d <= to;
      });
    }
    if (needsAction) {
      list = list.filter((p) => p.status === "REJECTED" || p.status === "DRAFT");
    }
    // Sort
    if (sort === "oldest") {
      list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sort === "newest") {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sort === "name_asc") {
      list.sort((a, b) => (a.productName || "").localeCompare(b.productName || ""));
    } else if (sort === "name_desc") {
      list.sort((a, b) => (b.productName || "").localeCompare(a.productName || ""));
    } else if (sort === "status") {
      list.sort((a, b) => (a.status || "").localeCompare(b.status || ""));
    }
    return list;
  }, [
    items,
    debouncedQ,
    statusFilter,
    categoryFilter,
    brandFilter,
    factoryFilter,
    dateFrom,
    dateTo,
    needsAction,
    sort,
  ]);

  const totalFiltered = filtered.length;
  const pageSize = DEFAULT_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const categoriesFromData = useMemo(() => {
    const set = new Set();
    items.forEach((p) => {
      if (p.productType) set.add(p.productType);
    });
    return Array.from(set).sort();
  }, [items]);

  const brandsFromData = useMemo(() => {
    const set = new Set();
    items.forEach((p) => {
      if (p.brandName) set.add(p.brandName);
    });
    return Array.from(set).sort();
  }, [items]);

  const clearFilters = () => {
    setQ("");
    setStatusFilter("");
    setCategoryFilter("");
    setBrandFilter("");
    setFactoryFilter("");
    setDateFrom("");
    setDateTo("");
    setNeedsAction(false);
    setPage(1);
    updateUrl({
      q: "",
      status: "",
      category: "",
      brand: "",
      factoryId: "",
      dateFrom: "",
      dateTo: "",
      needsAction: false,
      page: 1,
    });
  };

  const removeChip = (key) => {
    if (key === "q") setQ("");
    if (key === "status") setStatusFilter("");
    if (key === "category") setCategoryFilter("");
    if (key === "brand") setBrandFilter("");
    if (key === "factoryId") setFactoryFilter("");
    if (key === "dateFrom") setDateFrom("");
    if (key === "dateTo") setDateTo("");
    if (key === "needsAction") setNeedsAction(false);
    setPage(1);
    setTimeout(() => updateUrl(), 0);
  };

  const saveCurrentView = () => {
    const name = window.prompt("Name this view (e.g. My Drafts, Rejected Fixes)");
    if (!name?.trim()) return;
    const view = {
      id: Date.now().toString(),
      name: name.trim(),
      q,
      status: statusFilter,
      category: categoryFilter,
      brand: brandFilter,
      factoryId: factoryFilter,
      dateFrom,
      dateTo,
      needsAction,
      sort,
    };
    const next = [...savedViews, view];
    setSavedViews(next);
    try {
      window.localStorage?.setItem(SAVED_VIEWS_KEY, JSON.stringify(next));
    } catch {}
    toast.success("View saved");
  };

  const applySavedView = (view) => {
    setQ(view.q || "");
    setStatusFilter(view.status || "");
    setCategoryFilter(view.category || "");
    setBrandFilter(view.brand || "");
    setFactoryFilter(view.factoryId || "");
    setDateFrom(view.dateFrom || "");
    setDateTo(view.dateTo || "");
    setNeedsAction(!!view.needsAction);
    setSort(view.sort || "newest");
    setPage(1);
    updateUrl({
      q: view.q || "",
      status: view.status || "",
      category: view.category || "",
      brand: view.brand || "",
      factoryId: view.factoryId || "",
      dateFrom: view.dateFrom || "",
      dateTo: view.dateTo || "",
      needsAction: view.needsAction,
      sort: view.sort || "newest",
      page: 1,
    });
  };

  const setPageAndUrl = (p) => {
    const next = Math.max(1, Math.min(p, totalPages));
    setPage(next);
    updateUrl({ page: next });
  };

  // Sync URL with filter state so refresh preserves state
  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter) params.set("status", statusFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (brandFilter) params.set("brand", brandFilter);
    if (factoryFilter) params.set("factoryId", factoryFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (needsAction) params.set("needsAction", "1");
    if (sort && sort !== "newest") params.set("sort", sort);
    if (page > 1) params.set("page", String(page));
    if (viewMode) params.set("view", viewMode);
    router.replace(`/producer/products?${params.toString()}`, { scroll: false });
  }, [q, statusFilter, categoryFilter, brandFilter, factoryFilter, dateFrom, dateTo, needsAction, sort, page, viewMode, router]);

  return (
    <ProducerPageShell
      title="Products"
      breadcrumbs={[{ label: "Products" }]}
      actions={
        <Link href="/producer/products/new" className="btn btn-primary btn-sm radius-12">
          <Icon icon="solar:add-circle-outline" className="me-1" aria-hidden />
          New Product
        </Link>
      }
    >
      <ProducerSectionCard
        title="All products"
        right={
          <div className="d-flex gap-2 flex-wrap align-items-center">
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Search name, brand, SKU, ID"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ maxWidth: 220 }}
              aria-label="Search products"
            />
            <select
              className="form-select form-select-sm"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                updateUrl({ sort: e.target.value, page: 1 });
              }}
              style={{ maxWidth: 160 }}
              aria-label="Sort"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className={`btn ${viewMode === "table" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setViewMode("table")}
                aria-label="Table view"
              >
                <Icon icon="solar:list-outline" />
              </button>
              <button
                type="button"
                className={`btn ${viewMode === "grid" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
              >
                <Icon icon="solar:widget-4-outline" />
              </button>
            </div>
          </div>
        }
      >
        {/* Filter panel */}
        <div className="mb-3">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm radius-12 me-2"
            onClick={() => setFilterOpen((o) => !o)}
            aria-expanded={filterOpen}
          >
            <Icon icon={filterOpen ? "solar:alt-arrow-up-outline" : "solar:filter-outline"} className="me-1" />
            Filters
          </button>
          {savedViews.length > 0 && (
            <div className="d-inline-block dropdown">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm radius-12 dropdown-toggle"
                data-bs-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="false"
              >
                Saved views
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                {savedViews.map((v) => (
                  <li key={v.id}>
                    <button type="button" className="dropdown-item" onClick={() => applySavedView(v)}>
                      {v.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm radius-12 ms-2"
            onClick={saveCurrentView}
          >
            Save current view
          </button>
        </div>

        {filterOpen && (
          <div className="card card-body mb-3 radius-12 bg-light">
            <div className="row g-2">
              <div className="col-md-2">
                <label className="form-label small mb-0">Status</label>
                <select
                  className="form-select form-select-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Status"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value || "all"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {categoriesFromData.length > 0 && (
                <div className="col-md-2">
                  <label className="form-label small mb-0">Category</label>
                  <select
                    className="form-select form-select-sm"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    aria-label="Category"
                  >
                    <option value="">All</option>
                    {categoriesFromData.map((c) => (
                      <option key={c} value={c}>
                        {c.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {brandsFromData.length > 0 && (
                <div className="col-md-2">
                  <label className="form-label small mb-0">Brand</label>
                  <select
                    className="form-select form-select-sm"
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                    aria-label="Brand"
                  >
                    <option value="">All</option>
                    {brandsFromData.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {factories.length > 0 && (
                <div className="col-md-2">
                  <label className="form-label small mb-0">Factory</label>
                  <select
                    className="form-select form-select-sm"
                    value={factoryFilter}
                    onChange={(e) => setFactoryFilter(e.target.value)}
                    aria-label="Factory"
                  >
                    <option value="">All</option>
                    {factories.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="col-md-2">
                <label className="form-label small mb-0">Date from</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  aria-label="Date from"
                />
              </div>
              <div className="col-md-2">
                <label className="form-label small mb-0">Date to</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  aria-label="Date to"
                />
              </div>
              <div className="col-md-2 d-flex align-items-end">
                <div className="form-check">
                  <input
                    id="needsAction"
                    type="checkbox"
                    className="form-check-input"
                    checked={needsAction}
                    onChange={(e) => setNeedsAction(e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="needsAction">
                    Needs action
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
            {debouncedQ && (
              <span className="badge bg-light text-dark border d-inline-flex align-items-center gap-1">
                Search: {debouncedQ}
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 ms-1"
                  onClick={() => removeChip("q")}
                  aria-label="Remove search"
                >
                  <Icon icon="solar:close-circle-outline" />
                </button>
              </span>
            )}
            {statusFilter && (
              <span className="badge bg-light text-dark border d-inline-flex align-items-center gap-1">
                Status: {statusFilter}
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 ms-1"
                  onClick={() => removeChip("status")}
                  aria-label="Remove status"
                >
                  <Icon icon="solar:close-circle-outline" />
                </button>
              </span>
            )}
            {categoryFilter && (
              <span className="badge bg-light text-dark border d-inline-flex align-items-center gap-1">
                Category: {categoryFilter}
                <button type="button" className="btn btn-link btn-sm p-0 ms-1" onClick={() => removeChip("category")}>
                  <Icon icon="solar:close-circle-outline" />
                </button>
              </span>
            )}
            {brandFilter && (
              <span className="badge bg-light text-dark border d-inline-flex align-items-center gap-1">
                Brand: {brandFilter}
                <button type="button" className="btn btn-link btn-sm p-0 ms-1" onClick={() => removeChip("brand")}>
                  <Icon icon="solar:close-circle-outline" />
                </button>
              </span>
            )}
            {factoryFilter && (
              <span className="badge bg-light text-dark border d-inline-flex align-items-center gap-1">
                Factory
                <button type="button" className="btn btn-link btn-sm p-0 ms-1" onClick={() => removeChip("factoryId")}>
                  <Icon icon="solar:close-circle-outline" />
                </button>
              </span>
            )}
            {(dateFrom || dateTo) && (
              <span className="badge bg-light text-dark border d-inline-flex align-items-center gap-1">
                Date range
                <button type="button" className="btn btn-link btn-sm p-0 ms-1" onClick={() => { removeChip("dateFrom"); removeChip("dateTo"); }}>
                  <Icon icon="solar:close-circle-outline" />
                </button>
              </span>
            )}
            {needsAction && (
              <span className="badge bg-light text-dark border d-inline-flex align-items-center gap-1">
                Needs action
                <button type="button" className="btn btn-link btn-sm p-0 ms-1" onClick={() => removeChip("needsAction")}>
                  <Icon icon="solar:close-circle-outline" />
                </button>
              </span>
            )}
            <button type="button" className="btn btn-link btn-sm p-0" onClick={clearFilters}>
              Clear all
            </button>
          </div>
        )}

        {loading ? (
          <ProducerTableSkeleton rows={6} cols={6} />
        ) : filtered.length === 0 ? (
          <ProducerEmptyState
            title={items.length === 0 ? "No products yet" : "No products match filters"}
            message={
              items.length === 0
                ? "Create your first product to start managing batches and codes."
                : "Try changing search or filters."
            }
            icon={<Icon icon="solar:box-outline" className="display-4 text-muted" aria-hidden />}
            primaryLabel="New Product"
            primaryHref="/producer/products/new"
            {...(items.length > 0 && { secondaryLabel: "Clear filters", secondaryHref: "/producer/products" })}
          />
        ) : viewMode === "table" ? (
          <>
            <div className="table-responsive">
              <table className="table table-bordered table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Brand</th>
                    <th>Name</th>
                    <th>SKU</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link
                          href={`/producer/products/${p.id}`}
                          className="text-primary text-decoration-none fw-medium"
                        >
                          {p.id}
                        </Link>
                      </td>
                      <td>{p.brandName || "—"}</td>
                      <td>{p.productName}</td>
                      <td>{p.sku || "—"}</td>
                      <td><StatusBadge status={p.status} /></td>
                      <td>
                        <div className="d-flex gap-2 flex-wrap">
                          <Link
                            className="btn btn-sm btn-outline-primary radius-12"
                            href={`/producer/products/${p.id}`}
                          >
                            View
                          </Link>
                          {(p.status === "DRAFT" || p.status === "REJECTED") && (
                            <Link
                              className="btn btn-sm btn-outline-secondary radius-12"
                              href={`/producer/products/${p.id}/edit`}
                            >
                              Edit
                            </Link>
                          )}
                          {p.status !== "DRAFT" && p.status !== "REJECTED" && (
                            <Link
                              className="btn btn-sm btn-outline-secondary radius-12"
                              href={`/producer/products/${p.id}/edit`}
                              title="Edit is only allowed for Draft or Rejected (backend may restrict Rejected)"
                            >
                              Edit
                            </Link>
                          )}
                          <Link
                            className="btn btn-sm btn-outline-secondary radius-12"
                            href={`/producer/batches`}
                          >
                            Batches
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination — table view */}
            {totalPages > 1 && (
              <nav className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2" aria-label="Products pagination">
                <span className="small text-muted">
                  Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalFiltered)} of {totalFiltered}
                </span>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage <= 1 ? "disabled" : ""}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setPageAndUrl(currentPage - 1)}
                      disabled={currentPage <= 1}
                      aria-label="Previous page"
                    >
                      Previous
                    </button>
                  </li>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                    .map((p, idx, arr) => (
                      <React.Fragment key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <li className="page-item disabled"><span className="page-link">…</span></li>
                        )}
                        <li className={`page-item ${p === currentPage ? "active" : ""}`}>
                          <button type="button" className="page-link" onClick={() => setPageAndUrl(p)}>
                            {p}
                          </button>
                        </li>
                      </React.Fragment>
                    ))}
                  <li className={`page-item ${currentPage >= totalPages ? "disabled" : ""}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setPageAndUrl(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      aria-label="Next page"
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </>
        ) : (
          <>
            <div className="row g-3">
              {paginated.map((p) => (
                <div key={p.id} className="col-sm-6 col-md-4 col-lg-3">
                  <div className="card radius-12 h-100">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <Link href={`/producer/products/${p.id}`} className="fw-medium text-primary text-decoration-none">
                          {p.productName}
                        </Link>
                        <StatusBadge status={p.status} />
                      </div>
                      <p className="small text-muted mb-1">{p.brandName || "—"} · {p.sku || "—"}</p>
                      <div className="d-flex gap-2 flex-wrap mt-2">
                        <Link className="btn btn-sm btn-outline-primary radius-12" href={`/producer/products/${p.id}`}>
                          View
                        </Link>
                        <Link className="btn btn-sm btn-outline-secondary radius-12" href={`/producer/products/${p.id}/edit`}>
                          Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Pagination — grid view */}
            {totalPages > 1 && (
              <nav className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2" aria-label="Products pagination">
                <span className="small text-muted">
                  Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalFiltered)} of {totalFiltered}
                </span>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage <= 1 ? "disabled" : ""}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setPageAndUrl(currentPage - 1)}
                      disabled={currentPage <= 1}
                      aria-label="Previous page"
                    >
                      Previous
                    </button>
                  </li>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                    .map((p, idx, arr) => (
                      <React.Fragment key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <li className="page-item disabled"><span className="page-link">…</span></li>
                        )}
                        <li className={`page-item ${p === currentPage ? "active" : ""}`}>
                          <button type="button" className="page-link" onClick={() => setPageAndUrl(p)}>
                            {p}
                          </button>
                        </li>
                      </React.Fragment>
                    ))}
                  <li className={`page-item ${currentPage >= totalPages ? "disabled" : ""}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setPageAndUrl(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      aria-label="Next page"
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </>
        )}
      </ProducerSectionCard>
    </ProducerPageShell>
  );
}
