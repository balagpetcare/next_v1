"use client";

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import AccessDenied from "@/src/components/branch/AccessDenied";

type EscalationItem = {
  id: number;
  type: string;
  status: string;
  payload: Record<string, unknown>;
  requestedByUserId: number;
  createdAt: string;
  decidedAt: string | null;
};

export default function ManagerEscalationsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const [list, setList] = useState<EscalationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");

  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    setLoading(true);
    const q = statusFilter ? `?status=${statusFilter}` : "";
    apiGet<{ success: boolean; data?: EscalationItem[]; message?: string }>(
      `/api/v1/manager/escalations/${branchId}${q}`
    )
      .then((res) => {
        if (cancelled) return;
        if (res.success && Array.isArray(res.data)) setList(res.data);
        else setError(res.message || "Failed to load escalations");
      })
      .catch((e: Error & { status?: number }) => {
        if (cancelled) return;
        setError(e?.message || "Server error");
        if (e?.status === 403) setErrorCode("forbidden");
        else if (e?.status === 404) setErrorCode("not_found");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, statusFilter]);

  if (errorCode === "forbidden" || errorCode === "not_found") {
    return (
      <AccessDenied
        message="You need manager access to view escalations."
        onBack={() => router.push("/staff/branch/" + branchId)}
      />
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="mb-0">Escalations</h5>
        <div className="d-flex gap-2 align-items-center">
          <select
            className="form-select form-select-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <Link href={`/staff/branch/${branchId}`} className="btn btn-outline-secondary btn-sm">Back to branch</Link>
        </div>
      </div>
      <Card>
        <p className="text-muted small mb-3">Requests that require owner approval. Pending items are waiting for owner decision.</p>
        {loading ? (
          <div className="placeholder-glow"><span className="placeholder col-6"></span></div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th>Decided</th>
                </tr>
              </thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e.id}>
                    <td>{e.id}</td>
                    <td>{e.type}</td>
                    <td><span className={`badge ${e.status === "PENDING" ? "bg-warning" : e.status === "APPROVED" ? "bg-success" : "bg-danger"}`}>{e.status}</span></td>
                    <td>{e.createdAt ? new Date(e.createdAt).toLocaleString() : "—"}</td>
                    <td>{e.decidedAt ? new Date(e.decidedAt).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && list.length === 0 && !error && <p className="mb-0 text-muted">No escalations for this filter.</p>}
        {error && <p className="mb-0 text-danger">{error}</p>}
      </Card>
    </div>
  );
}
