"use client";

// PHASE 2 FINAL CLEANUP: Warehouse staff management uses branch member system exclusively
// All staff operations route through BranchMember table with warehouse role labels for UX
// No separate WarehouseStaffAssignment records are created for new operations

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  warehouseById,
  warehouseStaffOverview,
  warehouseStaffInviteResend,
  warehouseStaffInviteReinvite,
  warehouseStaffInviteCancel,
  warehouseStaffRemove,
} from "@/lib/api";

const STAFF_ROLES = [
  { value: "WAREHOUSE_MANAGER", label: "Warehouse Manager" },
  { value: "RECEIVING_STAFF", label: "Receiving Staff" },
  { value: "DISPATCH_STAFF", label: "Dispatch Staff" },
  { value: "INVENTORY_CONTROLLER", label: "Inventory Controller" },
  { value: "QC_OFFICER", label: "QC Officer" },
  { value: "AUDIT_OFFICER", label: "Audit Officer" },
];

function roleBadge(r: string) {
  if (r === "WAREHOUSE_MANAGER") return "bg-primary";
  if (r === "RECEIVING_STAFF") return "bg-info";
  if (r === "DISPATCH_STAFF") return "bg-warning text-dark";
  if (r === "INVENTORY_CONTROLLER") return "bg-secondary";
  if (r === "QC_OFFICER") return "bg-success";
  if (r === "AUDIT_OFFICER") return "bg-dark";
  return "bg-light text-dark";
}

export default function OwnerWarehouseStaffPage() {
  const params = useParams();
  const router = useRouter();
  const warehouseId = Number(params?.id);

  const [wh, setWh] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  function filteredInvites(rows: any[]) {
    if (statusFilter === "ALL") return rows;
    return rows.filter((r) => String(r.status || "").toUpperCase() === statusFilter);
  }

  async function loadData() {
    try {
      const [whData, overview] = await Promise.all([
        warehouseById(warehouseId),
        warehouseStaffOverview(warehouseId),
      ]);
      setWh(whData);
      setStaff((overview?.staff || []) as any[]);
      setInvites((overview?.invites || []) as any[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!warehouseId) return;
    loadData();
  }, [warehouseId]);

  // Navigate to unified invitation form with warehouse context
  function handleInviteClick() {
    if (wh?.branchId) {
      router.push(`/owner/staffs/new?branchId=${wh.branchId}&context=warehouse&warehouseId=${warehouseId}`);
    } else {
      setError("Warehouse is not linked to a branch. Cannot create invitation.");
    }
  }

  async function handleRemove(assignmentId: number) {
    if (!confirm("Remove this staff assignment?")) return;
    try {
      await warehouseStaffRemove(warehouseId, assignmentId);
      await loadData();
      setNotice("Staff assignment removed.");
    } catch (e: any) {
      alert(e?.message || "Failed to remove staff");
    }
  }

  async function handleResendInvite(inviteId: number) {
    setActionBusyId(inviteId);
    try {
      await warehouseStaffInviteResend(warehouseId, inviteId);
      await loadData();
      setNotice("Invitation resent.");
    } catch (e: any) {
      alert(e?.message || "Failed to resend invitation");
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleReinvite(inviteId: number) {
    setActionBusyId(inviteId);
    try {
      await warehouseStaffInviteReinvite(warehouseId, inviteId);
      await loadData();
      setNotice("Invitation re-issued.");
    } catch (e: any) {
      alert(e?.message || "Failed to re-invite");
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleCancelInvite(inviteId: number) {
    if (!confirm("Cancel this invitation?")) return;
    setActionBusyId(inviteId);
    try {
      await warehouseStaffInviteCancel(warehouseId, inviteId);
      await loadData();
      setNotice("Invitation cancelled.");
    } catch (e: any) {
      alert(e?.message || "Failed to cancel invitation");
    } finally {
      setActionBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-2 text-muted">Loading staff…</p>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link href={`/owner/warehouse/${warehouseId}`} className="text-muted text-decoration-none small">
            ← {wh?.name || "Warehouse"}
          </Link>
          <h4 className="mb-0 mt-1">Staff Management</h4>
        </div>
        <button 
          className="btn btn-primary btn-sm" 
          onClick={handleInviteClick}
          disabled={!wh?.branchId}
          title={!wh?.branchId ? "Warehouse must be linked to a branch first" : "Invite staff to this warehouse"}
        >
          <i className="ti ti-mail me-1" />Invite Staff
        </button>
      </div>

      {/* Missing Branch Warning */}
      {!wh?.branchId && (
        <div className="alert alert-warning mb-4">
          <div className="d-flex align-items-start">
            <i className="ti ti-alert-triangle me-2 mt-1" />
            <div>
              <strong>Warehouse Not Linked to Branch</strong>
              <p className="mb-2">This warehouse must be linked to a branch before staff can be invited. All staff are branch staff in the unified system.</p>
              <small className="text-muted">
                To fix: Run the linkage script on the backend:<br/>
                <code>npx ts-node src/scripts/linkWarehousesToBranches.ts</code>
              </small>
            </div>
          </div>
        </div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}
      {notice && (
        <div className="alert alert-success d-flex justify-content-between align-items-center">
          <span>{notice}</span>
          <button className="btn btn-sm btn-link text-success p-0" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}

      <div className="card border mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Pending / Historical Invitations ({invites.length})</h6>
          <div className="d-flex gap-2 align-items-center">
            <label className="small text-muted mb-0">Status</label>
            <select className="form-select form-select-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All</option>
              <option value="PENDING">Pending</option>
              <option value="EXPIRED">Expired</option>
              <option value="REVOKED">Revoked</option>
            </select>
          </div>
        </div>
        <div className="card-body p-0">
          {invites.length === 0 ? (
            <div className="text-center py-4 text-muted">No invitations yet. Invite warehouse staff to begin onboarding.</div>
          ) : (
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Contact</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvites(invites).map((iv: any, _idx: number) => (
                  <tr key={iv.id}>
                    <td>{iv.displayName || iv.email || iv.phone || `Invite #${iv.id}`}</td>
                    <td><span className="badge bg-secondary">{String(iv.warehouseRole || iv.role || "—").replace(/_/g, " ")}</span></td>
                    <td>
                      <span className={`badge ${iv.status === "PENDING" ? "bg-warning text-dark" : iv.status === "EXPIRED" ? "bg-secondary" : "bg-danger"}`}>
                        {iv.status}
                      </span>
                    </td>
                    <td className="small text-muted">{iv.expiresAt ? new Date(iv.expiresAt).toLocaleString() : "—"}</td>
                    <td className="text-end">
                      {iv.status === "PENDING" ? (
                        <div className="d-inline-flex gap-1">
                          <button className="btn btn-sm btn-outline-warning" disabled={actionBusyId === iv.id} onClick={() => handleResendInvite(iv.id)}>Resend</button>
                          <button className="btn btn-sm btn-outline-danger" disabled={actionBusyId === iv.id} onClick={() => handleCancelInvite(iv.id)}>Cancel</button>
                        </div>
                      ) : (
                        <button className="btn btn-sm btn-outline-primary" disabled={actionBusyId === iv.id} onClick={() => handleReinvite(iv.id)}>Re-invite</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Staff Table */}
      {staff.length === 0 ? (
        <div className="text-center py-5">
          <i className="ti ti-users fs-1 text-muted" />
          <p className="mt-2 text-muted">No staff assigned to this warehouse yet. Accepted invitations will appear here.</p>
        </div>
      ) : (
        <div className="card border">
          <div className="card-body p-0">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Assigned</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s: any, _idx: number) => (
                  <tr key={s.id}>
                    <td className="fw-medium">{s.user?.profile?.displayName || "—"}</td>
                    <td className="text-muted small">{s.user?.auth?.email || "—"}</td>
                    <td><span className={`badge ${roleBadge(s.role)}`}>{s.role?.replace(/_/g, " ")}</span></td>
                    <td className="text-muted small">{s.assignedAt ? new Date(s.assignedAt).toLocaleDateString() : "—"}</td>
                    <td>
                      <span className={`badge ${s.isActive ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}`}>
                        {s.isActive ? "Active" : "Removed"}
                      </span>
                    </td>
                    <td>
                      {s.isActive && (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleRemove(s.id)}>
                          <i className="ti ti-x" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
