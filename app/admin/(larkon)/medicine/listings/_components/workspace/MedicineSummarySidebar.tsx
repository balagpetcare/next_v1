"use client";

import type { MedicineWorkspaceProfile, MedicineReviewStatus } from "../../_lib/medicineWorkspaceProfile.types";
import { computeWorkspaceCompleteness } from "../../_lib/workspaceCompleteness";

type Props = {
  countryId: number | "";
  brandSelected: boolean;
  presentationSelected: boolean;
  packageMark: string;
  profile: MedicineWorkspaceProfile;
  reviewStatus: MedicineReviewStatus | "";
  fingerprint: string | null;
  busyPreview: boolean;
};

export default function MedicineSummarySidebar({
  countryId,
  brandSelected,
  presentationSelected,
  packageMark,
  profile,
  reviewStatus,
  fingerprint,
  busyPreview,
}: Props) {
  const { percent, blocks } = computeWorkspaceCompleteness({
    countryId,
    brandSelected,
    presentationSelected,
    packageMark,
    profile,
  });

  return (
    <div className="card radius-12 sticky-top" style={{ top: "1rem" }}>
      <div className="card-header py-2">
        <h6 className="mb-0 small fw-semibold">Summary</h6>
      </div>
      <div className="card-body small">
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className="text-muted">Completeness</span>
            <span className="fw-semibold">{percent}%</span>
          </div>
          <div className="progress" style={{ height: 6 }}>
            <div className="progress-bar bg-primary" style={{ width: `${percent}%` }} />
          </div>
        </div>
        {blocks.map((b) => (
          <div key={b.id} className="mb-2 pb-2 border-bottom border-light">
            <div className="d-flex justify-content-between">
              <span>{b.label}</span>
              <span className="text-muted">
                {b.score}/{b.max}
              </span>
            </div>
            {b.hints.length > 0 ? <ul className="text-muted mb-0 ps-3 mt-1">{b.hints.map((h) => <li key={h}>{h}</li>)}</ul> : null}
          </div>
        ))}
        <div className="mt-3 pt-2 border-top">
          <span className="text-muted d-block mb-1">Review status</span>
          <span className="badge bg-secondary-subtle text-secondary-emphasis">{reviewStatus || "—"}</span>
        </div>
        <div className="mt-2">
          <span className="text-muted d-block mb-1">Fingerprint</span>
          {busyPreview ? (
            <span className="text-muted">Checking…</span>
          ) : fingerprint ? (
            <code className="small d-block text-break">{fingerprint}</code>
          ) : (
            <span className="text-muted">Run preview from actions</span>
          )}
        </div>
      </div>
    </div>
  );
}
