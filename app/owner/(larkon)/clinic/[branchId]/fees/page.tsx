"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicFees,
  ownerClinicFeesPut,
  ownerClinicServices,
  ownerClinicStaff,
  ownerClinicStaffProfilePut,
  type ClinicFeesData,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

type ServiceItem = { id: number; name: string; price?: number | string };
type StaffMember = {
  id: number;
  userId: number;
  role: string;
  status: string;
  user?: { profile?: { displayName?: string }; auth?: { email?: string; phone?: string } };
  profileSummary?: { staffType?: string; defaultConsultationFee?: number | null };
};

function pickServices(res: unknown): ServiceItem[] {
  const r = res as { items?: ServiceItem[] };
  return Array.isArray(r?.items) ? r.items : [];
}

function pickStaff(data: unknown): { branch?: { name: string }; members: StaffMember[] } | null {
  const d = data as { branch?: { name: string }; members?: StaffMember[] } | null;
  if (!d) return null;
  return { branch: d.branch ?? undefined, members: Array.isArray(d.members) ? d.members : [] };
}

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `৳${Number(value).toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

const SUCCESS_AUTO_CLEAR_MS = 4000;

export default function ClinicFeesPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [fees, setFees] = useState<ClinicFeesData | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [staffData, setStaffData] = useState<{ branch?: { name: string }; members: StaffMember[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  // Doctor inline edit
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [doctorFeeDraft, setDoctorFeeDraft] = useState<string>("");
  const [savingDoctorId, setSavingDoctorId] = useState<number | null>(null);

  // Service override panel
  const [serviceSearch, setServiceSearch] = useState("");
  const [overridePanelServiceId, setOverridePanelServiceId] = useState<number | null>(null);
  const [overridePanelFee, setOverridePanelFee] = useState("");
  const [savingOverrideServiceId, setSavingOverrideServiceId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError("");
      const [f, s, staffRes] = await Promise.all([
        ownerClinicFees(branchId),
        ownerClinicServices(branchId),
        ownerClinicStaff(branchId),
      ]);
      setFees(f ?? null);
      setServices(pickServices(s));
      setStaffData(pickStaff(staffRes));
    } catch (e) {
      setError((e as Error)?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-clear success
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), SUCCESS_AUTO_CLEAR_MS);
    return () => clearTimeout(t);
  }, [success]);

  const staffByMemberId = useMemo(() => {
    const map: Record<number, StaffMember> = {};
    staffData?.members?.forEach((m) => {
      map[m.id] = m;
    });
    return map;
  }, [staffData]);

  const overrideByServiceId = useMemo(() => {
    const map: Record<number, number> = {};
    fees?.serviceOverrides?.forEach((o) => {
      map[o.serviceId] = o.fee;
    });
    return map;
  }, [fees]);

  const doctorRows = useMemo(() => {
    if (!fees?.doctorFees) return [];
    return fees.doctorFees.map((d) => ({
      branchMemberId: d.branchMemberId,
      staffType: d.staffType,
      defaultConsultationFee: d.defaultConsultationFee,
      displayName: staffByMemberId[d.branchMemberId]?.user?.profile?.displayName ?? `Member #${d.branchMemberId}`,
    }));
  }, [fees?.doctorFees, staffByMemberId]);

  const serviceRows = useMemo(() => {
    return services.map((s) => {
      const basePrice = typeof s.price === "number" ? s.price : Number(s.price);
      const overrideFee = overrideByServiceId[s.id];
      const effectiveFee = overrideFee != null && !Number.isNaN(overrideFee) ? overrideFee : (Number.isNaN(basePrice) ? null : basePrice);
      return {
        id: s.id,
        name: s.name,
        basePrice: Number.isNaN(basePrice) ? null : basePrice,
        overrideFee: overrideFee != null ? overrideFee : null,
        effectiveFee,
        isOverridden: overrideFee != null,
      };
    });
  }, [services, overrideByServiceId]);

  const filteredServiceRows = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    if (!q) return serviceRows;
    return serviceRows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        String(r.id).toLowerCase().includes(q)
    );
  }, [serviceRows, serviceSearch]);

  const startEditDoctor = (memberId: number, currentFee: number | null) => {
    setEditingMemberId(memberId);
    setDoctorFeeDraft(currentFee != null ? String(currentFee) : "");
  };

  const cancelEditDoctor = () => {
    setEditingMemberId(null);
    setDoctorFeeDraft("");
  };

  const saveDoctorFee = async () => {
    if (!branchId || editingMemberId == null) return;
    const feeParsed = doctorFeeDraft.trim() === "" ? null : parseFloat(doctorFeeDraft);
    if (feeParsed != null && (Number.isNaN(feeParsed) || feeParsed < 0)) {
      setError("Consultation fee must be a non-negative number or empty.");
      return;
    }
    try {
      setSavingDoctorId(editingMemberId);
      setError("");
      await ownerClinicStaffProfilePut(branchId, editingMemberId, {
        defaultConsultationFee: feeParsed,
      });
      setSuccess("Consultation fee saved.");
      setEditingMemberId(null);
      setDoctorFeeDraft("");
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to save");
    } finally {
      setSavingDoctorId(null);
    }
  };

  const openOverridePanel = (serviceId: number) => {
    const row = serviceRows.find((r) => r.id === serviceId);
    setOverridePanelServiceId(serviceId);
    setOverridePanelFee(row?.overrideFee != null ? String(row.overrideFee) : "");
  };

  const closeOverridePanel = () => {
    setOverridePanelServiceId(null);
    setOverridePanelFee("");
  };

  const saveServiceOverride = async () => {
    if (!branchId || !fees || overridePanelServiceId == null) return;
    const fee = parseFloat(overridePanelFee);
    if (Number.isNaN(fee) || fee < 0) {
      setError("Override fee must be a non-negative number.");
      return;
    }
    const rest = fees.serviceOverrides.filter((o) => o.serviceId !== overridePanelServiceId);
    const next = [...rest, { serviceId: overridePanelServiceId, fee }];
    try {
      setSavingOverrideServiceId(overridePanelServiceId);
      setError("");
      await ownerClinicFeesPut(branchId, { serviceOverrides: next });
      setSuccess("Service override saved.");
      closeOverridePanel();
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to save");
    } finally {
      setSavingOverrideServiceId(null);
    }
  };

  const clearServiceOverride = async (serviceId: number) => {
    if (!branchId || !fees) return;
    if (!confirm("Remove override for this service? The base price will be used.")) return;
    const next = fees.serviceOverrides.filter((o) => o.serviceId !== serviceId);
    try {
      setSaving(true);
      setError("");
      await ownerClinicFeesPut(branchId, { serviceOverrides: next });
      setSuccess("Override removed.");
      if (overridePanelServiceId === serviceId) closeOverridePanel();
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to remove");
    } finally {
      setSaving(false);
    }
  };

  if (!branchId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch.</div>
      </div>
    );
  }

  const branchName = staffData?.branch?.name ?? `Branch #${branchId}`;

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Clinic fees"
        subtitle={branchName}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Fees", href: `/owner/clinic/${branchId}/fees` },
        ]}
        actions={[
          <Link
            key="staff"
            href={`/owner/clinic/${branchId}/staff`}
            className="btn btn-outline-secondary radius-12"
          >
            <i className="ri-team-line me-1" />
            Staff
          </Link>,
          <Link
            key="services"
            href={`/owner/clinic/${branchId}/services`}
            className="btn btn-outline-secondary radius-12"
          >
            <i className="ri-service-line me-1" />
            Services
          </Link>,
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-3">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success radius-12 mb-3">
          <i className="ri-check-line me-2" />
          {success}
        </div>
      )}

      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="text-muted mt-2 mb-0">Loading fees…</p>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {/* Left: Doctor consultation fees */}
          <div className="col-12 col-lg-6">
            <div className="card radius-12 h-100">
              <div className="card-body p-24">
                <h6 className="mb-3 fw-semibold">
                  <i className="ri-stethoscope-line me-2 text-primary" />
                  Doctor consultation fees
                </h6>
                <p className="text-muted small mb-3">
                  Set default consultation fee per doctor. Edit inline and save.
                </p>
                {doctorRows.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="ri-user-line fs-1 text-muted d-block mb-2" />
                    <p className="text-muted small mb-2">No doctor fees configured.</p>
                    <Link
                      href={`/owner/clinic/${branchId}/staff`}
                      className="btn btn-sm btn-outline-primary radius-12"
                    >
                      Manage staff
                    </Link>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Name</th>
                          <th>Type</th>
                          <th>Fee</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {doctorRows.map((row) => (
                          <tr key={row.branchMemberId}>
                            <td className="fw-semibold">{row.displayName}</td>
                            <td>
                              <span className="badge bg-primary-subtle text-primary radius-8">
                                {row.staffType}
                              </span>
                            </td>
                            <td>
                              {editingMemberId === row.branchMemberId ? (
                                <input
                                  type="number"
                                  className="form-control form-control-sm radius-8"
                                  style={{ width: 100 }}
                                  min={0}
                                  step="0.01"
                                  placeholder="Optional"
                                  value={doctorFeeDraft}
                                  onChange={(e) => setDoctorFeeDraft(e.target.value)}
                                />
                              ) : (
                                formatMoney(row.defaultConsultationFee)
                              )}
                            </td>
                            <td className="text-end">
                              {editingMemberId === row.branchMemberId ? (
                                <div className="d-flex gap-1 justify-content-end">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary radius-8"
                                    onClick={saveDoctorFee}
                                    disabled={savingDoctorId === row.branchMemberId}
                                  >
                                    {savingDoctorId === row.branchMemberId ? "Saving…" : "Save"}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary radius-8"
                                    onClick={cancelEditDoctor}
                                    disabled={savingDoctorId === row.branchMemberId}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="d-flex gap-1 justify-content-end">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary radius-8"
                                    onClick={() => startEditDoctor(row.branchMemberId, row.defaultConsultationFee)}
                                  >
                                    Edit
                                  </button>
                                  <Link
                                    href={`/owner/clinic/${branchId}/staff/${row.branchMemberId}`}
                                    className="btn btn-sm btn-outline-secondary radius-8"
                                  >
                                    Profile
                                  </Link>
                                </div>
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

          {/* Right: Service fees (effective) */}
          <div className="col-12 col-lg-6">
            <div className="card radius-12 h-100">
              <div className="card-body p-24">
                <h6 className="mb-3 fw-semibold">
                  <i className="ri-money-dollar-circle-line me-2 text-primary" />
                  Service fees (effective)
                </h6>
                <p className="text-muted small mb-3">
                  All services with base price and optional branch overrides.
                </p>
                <div className="mb-3">
                  <input
                    type="text"
                    className="form-control form-control-sm radius-12"
                    placeholder="Search by service name or ID…"
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                  />
                </div>
                {services.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="ri-service-line fs-1 text-muted d-block mb-2" />
                    <p className="text-muted small mb-2">No services in this branch.</p>
                    <Link
                      href={`/owner/clinic/${branchId}/services`}
                      className="btn btn-sm btn-outline-primary radius-12"
                    >
                      Add services
                    </Link>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Service</th>
                          <th>Base</th>
                          <th>Override</th>
                          <th>Effective</th>
                          <th>Status</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredServiceRows.map((row) => (
                          <tr key={row.id}>
                            <td>
                              <span className="fw-semibold">{row.name}</span>
                              <span className="text-muted small ms-1">#{row.id}</span>
                            </td>
                            <td>{formatMoney(row.basePrice)}</td>
                            <td>{row.overrideFee != null ? formatMoney(row.overrideFee) : "—"}</td>
                            <td>{formatMoney(row.effectiveFee)}</td>
                            <td>
                              {row.isOverridden ? (
                                <span className="badge bg-info-subtle text-info-emphasis radius-8">Overridden</span>
                              ) : (
                                <span className="badge bg-secondary-subtle text-secondary-emphasis radius-8">Default</span>
                              )}
                            </td>
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary radius-8 me-1"
                                onClick={() => openOverridePanel(row.id)}
                              >
                                Set override
                              </button>
                              {row.isOverridden && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger radius-8"
                                  onClick={() => clearServiceOverride(row.id)}
                                  disabled={saving}
                                >
                                  Clear
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {services.length > 0 && filteredServiceRows.length === 0 && (
                  <p className="text-muted small mt-2 mb-0">No services match your search.</p>
                )}

                {/* Override edit panel */}
                {overridePanelServiceId != null && (
                  <div className="mt-4 pt-4 border-top">
                    <h6 className="mb-2">Set override fee</h6>
                    {(() => {
                      const row = serviceRows.find((r) => r.id === overridePanelServiceId);
                      if (!row) return null;
                      return (
                        <>
                          <p className="text-muted small mb-2">
                            {row.name} (base: {formatMoney(row.basePrice)})
                          </p>
                          <div className="d-flex flex-wrap align-items-center gap-2">
                            <input
                              type="number"
                              className="form-control form-control-sm radius-12"
                              style={{ width: 120 }}
                              min={0}
                              step="0.01"
                              placeholder="Override amount"
                              value={overridePanelFee}
                              onChange={(e) => setOverridePanelFee(e.target.value)}
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-primary radius-12"
                              onClick={saveServiceOverride}
                              disabled={savingOverrideServiceId === overridePanelServiceId}
                            >
                              {savingOverrideServiceId === overridePanelServiceId ? "Saving…" : "Save override"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary radius-12"
                              onClick={closeOverridePanel}
                              disabled={savingOverrideServiceId === overridePanelServiceId}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
