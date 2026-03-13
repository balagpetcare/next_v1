"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicTreatmentBillingSummary,
  staffClinicTreatmentDayBillCreate,
  staffClinicInternalOrderCreate,
  staffClinicOpenVialAvailability,
} from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { toast } from "react-toastify";

const PERMS = ["clinic.billing.view", "medicine.dose.read", "medicine.dose.record"];

export default function TreatmentBillingPage() {
  const params = useParams();
  const branchId = String(params?.branchId ?? "");
  const { branch, myAccess, isLoading } = useBranchContext(branchId);
  const hasAccess = (myAccess?.permissions as string[] || []).some((p: string) => PERMS.includes(p));

  const [courseId, setCourseId] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [treatmentDayId, setTreatmentDayId] = useState("");
  const [serviceFee, setServiceFee] = useState("0");

  const loadSummary = useCallback(() => {
    if (!branchId || !courseId) return;
    setLoading(true);
    setSummary(null);
    staffClinicTreatmentBillingSummary(branchId, Number(courseId))
      .then(setSummary)
      .catch((e) => {
        toast.error(e?.message || "Failed to load summary");
        setSummary(null);
      })
      .finally(() => setLoading(false));
  }, [branchId, courseId]);

  const handleCreateBill = useCallback(() => {
    if (!branchId || !courseId || !customerId || !treatmentDayId) {
      toast.error("Customer ID and Treatment Day ID required");
      return;
    }
    setCreating(true);
    staffClinicTreatmentDayBillCreate(branchId, Number(courseId), {
      customerId: Number(customerId),
      treatmentDayId: Number(treatmentDayId),
      serviceFee: Number(serviceFee) || 0,
    })
      .then(() => {
        toast.success("Bill created");
        setCustomerId("");
        setTreatmentDayId("");
      })
      .catch((e) => toast.error(e?.message || "Failed"))
      .finally(() => setCreating(false));
  }, [branchId, courseId, customerId, treatmentDayId, serviceFee]);

  const handleInternalOrder = useCallback(
    (items: { variantId: number; requestedQty: number; dosageMl?: number }[]) => {
      if (!branchId || !courseId || !summary?.currentDay) return;
      setCreating(true);
      staffClinicInternalOrderCreate(branchId, {
        treatmentCourseId: Number(courseId),
        treatmentDayItemId: items[0] ? summary.todayDueItems?.find((i: any) => i.variantId === items[0].variantId)?.treatmentDayItemId : undefined,
        requestReason: "No open vial for treatment day",
        items: items.map((i) => ({ variantId: i.variantId, requestedQty: i.requestedQty })),
      })
        .then(() => {
          toast.success("Internal order created");
          loadSummary();
        })
        .catch((e) => toast.error(e?.message || "Failed"))
        .finally(() => setCreating(false));
    },
    [branchId, courseId, summary, loadSummary]
  );

  if (isLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" />
      </div>
    );
  }
  if (!hasAccess) {
    return <AccessDenied missingPerm="clinic.billing.view" onBack={() => window.history.back()} />;
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <h1 className="h4 mb-4">Treatment Billing</h1>
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-md-4">
              <label className="form-label small">Treatment Course ID</label>
              <input
                type="number"
                className="form-control"
                placeholder="Course ID"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={loadSummary}
                disabled={!courseId || loading}
              >
                {loading ? "Loading…" : "Load summary"}
              </button>
            </div>
          </div>
        </div>
      </div>
      {summary && (
        <>
          <div className="card mb-4">
            <div className="card-header">
              <strong>Course</strong> #{summary.course?.id} — Patient: {summary.course?.patient?.profile?.displayName ?? "-"}
              {summary.currentDay && (
                <span className="ms-2 badge bg-info">
                  Day {summary.currentDay.dayNumber} — {summary.expectedMedicineCount} medicines due
                </span>
              )}
            </div>
            <div className="card-body">
              {summary.todayDueItems?.length === 0 && (
                <p className="text-muted mb-0">No medicines due today for this course.</p>
              )}
              {summary.todayDueItems?.length > 0 && (
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Dose (mL)</th>
                      <th>Open vial</th>
                      <th>Unit price</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.todayDueItems.map((row: any) => (
                      <tr key={row.treatmentDayItemId ?? row.variantId}>
                        <td>{row.medicineName}</td>
                        <td>{row.dosageMl}</td>
                        <td>
                          {row.openVial?.available ? (
                            <span className="badge bg-success">
                              Yes — {row.openVial.remainingMl} mL left
                            </span>
                          ) : (
                            <span className="badge bg-warning">No open vial</span>
                          )}
                        </td>
                        <td>{row.unitPrice ?? 0}</td>
                        <td>
                          {!row.openVial?.available && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              disabled={creating}
                              onClick={() =>
                                handleInternalOrder([
                                  {
                                    variantId: row.variantId,
                                    requestedQty: 1,
                                    dosageMl: row.dosageMl,
                                  },
                                ])
                              }
                            >
                              Create internal order
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="mb-0 mt-2">
                <strong>Total amount:</strong> {summary.totalAmount ?? 0}
              </p>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h6 className="card-title">Create bill for today</h6>
              <div className="row g-2">
                <div className="col-md-3">
                  <label className="form-label small">Customer ID</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label small">Treatment Day ID</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={treatmentDayId}
                    onChange={(e) => setTreatmentDayId(e.target.value)}
                    placeholder={summary.currentDay?.id}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label small">Service fee</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={serviceFee}
                    onChange={(e) => setServiceFee(e.target.value)}
                  />
                </div>
                <div className="col-md-2 d-flex align-items-end">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleCreateBill}
                    disabled={creating}
                  >
                    {creating ? "Creating…" : "Create bill"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
