"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { useToast } from "@/src/hooks/useToast";
import { producerProductsList, producerMe, producerFactoriesList } from "../../_lib/producerApi";
import { normalizeApiError, useApiErrorPopup } from "../../_lib/apiErrorPopup";
import { Dropdown } from "react-bootstrap";
import ProducerTableSkeleton from "../../_components/ProducerTableSkeleton";
import ProducerPageShell from "../../_components/ProducerPageShell";
import ProducerSectionCard from "../../_components/ProducerSectionCard";
import ProducerEmptyState from "../../_components/ProducerEmptyState";

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
  { value: "updated", label: "Last updated" },
];

const DEFAULT_PAGE_SIZE = 20;

function StatusPill({ status }) {
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
  return (
    <span className={`badge ${cls} radius-12 text-uppercase`}>
      {s.replace(/_/g, " ")}
    </span>
  );
}

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

function formatDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ProducerProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { showApiErrorPopup, ApiErrorModal } = useApiErrorPopup();
  const [org, setOrg] = useState(null);
  const [items, setItems] = useState([]);
  const [factories, setFactories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [q, setQ] = useState(() => searchParams?.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState(
    () => searchParams?.get("status") ?? ""
  );
  const [categoryFilter, setCategoryFilter] = useState(
    () => searchParams?.get("category") ?? ""
  );
  const [brandFilter, setBrandFilter] = useState(
    () => searchParams?.get("brand") ?? ""
  );
  const [factoryFilter, setFactoryFilter] = useState(
    () => searchParams?.get("factoryId") ?? ""
  );
  const [dateFrom, setDateFrom] = useState(
    () => searchParams?.get("dateFrom") ?? ""
  );
  const [dateTo, setDateTo] = useState(() => searchParams?.get("dateTo") ?? "");
  const [sort, setSort] = useState(() => searchParams?.get("sort") || "newest");
  const [page, setPage] = useState(() =>
    Math.max(1, parseInt(searchParams?.get("page") || "1", 10))
  );

  const debouncedQ = useDebounce(q, 400);

  const updateUrl = useCallback(
    (updates = {}) => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      const qq = updates.q !== undefined ? updates.q : q;
      const st = updates.status !== undefined ? updates.status : statusFilter;
      const cat =
        updates.category !== undefined ? updates.category : categoryFilter;
      const br = updates.brand !== undefined ? updates.brand : brandFilter;
      const fac =
        updates.factoryId !== undefined ? updates.factoryId : factoryFilter;
      const df = updates.dateFrom !== undefined ? updates.dateFrom : dateFrom;
      const dt = updates.dateTo !== undefined ? updates.dateTo : dateTo;
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
      if (so && so !== "newest") params.set("sort", so);
      else params.delete("sort");
      if (p > 1) params.set("page", String(p));
      else params.delete("page");
      router.replace(`/producer/products?${params.toString()}`, {
        scroll: false,
      });
    },
    [
      q,
      statusFilter,
      categoryFilter,
      brandFilter,
      factoryFilter,
      dateFrom,
      dateTo,
      sort,
      page,
      router,
      searchParams,
    ]
  );

  const load = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const res = await producerProductsList({});
      const list = Array.isArray(res) ? res : [];
      setItems(list);
    } catch (e) {
      if (e?.status === 401) {
        router.replace("/producer/login?from=/producer/products");
        return;
      }
      setItems([]);
      setLoadError(true);
      showApiErrorPopup(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  }, [router, showApiErrorPopup]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    producerMe(true).then((me) => {
      if (me?.org) setOrg(me.org);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    producerFactoriesList()
      .then((list) => setFactories(Array.isArray(list) ? list : []))
      .catch(() => setFactories([]));
  }, []);

  useEffect(() => {
    setQ(searchParams?.get("q") ?? "");
    setStatusFilter(searchParams?.get("status") ?? "");
    setCategoryFilter(searchParams?.get("category") ?? "");
    setBrandFilter(searchParams?.get("brand") ?? "");
    setFactoryFilter(searchParams?.get("factoryId") ?? "");
    setDateFrom(searchParams?.get("dateFrom") ?? "");
    setDateTo(searchParams?.get("dateTo") ?? "");
    setSort(searchParams?.get("sort") || "newest");
    setPage(Math.max(1, parseInt(searchParams?.get("page") || "1", 10)));
  }, [searchParams]);

  const hasActiveFilters =
    debouncedQ ||
    statusFilter ||
    categoryFilter ||
    brandFilter ||
    factoryFilter ||
    dateFrom ||
    dateTo;

  const filtered = useMemo(() => {
    let list = [...items];
    const term = (debouncedQ || "").trim().toLowerCase();
    if (term) {
      list = list.filter(
        (p) =>
          (p.productName || "").toLowerCase().includes(term) ||
          (p.brandName || "").toLowerCase().includes(term) ||
          (p.sku || "").toLowerCase().includes(term) ||
          String(p.id).includes(term)
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
      list = list.filter(
        (p) => Number(p.factoryId) === Number(factoryFilter)
      );
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      list = list.filter((p) => {
        const d = p.updatedAt
          ? new Date(p.updatedAt)
          : new Date(p.createdAt);
        return d >= from;
      });
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter((p) => {
        const d = p.updatedAt
          ? new Date(p.updatedAt)
          : new Date(p.createdAt);
        return d <= to;
      });
    }
    if (sort === "oldest") {
      list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sort === "newest") {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sort === "name_asc") {
      list.sort((a, b) =>
        (a.productName || "").localeCompare(b.productName || "")
      );
    } else if (sort === "name_desc") {
      list.sort((a, b) =>
        (b.productName || "").localeCompare(a.productName || "")
      );
    } else if (sort === "updated") {
      list.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt) -
          new Date(a.updatedAt || a.createdAt)
      );
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
    sort,
  ]);

  const totalFiltered = filtered.length;
  const totalPages = Math.max(
    1,
    Math.ceil(totalFiltered / DEFAULT_PAGE_SIZE)
  );
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * DEFAULT_PAGE_SIZE;
    return filtered.slice(start, start + DEFAULT_PAGE_SIZE);
  }, [filtered, currentPage]);

  const kpiTotal = items.length;
  const kpiActive = items.filter(
    (p) => p.status === "ACTIVE" || p.status === "APPROVED"
  ).length;
  const kpiDraft = items.filter((p) => p.status === "DRAFT").length;
  const kpiPending = items.filter(
    (p) =>
      p.status === "SUBMITTED" ||
      p.status === "UNDER_REVIEW"
  ).length;
  const kpiRejected = items.filter((p) => p.status === "REJECTED").length;

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

  const clearFilters = useCallback(() => {
    setQ("");
    setStatusFilter("");
    setCategoryFilter("");
    setBrandFilter("");
    setFactoryFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
    updateUrl({
      q: "",
      status: "",
      category: "",
      brand: "",
      factoryId: "",
      dateFrom: "",
      dateTo: "",
      page: 1,
    });
  }, [updateUrl]);

  const removeChip = (key) => {
    if (key === "q") setQ("");
    if (key === "status") setStatusFilter("");
    if (key === "category") setCategoryFilter("");
    if (key === "brand") setBrandFilter("");
    if (key === "factoryId") setFactoryFilter("");
    if (key === "dateFrom") setDateFrom("");
    if (key === "dateTo") setDateTo("");
    setPage(1);
    setTimeout(() => updateUrl(), 0);
  };

  const setPageAndUrl = (p) => {
    const next = Math.max(1, Math.min(p, totalPages));
    setPage(next);
    updateUrl({ page: next });
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((p) => p.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const exportSelected = () => {
    const ids = Array.from(selectedIds);
    const toExport = items.filter((p) => ids.includes(p.id));
    if (toExport.length === 0) {
      toast.error("No rows selected");
      return;
    }
    const headers = [
      "id",
      "productName",
      "brandName",
      "sku",
      "productType",
      "status",
      "createdAt",
      "updatedAt",
    ];
    const rows = toExport.map((p) =>
      headers.map((h) => (p[h] != null ? String(p[h]) : ""))
    );
    const csv =
      headers.join(",") +
      "\n" +
      rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `producer-products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  };

  const proofLabel = (p) => {
    if (p.proofs != null && Array.isArray(p.proofs)) {
      const n = p.proofs.length;
      return n === 0 ? "Missing" : `${n} doc${n !== 1 ? "s" : ""}`;
    }
    return "—";
  };

  return (
    <>
      <ApiErrorModal />
      <ProducerPageShell
        title="Products"
        breadcrumbs={[{ label: "Products", href: "/producer/products" }]}
      actions={
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {org && (
            <span
              className="badge bg-light text-dark border radius-12 px-2 py-1"
              title="Current producer org"
            >
              {org.name || "Producer"}
              {org.status === "VERIFIED" ? (
                <Icon icon="solar:verified-check-bold" className="ms-1 text-success" />
              ) : (
                <span className="text-warning small ms-1">(Pending)</span>
              )}
            </span>
          )}
          <Link
            href="/producer/products/new"
            className="btn btn-primary btn-sm radius-12"
          >
            <Icon icon="solar:add-circle-outline" className="me-1" aria-hidden />
            New Product
          </Link>
        </div>
      }
    >
      <p className="text-muted small mb-3">
        Manage authenticity products, proofs, and batches. Submit for owner
        approval, then platform admin approval to activate.
      </p>

      {/* KPI cards */}
      <div className="row g-2 mb-4">
        <div className="col-6 col-md-3">
          <button
            type="button"
            className="card radius-12 w-100 border text-start text-decoration-none text-dark h-100"
            onClick={() => {
              setStatusFilter("");
              setPage(1);
              updateUrl({ status: "", page: 1 });
            }}
          >
            <div className="card-body py-3">
              <div className="small text-muted">Total</div>
              <div className="h4 mb-0">{kpiTotal}</div>
            </div>
          </button>
        </div>
        <div className="col-6 col-md-3">
          <button
            type="button"
            className="card radius-12 w-100 border text-start text-decoration-none text-dark h-100"
            onClick={() => {
              setStatusFilter("ACTIVE");
              setPage(1);
              updateUrl({ status: "ACTIVE", page: 1 });
            }}
          >
            <div className="card-body py-3">
              <div className="small text-muted">Active</div>
              <div className="h4 mb-0 text-success">{kpiActive}</div>
            </div>
          </button>
        </div>
        <div className="col-6 col-md-3">
          <button
            type="button"
            className="card radius-12 w-100 border text-start text-decoration-none text-dark h-100"
            onClick={() => {
              setStatusFilter("DRAFT");
              setPage(1);
              updateUrl({ status: "DRAFT", page: 1 });
            }}
          >
            <div className="card-body py-3">
              <div className="small text-muted">Draft</div>
              <div className="h4 mb-0 text-secondary">{kpiDraft}</div>
            </div>
          </button>
        </div>
        <div className="col-6 col-md-3">
          <button
            type="button"
            className="card radius-12 w-100 border text-start text-decoration-none text-dark h-100"
            onClick={() => {
              setStatusFilter("REJECTED");
              setPage(1);
              updateUrl({ status: "REJECTED", page: 1 });
            }}
          >
            <div className="card-body py-3">
              <div className="small text-muted">Pending / Rejected</div>
              <div className="h4 mb-0 text-info">
                {kpiPending} / {kpiRejected}
              </div>
            </div>
          </button>
        </div>
      </div>

      {loadError && (
        <div className="alert alert-danger radius-12 d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <span>Unable to load products.</span>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm radius-12"
            onClick={() => { setLoadError(null); load(); }}
          >
            Retry
          </button>
        </div>
      )}

      <ProducerSectionCard
        title="Filters"
        className="mb-3 position-sticky top-0 bg-white z-1 shadow-sm"
        right={
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm radius-12"
            onClick={() => setFilterOpen((o) => !o)}
            aria-expanded={filterOpen}
          >
            <Icon
              icon={
                filterOpen
                  ? "solar:alt-arrow-up-outline"
                  : "solar:filter-outline"
              }
              className="me-1"
            />
            {filterOpen ? "Hide" : "Show"}
          </button>
        }
      >
        {filterOpen && (
          <div className="row g-2 mb-3">
            <div className="col-md-2">
              <label className="form-label small mb-0">Search (name / SKU)</label>
              <input
                type="search"
                className="form-control form-control-sm radius-12"
                placeholder="Search…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Search"
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small mb-0">Status</label>
              <select
                className="form-select form-select-sm radius-12"
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
                  className="form-select form-select-sm radius-12"
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
                  className="form-select form-select-sm radius-12"
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
                  className="form-select form-select-sm radius-12"
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
              <label className="form-label small mb-0">Created from</label>
              <input
                type="date"
                className="form-control form-control-sm radius-12"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-label="Date from"
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small mb-0">Created to</label>
              <input
                type="date"
                className="form-control form-control-sm radius-12"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                aria-label="Date to"
              />
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <div className="d-flex flex-wrap gap-2 align-items-center">
            {debouncedQ && (
              <span className="badge bg-light text-dark border radius-12 d-inline-flex align-items-center gap-1">
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
              <span className="badge bg-light text-dark border radius-12 d-inline-flex align-items-center gap-1">
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
              <span className="badge bg-light text-dark border radius-12 d-inline-flex align-items-center gap-1">
                Category
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 ms-1"
                  onClick={() => removeChip("category")}
                >
                  <Icon icon="solar:close-circle-outline" />
                </button>
              </span>
            )}
            {brandFilter && (
              <span className="badge bg-light text-dark border radius-12 d-inline-flex align-items-center gap-1">
                Brand
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 ms-1"
                  onClick={() => removeChip("brand")}
                >
                  <Icon icon="solar:close-circle-outline" />
                </button>
              </span>
            )}
            {(dateFrom || dateTo) && (
              <span className="badge bg-light text-dark border radius-12 d-inline-flex align-items-center gap-1">
                Date range
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 ms-1"
                  onClick={() => {
                    removeChip("dateFrom");
                    removeChip("dateTo");
                  }}
                >
                  <Icon icon="solar:close-circle-outline" />
                </button>
              </span>
            )}
            <button
              type="button"
              className="btn btn-link btn-sm p-0"
              onClick={clearFilters}
            >
              Clear all
            </button>
          </div>
        )}
      </ProducerSectionCard>

      <ProducerSectionCard
        title="Products"
        className="mb-3"
        right={
          <div className="d-flex gap-2 flex-wrap align-items-center">
            <select
              className="form-select form-select-sm radius-12"
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
          </div>
        }
      >
        {selectedIds.size > 0 && (
          <div className="d-flex align-items-center gap-2 flex-wrap mb-3 p-2 bg-light radius-12">
            <span className="small">
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm radius-12"
              onClick={exportSelected}
            >
              Export selected
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm radius-12"
              onClick={clearSelection}
            >
              Clear selection
            </button>
          </div>
        )}

        {loading ? (
          <ProducerTableSkeleton rows={8} cols={9} />
        ) : filtered.length === 0 ? (
          <ProducerEmptyState
            title={items.length === 0 ? "No products yet" : "No products match filters"}
            message={
              items.length === 0
                ? "Create your first product to start managing batches and codes."
                : "Try changing search or filters."
            }
            icon={
              <Icon
                icon="solar:box-outline"
                className="display-4 text-muted"
                aria-hidden
              />
            }
            primaryLabel="New Product"
            primaryHref="/producer/products/new"
            secondaryLabel={items.length > 0 ? "Clear filters" : undefined}
            secondaryHref={items.length > 0 ? "/producer/products" : undefined}
          />
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={
                          paginated.length > 0 &&
                          selectedIds.size === paginated.length
                        }
                        onChange={toggleSelectAll}
                        aria-label="Select all on page"
                      />
                    </th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Brand</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Proofs</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th style={{ width: 60 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedIds.has(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          aria-label={`Select ${p.productName}`}
                        />
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded bg-light d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{ width: 40, height: 40 }}
                          >
                            <Icon
                              icon="solar:box-outline"
                              className="text-muted"
                              style={{ fontSize: "1.25rem" }}
                            />
                          </div>
                          <div>
                            <Link
                              href={`/producer/products/${p.id}`}
                              className="fw-medium text-primary text-decoration-none"
                            >
                              {p.productName || "—"}
                            </Link>
                            <div className="small text-muted">
                              {p.sku || "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="small">
                        {p.productType
                          ? p.productType.replace(/_/g, " ")
                          : "—"}
                      </td>
                      <td className="small">{p.brandName || "—"}</td>
                      <td className="small text-muted">—</td>
                      <td className="small text-muted">—</td>
                      <td className="small text-muted">
                        {proofLabel(p)}
                      </td>
                      <td>
                        <StatusPill status={p.status} />
                      </td>
                      <td className="small text-muted">
                        {formatDate(p.updatedAt || p.createdAt)}
                      </td>
                      <td>
                        <Dropdown align="end">
                          <Dropdown.Toggle
                            variant="outline-secondary"
                            size="sm"
                            className="radius-12"
                            id={`product-actions-${p.id}`}
                            aria-label="Actions"
                          >
                            <Icon icon="solar:menu-dots-outline" />
                          </Dropdown.Toggle>
                          <Dropdown.Menu align="end">
                            <Dropdown.Item as={Link} href={`/producer/products/${p.id}`}>
                              View
                            </Dropdown.Item>
                            <Dropdown.Item as={Link} href={`/producer/products/${p.id}/edit`}>
                              Edit
                            </Dropdown.Item>
                            <Dropdown.Item as={Link} href={`/producer/products/new?duplicate=${p.id}`}>
                              Duplicate
                            </Dropdown.Item>
                            <Dropdown.Item as={Link} href={`/producer/products/${p.id}/edit`}>
                              Manage Proofs
                            </Dropdown.Item>
                            {p.status === "DRAFT" && (
                              <Dropdown.Item disabled className="text-muted" title="Delete is not implemented in API">
                                Delete (draft)
                              </Dropdown.Item>
                            )}
                          </Dropdown.Menu>
                        </Dropdown>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <nav
                className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2"
                aria-label="Products pagination"
              >
                <span className="small text-muted">
                  Showing{" "}
                  {(currentPage - 1) * DEFAULT_PAGE_SIZE + 1}–
                  {Math.min(
                    currentPage * DEFAULT_PAGE_SIZE,
                    totalFiltered
                  )}{" "}
                  of {totalFiltered}
                </span>
                <ul className="pagination pagination-sm mb-0">
                  <li
                    className={`page-item ${currentPage <= 1 ? "disabled" : ""}`}
                  >
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
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - currentPage) <= 2
                    )
                    .map((p, idx, arr) => (
                      <React.Fragment key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <li className="page-item disabled">
                            <span className="page-link">…</span>
                          </li>
                        )}
                        <li
                          className={`page-item ${p === currentPage ? "active" : ""}`}
                        >
                          <button
                            type="button"
                            className="page-link"
                            onClick={() => setPageAndUrl(p)}
                          >
                            {p}
                          </button>
                        </li>
                      </React.Fragment>
                    ))}
                  <li
                    className={`page-item ${currentPage >= totalPages ? "disabled" : ""}`}
                  >
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
    </>
  );
}
