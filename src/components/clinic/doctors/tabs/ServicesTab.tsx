"use client";

import { useState, useCallback } from "react";
import {
  staffDoctorPutServices,
  staffDoctorDeleteServiceMapping,
  staffClinicServices,
} from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";

type Props = {
  branchId: string;
  memberId: number;
  services: any[];
  loading?: boolean;
  permissions: string[];
  onRefresh?: () => void;
};

const BOOKING_TYPES = ["WALK_IN", "APPOINTMENT", "BOTH"];

function hasPerm(permissions: string[], perm: string): boolean {
  return permissions.includes(perm);
}

export default function ServicesTab({
  branchId,
  memberId,
  services,
  loading,
  permissions,
  onRefresh,
}: Props) {
  const [assignModal, setAssignModal] = useState(false);
  const [branchServices, setBranchServices] = useState<{ id: number; name: string; category?: string }[]>([]);
  const [loadingBranchServices, setLoadingBranchServices] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const canManage = hasPerm(permissions, "clinic.doctors.manage_services");
  const assignedIds = new Set(services.map((s: any) => s.serviceId));

  const openAssignModal = useCallback(() => {
    setAssignModal(true);
    setError(null);
    setLoadingBranchServices(true);
    staffClinicServices(branchId)
      .then((list) => setBranchServices(list))
      .catch(() => setBranchServices([]))
      .finally(() => setLoadingBranchServices(false));
  }, [branchId]);

  const handleAssign = useCallback(
    async (serviceId: number) => {
      if (!canManage) return;
      setSaving(`assign-${serviceId}`);
      setError(null);
      try {
        await staffDoctorPutServices(branchId, memberId, { serviceId, status: "ACTIVE", isAllowed: true });
        onRefresh?.();
        setAssignModal(false);
        toast.success("Service assigned");
      } catch (e: any) {
        setError(e?.message ?? "Failed to assign");
        toast.error(e?.message ?? "Failed to assign");
      } finally {
        setSaving(null);
      }
    },
    [branchId, memberId, canManage, onRefresh]
  );

  const handleUnassign = useCallback(
    async (mappingId: number) => {
      if (!canManage || !confirm("Remove this service from the doctor?")) return;
      setSaving(`delete-${mappingId}`);
      setError(null);
      try {
        await staffDoctorDeleteServiceMapping(branchId, memberId, mappingId);
        onRefresh?.();
        toast.success("Service removed");
      } catch (e: any) {
        setError(e?.message ?? "Failed to remove");
        toast.error(e?.message ?? "Failed to remove");
      } finally {
        setSaving(null);
      }
    },
    [branchId, memberId, canManage, onRefresh]
  );

  const handleStatusChange = useCallback(
    async (mapping: any, newStatus: string) => {
      if (!canManage) return;
      setSaving(`status-${mapping.id}`);
      setError(null);
      try {
        await staffDoctorPutServices(branchId, memberId, {
          serviceId: mapping.serviceId,
          status: newStatus,
          isAllowed: mapping.isAllowed,
          customDuration: mapping.customDuration,
          bookingType: mapping.bookingType,
          requiresApproval: mapping.requiresApproval,
        });
        onRefresh?.();
        toast.success("Status updated");
      } catch (e: any) {
        setError(e?.message ?? "Failed to update");
        toast.error(e?.message ?? "Failed to update");
      } finally {
        setSaving(null);
      }
    },
    [branchId, memberId, canManage, onRefresh, toast]
  );

  const handleUpdateMapping = useCallback(
    async (mapping: any, updates: { customDuration?: number; bookingType?: string; requiresApproval?: boolean }) => {
      if (!canManage) return;
      setSaving(`update-${mapping.id}`);
      setError(null);
      try {
        await staffDoctorPutServices(branchId, memberId, {
          serviceId: mapping.serviceId,
          status: mapping.status,
          isAllowed: mapping.isAllowed,
          customDuration: updates.customDuration ?? mapping.customDuration,
          bookingType: updates.bookingType ?? mapping.bookingType,
          requiresApproval: updates.requiresApproval ?? mapping.requiresApproval,
        });
        onRefresh?.();
        toast.success("Updated");
      } catch (e: any) {
        setError(e?.message ?? "Failed to update");
        toast.error(e?.message ?? "Failed to update");
      } finally {
        setSaving(null);
      }
    },
    [branchId, memberId, canManage, onRefresh, toast]
  );

  const unassigned = branchServices.filter((s) => !assignedIds.has(s.id));

  if (loading) {
    return (
      <div className="card radius-12">
        <div className="card-body text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="text-muted mt-2 mb-0">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="alert alert-danger alert-dismissible fade show radius-12 mb-3" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Close" />
        </div>
      )}

      <div className="card radius-12">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0">Assigned services</h6>
            {canManage && (
              <button type="button" className="btn btn-primary btn-sm radius-8" onClick={openAssignModal}>
                Assign service
              </button>
            )}
          </div>

          {services.length ? (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Service</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Duration (min)</th>
                    <th>Booking</th>
                    <th>Requires approval</th>
                    {canManage && <th className="text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {services.map((s: any) => (
                    <tr key={s.id}>
                      <td>{s.service?.name ?? s.serviceId}</td>
                      <td>{s.service?.category ?? "—"}</td>
                      <td>
                        {canManage ? (
                          <select
                            className="form-select form-select-sm"
                            value={s.status ?? "ACTIVE"}
                            disabled={!!saving}
                            onChange={(e) => handleStatusChange(s, e.target.value)}
                          >
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                          </select>
                        ) : (
                          <span className="badge radius-8">{s.status ?? "ACTIVE"}</span>
                        )}
                      </td>
                      <td>
                        {canManage ? (
                          <input
                            key={`duration-${s.id}-${s.customDuration ?? ""}`}
                            type="number"
                            className="form-control form-control-sm"
                            style={{ width: 70 }}
                            defaultValue={s.customDuration ?? ""}
                            placeholder="—"
                            min={1}
                            onBlur={(e) => {
                              const v = e.target.value ? parseInt(e.target.value, 10) : undefined;
                              if (v !== s.customDuration) handleUpdateMapping(s, { customDuration: v });
                            }}
                          />
                        ) : (
                          s.customDuration ?? "—"
                        )}
                      </td>
                      <td>
                        {canManage ? (
                          <select
                            className="form-select form-select-sm"
                            value={s.bookingType ?? ""}
                            onChange={(e) => handleUpdateMapping(s, { bookingType: e.target.value || undefined })}
                          >
                            <option value="">—</option>
                            {BOOKING_TYPES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        ) : (
                          s.bookingType ?? "—"
                        )}
                      </td>
                      <td>
                        {canManage ? (
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={!!s.requiresApproval}
                              onChange={(e) => handleUpdateMapping(s, { requiresApproval: e.target.checked })}
                            />
                          </div>
                        ) : (
                          s.requiresApproval ? "Yes" : "No"
                        )}
                      </td>
                      {canManage && (
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm radius-8"
                            disabled={!!saving}
                            onClick={() => handleUnassign(s.id)}
                          >
                            {saving === `delete-${s.id}` ? "..." : "Remove"}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5">
              <i className="ri-stethoscope-line fs-1 text-muted d-block mb-2" aria-hidden />
              <p className="text-muted mb-3">No services assigned yet.</p>
              {canManage && (
                <button type="button" className="btn btn-primary radius-8" onClick={openAssignModal}>
                  Assign first service
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {assignModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h6 className="modal-title">Assign service</h6>
                <button type="button" className="btn-close" onClick={() => setAssignModal(false)} aria-label="Close" />
              </div>
              <div className="modal-body">
                {loadingBranchServices ? (
                  <p className="text-muted small">Loading services...</p>
                ) : unassigned.length === 0 ? (
                  <p className="text-muted small mb-0">All branch services are already assigned.</p>
                ) : (
                  <ul className="list-group list-group-flush">
                    {unassigned.map((svc) => (
                      <li key={svc.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <span>{svc.name} {svc.category ? `(${svc.category})` : ""}</span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary radius-8"
                          disabled={!!saving}
                          onClick={() => handleAssign(svc.id)}
                        >
                          {saving === `assign-${svc.id}` ? "..." : "Assign"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
