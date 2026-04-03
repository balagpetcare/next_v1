"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { adminMedicineWorkspaceApi } from "@/lib/adminApi";
import { ADMIN_MEDICINE_LISTINGS } from "../_lib/paths";

export default function AdminMedicineExportsPage() {
  const [countries, setCountries] = useState<{ id: number; code: string; name: string }[]>([]);
  const [countryId, setCountryId] = useState<number | "">("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [rxFilter, setRxFilter] = useState<"all" | "yes" | "no">("all");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    adminMedicineWorkspaceApi.countries().then((r) => setCountries(r.data ?? [])).catch(() => {});
  }, []);

  const exportParams = useMemo(
    () => ({
      countryId: countryId === "" ? undefined : Number(countryId),
      includeArchived,
      q: q.trim() || undefined,
      isActive: statusFilter === "all" ? undefined : statusFilter === "active",
      hasPrescriptions: rxFilter === "yes" ? true : rxFilter === "no" ? false : undefined,
    }),
    [countryId, includeArchived, q, statusFilter, rxFilter]
  );

  const suggestedFilename = useMemo(() => {
    const parts = ["medicine-listings"];
    if (countryId !== "") parts.push(`country-${countryId}`);
    if (statusFilter !== "all") parts.push(statusFilter);
    if (rxFilter !== "all") parts.push(rxFilter === "yes" ? "with-rx" : "no-rx");
    if (q.trim()) parts.push("filtered");
    return `${parts.join("-")}.csv`;
  }, [countryId, statusFilter, rxFilter, q]);

  const onDownload = async () => {
    try {
      setBusy(true);
      setError("");
      await adminMedicineWorkspaceApi.downloadListingsCsv(exportParams, suggestedFilename);
    } catch (e) {
      setError((e as Error)?.message || "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dashboard-main-body">
      <h1 className="h4 mb-1">Export & Reports</h1>
      <p className="text-muted small mb-2">
        Download <strong>country catalog medicines</strong> (listings) as CSV using the same filter parameters as the{" "}
        <Link href={ADMIN_MEDICINE_LISTINGS}>listings grid</Link>. Batch-level invalid/classification CSVs stay on each import batch detail
        screen.
      </p>
      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
      <div className="card radius-12" style={{ maxWidth: 520 }}>
        <div className="card-body p-24">
          <div className="mb-3">
            <label className="form-label fw-medium">Country (optional)</label>
            <select
              className="form-select"
              value={countryId === "" ? "" : String(countryId)}
              onChange={(e) => setCountryId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">All countries</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label fw-medium">Search (q)</label>
            <input
              className="form-control"
              placeholder="Brand, generic, strength…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label className="form-label fw-medium">Listing status</label>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
            >
              <option value="all">All (active + inactive)</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label fw-medium">Prescription lines</label>
            <select
              className="form-select"
              value={rxFilter}
              onChange={(e) => setRxFilter(e.target.value as "all" | "yes" | "no")}
            >
              <option value="all">Any</option>
              <option value="yes">Has prescription lines</option>
              <option value="no">No prescription lines</option>
            </select>
          </div>
          <div className="form-check mb-4">
            <input
              className="form-check-input"
              type="checkbox"
              id="incArch"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="incArch">
              Include archived listings
            </label>
          </div>
          <button type="button" className="btn btn-primary radius-12" disabled={busy} onClick={() => void onDownload()}>
            {busy ? "Preparing…" : "Download CSV"}
          </button>
          <p className="text-muted small mt-3 mb-0">
            Export is server-filtered (not limited to the current listings page). For batch-scoped slices, open the import batch and use the
            download actions there.
          </p>
        </div>
      </div>
    </div>
  );
}
