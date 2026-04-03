"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import {
  listDecisionPackages,
  ownerGet,
  postApproveDecisionPackage,
  postRejectDecisionPackage,
  postSynthesizeDecisionPackage,
} from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type BranchRow = { org?: { id: number } };

export default function RecommendationsPage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveOrg = useCallback(async () => {
    const brRes = await ownerGet<{ data?: BranchRow[] }>("/api/v1/owner/branches");
    const list = (brRes as { data?: BranchRow[] })?.data;
    const oid = Array.isArray(list) && list[0]?.org?.id ? list[0].org.id : null;
    setOrgId(oid);
    return oid;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let oid = orgId;
      if (oid == null) {
        oid = await resolveOrg();
        if (oid != null) setOrgId(oid);
      }
      if (!oid) {
        setRows([]);
        return;
      }
      const res = await listDecisionPackages({ orgId: oid });
      const data = (res as { data?: unknown[] })?.data ?? (res as unknown as unknown[]);
      setRows(Array.isArray(data) ? (data as Array<Record<string, unknown>>) : []);
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    } finally {
      setLoading(false);
    }
  }, [orgId, resolveOrg]);

  useEffect(() => {
    load();
  }, [load]);

  const onSynthesize = async () => {
    if (!orgId) return;
    setBusy(true);
    setError(null);
    try {
      await postSynthesizeDecisionPackage({ orgId, take: 10 });
      await load();
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    } finally {
      setBusy(false);
    }
  };

  const onApprove = async (id: number) => {
    if (!orgId) return;
    if (
      !window.confirm(
        "Approve this decision package? This records governance approval only — it does not create stock requests or POs automatically."
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await postApproveDecisionPackage(id, {
        orgId,
        clientRequestId: `approve-${id}-${Date.now()}`,
        comment: "Approved via recommendation center (no auto stock move).",
      });
      await load();
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    } finally {
      setBusy(false);
    }
  };

  const onReject = async (id: number) => {
    if (!orgId) return;
    if (!window.confirm("Reject this decision package?")) return;
    setBusy(true);
    try {
      await postRejectDecisionPackage(id, { orgId, comment: "Rejected via recommendation center" });
      await load();
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Recommendation center"
        subtitle="Decision packages bundle explainable line items with evidence JSON. Approval records audit only — execute stock requests and POs in their native workflows."
      />
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p className="text-muted">Loading…</p>}

      {!loading && orgId != null && (
        <div className="mb-3">
          <button type="button" className="btn btn-primary btn-sm me-2" disabled={busy} onClick={onSynthesize}>
            Synthesize from critical replenishment
          </button>
          <span className="small text-muted">Uses OPEN + CRITICAL AI replenishment rows.</span>
        </div>
      )}

      <div className="table-responsive">
        <table className="table table-sm table-bordered bg-white">
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Summary</th>
              <th>Policy</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted">
                  No decision packages yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td>{String(r.id)}</td>
                <td>{String(r.status)}</td>
                <td>{String(r.summary ?? "—")}</td>
                <td>
                  <code className="small">{String(r.policyVersion ?? "—")}</code>
                </td>
                <td>
                  <Link href={`/owner/inventory/network-command/recommendations/${r.id}`} className="btn btn-link btn-sm py-0">
                    View
                  </Link>
                  {r.status === "PROPOSED" || r.status === "PENDING_APPROVAL" ? (
                    <>
                      <button type="button" className="btn btn-success btn-sm py-0 ms-1" disabled={busy} onClick={() => onApprove(Number(r.id))}>
                        Approve
                      </button>
                      <button type="button" className="btn btn-outline-danger btn-sm py-0 ms-1" disabled={busy} onClick={() => onReject(Number(r.id))}>
                        Reject
                      </button>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
