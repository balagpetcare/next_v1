"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  adminMedicineWorkspaceApi,
  type MedicineWorkspaceDashboardSummary,
} from "@/lib/adminApi";
import MedicineControlCenterAlerts from "./_components/MedicineControlCenterAlerts";
import MedicineControlCenterKpiGroups from "./_components/MedicineControlCenterKpiGroups";
import MedicineQuickOpsGrid from "./_components/MedicineQuickOpsGrid";
import { MedicineTableEmptyState, MedicineTableSlTd, MedicineTableSlTh } from "./_components/MedicineUiHelpers";
import { medicineTableSl } from "./_lib/medicineTableDisplay";
import { ADMIN_MEDICINE_BASE, ADMIN_MEDICINE_IMPORTS } from "./_lib/paths";

export default function AdminMedicineControlCenterPage() {
  const [data, setData] = useState<MedicineWorkspaceDashboardSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await adminMedicineWorkspaceApi.dashboardSummary();
        setData(res.data ?? null);
        setError("");
      } catch (e) {
        setError((e as Error)?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-main-body text-center py-5">
        <div className="spinner-border text-primary" />
        <p className="text-muted small mt-3 mb-0">Loading medicine control center…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-danger radius-12 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger radius-8"
            onClick={() => {
              setError("");
              setLoading(true);
              adminMedicineWorkspaceApi
                .dashboardSummary()
                .then((res) => {
                  setData(res.data ?? null);
                })
                .catch((e) => setError((e as Error)?.message || "Failed to load dashboard"))
                .finally(() => setLoading(false));
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="dashboard-main-body">
        <MedicineTableEmptyState title="No dashboard data" hint="Check API connectivity and permissions." />
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <div className="d-flex flex-wrap justify-content-between gap-3 mb-3">
        <div>
          <h1 className="h4 mb-1">Medicine Control Center</h1>
          <p className="text-muted small mb-0">
            Unified operations for country catalog medicines, CSV import pipeline, master data (generics, dosage forms, strengths, brands),
            review queues, and exports.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2 align-items-start">
          <Link href={`${ADMIN_MEDICINE_BASE}/listings`} className="btn btn-primary btn-sm radius-12">
            Browse medicines
          </Link>
          <Link href={`${ADMIN_MEDICINE_BASE}/listings/new`} className="btn btn-outline-primary btn-sm radius-12">
            New medicine
          </Link>
          <Link href={`${ADMIN_MEDICINE_IMPORTS}/new`} className="btn btn-outline-primary btn-sm radius-12">
            Import CSV
          </Link>
          <Link href={`${ADMIN_MEDICINE_BASE}/exports`} className="btn btn-outline-secondary btn-sm radius-12">
            Export CSV
          </Link>
          <Link href={`${ADMIN_MEDICINE_BASE}/review`} className="btn btn-outline-secondary btn-sm radius-12">
            Review queues
          </Link>
        </div>
      </div>

      <MedicineControlCenterAlerts data={data} />
      <MedicineControlCenterKpiGroups data={data} />
      <MedicineQuickOpsGrid />

      <div className="card radius-12">
        <div className="card-header bg-transparent p-24 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <h6 className="mb-0 fw-semibold">Recent import batches (7 days)</h6>
          <Link href={ADMIN_MEDICINE_IMPORTS} className="btn btn-sm btn-outline-primary radius-8">
            Full batch history
          </Link>
        </div>
        <div className="card-body p-24 pt-0">
          {!data.imports.recentBatches?.length ? (
            <p className="text-muted small mb-0">
              No import batches in the last 7 days.{" "}
              <Link href={`${ADMIN_MEDICINE_IMPORTS}/new`} className="fw-medium">
                Start an import
              </Link>
              .
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <MedicineTableSlTh />
                    <th>Country</th>
                    <th>File</th>
                    <th>Rows</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.imports.recentBatches.map((b, idx) => (
                    <tr key={b.id}>
                      <MedicineTableSlTd>
                        {medicineTableSl(1, Math.max(data.imports.recentBatches.length, 1), idx)}
                      </MedicineTableSlTd>
                      <td>
                        <span className="badge bg-light text-dark">{b.country?.code ?? "—"}</span>
                      </td>
                      <td className="text-truncate" style={{ maxWidth: 200 }} title={b.filename}>
                        {b.filename}
                      </td>
                      <td>{b.totalRows}</td>
                      <td>
                        <span className="badge bg-secondary-subtle text-dark">{b.status}</span>
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
          )}
        </div>
      </div>
    </div>
  );
}
