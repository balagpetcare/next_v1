"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicCaseById,
  staffClinicConsumptionForCase,
  staffClinicConsumptionPlanned,
  staffClinicConsumptionVariance,
  staffClinicConsumptionReconcile,
  staffClinicCompleteCase,
  staffClinicAddProcedureOrder,
  staffClinicCompleteProcedureOrder,
  staffClinicDoctors,
} from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { ReportDataDisplay } from "@/src/components/dashboard";
import { toast } from "react-toastify";

export default function StaffClinicCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const caseId = useMemo(() => Number(params?.caseId), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const [caseData, setCaseData] = useState(null);
  const [consumption, setConsumption] = useState([]);
  const [variance, setVariance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [consumptionLoading, setConsumptionLoading] = useState(false);
  const [plannedPkgId, setPlannedPkgId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [otModalOpen, setOtModalOpen] = useState(false);
  const [otDoctorId, setOtDoctorId] = useState("");
  const [otScheduledAt, setOtScheduledAt] = useState("");
  const [otPackageId, setOtPackageId] = useState("");
  const [dischargeLoading, setDischargeLoading] = useState(false);
  const [completeOrderLoading, setCompleteOrderLoading] = useState(null);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasRead = permissions.some((p) => p === "clinic.cases.read" || p === "clinic.cases.write");
  const hasConsumptionWrite = permissions.some((p) => p === "clinic.consumption.write");

  const load = useCallback(() => {
    if (!branchId || !caseId) return;
    setLoading(true);
    Promise.all([
      staffClinicCaseById(branchId, caseId),
      staffClinicConsumptionForCase(branchId, caseId),
      staffClinicConsumptionVariance(branchId, caseId).catch(() => null),
    ])
      .then(([c, cons, v]) => {
        setCaseData(c ?? null);
        setConsumption(Array.isArray(cons) ? cons : []);
        setVariance(v ?? null);
      })
      .catch(() => {
        setCaseData(null);
        setConsumption([]);
        setVariance(null);
      })
      .finally(() => setLoading(false));
  }, [branchId, caseId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!branchId) return;
    staffClinicDoctors(branchId).then(setDoctors).catch(() => setDoctors([]));
  }, [branchId]);

  const handleCreatePlanned = useCallback(() => {
    if (!branchId || !caseId || !plannedPkgId) return;
    setSubmitting(true);
    staffClinicConsumptionPlanned(branchId, caseId, { surgeryPackageId: Number(plannedPkgId) })
      .then(() => {
        toast.success("Planned consumption created from package.");
        setPlannedPkgId("");
        load();
      })
      .catch((e) => toast.error(e?.message || "Failed"))
      .finally(() => setSubmitting(false));
  }, [branchId, caseId, plannedPkgId, load]);

  const handleReconcile = useCallback(
    (consumptionId) => {
      if (!branchId || !caseId) return;
      setConsumptionLoading(true);
      staffClinicConsumptionReconcile(branchId, caseId, consumptionId)
        .then(() => {
          toast.success("Variance reconciled.");
          load();
        })
        .catch((e) => toast.error(e?.message || "Failed"))
        .finally(() => setConsumptionLoading(false));
    },
    [branchId, caseId, load]
  );

  const handleDischarge = useCallback(() => {
    if (!branchId || !caseId || caseData?.status === "COMPLETED") return;
    if (!confirm("Discharge this case? Status will be set to COMPLETED.")) return;
    setDischargeLoading(true);
    staffClinicCompleteCase(branchId, caseId)
      .then(() => {
        toast.success("Case discharged.");
        load();
      })
      .catch((e) => toast.error(e?.message || "Failed"))
      .finally(() => setDischargeLoading(false));
  }, [branchId, caseId, caseData?.status, load]);

  const handleScheduleOt = useCallback(() => {
    if (!branchId || !caseId || !otDoctorId) return;
    setSubmitting(true);
    staffClinicAddProcedureOrder(branchId, caseId, {
      doctorId: Number(otDoctorId),
      scheduledAt: otScheduledAt || undefined,
      surgeryPackageId: otPackageId ? Number(otPackageId) : undefined,
    })
      .then(() => {
        toast.success("Procedure order added.");
        setOtModalOpen(false);
        setOtDoctorId("");
        setOtScheduledAt("");
        setOtPackageId("");
        load();
      })
      .catch((e) => toast.error(e?.message || "Failed"))
      .finally(() => setSubmitting(false));
  }, [branchId, caseId, otDoctorId, otScheduledAt, otPackageId, load]);

  const handleCompleteOrder = useCallback(
    (orderId) => {
      if (!branchId || !caseId) return;
      setCompleteOrderLoading(orderId);
      staffClinicCompleteProcedureOrder(branchId, caseId, orderId)
        .then(() => {
          toast.success("Procedure completed.");
          load();
        })
        .catch((e) => toast.error(e?.message || "Failed"))
        .finally(() => setCompleteOrderLoading(null));
    },
    [branchId, caseId, load]
  );

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }

  if (!hasRead) {
    return (
      <AccessDenied missingPerm="clinic.cases.read" onBack={() => router.push(`/staff/branch/${branchId}/clinic/cases`)} />
    );
  }

  if (loading && !caseData) {
    return (
      <div className="container py-40 text-center">
        <span className="spinner-border text-primary" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="container py-24">
        <div className="alert alert-warning">Case not found.</div>
        <Link href={`/staff/branch/${branchId}/clinic/cases`} className="btn btn-outline-primary">
          Back to cases
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24 flex-wrap">
        <Link href={`/staff/branch/${branchId}/clinic/cases`} className="btn btn-outline-secondary btn-sm">
          ← Cases
        </Link>
        {caseData.visitId && (
          <>
            <Link href={`/staff/branch/${branchId}/clinic/visits/${caseData.visitId}`} className="btn btn-outline-secondary btn-sm">
              Visit
            </Link>
            <Link href={`/staff/branch/${branchId}/clinic/billing?visitId=${caseData.visitId}`} className="btn btn-outline-primary btn-sm">
              Billing
            </Link>
          </>
        )}
        <h5 className="mb-0">Case #{caseData.id}</h5>
        <span className={`badge radius-8 ${caseData.status === "COMPLETED" ? "bg-success" : "bg-primary"}`}>{caseData.status}</span>
      </div>

      <div className="card radius-12 mb-4">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h6 className="mb-0">Case info</h6>
          {caseData.status !== "COMPLETED" && (
            <button
              type="button"
              className="btn btn-sm btn-success radius-8"
              onClick={handleDischarge}
              disabled={dischargeLoading}
            >
              {dischargeLoading ? "Discharging…" : "Discharge"}
            </button>
          )}
        </div>
        <div className="card-body">
          <p className="mb-0">
            Patient: {caseData.patient?.profile?.displayName ?? "—"} / Pet: {caseData.pet?.name ?? "—"} | Package:{" "}
            {caseData.surgeryPackage?.packageName ?? "—"} | Opened: {caseData.openedAt ? new Date(caseData.openedAt).toLocaleString() : "—"}
          </p>
        </div>
      </div>

      <div className="card radius-12 mb-4">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h6 className="mb-0">Procedure orders (OT)</h6>
          {caseData.status !== "COMPLETED" && (
            <button type="button" className="btn btn-sm btn-primary radius-8" onClick={() => setOtModalOpen(true)}>
              Schedule OT
            </button>
          )}
        </div>
        <div className="card-body">
          {!caseData.procedureOrders?.length ? (
            <p className="text-muted mb-0">No procedure orders. Use Schedule OT to add one.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Doctor</th>
                    <th>Scheduled at</th>
                    <th>Status</th>
                    <th>Started / Completed</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {caseData.procedureOrders.map((po) => (
                    <tr key={po.id}>
                      <td>{po.id}</td>
                      <td>{doctors.find((d) => d.id === po.doctorId)?.displayName ?? po.doctorId ?? "—"}</td>
                      <td>{po.scheduledAt ? new Date(po.scheduledAt).toLocaleString() : "—"}</td>
                      <td>
                        <span className={`badge radius-8 ${po.status === "COMPLETED" ? "bg-success" : "bg-secondary"}`}>{po.status}</span>
                      </td>
                      <td>
                        {po.startedAt ? new Date(po.startedAt).toLocaleTimeString() : "—"} /{" "}
                        {po.completedAt ? new Date(po.completedAt).toLocaleString() : "—"}
                      </td>
                      <td>
                        {po.status !== "COMPLETED" && caseData.status !== "COMPLETED" && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success radius-8"
                            onClick={() => handleCompleteOrder(po.id)}
                            disabled={completeOrderLoading === po.id}
                          >
                            {completeOrderLoading === po.id ? "…" : "Complete"}
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

      {otModalOpen && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} role="dialog">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h5 className="modal-title">Schedule OT</h5>
                <button type="button" className="btn-close" onClick={() => setOtModalOpen(false)} aria-label="Close" />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Doctor</label>
                  <select
                    className="form-select radius-8"
                    value={otDoctorId}
                    onChange={(e) => setOtDoctorId(e.target.value)}
                  >
                    <option value="">Select doctor</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>{d.displayName ?? "Doctor #" + d.id}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Scheduled at (optional)</label>
                  <input
                    type="datetime-local"
                    className="form-control radius-8"
                    value={otScheduledAt}
                    onChange={(e) => setOtScheduledAt(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Package ID (optional)</label>
                  <input
                    type="number"
                    className="form-control radius-8"
                    placeholder="Surgery package ID"
                    value={otPackageId}
                    onChange={(e) => setOtPackageId(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary radius-8" onClick={() => setOtModalOpen(false)}>Cancel</button>
                <button type="button" className="btn btn-primary radius-8" onClick={handleScheduleOt} disabled={submitting || !otDoctorId}>
                  {submitting ? "Adding…" : "Add"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {hasConsumptionWrite && (
        <div className="card radius-12 mb-4">
          <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
            <h6 className="mb-0">Planned consumption (from package)</h6>
            <div className="d-flex gap-2 align-items-center">
              <input
                type="number"
                className="form-control form-control-sm w-80"
                placeholder="Package ID"
                value={plannedPkgId}
                onChange={(e) => setPlannedPkgId(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-sm btn-primary radius-12"
                onClick={handleCreatePlanned}
                disabled={!plannedPkgId || submitting}
              >
                {submitting ? "Creating…" : "Create planned"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card radius-12 mb-4">
        <div className="card-header">
          <h6 className="mb-0">Consumption records</h6>
        </div>
        <div className="card-body">
          {consumption.length === 0 ? (
            <p className="text-muted mb-0">No consumption records. Create planned from package or record actual consumption via API.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Mode</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {consumption.map((c) => (
                    <tr key={c.id}>
                      <td>{c.id}</td>
                      <td>{c.mode ?? "—"}</td>
                      <td>{c.status ?? "—"}</td>
                      <td>{c.items?.length ?? 0}</td>
                      <td>
                        {variance?.consumptions?.some((v) => v.id === c.id) && hasConsumptionWrite && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning radius-8"
                            onClick={() => handleReconcile(c.id)}
                            disabled={consumptionLoading}
                          >
                            Reconcile
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

      {variance && (variance.summary?.totalVariance !== undefined || variance.consumptions?.length > 0) && (
        <div className="card radius-12 mb-4">
          <div className="card-header">
            <h6 className="mb-0">Variance summary</h6>
          </div>
          <div className="card-body">
            <ReportDataDisplay data={variance.summary ?? variance} className="mb-0" />
          </div>
        </div>
      )}
    </div>
  );
}
