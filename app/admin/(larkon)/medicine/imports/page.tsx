"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminMedicineCatalogImportApi, adminMedicineWorkspaceApi } from "@/lib/adminApi";
import { MedicineTableEmptyState, MedicineTableSlTd, MedicineTableSlTh } from "../_components/MedicineUiHelpers";
import { medicineTableSl } from "../_lib/medicineTableDisplay";
import { PaginationBar } from "@/src/components/common/PaginationBar";
import { ADMIN_MEDICINE_BASE, ADMIN_MEDICINE_IMPORTS } from "../_lib/paths";

type BatchItem = {
  id: number;
  status: string;
  filename: string;
  totalRows: number;
  previewVersion: number;
  createdAt: string;
  errorMessage?: string | null;
  country?: { code: string; name: string };
};

const STATUS_OPTS = [
  "",
  "UPLOADED",
  "PARSED",
  "PREVIEW_READY",
  "CONFIRMED",
  "APPLYING",
  "APPLIED",
  "PARTIALLY_APPLIED",
  "FAILED",
  "CANCELLED",
];

export default function AdminMedicineImportsListPage() {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [countries, setCountries] = useState<{ id: number; code: string; name: string }[]>([]);
  const [countryId, setCountryId] = useState<number | "">("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminMedicineWorkspaceApi.countries().then((r) => setCountries(r.data ?? [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminMedicineCatalogImportApi.batches({
        page,
        limit,
        countryId: countryId === "" ? undefined : Number(countryId),
        status: status || undefined,
      });
      const data = res?.data as {
        items?: BatchItem[];
        pagination?: { totalPages?: number; total?: number };
      };
      setItems((data?.items ?? []) as BatchItem[]);
      setTotalPages(Math.max(1, Number(data?.pagination?.totalPages) || 1));
      setTotalCount(Number(data?.pagination?.total) || 0);
      setError("");
    } catch (e) {
      setError((e as Error)?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, limit, countryId, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="dashboard-main-body">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <Link href={ADMIN_MEDICINE_BASE} className="text-muted small d-inline-block mb-1">
            ← Medicine Control Center
          </Link>
          <h1 className="h4 mb-1">Imports</h1>
          <p className="text-muted small mb-0">
            Staging pipeline: upload → parse → preview → confirm → apply. Creates/updates <strong>master entities</strong> and{" "}
            <strong>country catalog medicines</strong> per file. Purge (governance only) removes staging, not applied catalog rows.
          </p>
        </div>
        <Link href={`${ADMIN_MEDICINE_IMPORTS}/new`} className="btn btn-primary radius-12">
          New import
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger radius-12 mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger radius-8" onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}

      <div className="card radius-12 mb-3">
        <div className="card-body p-24">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label small fw-medium">Country</label>
              <select
                className="form-select form-select-sm"
                value={countryId === "" ? "" : String(countryId)}
                onChange={(e) => {
                  setCountryId(e.target.value ? Number(e.target.value) : "");
                  setPage(1);
                }}
              >
                <option value="">All countries</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-medium">Status</label>
              <select
                className="form-select form-select-sm"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                {STATUS_OPTS.map((s) => (
                  <option key={s || "all"} value={s}>
                    {s || "All statuses"}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <button type="button" className="btn btn-outline-primary btn-sm w-100 radius-8" onClick={() => load()}>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card radius-12">
        <div className="card-header bg-transparent p-24">
          <h6 className="mb-0 fw-semibold">Import history</h6>
        </div>
        <div className="card-body p-24">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" />
            </div>
          ) : items.length === 0 ? (
            <MedicineTableEmptyState
              title="No import batches match these filters"
              hint={
                <>
                  Clear filters or start a new upload from{" "}
                  <Link href={`${ADMIN_MEDICINE_IMPORTS}/new`} className="fw-medium">
                    New import
                  </Link>
                  .
                </>
              }
            />
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <MedicineTableSlTh />
                      <th>Country</th>
                      <th>File</th>
                      <th>Rows</th>
                      <th>Status</th>
                      <th>Preview v</th>
                      <th>Created</th>
                      <th>Note</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((b, idx) => (
                      <tr key={b.id}>
                        <MedicineTableSlTd>{medicineTableSl(page, limit, idx)}</MedicineTableSlTd>
                        <td>
                          <span className="badge bg-light text-dark">{b.country?.code ?? "—"}</span>{" "}
                          <span className="text-muted small">{b.country?.name ?? ""}</span>
                        </td>
                        <td className="text-truncate" style={{ maxWidth: 200 }} title={b.filename}>
                          {b.filename}
                        </td>
                        <td>{b.totalRows}</td>
                        <td>
                          <span className="badge bg-secondary-subtle text-dark">{b.status}</span>
                        </td>
                        <td>{b.previewVersion}</td>
                        <td className="small text-muted">{new Date(b.createdAt).toLocaleString()}</td>
                        <td className="small text-muted text-truncate" style={{ maxWidth: 200 }} title={b.errorMessage || ""}>
                          {b.status === "FAILED" && b.errorMessage ? b.errorMessage : "—"}
                        </td>
                        <td className="text-end">
                          <Link href={`${ADMIN_MEDICINE_IMPORTS}/${b.id}`} className="btn btn-sm btn-outline-primary radius-8">
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar
                page={page}
                pageSize={limit}
                total={totalCount}
                totalPages={totalPages}
                disabled={loading}
                onPageChange={setPage}
                ariaLabel="Import batches pages"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
