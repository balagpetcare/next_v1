"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicDoctorDetail,
  ownerClinicDoctorTermsPatch,
  ownerClinicDoctorServicesPut,
  ownerClinicServices,
  ownerClinicScheduleProposalsList,
  ownerClinicDoctorMetrics,
  ownerClinicDoctorCapacity,
  ownerClinicDoctorSettlementLedger,
  ownerClinicDoctorAuditLog,
  type ScheduleProposalRow,
  type DoctorMetrics,
  type DoctorCapacitySummary,
  type SettlementLedgerRow,
  type DoctorAuditLogRow,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { formatAuditDetails, humanizeFieldLabel } from "@/src/lib/displayFormatters";

type ServiceFeeRow = {
  id: number;
  serviceId: number;
  serviceName?: string;
  category?: string;
  fee: number;
  durationMin?: number | null;
  isActive: boolean;
  notes?: string | null;
};

type TabId = "overview" | "terms" | "services" | "schedule" | "metrics" | "capacity" | "settlement" | "audit";

export default function ClinicDoctorDetailPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const memberId = params?.memberId as string | undefined;
  const [data, setData] = useState<Awaited<ReturnType<typeof ownerClinicDoctorDetail>>>(null);
  const [branchServices, setBranchServices] = useState<{ id: number; name: string; category?: string; price?: number; duration?: number }[]>([]);
  const [tab, setTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [termsSaving, setTermsSaving] = useState(false);
  const [servicesSaving, setServicesSaving] = useState(false);
  const [termsForm, setTermsForm] = useState<Record<string, unknown>>({});
  const [serviceFeesDraft, setServiceFeesDraft] = useState<Array<{ serviceId: number; fee: number; durationMin?: number; isActive: boolean; notes?: string; serviceName?: string }>>([]);
  const [addServiceId, setAddServiceId] = useState<string>("");
  const [proposals, setProposals] = useState<ScheduleProposalRow[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [metrics, setMetrics] = useState<DoctorMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsFrom, setMetricsFrom] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [metricsTo, setMetricsTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [capacityDate, setCapacityDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [capacityData, setCapacityData] = useState<DoctorCapacitySummary | null>(null);
  const [capacityLoading, setCapacityLoading] = useState(false);
  const [settlementStatus, setSettlementStatus] = useState<string>("");
  const [settlementFrom, setSettlementFrom] = useState<string>("");
  const [settlementTo, setSettlementTo] = useState<string>("");
  const [settlementRows, setSettlementRows] = useState<SettlementLedgerRow[]>([]);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [auditRows, setAuditRows] = useState<DoctorAuditLogRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const load = useCallback(async () => {
    if (!branchId || !memberId) return;
    try {
      setLoading(true);
      setError("");
      const [detailRes, servicesRes] = await Promise.all([
        ownerClinicDoctorDetail(branchId, memberId),
        ownerClinicServices(branchId),
      ]);
      setData(detailRes ?? null);
      const serv = servicesRes as { items?: { id: number; name: string; category?: string; price?: number; duration?: number }[] };
      setBranchServices(Array.isArray(serv?.items) ? serv.items : []);
      const profile = (detailRes?.profile ?? {}) as Record<string, unknown>;
      setTermsForm({
        roleInClinic: profile.roleInClinic ?? "",
        followUpFee: profile.followUpFee ?? "",
        emergencyFee: profile.emergencyFee ?? "",
        scheduleEditPolicy: profile.scheduleEditPolicy ?? "",
        contractStatus: profile.contractStatus ?? "ACTIVE",
        contractStartDate: profile.contractStartDate ? String(profile.contractStartDate).slice(0, 10) : "",
        contractEndDate: profile.contractEndDate ? String(profile.contractEndDate).slice(0, 10) : "",
        contractNotes: profile.contractNotes ?? "",
        maxPatientsPerDay: profile.maxPatientsPerDay ?? "",
        allowEmergencyOverbook: profile.allowEmergencyOverbook ?? false,
        travelBufferMinutes: profile.travelBufferMinutes ?? 0,
      });
      const fees = (detailRes?.serviceFees ?? []) as ServiceFeeRow[];
      setServiceFeesDraft(
        fees.map((f) => ({
          serviceId: f.serviceId,
          fee: f.fee,
          durationMin: f.durationMin ?? undefined,
          isActive: f.isActive,
          notes: f.notes ?? undefined,
          serviceName: f.serviceName,
        }))
      );
    } catch (e) {
      setError((e as Error)?.message || "Failed to load doctor");
    } finally {
      setLoading(false);
    }
  }, [branchId, memberId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleTermsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || !memberId) return;
    setTermsSaving(true);
    setError("");
    try {
      await ownerClinicDoctorTermsPatch(branchId, memberId, {
        roleInClinic: (termsForm.roleInClinic as string) || undefined,
        followUpFee: (termsForm.followUpFee as string) === "" ? null : Number(termsForm.followUpFee),
        emergencyFee: (termsForm.emergencyFee as string) === "" ? null : Number(termsForm.emergencyFee),
        scheduleEditPolicy: (termsForm.scheduleEditPolicy as string) || undefined,
        contractStatus: (termsForm.contractStatus as string) || undefined,
        contractStartDate: (termsForm.contractStartDate as string) || null,
        contractEndDate: (termsForm.contractEndDate as string) || null,
        contractNotes: (termsForm.contractNotes as string) || null,
        maxPatientsPerDay: (termsForm.maxPatientsPerDay as string) === "" ? null : Number(termsForm.maxPatientsPerDay),
        allowEmergencyOverbook: Boolean(termsForm.allowEmergencyOverbook),
        travelBufferMinutes: Number(termsForm.travelBufferMinutes) || 0,
      });
      await load();
    } catch (err) {
      setError((err as Error)?.message || "Failed to save terms");
    } finally {
      setTermsSaving(false);
    }
  };

  const handleServicesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || !memberId) return;
    setServicesSaving(true);
    setError("");
    try {
      await ownerClinicDoctorServicesPut(branchId, memberId, {
        services: serviceFeesDraft.map((s) => ({
          serviceId: s.serviceId,
          fee: s.fee,
          durationMin: s.durationMin,
          isActive: s.isActive,
          notes: s.notes || undefined,
        })),
      });
      await load();
    } catch (err) {
      setError((err as Error)?.message || "Failed to save services");
    } finally {
      setServicesSaving(false);
    }
  };

  const addServiceFee = () => {
    const id = parseInt(addServiceId, 10);
    if (!id || serviceFeesDraft.some((s) => s.serviceId === id)) return;
    const svc = branchServices.find((s) => s.id === id);
    setServiceFeesDraft((prev) => [...prev, { serviceId: id, fee: svc?.price ?? 0, isActive: true, serviceName: svc?.name }]);
    setAddServiceId("");
  };

  const removeServiceFee = (serviceId: number) => {
    setServiceFeesDraft((prev) => prev.filter((s) => s.serviceId !== serviceId));
  };

  const loadProposals = useCallback(async () => {
    if (!branchId) return;
    setProposalsLoading(true);
    try {
      const list = await ownerClinicScheduleProposalsList(branchId);
      setProposals(Array.isArray(list) ? list : []);
    } catch {
      setProposals([]);
    } finally {
      setProposalsLoading(false);
    }
  }, [branchId]);

  const loadMetrics = useCallback(async () => {
    if (!branchId || !memberId) return;
    setMetricsLoading(true);
    try {
      const m = await ownerClinicDoctorMetrics(branchId, memberId, { from: metricsFrom, to: metricsTo });
      setMetrics(m ?? null);
    } catch {
      setMetrics(null);
    } finally {
      setMetricsLoading(false);
    }
  }, [branchId, memberId, metricsFrom, metricsTo]);

  const loadCapacity = useCallback(async () => {
    if (!branchId || !memberId) return;
    setCapacityLoading(true);
    try {
      const c = await ownerClinicDoctorCapacity(branchId, memberId, capacityDate);
      setCapacityData(c ?? null);
    } catch {
      setCapacityData(null);
    } finally {
      setCapacityLoading(false);
    }
  }, [branchId, memberId, capacityDate]);

  const loadSettlement = useCallback(async () => {
    if (!branchId || !memberId) return;
    setSettlementLoading(true);
    try {
      const rows = await ownerClinicDoctorSettlementLedger(branchId, memberId, {
        status: settlementStatus || undefined,
        from: settlementFrom || undefined,
        to: settlementTo || undefined,
      });
      setSettlementRows(Array.isArray(rows) ? rows : []);
    } catch {
      setSettlementRows([]);
    } finally {
      setSettlementLoading(false);
    }
  }, [branchId, memberId, settlementStatus, settlementFrom, settlementTo]);

  useEffect(() => {
    if (tab === "schedule") loadProposals();
  }, [tab, loadProposals]);

  useEffect(() => {
    if (tab === "metrics") loadMetrics();
  }, [tab, loadMetrics]);

  useEffect(() => {
    if (tab === "capacity") loadCapacity();
  }, [tab, loadCapacity]);

  useEffect(() => {
    if (tab === "settlement") loadSettlement();
  }, [tab, loadSettlement]);

  const loadAudit = useCallback(async () => {
    if (!branchId || !memberId) return;
    setAuditLoading(true);
    try {
      const list = await ownerClinicDoctorAuditLog(branchId, memberId, { limit: 50 });
      setAuditRows(Array.isArray(list) ? list : []);
    } catch {
      setAuditRows([]);
    } finally {
      setAuditLoading(false);
    }
  }, [branchId, memberId]);

  useEffect(() => {
    if (tab === "audit") loadAudit();
  }, [tab, loadAudit]);

  if (!branchId || !memberId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch or doctor.</div>
      </div>
    );
  }

  const displayName = data?.displayName ?? `Doctor #${data?.userId ?? memberId}`;
  const profile = (data?.profile ?? {}) as Record<string, unknown>;

  const tabButtons: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "terms", label: "Terms" },
    { id: "services", label: "Services" },
    { id: "schedule", label: "Schedule" },
    { id: "metrics", label: "Metrics" },
    { id: "capacity", label: "Capacity" },
    { id: "settlement", label: "Settlement" },
    { id: "audit", label: "Audit" },
  ];
  const memberIdNum = Number(memberId);
  const doctorProposals = proposals.filter((p) => p.branchMemberId === memberIdNum);

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title={loading ? "Doctor" : String(displayName)}
        subtitle={data?.branch?.name ?? `Branch #${branchId}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Doctors", href: `/owner/clinic/${branchId}/doctors` },
          { label: String(displayName), href: `/owner/clinic/${branchId}/doctors/${memberId}` },
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status" />
          </div>
        </div>
      ) : !data ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <p className="text-muted mb-0">Doctor not found.</p>
            <Link href={`/owner/clinic/${branchId}/doctors`} className="btn btn-outline-primary mt-3 radius-12">
              Back to doctors
            </Link>
          </div>
        </div>
      ) : (
        <>
          <ul className="nav nav-tabs mb-3">
            {tabButtons.map((t) => (
              <li key={t.id} className="nav-item">
                <button
                  type="button"
                  className={`nav-link radius-12 ${tab === t.id ? "active" : ""}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              </li>
            ))}
          </ul>

          {tab === "overview" && (
            <div className="card radius-12 mb-4">
              <div className="card-body">
                <h5 className="card-title mb-3">Profile summary</h5>
                <p className="mb-1">
                  <strong>Verification:</strong>{" "}
                  <span className={`badge radius-8 ${(data as any)?.verificationStatus === "VERIFIED" ? "bg-success" : (data as any)?.verificationStatus === "PENDING" ? "bg-warning" : "bg-secondary"}`}>
                    {(data as any)?.verificationStatus ?? "—"}
                  </span>
                </p>
                <p className="mb-1">
                  <strong>Contract status:</strong>{" "}
                  <span className="badge bg-primary radius-8">{String(profile.contractStatus ?? "—")}</span>
                  {" "}
                  <Link href={`/owner/clinic/${branchId}/doctors/${memberId}/contract`} className="btn btn-sm btn-outline-primary radius-12">
                    Settlement contract
                  </Link>
                </p>
                <p className="mb-1">
                  <strong>Onboarding:</strong>{" "}
                  <span className={`badge radius-8 ${(profile as any).onboardingStatus === "COMPLETED" ? "bg-success" : "bg-warning"}`}>
                    {(profile as any).onboardingStatus === "COMPLETED" ? "Completed" : "Pending"}
                  </span>
                </p>
                <p className="mb-1">
                  <strong>Schedule policy:</strong> {String(profile.scheduleEditPolicy ?? "—")}
                </p>
                <p className="mb-1">
                  <strong>Follow-up fee:</strong> {profile.followUpFee != null ? String(profile.followUpFee) : "—"}
                </p>
                <p className="mb-1">
                  <strong>Emergency fee:</strong> {profile.emergencyFee != null ? String(profile.emergencyFee) : "—"}
                </p>
                <p className="mb-0">
                  <strong>Service fees:</strong> {Array.isArray(data.serviceFees) ? data.serviceFees.length : 0} configured
                </p>
              </div>
            </div>
          )}

          {tab === "terms" && (
            <div className="card radius-12 mb-4">
              <div className="card-body">
                <h5 className="card-title mb-3">Contract & terms</h5>
                <form onSubmit={handleTermsSubmit}>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label">Role in clinic</label>
                      <input
                        type="text"
                        className="form-control radius-12"
                        value={String(termsForm.roleInClinic ?? "")}
                        onChange={(e) => setTermsForm((f) => ({ ...f, roleInClinic: e.target.value }))}
                        placeholder="e.g. CONSULTANT"
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Contract status</label>
                      <select
                        className="form-select radius-12"
                        value={String(termsForm.contractStatus ?? "ACTIVE")}
                        onChange={(e) => setTermsForm((f) => ({ ...f, contractStatus: e.target.value }))}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="PENDING">Pending</option>
                        <option value="PAUSED">Paused</option>
                        <option value="ENDED">Ended</option>
                      </select>
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Schedule edit policy</label>
                      <select
                        className="form-select radius-12"
                        value={String(termsForm.scheduleEditPolicy ?? "")}
                        onChange={(e) => setTermsForm((f) => ({ ...f, scheduleEditPolicy: e.target.value }))}
                      >
                        <option value="CLINIC_ONLY">Clinic only</option>
                        <option value="DOCTOR_PROPOSE_CLINIC_APPROVES">Doctor proposes, clinic approves</option>
                        <option value="BOTH">Both</option>
                        <option value="DOCTOR_EDIT">Doctor can edit</option>
                      </select>
                    </div>
                    <div className="col-12 col-md-3">
                      <label className="form-label">Follow-up fee</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className="form-control radius-12"
                        value={String(termsForm.followUpFee ?? "")}
                        onChange={(e) => setTermsForm((f) => ({ ...f, followUpFee: e.target.value }))}
                      />
                    </div>
                    <div className="col-12 col-md-3">
                      <label className="form-label">Emergency fee</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className="form-control radius-12"
                        value={String(termsForm.emergencyFee ?? "")}
                        onChange={(e) => setTermsForm((f) => ({ ...f, emergencyFee: e.target.value }))}
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">Contract start date</label>
                      <input
                        type="date"
                        className="form-control radius-12"
                        value={String(termsForm.contractStartDate ?? "")}
                        onChange={(e) => setTermsForm((f) => ({ ...f, contractStartDate: e.target.value }))}
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">Contract end date</label>
                      <input
                        type="date"
                        className="form-control radius-12"
                        value={String(termsForm.contractEndDate ?? "")}
                        onChange={(e) => setTermsForm((f) => ({ ...f, contractEndDate: e.target.value }))}
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">Max patients per day</label>
                      <input
                        type="number"
                        min={0}
                        className="form-control radius-12"
                        value={String(termsForm.maxPatientsPerDay ?? "")}
                        onChange={(e) => setTermsForm((f) => ({ ...f, maxPatientsPerDay: e.target.value }))}
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">Travel buffer (min)</label>
                      <input
                        type="number"
                        min={0}
                        className="form-control radius-12"
                        value={String(termsForm.travelBufferMinutes ?? 0)}
                        onChange={(e) => setTermsForm((f) => ({ ...f, travelBufferMinutes: e.target.value }))}
                      />
                    </div>
                    <div className="col-12">
                      <div className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={Boolean(termsForm.allowEmergencyOverbook)}
                          onChange={(e) => setTermsForm((f) => ({ ...f, allowEmergencyOverbook: e.target.checked }))}
                        />
                        <label className="form-check-label">Allow emergency overbook</label>
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Contract notes</label>
                      <textarea
                        className="form-control radius-12"
                        rows={2}
                        value={String(termsForm.contractNotes ?? "")}
                        onChange={(e) => setTermsForm((f) => ({ ...f, contractNotes: e.target.value }))}
                      />
                    </div>
                    <div className="col-12">
                      <button type="submit" className="btn btn-primary radius-12" disabled={termsSaving}>
                        {termsSaving ? "Saving…" : "Save terms"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {tab === "services" && (
            <div className="card radius-12 mb-4">
              <div className="card-body">
                <h5 className="card-title mb-3">Service fees</h5>
                <p className="text-muted small mb-3">Set doctor-specific fee and duration per service. Only branch services can be assigned.</p>
                <form onSubmit={handleServicesSubmit}>
                  <div className="table-responsive mb-3">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Service</th>
                          <th>Fee</th>
                          <th>Duration (min)</th>
                          <th>Notes</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {serviceFeesDraft.map((row) => (
                          <tr key={row.serviceId}>
                            <td>{row.serviceName ?? `Service #${row.serviceId}`}</td>
                            <td>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                className="form-control form-control-sm radius-8 w-100"
                                value={row.fee}
                                onChange={(e) =>
                                  setServiceFeesDraft((prev) =>
                                    prev.map((s) => (s.serviceId === row.serviceId ? { ...s, fee: Number(e.target.value) } : s))
                                  )
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min={0}
                                className="form-control form-control-sm radius-8 w-100"
                                value={row.durationMin ?? ""}
                                onChange={(e) =>
                                  setServiceFeesDraft((prev) =>
                                    prev.map((s) =>
                                      s.serviceId === row.serviceId ? { ...s, durationMin: e.target.value ? Number(e.target.value) : undefined } : s
                                    )
                                  )
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm radius-8 w-100"
                                value={row.notes ?? ""}
                                onChange={(e) =>
                                  setServiceFeesDraft((prev) =>
                                    prev.map((s) => (s.serviceId === row.serviceId ? { ...s, notes: e.target.value || undefined } : s))
                                  )
                                }
                              />
                            </td>
                            <td>
                              <button type="button" className="btn btn-sm btn-outline-danger radius-8" onClick={() => removeServiceFee(row.serviceId)}>
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                    <select
                      className="form-select form-select-sm w-auto radius-12"
                      value={addServiceId}
                      onChange={(e) => setAddServiceId(e.target.value)}
                    >
                      <option value="">Add service…</option>
                      {branchServices
                        .filter((s) => !serviceFeesDraft.some((d) => d.serviceId === s.id))
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.price})
                          </option>
                        ))}
                    </select>
                    <button type="button" className="btn btn-sm btn-outline-primary radius-12" onClick={addServiceFee} disabled={!addServiceId}>
                      Add
                    </button>
                  </div>
                  <button type="submit" className="btn btn-primary radius-12" disabled={servicesSaving}>
                    {servicesSaving ? "Saving…" : "Save all service fees"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {tab === "schedule" && (
            <div className="card radius-12 mb-4">
              <div className="card-body">
                <h5 className="card-title mb-3">Schedule proposals</h5>
                <p className="text-muted small mb-3">
                  Proposals submitted by this doctor. Review and approve or reject from the branch{" "}
                  <Link href={`/owner/clinic/${branchId}/schedule-proposals`}>Schedule proposals</Link> page.
                </p>
                {proposalsLoading ? (
                  <div className="text-center py-3">
                    <span className="spinner-border spinner-border-sm text-primary" />
                  </div>
                ) : doctorProposals.length === 0 ? (
                  <p className="text-muted mb-0">No schedule proposals from this doctor.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Status</th>
                          <th>Reviewed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {doctorProposals.map((p) => (
                          <tr key={p.id}>
                            <td>{p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"}</td>
                            <td>
                              <span className={`badge radius-8 ${p.status === "PENDING" ? "bg-warning" : p.status === "APPROVED" ? "bg-success" : "bg-secondary"}`}>
                                {p.status}
                              </span>
                            </td>
                            <td>{p.reviewedAt ? new Date(p.reviewedAt).toLocaleString() : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "metrics" && (
            <div className="card radius-12 mb-4">
              <div className="card-body">
                <h5 className="card-title mb-3">Metrics</h5>
                <div className="row g-2 mb-3">
                  <div className="col-auto">
                    <label className="form-label small mb-0">From</label>
                    <input type="date" className="form-control form-control-sm radius-12" value={metricsFrom} onChange={(e) => setMetricsFrom(e.target.value)} />
                  </div>
                  <div className="col-auto">
                    <label className="form-label small mb-0">To</label>
                    <input type="date" className="form-control form-control-sm radius-12" value={metricsTo} onChange={(e) => setMetricsTo(e.target.value)} />
                  </div>
                  <div className="col-auto d-flex align-items-end">
                    <button type="button" className="btn btn-sm btn-primary radius-12" onClick={loadMetrics} disabled={metricsLoading}>
                      {metricsLoading ? "Loading…" : "Apply"}
                    </button>
                  </div>
                </div>
                {metricsLoading ? (
                  <div className="text-center py-3">
                    <span className="spinner-border spinner-border-sm text-primary" />
                  </div>
                ) : metrics ? (
                  <div className="row g-3">
                    <div className="col-6 col-md-4">
                      <div className="card bg-light radius-12">
                        <div className="card-body py-3">
                          <div className="small text-muted">Patients seen</div>
                          <div className="h4 mb-0">{metrics.patientsSeen}</div>
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="card bg-light radius-12">
                        <div className="card-body py-3">
                          <div className="small text-muted">Appointments completed</div>
                          <div className="h4 mb-0">{metrics.appointments.completed}</div>
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="card bg-light radius-12">
                        <div className="card-body py-3">
                          <div className="small text-muted">Appointments cancelled</div>
                          <div className="h4 mb-0">{metrics.appointments.cancelled}</div>
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="card bg-light radius-12">
                        <div className="card-body py-3">
                          <div className="small text-muted">No-shows</div>
                          <div className="h4 mb-0">{metrics.appointments.noShow}</div>
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="card bg-light radius-12">
                        <div className="card-body py-3">
                          <div className="small text-muted">Visits completed</div>
                          <div className="h4 mb-0">{metrics.visits.completed}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted mb-0">Select date range and click Apply.</p>
                )}
              </div>
            </div>
          )}

          {tab === "capacity" && (
            <div className="card radius-12 mb-4">
              <div className="card-body">
                <h5 className="card-title mb-3">Daily capacity</h5>
                <div className="row g-2 mb-3">
                  <div className="col-auto">
                    <label className="form-label small mb-0">Date</label>
                    <input type="date" className="form-control form-control-sm radius-12" value={capacityDate} onChange={(e) => setCapacityDate(e.target.value)} />
                  </div>
                  <div className="col-auto d-flex align-items-end">
                    <button type="button" className="btn btn-sm btn-primary radius-12" onClick={loadCapacity} disabled={capacityLoading}>
                      {capacityLoading ? "Loading…" : "Apply"}
                    </button>
                  </div>
                </div>
                {capacityLoading ? (
                  <div className="text-center py-3">
                    <span className="spinner-border spinner-border-sm text-primary" />
                  </div>
                ) : capacityData ? (
                  <div className="row g-3">
                    <div className="col-6 col-md-4">
                      <div className="card bg-light radius-12">
                        <div className="card-body py-3">
                          <div className="small text-muted">Max patients per day</div>
                          <div className="h4 mb-0">{capacityData.maxPatientsPerDay ?? "—"}</div>
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className="card bg-light radius-12">
                        <div className="card-body py-3">
                          <div className="small text-muted">Booked</div>
                          <div className="h4 mb-0">{capacityData.bookedCount}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted mb-0">Select date and click Apply.</p>
                )}
              </div>
            </div>
          )}

          {tab === "settlement" && (
            <div className="card radius-12 mb-4">
              <div className="card-body">
                <h5 className="card-title mb-3">Settlement ledger</h5>
                <div className="row g-2 mb-3">
                  <div className="col-auto">
                    <label className="form-label small mb-0">Status</label>
                    <select className="form-select form-select-sm radius-12" value={settlementStatus} onChange={(e) => setSettlementStatus(e.target.value)}>
                      <option value="">All</option>
                      <option value="PENDING">Pending</option>
                      <option value="SETTLED">Settled</option>
                    </select>
                  </div>
                  <div className="col-auto">
                    <label className="form-label small mb-0">From</label>
                    <input type="date" className="form-control form-control-sm radius-12" value={settlementFrom} onChange={(e) => setSettlementFrom(e.target.value)} />
                  </div>
                  <div className="col-auto">
                    <label className="form-label small mb-0">To</label>
                    <input type="date" className="form-control form-control-sm radius-12" value={settlementTo} onChange={(e) => setSettlementTo(e.target.value)} />
                  </div>
                  <div className="col-auto d-flex align-items-end">
                    <button type="button" className="btn btn-sm btn-primary radius-12" onClick={loadSettlement} disabled={settlementLoading}>
                      {settlementLoading ? "Loading…" : "Apply"}
                    </button>
                  </div>
                </div>
                {settlementLoading ? (
                  <div className="text-center py-3">
                    <span className="spinner-border spinner-border-sm text-primary" />
                  </div>
                ) : settlementRows.length === 0 ? (
                  <p className="text-muted mb-0">No ledger entries. Use filters and click Apply.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Visit / Order</th>
                          <th>Gross</th>
                          <th>Clinic</th>
                          <th>Doctor</th>
                          <th>Status</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {settlementRows.map((row) => (
                          <tr key={row.id}>
                            <td>{row.type}</td>
                            <td>{row.visitId ?? row.orderId ?? "—"}</td>
                            <td>{row.grossAmount}</td>
                            <td>{row.clinicShare}</td>
                            <td>{row.doctorShare}</td>
                            <td>
                              <span className={`badge radius-8 ${row.settlementStatus === "SETTLED" ? "bg-success" : "bg-warning"}`}>{row.settlementStatus}</span>
                            </td>
                            <td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "audit" && (
            <div className="card radius-12 mb-4">
              <div className="card-body">
                <h5 className="card-title mb-3">Audit log</h5>
                <p className="text-muted small mb-3">Changes to terms, services, and schedule proposal reviews.</p>
                {auditLoading ? (
                  <div className="text-center py-3">
                    <span className="spinner-border spinner-border-sm text-primary" />
                  </div>
                ) : auditRows.length === 0 ? (
                  <p className="text-muted mb-0">No audit entries yet.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Action</th>
                          <th>Field</th>
                          <th>Role</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditRows.map((row) => (
                          <tr key={row.id}>
                            <td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}</td>
                            <td><span className="badge bg-secondary radius-8">{row.action}</span></td>
                            <td>{row.field ? humanizeFieldLabel(row.field) : "—"}</td>
                            <td>{row.changedByRole ?? "—"}</td>
                            <td className="small">
                              {(() => {
                                const lines = formatAuditDetails({ field: row.field, oldValue: row.oldValue, newValue: row.newValue });
                                if (lines.length === 0) return "—";
                                return (
                                  <ul className="list-unstyled mb-0 small">
                                    {lines.map((line, i) => (
                                      <li key={i}>{line}</li>
                                    ))}
                                  </ul>
                                );
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          <Link href={`/owner/clinic/${branchId}/doctors`} className="btn btn-outline-secondary radius-12">
            <i className="ri-arrow-left-line me-1" />
            Back to doctors
          </Link>
        </>
      )}
    </div>
  );
}
