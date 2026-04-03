"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminMedicineWorkspaceApi } from "@/lib/adminApi";
import { MasterActiveBadge, MedicineTableEmptyState, MedicineTableSlTd, MedicineTableSlTh } from "../_components/MedicineUiHelpers";
import { MEDICINE_MASTER_PAGE_LIMIT, medicineTableSl } from "../_lib/medicineTableDisplay";
import { PaginationBar } from "@/src/components/common/PaginationBar";
import { ADMIN_MEDICINE_BASE } from "../_lib/paths";

export default function AdminMedicineDosageFormsPage() {
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminMedicineWorkspaceApi.dosageFormsList({
        search: search.trim() || undefined,
        page,
        limit: 40,
        includeInactive,
      });
      const d = res.data as { items?: Record<string, unknown>[]; pagination?: { total?: number; totalPages?: number } };
      setItems(d?.items ?? []);
      const pag = d?.pagination;
      setTotalCount(Number(pag?.total) || 0);
      setTotalPages(Math.max(1, Number(pag?.totalPages) || 1));
      setError("");
    } catch (e) {
      setError((e as Error)?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }, [search, page, includeInactive]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="dashboard-main-body">
      <div className="d-flex flex-wrap justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">Dosage Forms</h1>
          <p className="text-muted small mb-0">Normalized dosage forms. Archive blocked while presentations use the form.</p>
        </div>
        <Link href={`${ADMIN_MEDICINE_BASE}/dosage-forms/new`} className="btn btn-primary btn-sm radius-12">
          New form
        </Link>
      </div>
      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
      <div className="card radius-12 mb-3">
        <div className="card-body p-16 d-flex flex-wrap gap-2">
          <input
            className="form-control form-control-sm"
            style={{ maxWidth: 280 }}
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
          <label className="form-check small mb-0">
            <input
              type="checkbox"
              className="form-check-input"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />{" "}
            Include inactive
          </label>
          <button type="button" className="btn btn-sm btn-outline-primary radius-8" onClick={() => load()}>
            Search
          </button>
        </div>
      </div>
      <div className="card radius-12">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <MedicineTableSlTh />
                    <th>Form</th>
                    <th>Key</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {!loading && items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-0">
                        <MedicineTableEmptyState title="No dosage forms found" hint="Adjust search or include inactive." />
                      </td>
                    </tr>
                  ) : (
                    items.map((g, idx) => (
                      <tr key={String(g.id)}>
                        <MedicineTableSlTd>{medicineTableSl(page, MEDICINE_MASTER_PAGE_LIMIT, idx)}</MedicineTableSlTd>
                        <td className="fw-semibold">{String(g.displayName ?? "")}</td>
                        <td>
                          <code className="small text-muted">{String(g.normalizedKey ?? "")}</code>
                        </td>
                        <td>
                          <MasterActiveBadge isActive={Boolean(g.isActive)} />
                        </td>
                        <td className="text-end">
                          <Link href={`${ADMIN_MEDICINE_BASE}/dosage-forms/${g.id}`} className="btn btn-sm btn-outline-primary radius-8">
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card-footer bg-transparent">
          <PaginationBar
            page={page}
            pageSize={MEDICINE_MASTER_PAGE_LIMIT}
            total={totalCount}
            totalPages={totalPages}
            disabled={loading}
            onPageChange={setPage}
            className="mt-0 pt-0 border-0"
            ariaLabel="Dosage forms list pages"
          />
        </div>
      </div>
    </div>
  );
}
