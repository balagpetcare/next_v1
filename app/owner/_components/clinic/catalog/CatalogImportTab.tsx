"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  ownerClinicCatalogImportPreview,
  ownerClinicCatalogImportExecute,
  ownerClinicMasterCatalogCategories,
  ownerClinicMasterCatalogItems,
  ownerClinicAddFromMasterPreview,
  ownerClinicAddFromMasterExecute,
} from "@/app/owner/_lib/ownerApi";

type CatalogImportTabProps = { branchId: string };

const SAMPLE_CSV = `type,name,categoryName,domainType,baseUnit
category,Surgical Consumables,,,
category,Medications,,,
item,Syringe 5ml,Medical Consumables,CLINIC_SUPPLY,pc
item,Gauze pack,Surgical Consumables,CLINIC_SUPPLY,pck`;

type MasterItem = {
  id: number;
  name: string;
  itemCode: string;
  slug: string;
  domainType: string;
  baseUnit?: string;
  category?: { id: number; name: string; slug: string };
};
type MasterCategory = { id: number; name: string; slug: string; domainType?: string; _count?: { items: number } };

export default function CatalogImportTab({ branchId }: CatalogImportTabProps) {
  const [importMode, setImportMode] = useState<"csv" | "master">("csv");

  return (
    <div className="card radius-12">
      <div className="card-body">
        <ul className="nav nav-tabs nav-tabs-card mb-3" role="tablist">
          <li className="nav-item" role="presentation">
            <button
              type="button"
              className={`nav-link radius-12 me-1 ${importMode === "csv" ? "active" : ""}`}
              onClick={() => setImportMode("csv")}
              role="tab"
              aria-selected={importMode === "csv"}
            >
              CSV Import
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              type="button"
              className={`nav-link radius-12 me-1 ${importMode === "master" ? "active" : ""}`}
              onClick={() => setImportMode("master")}
              role="tab"
              aria-selected={importMode === "master"}
            >
              Add from Master Catalog
            </button>
          </li>
        </ul>

        {importMode === "csv" && <CsvImportFlow branchId={branchId} />}
        {importMode === "master" && <MasterCatalogFlow branchId={branchId} />}
      </div>
    </div>
  );
}

function CsvImportFlow({ branchId }: { branchId: string }) {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [executeLoading, setExecuteLoading] = useState(false);
  const [action, setAction] = useState<"create-or-update" | "create" | "update" | "skip-duplicates">("create-or-update");

  const handlePreview = useCallback(async () => {
    if (!branchId || !csvText.trim()) {
      toast.warning("Paste CSV content first.");
      return;
    }
    setPreviewLoading(true);
    setPreview(null);
    try {
      const data = await ownerClinicCatalogImportPreview(branchId, { csvText: csvText.trim(), action });
      setPreview(data);
      toast.success("Preview ready.");
    } catch (e) {
      toast.error((e as Error)?.message ?? "Preview failed");
    } finally {
      setPreviewLoading(false);
    }
  }, [branchId, csvText, action]);

  const handleExecute = useCallback(async () => {
    if (!branchId || !preview) return;
    setExecuteLoading(true);
    try {
      const result = await ownerClinicCatalogImportExecute(branchId, { preview, action });
      const r = result as { createdCategories?: number; updatedCategories?: number; createdItems?: number; updatedItems?: number; skipped?: number; errors?: { rowIndex: number; message: string }[] };
      const msg = `Created: ${r.createdCategories ?? 0} categories, ${r.createdItems ?? 0} items. Updated: ${r.updatedCategories ?? 0} categories, ${r.updatedItems ?? 0} items. Skipped: ${r.skipped ?? 0}.`;
      if ((r.errors?.length ?? 0) > 0) toast.warning(`${msg} ${r.errors?.length} row(s) had errors.`);
      else toast.success(msg);
      setPreview(null);
      setCsvText("");
    } catch (e) {
      toast.error((e as Error)?.message ?? "Import failed");
    } finally {
      setExecuteLoading(false);
    }
  }, [branchId, preview, action]);

  const validationErrors = (preview?.validationErrors as { rowIndex: number; field?: string; message: string }[]) ?? [];
  const rowCount = (preview?.rowCount as number) ?? 0;

  return (
    <>
      <h6 className="mb-3">Bulk import (CSV)</h6>
      <p className="text-muted small mb-3">
        Paste CSV with columns: <code>type</code> (category | item), <code>name</code>, and for items: <code>categoryName</code>, <code>domainType</code>, <code>baseUnit</code>. Run preview first, then execute.
      </p>
      <div className="mb-3">
        <label className="form-label small">Import action</label>
        <select
          className="form-select form-select-sm radius-8 w-auto"
          value={action}
          onChange={(e) => setAction(e.target.value as typeof action)}
        >
          <option value="create-or-update">Create or update</option>
          <option value="create">Create only</option>
          <option value="update">Update only</option>
          <option value="skip-duplicates">Skip duplicates</option>
        </select>
      </div>
      <div className="mb-3">
        <textarea
          className="form-control font-monospace small radius-12"
          rows={8}
          placeholder="Paste CSV here..."
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
        />
      </div>
      <div className="d-flex gap-2 mb-4">
        <button type="button" className="btn btn-outline-primary radius-12" onClick={handlePreview} disabled={previewLoading || !csvText.trim()}>
          {previewLoading ? "Loading…" : "Preview"}
        </button>
        <button type="button" className="btn btn-outline-secondary radius-12" onClick={() => setCsvText(SAMPLE_CSV)}>
          Load sample
        </button>
      </div>

      {preview && (
        <div className="border rounded-3 p-3 bg-light">
          <h6 className="mb-2">Preview</h6>
          <p className="small mb-2">
            Rows: <strong>{rowCount}</strong> ({(preview.categoryCount as number) ?? 0} categories, {(preview.itemCount as number) ?? 0} items). Duplicates: {(preview.duplicates as unknown[])?.length ?? 0}. Validation errors: {validationErrors.length}.
          </p>
          {validationErrors.length > 0 && (
            <ul className="small text-danger mb-2">
              {validationErrors.slice(0, 10).map((e, i) => (
                <li key={i}>Row {e.rowIndex}: {e.message}</li>
              ))}
              {validationErrors.length > 10 && <li>… and {validationErrors.length - 10} more</li>}
            </ul>
          )}
          <button type="button" className="btn btn-primary radius-12" onClick={handleExecute} disabled={executeLoading}>
            {executeLoading ? "Importing…" : "Execute import"}
          </button>
        </div>
      )}
    </>
  );
}

function MasterCatalogFlow({ branchId }: { branchId: string }) {
  const [categories, setCategories] = useState<MasterCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [domainType, setDomainType] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [previewResult, setPreviewResult] = useState<Record<string, unknown> | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [executeLoading, setExecuteLoading] = useState(false);
  const [addOption, setAddOption] = useState<"createMissingOnly" | "createOrUpdate" | "skipExisting">("createMissingOnly");
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = items.length > 0 && selectedIds.size > 0 && selectedIds.size < items.length;
  }, [items.length, selectedIds.size]);

  const loadCategories = useCallback(async (signal?: AbortSignal) => {
    if (!branchId) return;
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const res = await ownerClinicMasterCatalogCategories(branchId, { limit: 200 });
      if (signal?.aborted) return;
      setCategories(res.items as MasterCategory[]);
    } catch (e) {
      if (signal?.aborted) return;
      setCategories([]);
      const msg = (e as Error)?.message ?? "Failed to load categories.";
      setCategoriesError(msg);
      toast.error(msg);
    } finally {
      if (!signal?.aborted) setCategoriesLoading(false);
    }
  }, [branchId]);

  const loadItems = useCallback(async (signal?: AbortSignal) => {
    if (!branchId) return;
    setItemsLoading(true);
    setItemsError(null);
    try {
      const res = await ownerClinicMasterCatalogItems(branchId, {
        page: pagination.page,
        limit: pagination.limit,
        search: search.trim() || undefined,
        categoryId: categoryId === "" ? undefined : categoryId,
        domainType: domainType || undefined,
      });
      if (signal?.aborted) return;
      setItems(res.items);
      setPagination(res.pagination);
    } catch (e) {
      if (signal?.aborted) return;
      setItems([]);
      setPagination((p) => ({ ...p, total: 0, totalPages: 0 }));
      const msg = (e as Error)?.message ?? "Failed to load master catalog items.";
      setItemsError(msg);
      toast.error(msg);
    } finally {
      if (!signal?.aborted) setItemsLoading(false);
    }
  }, [branchId, pagination.page, pagination.limit, search, categoryId, domainType]);

  const goToPage = useCallback((page: number) => {
    setPagination((p) => ({ ...p, page: Math.max(1, Math.min(page, p.totalPages || 1)) }));
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    loadCategories(ac.signal);
    return () => ac.abort();
  }, [loadCategories]);

  useEffect(() => {
    const ac = new AbortController();
    loadItems(ac.signal);
    return () => ac.abort();
  }, [loadItems]);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  }, [items, selectedIds.size]);

  const handleToggleItem = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handlePreview = useCallback(async () => {
    if (!branchId || selectedIds.size === 0) {
      toast.warning("Select at least one item.");
      return;
    }
    setPreviewLoading(true);
    setPreviewResult(null);
    try {
      const data = await ownerClinicAddFromMasterPreview(branchId, {
        masterItemIds: [...selectedIds],
        option: addOption,
      });
      setPreviewResult(data);
      toast.success("Preview ready.");
    } catch (e) {
      toast.error((e as Error)?.message ?? "Preview failed");
    } finally {
      setPreviewLoading(false);
    }
  }, [branchId, selectedIds, addOption]);

  const handleAddToClinic = useCallback(async () => {
    if (!branchId || selectedIds.size === 0) {
      toast.warning("Select at least one item.");
      return;
    }
    setExecuteLoading(true);
    try {
      const result = await ownerClinicAddFromMasterExecute(branchId, {
        masterItemIds: [...selectedIds],
        option: addOption,
      });
      const msg = `Created: ${result.createdCategories} categories, ${result.createdItems} items. Updated: ${result.updatedItems}. Skipped: ${result.skippedItems}.`;
      toast.success(msg);
      setPreviewResult(null);
      setSelectedIds(new Set());
    } catch (e) {
      toast.error((e as Error)?.message ?? "Add to clinic failed");
    } finally {
      setExecuteLoading(false);
    }
  }, [branchId, selectedIds, addOption]);

  return (
    <>
      <h6 className="mb-3">Add from Master Catalog</h6>
      <p className="text-muted small mb-3">
        Search and select master catalog items, then add them to your clinic catalog. Use the duplicate handling option to control how existing items are treated.
      </p>

      <div className="row g-2 mb-3">
        <div className="col-12 col-md-4">
          <input
            type="text"
            className="form-control form-control-sm radius-8"
            placeholder={"Search items..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-6 col-md-3">
          <select
            className="form-select form-select-sm radius-8"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
          >
            <option value="">All categories</option>
            {categoriesLoading ? (
              <option disabled>Loading…</option>
            ) : (
              categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c._count?.items ?? 0})
                </option>
              ))
            )}
          </select>
        </div>
        <div className="col-6 col-md-2">
          <select
            className="form-select form-select-sm radius-8"
            value={domainType}
            onChange={(e) => setDomainType(e.target.value)}
          >
            <option value="">All types</option>
            <option value="MEDICINE">MEDICINE</option>
            <option value="CLINIC_SUPPLY">CLINIC_SUPPLY</option>
            <option value="SURGICAL_CONSUMABLE">SURGICAL_CONSUMABLE</option>
            <option value="DRESSING_SUPPLY">DRESSING_SUPPLY</option>
            <option value="INSTRUMENT">INSTRUMENT</option>
          </select>
        </div>
      </div>

      <div className="mb-2 d-flex align-items-center justify-content-between flex-wrap gap-2">
        <label className="form-label small mb-0 me-2">
          Duplicate handling:
        </label>
        <select
          className="form-select form-select-sm radius-8 w-auto"
          value={addOption}
          onChange={(e) => setAddOption(e.target.value as typeof addOption)}
        >
          <option value="createMissingOnly">Create missing only</option>
          <option value="createOrUpdate">Create or update</option>
          <option value="skipExisting">Skip existing</option>
        </select>
      </div>

      <div className="table-responsive mb-3" style={{ maxHeight: "400px", overflowY: "auto" }}>
        <table className="table table-sm table-hover">
          <thead className="table-light sticky-top">
            <tr>
              <th style={{ width: "40px" }}>
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="form-check-input"
                  checked={items.length > 0 && selectedIds.size === items.length}
                  onChange={handleSelectAll}
                  aria-label="Select all in current filter"
                />
              </th>
              <th>Name</th>
              <th>Code</th>
              <th>Category</th>
              <th>Domain</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            {itemsLoading ? (
              <tr>
                <td colSpan={6} className="text-center text-muted py-4">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-muted py-4">
                  {itemsError ? (
                    "Could not load master catalog. Check that the backend is running and you have permission."
                  ) : pagination.total === 0 && !search.trim() && categoryId === "" && !domainType ? (
                    <>
                      Master catalog is empty. Run the database seed in the backend to load items:{" "}
                      <code className="small">npx prisma db seed</code> (in the backend-api project).
                    </>
                  ) : (
                    "No items match the filter. Adjust search or category."
                  )}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={selectedIds.has(item.id)}
                      onChange={() => handleToggleItem(item.id)}
                      aria-label={`Select ${item.name}`}
                    />
                  </td>
                  <td>{item.name}</td>
                  <td><code className="small">{item.itemCode}</code></td>
                  <td>{item.category?.name ?? "—"}</td>
                  <td><span className="badge bg-secondary-subtle text-secondary-emphasis radius-8">{item.domainType}</span></td>
                  <td>{item.baseUnit ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="d-flex align-items-center gap-3 flex-wrap mb-3">
        <span className="small text-muted">
          Selected: <strong>{selectedIds.size}</strong> item(s). Page {pagination.page} of {pagination.totalPages || 1} ({pagination.total} total).
        </span>
        {pagination.totalPages > 1 && (
          <div className="d-flex gap-1">
            <button type="button" className="btn btn-outline-secondary btn-sm radius-8" onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page <= 1}>Prev</button>
            <button type="button" className="btn btn-outline-secondary btn-sm radius-8" onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page >= (pagination.totalPages || 1)}>Next</button>
          </div>
        )}
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-primary btn-sm radius-12"
            onClick={handlePreview}
            disabled={previewLoading || selectedIds.size === 0}
          >
            {previewLoading ? "Loading…" : "Preview"}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm radius-12"
            onClick={handleAddToClinic}
            disabled={executeLoading || selectedIds.size === 0}
          >
            {executeLoading ? "Adding…" : "Add to clinic"}
          </button>
        </div>
      </div>

      {previewResult && (
        <div className="border rounded-3 p-3 bg-light">
          <h6 className="mb-2">Preview</h6>
          <p className="small mb-2">
            {(previewResult.actionSummary as string) ?? ""}
          </p>
          <p className="small text-muted mb-0">
            New: {(previewResult.newItemsCount as number) ?? 0} items, {(previewResult.newCategoriesCount as number) ?? 0} categories. Already installed: {(previewResult.duplicateCount as number) ?? 0} items.
          </p>
        </div>
      )}
    </>
  );
}
