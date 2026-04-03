"use client";

import Link from "next/link";
import type { MedicineWorkspaceDashboardSummary } from "@/lib/adminApi";
import { ADMIN_MEDICINE_IMPORTS } from "../_lib/paths";

export default function MedicineControlCenterAlerts({ data }: { data: MedicineWorkspaceDashboardSummary }) {
  const failed = data.imports.failedLast7Days ?? 0;
  const stuck = data.imports.batchesApplyingStuck ?? 0;
  const applying = data.imports.batchesApplying ?? 0;
  const partial = data.imports.partialAppliedLast7Days ?? 0;
  const review = data.reviewQueues.needsAttentionRows ?? 0;

  if (failed === 0 && stuck === 0 && partial === 0 && review === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <h6 className="small fw-semibold text-muted text-uppercase mb-2">Operations attention</h6>
      <div className="d-flex flex-column gap-2">
        {failed > 0 && (
          <div className="alert alert-danger radius-12 mb-0 py-2 small">
            <strong>{failed}</strong> import batch(es) failed in the last 7 days.{" "}
            <Link href={ADMIN_MEDICINE_IMPORTS} className="alert-link">
              Open import history
            </Link>
          </div>
        )}
        {stuck > 0 && (
          <div className="alert alert-warning radius-12 mb-0 py-2 small">
            <strong>{stuck}</strong> batch(es) in APPLYING with no update for 2+ hours (possible stuck job).{" "}
            <Link href={ADMIN_MEDICINE_IMPORTS} className="alert-link">
              Inspect batches
            </Link>
            {applying > stuck ? (
              <span className="text-muted"> · {applying - stuck} other applying batch(es) recently active.</span>
            ) : null}
          </div>
        )}
        {partial > 0 && (
          <div className="alert alert-info radius-12 mb-0 py-2 small">
            <strong>{partial}</strong> partially applied import(s) in the last 7 days — review apply summaries on each batch.
          </div>
        )}
        {review > 0 && (
          <div className="alert alert-secondary radius-12 mb-0 py-2 small">
            <strong>{review}</strong> import row(s) need attention (invalid / needs review on open batches).{" "}
            <Link href={`${ADMIN_MEDICINE_IMPORTS}`} className="alert-link">
              Imports
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
