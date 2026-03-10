"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  staffClinicSupplyRequestsList,
  staffClinicSupplyRequestSubmit,
} from "@/lib/api";

type RequestRow = {
  id: number;
  requestNo: string;
  status: string;
  priority: string;
  branch?: { name: string };
  items?: Array<{ clinicalItem?: { name: string }; variant?: { variantName: string }; requestedQty: number; approvedQty?: number }>;
  requestedAt?: string;
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "OWNER_REVIEW", label: "Pending review" },
  { value: "APPROVED", label: "Approved" },
  { value: "PARTIAL_APPROVED", label: "Partial" },
  { value: "REJECTED", label: "Rejected" },
];

function statusBadgeClass(status: string): string {
  switch (status) {
    case "DRAFT":
      return "bg-secondary";
    case "OWNER_REVIEW":
      return "bg-warning text-dark";
    case "APPROVED":
      return "bg-success";
    case "PARTIAL_APPROVED":
      return "bg-info";
    case "REJECTED":
      return "bg-danger";
    case "DISPATCHED":
      return "bg-primary";
    case "RECEIVED":
    case "CLOSED":
      return "bg-dark";
    default:
      return "bg-secondary";
  }
}

export default function StaffClinicSupplyRequestsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = params?.branchId as string | undefined;
  const [list, setList] = useState<{ items: RequestRow[]; total: number }>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (searchParams.get("created") === "1" && branchId) {
      setSuccess("Supply request created.");
      router.replace(`/staff/branch/${branchId}/clinic/supply-requests`, { scroll: false });
    }
  }, [searchParams, branchId, router]);

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError("");
      const data = await staffClinicSupplyRequestsList(branchId, {
        status: statusFilter || undefined,
        limit: 50,
      });
      setList(data as { items: RequestRow[]; total: number });
    } catch (e) {
      setError((e as Error)?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [branchId, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.MouseEvent, requestId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!branchId) return;
    try {
      setError("");
      await staffClinicSupplyRequestSubmit(branchId, requestId);
      setSuccess("Request submitted for owner review.");
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Submit failed");
    }
  };

  const goToDetail = (requestId: number) => {
    if (branchId) router.push(`/staff/branch/${branchId}/clinic/supply-requests/${requestId}`);
  };

  if (!branchId) {
    return (
      <div className="p-4">
        <div className="alert alert-warning">Invalid branch.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h5 mb-0">Supply requests</h1>
        <div className="d-flex gap-2">
          <Link
            href={`/staff/branch/${branchId}/clinic/supply-requests/new`}
            className="btn btn-primary btn-sm radius-8"
          >
            <i className="ri-add-line me-1" /> New request
          </Link>
          <Link
            href={`/staff/branch/${branchId}/clinic/items`}
            className="btn btn-outline-secondary btn-sm radius-8"
          >
            Back to items
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
      {success && <div className="alert alert-success radius-12 mb-3">{success}</div>}

      <div className="d-flex flex-wrap gap-2 mb-3">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value || "all"}
            type="button"
            className={`btn btn-sm radius-8 ${statusFilter === f.value ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card radius-12">
        <div className="card-header bg-transparent p-24">
          <h6 className="mb-0 fw-semibold">Requests</h6>
        </div>
        <div className="card-body p-24">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" />
              <p className="text-muted mt-2 mb-0">Loading…</p>
            </div>
          ) : list.items.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted mb-3">No supply requests yet.</p>
              <div className="d-flex flex-wrap justify-content-center gap-2">
                <Link
                  href={`/staff/branch/${branchId}/clinic/supply-requests/new`}
                  className="btn btn-primary radius-8"
                >
                  Create new request
                </Link>
                <Link
                  href={`/staff/branch/${branchId}/clinic/supply-requests/new`}
                  className="btn btn-outline-secondary radius-8"
                >
                  View low-stock items
                </Link>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Request #</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Items</th>
                    <th>Requested</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((r) => (
                    <tr
                      key={r.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => goToDetail(r.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          goToDetail(r.id);
                        }
                      }}
                      className="cursor-pointer"
                      style={{ cursor: "pointer" }}
                    >
                      <td>{r.requestNo}</td>
                      <td>
                        <span className={`badge ${statusBadgeClass(r.status)}`}>{r.status}</span>
                      </td>
                      <td>{r.priority}</td>
                      <td>{(r.items?.length ?? 0)} line(s)</td>
                      <td>{r.requestedAt ? new Date(r.requestedAt).toLocaleString() : "—"}</td>
                      <td className="text-end" onClick={(e) => e.stopPropagation()}>
                        {r.status === "DRAFT" && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary radius-8"
                            onClick={(e) => handleSubmit(e, r.id)}
                          >
                            Submit
                          </button>
                        )}
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
