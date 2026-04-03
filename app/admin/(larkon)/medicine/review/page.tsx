"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminMedicineWorkspaceApi } from "@/lib/adminApi";
import { ADMIN_MEDICINE_IMPORTS } from "../_lib/paths";

export default function AdminMedicineReviewPage() {
  const [data, setData] = useState<{
    invalid: number;
    duplicateInFile: number;
    existsInDb: number;
    needsReview: number;
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminMedicineWorkspaceApi
      .reviewQueues()
      .then((r) => setData(r.data ?? null))
      .catch((e) => setError((e as Error)?.message || "Failed"));
  }, []);

  return (
    <div className="dashboard-main-body">
      <h1 className="h4 mb-1">Review & Conflicts</h1>
      <p className="text-muted small mb-4">
        Aggregate row counts by classification for <strong>open</strong> import batches (not applied or cancelled). Resolve issues in{" "}
        <strong>Imports</strong>: open a batch, use tabs, preview/confirm/apply, and download invalid or NEEDS_REVIEW slices as CSV.
      </p>
      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
      <div className="row g-3 mb-4">
        {data &&
          [
            ["INVALID", data.invalid],
            ["DUPLICATE_IN_FILE", data.duplicateInFile],
            ["EXISTS_IN_DB", data.existsInDb],
            ["NEEDS_REVIEW", data.needsReview],
          ].map(([label, val]) => (
            <div key={String(label)} className="col-6 col-md-3">
              <div className="card border-0 shadow-sm radius-12">
                <div className="card-body p-16">
                  <div className="text-muted small">{label}</div>
                  <div className="h4 mb-0 fw-semibold">{val as number}</div>
                </div>
              </div>
            </div>
          ))}
      </div>
      <Link href={ADMIN_MEDICINE_IMPORTS} className="btn btn-primary radius-12">
        Go to imports
      </Link>
    </div>
  );
}
