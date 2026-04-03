"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminMedicineWorkspaceApi,
  type MedicineListingsListParams,
  type MedicineWorkspaceDashboardSummary,
} from "@/lib/adminApi";
import { ADMIN_MEDICINE_BASE, ADMIN_MEDICINE_IMPORTS } from "../_lib/paths";
import {
  DEFAULT_MEDICINE_LISTINGS_FILTER_STATE,
  medicineFilterStateToListParams,
  parseMedicineListingsFiltersFromSearchParams,
  serializeMedicineListingsFiltersToSearchParams,
  type MedicineListingsFilterState,
} from "./_lib/medicineListingsFilterState";
import MedicineListingStatsCards from "./_components/MedicineListingStatsCards";
import MedicineListingTable, { type MedicineListingRowModel } from "./_components/MedicineListingTable";
import { PaginationBar } from "@/src/components/common/PaginationBar";
import MedicineSearchConsole from "./_components/MedicineSearchConsole";
import { useDebouncedValue } from "./_lib/useDebouncedValue";

type BulkAction = "deactivate" | "activate" | "archive";

export default function AdminMedicineListingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [draft, setDraft] = useState<MedicineListingsFilterState>(() =>
    parseMedicineListingsFiltersFromSearchParams(sp)
  );

  useEffect(() => {
    const onPop = () => {
      setDraft(parseMedicineListingsFiltersFromSearchParams(new URLSearchParams(window.location.search)));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const debouncedQ = useDebouncedValue(draft.q, 400);

  useEffect(() => {
    const after = debouncedQ.trim();
    const before = sp.get("q") || "";
    if (before === after) return;
    const p = new URLSearchParams(sp.toString());
    if (after) p.set("q", after);
    else p.delete("q");
    p.set("page", "1");
    setDraft((d) => ({ ...d, page: 1 }));
    router.replace(`${pathname}?${p}`, { scroll: false });
  }, [debouncedQ, pathname, router, sp]);

  const commitToUrl = useCallback(
    (next: MedicineListingsFilterState) => {
      const qs = serializeMedicineListingsFiltersToSearchParams(next).toString();
      router.push(`${pathname}?${qs}`, { scroll: false });
    },
    [pathname, router]
  );

  const [countries, setCountries] = useState<{ id: number; code: string; name: string }[]>([]);
  const [items, setItems] = useState<MedicineListingRowModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [bulkModal, setBulkModal] = useState<BulkAction | null>(null);
  const [bulkNote, setBulkNote] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);

  const [dash, setDash] = useState<MedicineWorkspaceDashboardSummary | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [countrySlice, setCountrySlice] = useState<{ active: number; inactive: number; archived: number } | null>(null);

  const listParams: MedicineListingsListParams = useMemo(
    () => medicineFilterStateToListParams(draft, debouncedQ),
    [draft, debouncedQ]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminMedicineWorkspaceApi.listingsList(listParams);
      const d = res.data as { items?: MedicineListingRowModel[]; pagination?: { totalPages?: number; total?: number } };
      setItems((d?.items ?? []) as MedicineListingRowModel[]);
      const tp = Number(d?.pagination?.totalPages) || 1;
      setTotalPages(Math.max(1, tp));
      setTotalCount(Number(d?.pagination?.total) || 0);
      setError("");
      setSelected(new Set());
    } catch (e) {
      setError((e as Error)?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [listParams]);

  useEffect(() => {
    adminMedicineWorkspaceApi.countries().then((r) => setCountries(r.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setDashLoading(true);
        const res = await adminMedicineWorkspaceApi.dashboardSummary();
        if (!cancelled) setDash(res.data ?? null);
      } catch {
        if (!cancelled) setDash(null);
      } finally {
        if (!cancelled) setDashLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cid = draft.countryId;
    if (!cid) {
      setCountrySlice(null);
      return;
    }
    const id = Number(cid);
    if (!Number.isFinite(id)) {
      setCountrySlice(null);
      return;
    }
    let cancelled = false;
    adminMedicineWorkspaceApi
      .countryCatalogSummary(id)
      .then((r) => {
        if (!cancelled && r.data?.listings) setCountrySlice(r.data.listings);
      })
      .catch(() => {
        if (!cancelled) setCountrySlice(null);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.countryId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleId = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectableOnPage = items.filter((r) => !r.archivedAt);
  const allSelectableSelected =
    selectableOnPage.length > 0 && selectableOnPage.every((r) => selected.has(r.id));

  const toggleSelectAllPage = () => {
    if (allSelectableSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        selectableOnPage.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        selectableOnPage.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  const runBulk = async () => {
    if (!bulkModal || selected.size === 0) return;
    try {
      setBulkBusy(true);
      setError("");
      const res = await adminMedicineWorkspaceApi.listingsBulk({
        action: bulkModal,
        ids: Array.from(selected),
        reason: bulkNote.trim() || undefined,
      });
      const failed = res.data?.failed ?? [];
      if (failed.length) {
        setError(
          `Bulk completed with ${res.data?.ok ?? 0} ok, ${failed.length} failed. First: #${failed[0].id} — ${failed[0].message}`
        );
      }
      setBulkModal(null);
      setBulkNote("");
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Bulk action failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const exportParams = useMemo(() => medicineFilterStateToListParams(draft, debouncedQ), [draft, debouncedQ]);

  const onExportFiltered = async () => {
    try {
      setExportBusy(true);
      setError("");
      const { page: _pg, limit: _lm, sortBy: _sb, sortDir: _sd, ...csvFilters } = exportParams;
      await adminMedicineWorkspaceApi.downloadListingsCsv(csvFilters, "medicine-listings-filtered.csv");
    } catch (e) {
      setError((e as Error)?.message || "Export failed");
    } finally {
      setExportBusy(false);
    }
  };

  const countryLabel = useMemo(() => {
    if (!draft.countryId) return null;
    const c = countries.find((x) => String(x.id) === draft.countryId);
    return c ? `${c.code} — ${c.name}` : null;
  }, [countries, draft.countryId]);

  const goPage = (p: number) => {
    const next = { ...draft, page: Math.max(1, p) };
    setDraft(next);
    commitToUrl(next);
  };

  return (
    <div className="dashboard-main-body">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-4 mb-3">
        <div className="flex-grow-1 min-w-0" style={{ maxWidth: 760 }}>
          <Link href={ADMIN_MEDICINE_BASE} className="text-muted small d-inline-block mb-2">
            ← Medicine Control Center
          </Link>
          <h1 className="h3 fw-bold mb-2">Medicines · Medicine operations</h1>
          <p className="text-muted mb-0">
            Enterprise search console: URL-backed views, local saved presets, and optional related-result expansion. Row actions and bulk rules
            unchanged.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2 justify-content-end align-items-start">
          <Link href={`${ADMIN_MEDICINE_BASE}/listings/new`} className="btn btn-primary btn-sm radius-12">
            <i className="ri-add-line me-1" aria-hidden />
            New medicine
          </Link>
          <Link href={`${ADMIN_MEDICINE_IMPORTS}/new`} className="btn btn-outline-primary btn-sm radius-12">
            <i className="ri-upload-2-line me-1" aria-hidden />
            Import
          </Link>
          <Link href={`${ADMIN_MEDICINE_BASE}/review`} className="btn btn-outline-secondary btn-sm radius-12">
            <i className="ri-error-warning-line me-1" aria-hidden />
            Review conflicts
          </Link>
        </div>
      </div>

      <MedicineListingStatsCards
        loading={dashLoading}
        dashboard={dash}
        countrySummary={countrySlice}
        countryLabel={countryLabel}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger radius-8" onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}

      {selected.size > 0 && (
        <div className="alert alert-primary radius-12 mb-3 d-flex flex-wrap align-items-center gap-2 py-2 border-primary-subtle">
          <span className="small fw-semibold">
            <i className="ri-checkbox-multiple-line me-1" aria-hidden />
            {selected.size} selected
          </span>
          <div className="vr d-none d-sm-block" />
          <button type="button" className="btn btn-sm btn-outline-warning radius-8" onClick={() => setBulkModal("deactivate")}>
            Deactivate
          </button>
          <button type="button" className="btn btn-sm btn-outline-success radius-8" onClick={() => setBulkModal("activate")}>
            Activate
          </button>
          <button type="button" className="btn btn-sm btn-outline-danger radius-8" onClick={() => setBulkModal("archive")}>
            Archive
          </button>
          <button type="button" className="btn btn-sm btn-link text-muted ms-auto" onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
        </div>
      )}

      <MedicineSearchConsole
        countries={countries}
        draft={draft}
        setDraft={setDraft}
        debouncedQ={debouncedQ}
        onCommitToUrl={commitToUrl}
        resultCount={totalCount}
        loading={loading}
        onExport={() => void onExportFiltered()}
        exportBusy={exportBusy}
      />

      <MedicineListingTable
        page={draft.page}
        limit={draft.limit}
        loading={loading}
        items={items}
        selected={selected}
        toggleId={toggleId}
        toggleSelectAllPage={toggleSelectAllPage}
        allSelectableSelected={allSelectableSelected}
        selectableOnPage={selectableOnPage}
        onResetFilters={() => {
          const next: MedicineListingsFilterState = {
            ...DEFAULT_MEDICINE_LISTINGS_FILTER_STATE,
            advancedOpen: draft.advancedOpen,
          };
          setDraft(next);
          commitToUrl(next);
        }}
        onListingMutation={() => void load()}
        onWorkspaceError={(msg) => setError(msg)}
      />

      <PaginationBar
        page={draft.page}
        pageSize={draft.limit}
        total={totalCount}
        totalPages={totalPages}
        disabled={loading}
        onPageChange={goPage}
        className="mt-3 mb-4"
        ariaLabel="Medicine listings pages"
      />

      {bulkModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }} role="dialog">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h5 className="modal-title">
                  Bulk {bulkModal === "archive" ? "archive" : bulkModal === "activate" ? "activate" : "deactivate"} ({selected.size} rows)
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setBulkModal(null);
                    setBulkNote("");
                  }}
                  aria-label="Close"
                />
              </div>
              <div className="modal-body small">
                {bulkModal === "archive" && (
                  <p className="text-muted">
                    Rows referenced by prescriptions will fail individually; others will archive. Optional note applies to all successful
                    archives.
                  </p>
                )}
                {bulkModal === "deactivate" && <p className="text-muted">Optional note stored on each row&apos;s audit trail.</p>}
                <label className="form-label">Note (optional)</label>
                <input className="form-control form-control-sm" value={bulkNote} onChange={(e) => setBulkNote(e.target.value)} />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm radius-8"
                  onClick={() => {
                    setBulkModal(null);
                    setBulkNote("");
                  }}
                >
                  Cancel
                </button>
                <button type="button" className="btn btn-primary btn-sm radius-8" disabled={bulkBusy} onClick={() => void runBulk()}>
                  {bulkBusy ? "Working…" : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
