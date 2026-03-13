"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ownerGet, ownerPut } from "@/app/owner/_lib/ownerApi";
import { PageWorkspace, PageHeader, SectionCard, ErrorState } from "@/src/components/dashboard";
import { formatValueForDisplay } from "@/src/lib/displayFormatters";

const REQUEST_TYPE_LABELS: Record<string, string> = {
  PACKAGE_CREATE: "Create Package",
  PACKAGE_UPDATE: "Update Package",
  DOCTOR_INVITE: "Doctor Invite",
  DOCTOR_SCHEDULE: "Doctor Schedule",
  DISCOUNT_CHANGE: "Discount Change",
  SERVICE_CREATE: "New Service",
  INVENTORY_PURCHASE: "Inventory Purchase",
};

type ApprovalRequestItem = {
  id: number;
  branchId: number;
  requestType: string;
  entityType: string;
  status: string;
  payload: Record<string, unknown>;
  requestedByUserId: number;
  createdAt: string;
  approvedAt?: string | null;
  branch?: { id: number; name: string };
  requestedBy?: {
    id: number;
    profile?: { displayName?: string } | null;
    auth?: { email?: string } | null;
  };
};

export default function OwnerApprovalsPage() {
  const [list, setList] = useState<ApprovalRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [branchFilter, setBranchFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [decidingId, setDecidingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ status: statusFilter });
      if (branchFilter) params.set("branchId", branchFilter);
      if (typeFilter) params.set("requestType", typeFilter);
      const res = await ownerGet<{ success?: boolean; data?: ApprovalRequestItem[] }>(
        `/api/v1/owner/approval-requests?${params.toString()}`
      );
      setList(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load approval requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter, branchFilter, typeFilter]);

  const branches = useMemo(() => {
    const names = new Map<number, string>();
    list.forEach((e) => names.set(e.branchId, e.branch?.name ?? `Branch #${e.branchId}`));
    return Array.from(names.entries()).map(([id, name]) => ({ id: String(id), name }));
  }, [list]);

  const types = useMemo(() => {
    const set = new Set(list.map((e) => e.requestType));
    return Array.from(set).sort();
  }, [list]);

  const filteredList = useMemo(() => {
    return list.filter((e) => {
      if (branchFilter && String(e.branchId) !== branchFilter) return false;
      if (typeFilter && e.requestType !== typeFilter) return false;
      return true;
    });
  }, [list, branchFilter, typeFilter]);

  const handleDecide = async (id: number, decision: "APPROVED" | "REJECTED") => {
    setDecidingId(id);
    try {
      await ownerPut(`/api/v1/owner/approval-requests/${id}/decide`, {
        decision,
        rejectReason: decision === "REJECTED" ? rejectReason : undefined,
      });
      setRejectReason("");
      toast.success(decision === "APPROVED" ? "Approved" : "Rejected");
      await load();
    } catch (e) {
      const msg = (e as Error)?.message || "Failed to submit decision";
      setError(msg);
      toast.error(msg);
    } finally {
      setDecidingId(null);
    }
  };

  return (
    <PageWorkspace>
      <PageHeader
        title="Clinic Approvals"
        subtitle="Review and approve package, doctor, and discount requests"
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Clinic Approvals", href: "/owner/approvals" },
        ]}
      />
      {error && <ErrorState message={error} onRetry={load} className="mb-3" />}
      <SectionCard title="Approval requests" subtitle="Filter and approve or reject requests.">
          <div className="mb-3">
            <label className="form-label small text-muted">
              Reject reason (optional, used when you click Reject)
            </label>
            <input
              type="text"
              className="form-control form-control-sm mb-2"
              placeholder="Optional reason for rejection"
              value={rejectReason}
              onChange={(ev) => setRejectReason(ev.target.value)}
            />
          </div>
          <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
            <select
              className="form-select form-select-sm w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <select
              className="form-select form-select-sm w-auto"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              title="Filter by branch"
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              className="form-select form-select-sm w-auto"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              title="Filter by request type"
            >
              <option value="">All types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {REQUEST_TYPE_LABELS[t] ?? t}
                </option>
              ))}
            </select>
          </div>
          {loading ? (
            <div className="placeholder-glow">
              <span className="placeholder col-6" />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Branch</th>
                    <th>Type</th>
                    <th>Requested by</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((e) => (
                    <React.Fragment key={e.id}>
                      <tr>
                        <td>{e.id}</td>
                        <td>{e.branch?.name ?? `Branch #${e.branchId}`}</td>
                        <td>{REQUEST_TYPE_LABELS[e.requestType] ?? e.requestType}</td>
                        <td>
                          {e.requestedBy?.profile?.displayName ??
                            e.requestedBy?.auth?.email ??
                            `User #${e.requestedByUserId}`}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              e.status === "PENDING"
                                ? "bg-warning"
                                : e.status === "APPROVED"
                                  ? "bg-success"
                                  : "bg-danger"
                            }`}
                          >
                            {e.status}
                          </span>
                        </td>
                        <td>{e.createdAt ? new Date(e.createdAt).toLocaleString() : "—"}</td>
                        <td className="text-end">
                          {e.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                className="btn btn-success btn-sm me-1"
                                disabled={decidingId !== null}
                                onClick={() => handleDecide(e.id, "APPROVED")}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                disabled={decidingId !== null}
                                onClick={() => handleDecide(e.id, "REJECTED")}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="btn btn-link btn-sm ms-1 p-0"
                            onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                            aria-label="Toggle details"
                          >
                            {expandedId === e.id ? "Hide" : "Details"}
                          </button>
                        </td>
                      </tr>
                      {expandedId === e.id && (
                        <tr>
                          <td colSpan={7} className="bg-light small">
                            <div className="p-2 mb-0">{formatValueForDisplay(e.payload)}</div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && filteredList.length === 0 && (
            <p className="mb-0 text-muted">
              No approval requests{branchFilter || typeFilter ? " matching filters." : "."}
            </p>
          )}
      </SectionCard>
    </PageWorkspace>
  );
}
