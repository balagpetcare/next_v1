"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { Dropdown, Offcanvas, Modal, Button } from "react-bootstrap";
import { useToast } from "@/src/hooks/useToast";
import {
  producerBatchesList,
  producerBatchGet,
  producerBatchGenerateCodes,
  producerBatchExportSummaryCsv,
  producerBatchExportCodesCsv,
  producerBatchExportEventsCsv,
  producerBatchSubmit,
  producerProductCreateBatch,
  producerMe,
  producerProductsList,
  producerFactoriesList,
} from "../../_lib/producerApi";
import ProductPicker from "../../_components/ProductPicker";
import { normalizeApiError, useApiErrorPopup } from "../../_lib/apiErrorPopup";
import ProducerPageShell from "../../_components/ProducerPageShell";
import ProducerSectionCard from "../../_components/ProducerSectionCard";
import ProducerEmptyState from "../../_components/ProducerEmptyState";
import ProducerTableSkeleton from "../../_components/ProducerTableSkeleton";

const BATCH_STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "GENERATED", label: "Generated" },
];

const CODES_STATE_OPTIONS = [
  { value: "", label: "Any" },
  { value: "has_codes", label: "Has codes" },
  { value: "no_codes", label: "No codes" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "batch_no", label: "Batch No A–Z" },
  { value: "qty_desc", label: "Qty (high first)" },
];

const DEFAULT_PAGE_SIZE = 20;
const FETCH_LIMIT = 200;

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

function StatusPill({ status }) {
  const s = status || "DRAFT";
  const cls =
    s === "APPROVED" || s === "GENERATED"
      ? "bg-success"
      : s === "REJECTED"
        ? "bg-danger"
        : "bg-secondary";
  return (
    <span className={`badge ${cls} radius-12 text-uppercase`}>
      {s.replace(/_/g, " ")}
    </span>
  );
}

export default function ProducerBatchesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { showApiErrorPopup, ApiErrorModal } = useApiErrorPopup();
  const [org, setOrg] = useState(null);
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [factories, setFactories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [drawerBatchId, setDrawerBatchId] = useState(null);
  const [drawerBatch, setDrawerBatch] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [generateModalBatchId, setGenerateModalBatchId] = useState(null);
  const [generateQty, setGenerateQty] = useState("100");
  const [generateLength, setGenerateLength] = useState("12");
  const [generatePrefix, setGeneratePrefix] = useState("");
  const [generateSuffix, setGenerateSuffix] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [newBatchModalOpen, setNewBatchModalOpen] = useState(false);
  const [newBatchProductId, setNewBatchProductId] = useState("");
  const [newBatchSelectedProduct, setNewBatchSelectedProduct] = useState(null);
  const [newBatchForm, setNewBatchForm] = useState({
    batchNo: "",
    mfgDate: "",
    expDate: "",
    qtyPlanned: "",
  });
  const [creatingBatch, setCreatingBatch] = useState(false);

  const [q, setQ] = useState(() => searchParams?.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState(
    () => searchParams?.get("status") ?? ""
  );
  const [productFilter, setProductFilter] = useState(
    () => searchParams?.get("productId") ?? ""
  );
  const [factoryFilter, setFactoryFilter] = useState(
    () => searchParams?.get("factoryId") ?? ""
  );
  const [dateFrom, setDateFrom] = useState(
    () => searchParams?.get("dateFrom") ?? ""
  );
  const [dateTo, setDateTo] = useState(() => searchParams?.get("dateTo") ?? "");
  const [codesState, setCodesState] = useState(
    () => searchParams?.get("codesState") ?? ""
  );
  const [sort, setSort] = useState(() => searchParams?.get("sort") || "newest");
  const [page, setPage] = useState(() =>
    Math.max(1, parseInt(searchParams?.get("page") || "1", 10))
  );

  const debouncedQ = useDebounce(q, 400);

  const productMap = useMemo(() => {
    const m = new Map();
    (products || []).forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const factoryMap = useMemo(() => {
    const m = new Map();
    (factories || []).forEach((f) => m.set(f.id, f));
    return m;
  }, [factories]);

  const updateUrl = useCallback(
    (updates = {}) => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      const qq = updates.q !== undefined ? updates.q : q;
      const st = updates.status !== undefined ? updates.status : statusFilter;
      const pr = updates.productId !== undefined ? updates.productId : productFilter;
      const fac = updates.factoryId !== undefined ? updates.factoryId : factoryFilter;
      const df = updates.dateFrom !== undefined ? updates.dateFrom : dateFrom;
      const dt = updates.dateTo !== undefined ? updates.dateTo : dateTo;
      const cs = updates.codesState !== undefined ? updates.codesState : codesState;
      const so = updates.sort !== undefined ? updates.sort : sort;
      const p = updates.page !== undefined ? updates.page : page;

      if (qq) params.set("q", qq);
      else params.delete("q");
      if (st) params.set("status", st);
      else params.delete("status");
      if (pr) params.set("productId", pr);
      else params.delete("productId");
      if (fac) params.set("factoryId", fac);
      else params.delete("factoryId");
      if (df) params.set("dateFrom", df);
      else params.delete("dateFrom");
      if (dt) params.set("dateTo", dt);
      else params.delete("dateTo");
      if (cs) params.set("codesState", cs);
      else params.delete("codesState");
      if (so && so !== "newest") params.set("sort", so);
      else params.delete("sort");
      if (p > 1) params.set("page", String(p));
      else params.delete("page");
      router.replace(`/producer/batches?${params.toString()}`, { scroll: false });
    },
    [
      q,
      statusFilter,
      productFilter,
      factoryFilter,
      dateFrom,
      dateTo,
      codesState,
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
      const [batchesRes, productsRes, factoriesRes] = await Promise.all([
        producerBatchesList({ limit: FETCH_LIMIT, page: 1 }),
        producerProductsList({ limit: 500 }).catch(() => []),
        producerFactoriesList().catch(() => []),
      ]);
      const list = Array.isArray(batchesRes?.items) ? batchesRes.items : [];
      setItems(list);
      setProducts(
        Array.isArray(productsRes)
          ? productsRes
          : (productsRes?.items ?? [])
      );
      setFactories(Array.isArray(factoriesRes) ? factoriesRes : []);
    } catch (e) {
      if (e?.status === 401) {
        router.replace("/producer/login?from=/producer/batches");
        return;
      }
      setItems([]);
      setLoadError(true);
      showApiErrorPopup(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    producerMe(true).then((me) => me?.org && setOrg(me.org)).catch(() => {});
  }, []);

  useEffect(() => {
    setQ(searchParams?.get("q") ?? "");
    setStatusFilter(searchParams?.get("status") ?? "");
    setProductFilter(searchParams?.get("productId") ?? "");
    setFactoryFilter(searchParams?.get("factoryId") ?? "");
    setDateFrom(searchParams?.get("dateFrom") ?? "");
    setDateTo(searchParams?.get("dateTo") ?? "");
    setCodesState(searchParams?.get("codesState") ?? "");
    setSort(searchParams?.get("sort") || "newest");
    setPage(Math.max(1, parseInt(searchParams?.get("page") || "1", 10)));
  }, [searchParams]);

  const hasActiveFilters =
    debouncedQ ||
    statusFilter ||
    productFilter ||
    factoryFilter ||
    dateFrom ||
    dateTo ||
    codesState;

  const filtered = useMemo(() => {
    let list = [...items];
    const term = (debouncedQ || "").trim().toLowerCase();
    if (term) {
      list = list.filter((b) => {
        const productName =
          productMap.get(b.authProductId)?.productName || "";
        return (
          (b.batchNo || "").toLowerCase().includes(term) ||
          productName.toLowerCase().includes(term) ||
          String(b.id).includes(term)
        );
      });
    }
    if (statusFilter) {
      list = list.filter((b) => (b.status || "DRAFT") === statusFilter);
    }
    if (productFilter) {
      list = list.filter(
        (b) => Number(b.authProductId) === Number(productFilter)
      );
    }
    if (factoryFilter) {
      list = list.filter((b) => {
        const p = productMap.get(b.authProductId);
        return p && Number(p.factoryId) === Number(factoryFilter);
      });
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      list = list.filter((b) => new Date(b.updatedAt || b.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter((b) => new Date(b.updatedAt || b.createdAt) <= to);
    }
    if (codesState === "has_codes") {
      list = list.filter((b) => (b.qtyGenerated || 0) > 0);
    } else if (codesState === "no_codes") {
      list = list.filter((b) => (b.qtyGenerated || 0) === 0);
    }
    if (sort === "oldest") {
      list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sort === "newest") {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sort === "batch_no") {
      list.sort((a, b) =>
        (a.batchNo || "").localeCompare(b.batchNo || "")
      );
    } else if (sort === "qty_desc") {
      list.sort((a, b) => (b.qtyPlanned || 0) - (a.qtyPlanned || 0));
    }
    return list;
  }, [
    items,
    debouncedQ,
    statusFilter,
    productFilter,
    factoryFilter,
    dateFrom,
    dateTo,
    codesState,
    sort,
    productMap,
  ]);

  const totalFiltered = filtered.length;
  const totalPages = Math.max(
    1,
    Math.ceil(totalFiltered / DEFAULT_PAGE_SIZE)
  );
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * DEFAULT_PAGE_SIZE;
    return filtered.slice(start, start + DEFAULT_PAGE_SIZE);
  }, [filtered, currentPage]);

  const kpiTotal = items.length;
  const kpiDraft = items.filter((b) => b.status === "DRAFT").length;
  const kpiApproved = items.filter((b) => b.status === "APPROVED").length;
  const kpiRejected = items.filter((b) => b.status === "REJECTED").length;
  const kpiGenerated = items.filter((b) => b.status === "GENERATED").length;
  const kpiWithCodes = items.filter((b) => (b.qtyGenerated || 0) > 0).length;

  const removeChip = useCallback(
    (key) => {
      if (key === "q") {
        setQ("");
        updateUrl({ q: "", page: 1 });
      } else if (key === "status") {
        setStatusFilter("");
        updateUrl({ status: "", page: 1 });
      } else if (key === "productId") {
        setProductFilter("");
        updateUrl({ productId: "", page: 1 });
      } else if (key === "factoryId") {
        setFactoryFilter("");
        updateUrl({ factoryId: "", page: 1 });
      } else if (key === "dateFrom" || key === "dateTo") {
        setDateFrom("");
        setDateTo("");
        updateUrl({ dateFrom: "", dateTo: "", page: 1 });
      } else if (key === "codesState") {
        setCodesState("");
        updateUrl({ codesState: "", page: 1 });
      }
    },
    [updateUrl]
  );

  const clearFilters = useCallback(() => {
    setQ("");
    setStatusFilter("");
    setProductFilter("");
    setFactoryFilter("");
    setDateFrom("");
    setDateTo("");
    setCodesState("");
    setPage(1);
    updateUrl({
      q: "",
      status: "",
      productId: "",
      factoryId: "",
      dateFrom: "",
      dateTo: "",
      codesState: "",
      page: 1,
    });
  }, [updateUrl]);

  const setPageAndUrl = useCallback(
    (p) => {
      setPage(p);
      updateUrl({ page: p });
    },
    [updateUrl]
  );

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((b) => b.id)));
    }
  }, [paginated, selectedIds.size]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const openDrawer = useCallback(async (batchId) => {
    setDrawerBatchId(batchId);
    setDrawerBatch(null);
    setDrawerLoading(true);
    try {
      const data = await producerBatchGet(batchId, {
        codesPage: 1,
        codesLimit: 20,
      });
      setDrawerBatch(data?.batch || null);
    } catch {
      setDrawerBatch(null);
    } finally {
      setDrawerLoading(false);
    }
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerBatchId(null);
    setDrawerBatch(null);
  }, []);

  const refreshDrawer = useCallback(async () => {
    if (!drawerBatchId) return;
    setDrawerLoading(true);
    try {
      const data = await producerBatchGet(drawerBatchId, {
        codesPage: 1,
        codesLimit: 20,
      });
      setDrawerBatch(data?.batch || null);
      await load();
    } finally {
      setDrawerLoading(false);
    }
  }, [drawerBatchId, load]);

  const openGenerateModal = useCallback((batchId) => {
    setGenerateModalBatchId(batchId);
    setGenerateQty("100");
    setGenerateLength("12");
    setGeneratePrefix("");
    setGenerateSuffix("");
    setGenerateError(null);
  }, []);

  const validateGenerate = useCallback((batch) => {
    const qty = Number(generateQty);
    if (!qty || qty <= 0) return "Quantity must be a positive number.";
    const planned = Number(batch?.qtyPlanned || 0);
    const generated = Number(batch?.qtyGenerated || 0);
    const remaining = Math.max(0, planned - generated);
    if (qty > remaining) return `Requested quantity exceeds remaining (${remaining}).`;
    const len = Number(generateLength);
    if (!len || len < 8 || len > 15)
      return "Length must be between 8 and 15.";
    if (generatePrefix && generatePrefix.length !== 3)
      return "Prefix must be exactly 3 characters (A-Z, 0-9).";
    if (generateSuffix && generateSuffix.length !== 2)
      return "Suffix must be exactly 2 characters (A-Z, 0-9).";
    return null;
  }, [generateQty, generateLength, generatePrefix, generateSuffix]);

  const runGenerate = useCallback(async () => {
    if (!generateModalBatchId) return;
    const batch = items.find((b) => b.id === generateModalBatchId) || drawerBatch;
    const err = validateGenerate(batch);
    if (err) {
      setGenerateError(err);
      return;
    }
    setGenerateError(null);
    setGenerating(true);
    try {
      await producerBatchGenerateCodes(generateModalBatchId, {
        quantity: Number(generateQty),
        length: Number(generateLength),
        prefix: generatePrefix || undefined,
        suffix: generateSuffix || undefined,
      });
      toast.success("Codes generated successfully.");
      setGenerateModalBatchId(null);
      await load();
      if (drawerBatchId === generateModalBatchId) refreshDrawer();
    } catch (e) {
      setGenerateError(null);
      showApiErrorPopup(normalizeApiError(e));
    } finally {
      setGenerating(false);
    }
  }, [
    generateModalBatchId,
    items,
    drawerBatch,
    validateGenerate,
    generateQty,
    generateLength,
    generatePrefix,
    generateSuffix,
    toast,
    load,
    drawerBatchId,
    refreshDrawer,
    showApiErrorPopup,
  ]);

  const handleExportSummaryCsv = useCallback(async () => {
    try {
      await producerBatchExportSummaryCsv({
        search: q?.trim() || undefined,
        status: statusFilter || undefined,
        productId: productFilter || undefined,
        factoryId: factoryFilter || undefined,
        createdFrom: dateFrom || undefined,
        createdTo: dateTo || undefined,
      });
      toast.success("Summary CSV downloaded.");
    } catch (e) {
      showApiErrorPopup(normalizeApiError(e));
    }
  }, [toast, q, statusFilter, productFilter, factoryFilter, dateFrom, dateTo, showApiErrorPopup]);

  const handleExportCodesCsv = useCallback(
    async (batchId) => {
      try {
        await producerBatchExportCodesCsv(batchId);
        toast.success("Codes CSV downloaded.");
        if (drawerBatchId === batchId) refreshDrawer();
      } catch (e) {
        showApiErrorPopup(normalizeApiError(e));
      }
    },
    [toast, drawerBatchId, refreshDrawer, showApiErrorPopup]
  );

  const handleExportEventsCsv = useCallback(
    async (batchId) => {
      try {
        await producerBatchExportEventsCsv(batchId);
        toast.success("Timeline CSV downloaded.");
      } catch (e) {
        showApiErrorPopup(normalizeApiError(e));
      }
    },
    [toast, showApiErrorPopup]
  );

  const handleSubmit = useCallback(
    async (batchId) => {
      try {
        const data = await producerBatchSubmit(batchId, {});
        const autoApproved = data?.autoApproved === true || data?.approval?.status === "APPROVED";
        toast.success(
          autoApproved ? "Approved." : "Batch submitted for approval."
        );
        await load();
        if (drawerBatchId === batchId) refreshDrawer();
      } catch (e) {
        showApiErrorPopup(normalizeApiError(e));
      }
    },
    [toast, load, drawerBatchId, refreshDrawer, showApiErrorPopup]
  );

  const createNewBatch = useCallback(async () => {
    const productId = Number(newBatchProductId);
    if (!productId || !newBatchForm.batchNo || !newBatchForm.qtyPlanned) {
      toast.error("Select a product and enter Batch No and Qty Planned.");
      return;
    }
    setCreatingBatch(true);
    try {
      const res = await producerProductCreateBatch(productId, {
        batchNo: newBatchForm.batchNo.trim(),
        mfgDate: newBatchForm.mfgDate || undefined,
        expDate: newBatchForm.expDate || undefined,
        qtyPlanned: Number(newBatchForm.qtyPlanned),
      });
      const batchId = res?.id;
      toast.success("Batch created.");
      setNewBatchModalOpen(false);
      setNewBatchForm({ batchNo: "", mfgDate: "", expDate: "", qtyPlanned: "" });
      setNewBatchProductId("");
      await load();
      if (batchId) {
        openDrawer(batchId);
      }
    } catch (e) {
      showApiErrorPopup(normalizeApiError(e));
    } finally {
      setCreatingBatch(false);
    }
  }, [newBatchProductId, newBatchForm, toast, load, openDrawer, showApiErrorPopup]);

  const productsForFilter = useMemo(
    () =>
      [...new Set(items.map((b) => b.authProductId))].filter(Boolean).map((id) => {
        const p = productMap.get(id);
        return { id, name: p?.productName || `Product #${id}` };
      }),
    [items, productMap]
  );

  return (
    <>
      <ApiErrorModal />
      <ProducerPageShell
        title="Batches"
        breadcrumbs={[
          { label: "Producer", href: "/producer" },
          { label: "Batches" },
      ]}
      actions={
        <div className="d-flex flex-wrap align-items-center gap-2">
          {org?.name && (
            <span className="badge bg-light text-dark border radius-12">
              {org.name}
            </span>
          )}
          <Dropdown align="end">
            <Dropdown.Toggle
              variant="outline-primary"
              size="sm"
              className="radius-12"
              id="export-toggle"
            >
              <Icon icon="solar:export-outline" className="me-1" />
              Export
            </Dropdown.Toggle>
            <Dropdown.Menu align="end">
              <Dropdown.Item onClick={handleExportSummaryCsv}>
                Export Summary (CSV)
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          <Dropdown align="end">
            <Dropdown.Toggle
              variant="primary"
              size="sm"
              className="radius-12"
              id="new-batch-toggle"
            >
              <Icon icon="solar:add-circle-outline" className="me-1" />
              New Batch
            </Dropdown.Toggle>
            <Dropdown.Menu align="end">
              <Dropdown.Item
                onClick={() => {
                  setNewBatchModalOpen(true);
                  setNewBatchProductId("");
                  setNewBatchSelectedProduct(null);
                }}
              >
                Create from product
              </Dropdown.Item>
              <Dropdown.Item as={Link} href="/producer/products">
                View products
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      }
    >
      <p className="text-muted small mb-3">
        Manage batches and generate authenticity codes. Create batches from
        approved products, then generate and export codes.
      </p>

      {/* KPI cards */}
      <div className="row g-2 mb-4">
        <div className="col-6 col-md-2">
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
        <div className="col-6 col-md-2">
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
        <div className="col-6 col-md-2">
          <button
            type="button"
            className="card radius-12 w-100 border text-start text-decoration-none text-dark h-100"
            onClick={() => {
              setStatusFilter("APPROVED");
              setPage(1);
              updateUrl({ status: "APPROVED", page: 1 });
            }}
          >
            <div className="card-body py-3">
              <div className="small text-muted">Approved</div>
              <div className="h4 mb-0 text-success">{kpiApproved}</div>
            </div>
          </button>
        </div>
        <div className="col-6 col-md-2">
          <button
            type="button"
            className="card radius-12 w-100 border text-start text-decoration-none text-dark h-100"
            onClick={() => {
              setStatusFilter("GENERATED");
              setPage(1);
              updateUrl({ status: "GENERATED", page: 1 });
            }}
          >
            <div className="card-body py-3">
              <div className="small text-muted">Generated</div>
              <div className="h4 mb-0 text-info">{kpiGenerated}</div>
            </div>
          </button>
        </div>
        <div className="col-6 col-md-2">
          <button
            type="button"
            className="card radius-12 w-100 border text-start text-decoration-none text-dark h-100"
            onClick={() => {
              setCodesState("has_codes");
              setPage(1);
              updateUrl({ codesState: "has_codes", page: 1 });
            }}
          >
            <div className="card-body py-3">
              <div className="small text-muted">Codes generated</div>
              <div className="h4 mb-0">{kpiWithCodes}</div>
            </div>
          </button>
        </div>
        <div className="col-6 col-md-2">
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
              <div className="small text-muted">Rejected</div>
              <div className="h4 mb-0 text-danger">{kpiRejected}</div>
            </div>
          </button>
        </div>
      </div>

      {loadError && (
        <div className="alert alert-danger radius-12 d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <span>Unable to load batches.</span>
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
                filterOpen ? "solar:alt-arrow-up-outline" : "solar:filter-outline"
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
              <label className="form-label small mb-0">Search</label>
              <input
                type="search"
                className="form-control form-control-sm radius-12"
                placeholder="Batch no, product…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onBlur={() => updateUrl({ q: q, page: 1 })}
                onKeyDown={(e) => e.key === "Enter" && updateUrl({ q: q, page: 1 })}
                aria-label="Search"
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small mb-0">Status</label>
              <select
                className="form-select form-select-sm radius-12"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  updateUrl({ status: e.target.value, page: 1 });
                }}
                aria-label="Status"
              >
                {BATCH_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {productsForFilter.length > 0 && (
              <div className="col-md-2">
                <label className="form-label small mb-0">Product</label>
                <select
                  className="form-select form-select-sm radius-12"
                  value={productFilter}
                  onChange={(e) => {
                    setProductFilter(e.target.value);
                    updateUrl({ productId: e.target.value, page: 1 });
                  }}
                  aria-label="Product"
                >
                  <option value="">All</option>
                  {productsForFilter.map((pf) => (
                    <option key={pf.id} value={pf.id}>
                      {pf.name}
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
                  onChange={(e) => {
                    setFactoryFilter(e.target.value);
                    updateUrl({ factoryId: e.target.value, page: 1 });
                  }}
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
                className="form-control form-control-sm radius-12"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  updateUrl({ dateFrom: e.target.value, page: 1 });
                }}
                aria-label="Date from"
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small mb-0">Date to</label>
              <input
                type="date"
                className="form-control form-control-sm radius-12"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  updateUrl({ dateTo: e.target.value, page: 1 });
                }}
                aria-label="Date to"
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small mb-0">Codes</label>
              <select
                className="form-select form-select-sm radius-12"
                value={codesState}
                onChange={(e) => {
                  setCodesState(e.target.value);
                  updateUrl({ codesState: e.target.value, page: 1 });
                }}
                aria-label="Codes state"
              >
                {CODES_STATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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
            {productFilter && (
              <span className="badge bg-light text-dark border radius-12 d-inline-flex align-items-center gap-1">
                Product
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 ms-1"
                  onClick={() => removeChip("productId")}
                  aria-label="Remove product"
                >
                  <Icon icon="solar:close-circle-outline" />
                </button>
              </span>
            )}
            {factoryFilter && (
              <span className="badge bg-light text-dark border radius-12 d-inline-flex align-items-center gap-1">
                Factory
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 ms-1"
                  onClick={() => removeChip("factoryId")}
                  aria-label="Remove factory"
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
                  aria-label="Remove date range"
                >
                  <Icon icon="solar:close-circle-outline" />
                </button>
              </span>
            )}
            {codesState && (
              <span className="badge bg-light text-dark border radius-12 d-inline-flex align-items-center gap-1">
                Codes: {codesState === "has_codes" ? "Has codes" : "No codes"}
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 ms-1"
                  onClick={() => removeChip("codesState")}
                  aria-label="Remove codes filter"
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
        title="Batches"
        className="mb-3"
        right={
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
        }
      >
        {selectedIds.size > 0 && (
          <div className="d-flex align-items-center gap-2 flex-wrap mb-3 p-2 bg-light radius-12">
            <span className="small">{selectedIds.size} selected</span>
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
          <ProducerTableSkeleton rows={8} cols={10} />
        ) : filtered.length === 0 ? (
          <ProducerEmptyState
            title={
              items.length === 0 ? "No batches yet" : "No batches match filters"
            }
            message={
              items.length === 0
                ? "Create a batch from an approved product to get started."
                : "Try changing search or filters."
            }
            icon={
              <Icon
                icon="solar:box-outline"
                className="display-4 text-muted"
                aria-hidden
              />
            }
            primaryLabel={items.length === 0 ? "View products" : "Clear filters"}
            primaryHref={items.length === 0 ? "/producer/products" : "/producer/batches"}
            secondaryLabel={items.length > 0 ? undefined : "New Batch"}
            secondaryHref={items.length > 0 ? undefined : undefined}
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
                    <th>Batch No</th>
                    <th>Product</th>
                    <th>Factory</th>
                    <th>Qty</th>
                    <th>Codes</th>
                    <th>Status</th>
                    <th className="text-nowrap">Printed</th>
                    <th className="text-nowrap">QA</th>
                    <th>Updated</th>
                    <th style={{ width: 60 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((b) => {
                    const product = productMap.get(b.authProductId);
                    const factoryName = product?.factoryId
                      ? factoryMap.get(product.factoryId)?.name
                      : "—";
                    const canGenerate =
                      b.status === "APPROVED" || b.status === "GENERATED";
                    const remaining = Math.max(
                      0,
                      (b.qtyPlanned || 0) - (b.qtyGenerated || 0)
                    );
                    return (
                      <tr
                        key={b.id}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          if (
                            e.target.closest(
                              "button, a, input, [role='button'], .dropdown"
                            )
                          )
                            return;
                          openDrawer(b.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openDrawer(b.id);
                          }
                        }}
                        className="cursor-pointer"
                      >
                        <td onClick={(ev) => ev.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedIds.has(b.id)}
                            onChange={() => toggleSelect(b.id)}
                            aria-label={`Select ${b.batchNo}`}
                          />
                        </td>
                        <td>
                          <span className="fw-medium">{b.batchNo || "—"}</span>
                        </td>
                        <td className="small">
                          {product ? (
                            <Link
                              href={`/producer/products/${product.id}`}
                              className="text-primary text-decoration-none"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {product.productName || "—"}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="small text-muted">{factoryName}</td>
                        <td className="small">{b.qtyPlanned ?? "—"}</td>
                        <td className="small">
                          <span>
                            {b.qtyGenerated ?? 0} / {b.qtyPlanned ?? 0}
                          </span>
                          {canGenerate && remaining > 0 && (
                            <button
                              type="button"
                              className="btn btn-link btn-sm p-0 ms-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                openGenerateModal(b.id);
                              }}
                              title="Generate codes"
                            >
                              <Icon icon="solar:refresh-outline" />
                            </button>
                          )}
                        </td>
                        <td>
                          <StatusPill status={b.status} />
                        </td>
                        <td className="small">
                          {b.printedAt ? (
                            (b.printCount ?? 0) > 1 ? (
                              <span className="badge bg-info radius-12">Reprinted ({b.printCount})</span>
                            ) : (
                              <span className="badge bg-success radius-12">Printed</span>
                            )
                          ) : (
                            <span className="badge bg-secondary radius-12">Not printed</span>
                          )}
                        </td>
                        <td className="small text-muted">—</td>
                        <td className="small text-muted">
                          {formatDate(b.updatedAt || b.createdAt)}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <Dropdown align="end">
                            <Dropdown.Toggle
                              variant="outline-secondary"
                              size="sm"
                              className="radius-12"
                              id={`batch-actions-${b.id}`}
                              aria-label="Actions"
                            >
                              <Icon icon="solar:menu-dots-outline" />
                            </Dropdown.Toggle>
                            <Dropdown.Menu align="end">
                              <Dropdown.Item
                                onClick={() => openDrawer(b.id)}
                              >
                                View details
                              </Dropdown.Item>
                              <Dropdown.Item
                                as={Link}
                                href={`/producer/batches/${b.id}`}
                              >
                                Open page
                              </Dropdown.Item>
                              {canGenerate && (
                                <Dropdown.Item
                                  onClick={() => openGenerateModal(b.id)}
                                >
                                  Generate codes
                                </Dropdown.Item>
                              )}
                              {canGenerate && (
                                <>
                                  <Dropdown.Item
                                    onClick={() => handleExportCodesCsv(b.id)}
                                  >
                                    Export Codes (CSV)
                                  </Dropdown.Item>
                                  <Dropdown.Item
                                    onClick={() => handleExportEventsCsv(b.id)}
                                  >
                                    Export Timeline (CSV)
                                  </Dropdown.Item>
                                </>
                              )}
                              {(b.status === "DRAFT" ||
                                b.status === "REJECTED") && (
                                <Dropdown.Item
                                  onClick={() => handleSubmit(b.id)}
                                >
                                  Submit for approval
                                </Dropdown.Item>
                              )}
                            </Dropdown.Menu>
                          </Dropdown>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <nav
                className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2"
                aria-label="Batches pagination"
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
                            aria-label={`Page ${p}`}
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

      {/* Row drawer */}
      <Offcanvas
        show={!!drawerBatchId}
        onHide={closeDrawer}
        placement="end"
        className="rounded-start-3"
        style={{ width: "min(400px, 100vw)" }}
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Batch details</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {drawerLoading ? (
            <div className="text-muted small">Loading…</div>
          ) : !drawerBatch ? (
            <div className="text-muted small">Batch not found.</div>
          ) : (
            <>
              <div className="mb-3">
                <div className="small text-muted">Batch No</div>
                <div className="fw-semibold">{drawerBatch.batchNo}</div>
              </div>
              <div className="mb-3">
                <div className="small text-muted">Product</div>
                <div>
                  {drawerBatch.authProduct ? (
                    <Link
                      href={`/producer/products/${drawerBatch.authProduct.id}`}
                      className="text-primary text-decoration-none"
                    >
                      {drawerBatch.authProduct.productName || "—"}
                    </Link>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div className="mb-3">
                <div className="small text-muted">Quantity</div>
                <div>
                  Planned: {drawerBatch.qtyPlanned ?? "—"} · Generated:{" "}
                  {drawerBatch.qtyGenerated ?? 0}
                </div>
              </div>
              <div className="mb-3">
                <div className="small text-muted">Codes summary</div>
                <div>
                  {drawerBatch.qtyGenerated ?? 0} / {drawerBatch.qtyPlanned ?? 0}{" "}
                  codes
                </div>
              </div>
              <div className="mb-3">
                <div className="small text-muted">Status</div>
                <div>
                  <StatusPill status={drawerBatch.status} />
                </div>
              </div>
              <div className="mb-3">
                <div className="small text-muted">Updated</div>
                <div>{formatDate(drawerBatch.updatedAt || drawerBatch.createdAt)}</div>
              </div>
              <hr />
              <div className="d-flex flex-wrap gap-2">
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="radius-12"
                  as={Link}
                  href={`/producer/batches/${drawerBatch.id}`}
                >
                  Open page
                </Button>
                {(drawerBatch.status === "APPROVED" ||
                  drawerBatch.status === "GENERATED") && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      className="radius-12"
                      onClick={() => openGenerateModal(drawerBatch.id)}
                    >
                      Generate codes
                    </Button>
                    <Dropdown align="end">
                      <Dropdown.Toggle
                        variant="outline-secondary"
                        size="sm"
                        className="radius-12"
                      >
                        Export
                      </Dropdown.Toggle>
                      <Dropdown.Menu align="end">
                        <Dropdown.Item
                          onClick={() => handleExportCodesCsv(drawerBatch.id)}
                        >
                          Export Codes (CSV)
                        </Dropdown.Item>
                        <Dropdown.Item
                          onClick={() => handleExportEventsCsv(drawerBatch.id)}
                        >
                          Export Timeline (CSV)
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  </>
                )}
                {(drawerBatch.status === "DRAFT" ||
                  drawerBatch.status === "REJECTED") && (
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="radius-12"
                    onClick={() => handleSubmit(drawerBatch.id)}
                  >
                    Submit for approval
                  </Button>
                )}
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="radius-12"
                  onClick={refreshDrawer}
                >
                  Refresh
                </Button>
              </div>
            </>
          )}
        </Offcanvas.Body>
      </Offcanvas>

      {/* Generate codes modal */}
      <Modal
        show={!!generateModalBatchId}
        onHide={() => setGenerateModalBatchId(null)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Generate codes</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {generateModalBatchId && (() => {
            const batch =
              items.find((b) => b.id === generateModalBatchId) || drawerBatch;
            const remaining = batch
              ? Math.max(
                  0,
                  (batch.qtyPlanned || 0) - (batch.qtyGenerated || 0)
                )
              : 0;
            return (
              <>
                <p className="small text-muted mb-3">
                  Remaining capacity for this batch: {remaining}. Length 8–15;
                  prefix 3 chars, suffix 2 chars (A-Z, 0-9).
                </p>
                {generateError && (
                  <div className="alert alert-danger small mb-3">
                    {generateError}
                  </div>
                )}
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label small">Quantity</label>
                    <input
                      type="number"
                      className="form-control form-control-sm radius-12"
                      min={1}
                      max={remaining}
                      value={generateQty}
                      onChange={(e) => setGenerateQty(e.target.value)}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small">Length (8–15)</label>
                    <input
                      type="number"
                      className="form-control form-control-sm radius-12"
                      min={8}
                      max={15}
                      value={generateLength}
                      onChange={(e) => setGenerateLength(e.target.value)}
                    />
                  </div>
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label small">Prefix (3 chars, optional)</label>
                    <input
                      type="text"
                      className="form-control form-control-sm radius-12 text-uppercase"
                      maxLength={3}
                      placeholder="ABC"
                      value={generatePrefix}
                      onChange={(e) =>
                        setGeneratePrefix(
                          (e.target.value || "").replace(/[^A-Z0-9]/gi, "").slice(0, 3)
                        )
                      }
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small">Suffix (2 chars, optional)</label>
                    <input
                      type="text"
                      className="form-control form-control-sm radius-12 text-uppercase"
                      maxLength={2}
                      placeholder="12"
                      value={generateSuffix}
                      onChange={(e) =>
                        setGenerateSuffix(
                          (e.target.value || "").replace(/[^A-Z0-9]/gi, "").slice(0, 2)
                        )
                      }
                    />
                  </div>
                </div>
              </>
            );
          })()}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            size="sm"
            className="radius-12"
            onClick={() => setGenerateModalBatchId(null)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="radius-12"
            onClick={runGenerate}
            disabled={generating}
          >
            {generating ? "Generating…" : "Generate"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* New batch modal */}
      <Modal
        show={newBatchModalOpen}
        onHide={() => !creatingBatch && setNewBatchModalOpen(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>New batch</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small text-muted mb-3">
            Create a batch for an approved product. You can generate codes after
            the batch is approved.
          </p>
          <div className="mb-3">
            <label className="form-label small">Product</label>
            <ProductPicker
              producerOrgId={org?.id}
              value={newBatchProductId}
              selectedItem={newBatchSelectedProduct}
              onChange={(id, item) => {
                setNewBatchProductId(id);
                setNewBatchSelectedProduct(item ?? null);
              }}
              placeholder="Select product"
              onlyApproved
              disabled={creatingBatch}
            />
            <p className="small text-muted mt-1 mb-0">
              Search by name or SKU. Only approved/active products are shown.
            </p>
          </div>
          <div className="mb-3">
            <label className="form-label small">Batch No</label>
            <input
              type="text"
              className="form-control form-control-sm radius-12"
              placeholder="e.g. BATCH-2024-001"
              value={newBatchForm.batchNo}
              onChange={(e) =>
                setNewBatchForm((f) => ({ ...f, batchNo: e.target.value }))
              }
            />
          </div>
          <div className="row g-2 mb-3">
            <div className="col-6">
              <label className="form-label small">Mfg date</label>
              <input
                type="date"
                className="form-control form-control-sm radius-12"
                value={newBatchForm.mfgDate}
                onChange={(e) =>
                  setNewBatchForm((f) => ({ ...f, mfgDate: e.target.value }))
                }
              />
            </div>
            <div className="col-6">
              <label className="form-label small">Exp date</label>
              <input
                type="date"
                className="form-control form-control-sm radius-12"
                value={newBatchForm.expDate}
                onChange={(e) =>
                  setNewBatchForm((f) => ({ ...f, expDate: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label small">Qty planned</label>
            <input
              type="number"
              className="form-control form-control-sm radius-12"
              min={1}
              placeholder="1000"
              value={newBatchForm.qtyPlanned}
              onChange={(e) =>
                setNewBatchForm((f) => ({ ...f, qtyPlanned: e.target.value }))
              }
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            size="sm"
            className="radius-12"
            onClick={() => setNewBatchModalOpen(false)}
            disabled={creatingBatch}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="radius-12"
            onClick={createNewBatch}
            disabled={
              creatingBatch ||
              !newBatchProductId ||
              !newBatchForm.batchNo?.trim() ||
              !newBatchForm.qtyPlanned
            }
          >
            {creatingBatch ? "Creating…" : "Create batch"}
          </Button>
        </Modal.Footer>
      </Modal>
    </ProducerPageShell>
    </>
  );
}
