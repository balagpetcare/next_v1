"use client";

import { useState, useCallback } from "react";
import {
  staffDoctorPutPackages,
  staffDoctorDeletePackageMapping,
  staffDoctorsPackageMatrix,
} from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";

type Props = {
  branchId: string;
  memberId: number;
  packages: any[];
  loading?: boolean;
  permissions: string[];
  onRefresh?: () => void;
};

const PACKAGE_ROLES = ["PRIMARY", "ASSISTANT", "CONSULTANT", "SURGEON", "BACKUP"];

function hasPerm(permissions: string[], perm: string): boolean {
  return permissions.includes(perm);
}

export default function PackagesTab({
  branchId,
  memberId,
  packages,
  loading,
  permissions,
  onRefresh,
}: Props) {
  const [assignModal, setAssignModal] = useState(false);
  const [branchPackages, setBranchPackages] = useState<{ id: number; packageCode?: string; packageName?: string }[]>([]);
  const [loadingBranchPackages, setLoadingBranchPackages] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const canManage = hasPerm(permissions, "clinic.doctors.manage_packages");
  const assignedIds = new Set(packages.map((p: any) => p.surgeryPackageId));

  const openAssignModal = useCallback(() => {
    setAssignModal(true);
    setError(null);
    setLoadingBranchPackages(true);
    staffDoctorsPackageMatrix(branchId)
      .then((data) => setBranchPackages(data?.packages ?? []))
      .catch(() => setBranchPackages([]))
      .finally(() => setLoadingBranchPackages(false));
  }, [branchId]);

  const handleAssign = useCallback(
    async (surgeryPackageId: number) => {
      if (!canManage) return;
      setSaving(`assign-${surgeryPackageId}`);
      setError(null);
      try {
        await staffDoctorPutPackages(branchId, memberId, { surgeryPackageId, roleInPackage: "PRIMARY", status: "ACTIVE" });
        onRefresh?.();
        setAssignModal(false);
        toast.success("Package assigned");
      } catch (e: any) {
        setError(e?.message ?? "Failed to assign");
        toast.error(e?.message ?? "Failed to assign");
      } finally {
        setSaving(null);
      }
    },
    [branchId, memberId, canManage, onRefresh]
  );

  const handleRemove = useCallback(
    async (mappingId: number) => {
      if (!canManage || !confirm("Remove this doctor from the package?")) return;
      setSaving(`delete-${mappingId}`);
      setError(null);
      try {
        await staffDoctorDeletePackageMapping(branchId, memberId, mappingId);
        onRefresh?.();
        toast.success("Package removed");
      } catch (e: any) {
        setError(e?.message ?? "Failed to remove");
        toast.error(e?.message ?? "Failed to remove");
      } finally {
        setSaving(null);
      }
    },
    [branchId, memberId, canManage, onRefresh]
  );

  const handleUpdateMapping = useCallback(
    async (mapping: any, updates: { roleInPackage?: string; feeShareType?: string; bookingEligible?: boolean; status?: string }) => {
      if (!canManage) return;
      setSaving(`update-${mapping.id}`);
      setError(null);
      try {
        await staffDoctorPutPackages(branchId, memberId, {
          surgeryPackageId: mapping.surgeryPackageId,
          roleInPackage: updates.roleInPackage ?? mapping.roleInPackage,
          isPrimary: mapping.isPrimary,
          feeShareType: updates.feeShareType ?? mapping.feeShareType,
          activeFrom: mapping.activeFrom,
          activeTo: mapping.activeTo,
          bookingEligible: updates.bookingEligible ?? mapping.bookingEligible,
          status: updates.status ?? mapping.status,
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

  const unassigned = branchPackages.filter((p: any) => !assignedIds.has(p.id));

  if (loading) {
    return (
      <div className="card radius-12">
        <div className="card-body text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="text-muted mt-2 mb-0">Loading packages...</p>
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
            <h6 className="mb-0">Assigned packages</h6>
            {canManage && (
              <button type="button" className="btn btn-primary btn-sm radius-8" onClick={openAssignModal}>
                Assign package
              </button>
            )}
          </div>

          {packages.length ? (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Package</th>
                    <th>Code</th>
                    <th>Role</th>
                    <th>Fee share</th>
                    <th>Booking eligible</th>
                    <th>Status</th>
                    {canManage && <th className="text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {packages.map((p: any) => (
                    <tr key={p.id}>
                      <td>{p.surgeryPackage?.packageName ?? p.surgeryPackageId}</td>
                      <td>{p.surgeryPackage?.packageCode ?? "—"}</td>
                      <td>
                        {canManage ? (
                          <select
                            className="form-select form-select-sm"
                            value={p.roleInPackage ?? "PRIMARY"}
                            disabled={!!saving}
                            onChange={(e) => handleUpdateMapping(p, { roleInPackage: e.target.value })}
                          >
                            {PACKAGE_ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        ) : (
                          p.roleInPackage ?? "—"
                        )}
                      </td>
                      <td>{p.feeShareType ?? "—"}</td>
                      <td>
                        {canManage ? (
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={!!p.bookingEligible}
                              onChange={(e) => handleUpdateMapping(p, { bookingEligible: e.target.checked })}
                            />
                          </div>
                        ) : (
                          p.bookingEligible ? "Yes" : "No"
                        )}
                      </td>
                      <td>
                        {canManage ? (
                          <select
                            className="form-select form-select-sm"
                            value={p.status ?? "ACTIVE"}
                            onChange={(e) => handleUpdateMapping(p, { status: e.target.value })}
                          >
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                          </select>
                        ) : (
                          <span className="badge radius-8">{p.status ?? "ACTIVE"}</span>
                        )}
                      </td>
                      {canManage && (
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm radius-8"
                            disabled={!!saving}
                            onClick={() => handleRemove(p.id)}
                          >
                            {saving === `delete-${p.id}` ? "..." : "Remove"}
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
              <i className="ri-box-3-line fs-1 text-muted d-block mb-2" aria-hidden />
              <p className="text-muted mb-3">No packages assigned yet.</p>
              {canManage && (
                <button type="button" className="btn btn-primary radius-8" onClick={openAssignModal}>
                  Assign first package
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
                <h6 className="modal-title">Assign package</h6>
                <button type="button" className="btn-close" onClick={() => setAssignModal(false)} aria-label="Close" />
              </div>
              <div className="modal-body">
                {loadingBranchPackages ? (
                  <p className="text-muted small">Loading packages...</p>
                ) : unassigned.length === 0 ? (
                  <p className="text-muted small mb-0">All branch packages are already assigned to this doctor.</p>
                ) : (
                  <ul className="list-group list-group-flush">
                    {unassigned.map((pkg: any) => (
                      <li key={pkg.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <span>{pkg.packageName ?? pkg.packageCode ?? `#${pkg.id}`}</span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary radius-8"
                          disabled={!!saving}
                          onClick={() => handleAssign(pkg.id)}
                        >
                          {saving === `assign-${pkg.id}` ? "..." : "Assign"}
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
