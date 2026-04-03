"use client";

import Link from "next/link";
import type { MedicineWorkspaceDashboardSummary } from "@/lib/adminApi";
import styles from "../medicine-listings-console.module.css";
import { ADMIN_MEDICINE_BASE } from "../../_lib/paths";

type CountrySlice = { active: number; inactive: number; archived: number };

type Props = {
  loading: boolean;
  dashboard: MedicineWorkspaceDashboardSummary | null;
  countrySummary: CountrySlice | null;
  countryLabel: string | null;
};

function StatCard({
  label,
  value,
  hint,
  iconClass,
  variant,
}: {
  label: string;
  value: string | number;
  hint?: string;
  iconClass: string;
  variant: "primary" | "success" | "warning" | "info" | "secondary" | "danger";
}) {
  const tone =
    variant === "primary"
      ? "text-primary"
      : variant === "success"
        ? "text-success"
        : variant === "warning"
          ? "text-warning"
          : variant === "info"
            ? "text-info"
            : variant === "danger"
              ? "text-danger"
              : "text-secondary";
  return (
    <div className={`card radius-12 h-100 ${styles.statCard}`}>
      <div className="card-body p-8 p-md-20 d-flex align-items-start gap-3">
        <span className={`rounded-3 p-4 bg-light ${tone}`}>
          <i className={`${iconClass} fs-4`} aria-hidden />
        </span>
        <div className="flex-grow-1 min-w-0">
          <div className="text-muted text-uppercase fw-semibold small" style={{ fontSize: "0.7rem", letterSpacing: "0.04em" }}>
            {label}
          </div>
          <div className="h4 mb-0 fw-bold mt-1">{value}</div>
          {hint ? <div className="small text-muted mt-1 mb-0 text-truncate">{hint}</div> : null}
        </div>
      </div>
    </div>
  );
}

export default function MedicineListingStatsCards({ loading, dashboard, countrySummary, countryLabel }: Props) {
  if (loading && !dashboard) {
    return (
      <div className="row g-3 mb-4">
        {[1, 2, 3, 4, 5, 6].map((k) => (
          <div key={k} className="col-6 col-lg-4 col-xl-2">
            <div className="card radius-12">
              <div className="card-body p-20">
                <div className="placeholder-glow">
                  <span className="placeholder col-8 mb-2" />
                  <span className="placeholder col-5" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!dashboard) return null;

  const L = dashboard.listings;
  const totalCatalog = L.active + L.inactive + L.archived;
  const slice = countrySummary;
  const activeShow = slice ? slice.active : L.active;
  const inactiveShow = slice ? slice.inactive : L.inactive;
  const archivedShow = slice ? slice.archived : L.archived;
  const totalShow = slice ? slice.active + slice.inactive + slice.archived : totalCatalog;
  const scopeHint = countryLabel ? `Country: ${countryLabel}` : "All countries";

  const imported = L.importedLineage ?? 0;
  const manual = L.manualApprox ?? 0;
  const rxLinked = L.prescriptionLinked ?? 0;
  const review = dashboard.reviewQueues?.needsReview ?? 0;

  return (
    <div className="row g-3 mb-4">
      <div className="col-6 col-lg-4 col-xl-2">
        <StatCard label="Total medicines" value={totalShow} hint={scopeHint} iconClass="ri-database-2-line" variant="primary" />
      </div>
      <div className="col-6 col-lg-4 col-xl-2">
        <StatCard label="Active" value={activeShow} hint={scopeHint} iconClass="ri-checkbox-circle-line" variant="success" />
      </div>
      <div className="col-6 col-lg-4 col-xl-2">
        <StatCard label="Inactive" value={inactiveShow} hint="Disabled for new Rx search" iconClass="ri-pause-circle-line" variant="warning" />
      </div>
      <div className="col-6 col-lg-4 col-xl-2">
        <StatCard label="Archived" value={archivedShow} hint="Soft-archived rows" iconClass="ri-archive-line" variant="secondary" />
      </div>
      <div className="col-6 col-lg-4 col-xl-2">
        <StatCard
          label="Imported · Manual"
          value={`${imported} · ${manual}`}
          hint="Import lineage vs approx. manual"
          iconClass="ri-upload-cloud-2-line"
          variant="info"
        />
      </div>
      <div className="col-6 col-lg-4 col-xl-2">
        <StatCard
          label="Rx-linked"
          value={rxLinked}
          hint="Non-archived with prescription lines"
          iconClass="ri-file-list-3-line"
          variant="success"
        />
      </div>
      {review > 0 ? (
        <div className="col-12">
          <div className="alert alert-light border radius-12 mb-0 py-2 px-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
            <span className="small text-muted mb-0">
              <i className="ri-error-warning-line me-1 text-warning" aria-hidden />
              Import review queue: <strong>{review}</strong> row{review === 1 ? "" : "s"} need attention
            </span>
            <Link href={`${ADMIN_MEDICINE_BASE}/review`} className="btn btn-sm btn-outline-primary radius-8">
              Open review
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
