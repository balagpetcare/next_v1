"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { medicineRequisitionList, medicineRequisitionSummary } from "@/lib/api";
import { pharmacyApiUserMessage, logPharmacyApiError } from "@/src/lib/pharmacyApiMessage";
import { useToast } from "@/src/hooks/useToast";

function normalizeBranchIdParam(p: string | string[] | undefined): string | undefined {
  if (p == null) return undefined;
  const s = Array.isArray(p) ? p[0] : p;
  return typeof s === "string" && s.trim() !== "" ? s.trim() : undefined;
}

export default function BranchPharmacyDashboardPage() {
  const params = useParams();
  const toast = useToast();
  const branchIdRaw = normalizeBranchIdParam(params?.branchId as string | string[] | undefined);
  const branchIdNum = Number(branchIdRaw);
  const branchIdValid = Number.isFinite(branchIdNum) && branchIdNum > 0;
  const branchId = branchIdValid ? String(Math.trunc(branchIdNum)) : "";
  const [stats, setStats] = useState({ draft: 0, submitted: 0, dispatched: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!branchIdValid || !branchId) {
      setLoading(false);
      setStats({ draft: 0, submitted: 0, dispatched: 0, total: 0 });
      return;
    }
    setLoading(true);
    try {
      const [summary, draftPage] = await Promise.all([
        medicineRequisitionSummary({ branchId }),
        medicineRequisitionList({ branchId, status: "DRAFT", limit: 1, page: 1 }),
      ]);
      const pag = draftPage.pagination as { total?: number } | undefined;
      const draft = Number(pag?.total) || 0;
      if (summary) {
        setStats({
          draft,
          submitted: summary.pending,
          dispatched: summary.dispatched,
          total: summary.total,
        });
      } else {
        setStats({ draft, submitted: 0, dispatched: 0, total: 0 });
      }
    } catch (e: unknown) {
      logPharmacyApiError("branch pharmacy dashboard", e);
      toast.error(pharmacyApiUserMessage(e, "Could not load pharmacy statistics."));
      setStats({ draft: 0, submitted: 0, dispatched: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  }, [branchId, branchIdValid, toast]);

  useEffect(() => { load(); }, [load]);

  const cards = [
    { label: "Drafts", value: stats.draft, color: "text-secondary", href: `/staff/branch/${branchId}/pharmacy/requisitions?status=DRAFT` },
    { label: "Awaiting Review", value: stats.submitted, color: "text-warning", href: `/staff/branch/${branchId}/pharmacy/requisitions?status=SUBMITTED` },
    { label: "Incoming (Dispatched)", value: stats.dispatched, color: "text-info", href: `/staff/branch/${branchId}/pharmacy/requisitions?status=DISPATCHED` },
    { label: "Total Requisitions", value: stats.total, color: "text-dark", href: `/staff/branch/${branchId}/pharmacy/requisitions` },
  ];

  return (
    <div className="dashboard-main-body">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="mb-0">Branch Pharmacy</h5>
        {branchIdValid ? (
          <Link href={`/staff/branch/${branchId}/pharmacy/requisition-create`} className="btn btn-primary btn-sm">+ New Requisition</Link>
        ) : null}
      </div>

      {!branchIdValid ? (
        <div className="alert alert-warning py-2 small mb-3" role="alert">
          Invalid or missing branch. Open pharmacy from the branch menu.
        </div>
      ) : null}

      {loading ? (
        <div className="text-center py-5 text-secondary">Loading...</div>
      ) : branchIdValid ? (
        <>
          <div className="row g-3 mb-4">
            {cards.map((c) => (
              <div key={c.label} className="col-6 col-md-3">
                <Link href={c.href} className="text-decoration-none">
                  <div className="card radius-12 h-100">
                    <div className="card-body text-center">
                      <div className={`fs-3 fw-bold ${c.color}`}>{c.value}</div>
                      <div className="text-muted small">{c.label}</div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <div className="card radius-12">
                <div className="card-body">
                  <h6>Requisitions</h6>
                  <p className="text-muted small mb-2">Create and track medicine requisitions to central pharmacy.</p>
                  <Link href={`/staff/branch/${branchId}/pharmacy/requisitions`} className="btn btn-primary btn-sm">View Requisitions</Link>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card radius-12">
                <div className="card-body">
                  <h6>Pharmacy Stock</h6>
                  <p className="text-muted small mb-2">View your branch pharmacy inventory.</p>
                  <Link href={`/staff/branch/${branchId}/inventory?locationType=PHARMACY`} className="btn btn-outline-primary btn-sm">View Stock</Link>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
