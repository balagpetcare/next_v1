"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicTreatmentBillingSummary,
  staffClinicTreatmentDayBillCreate,
  staffClinicInternalOrderCreate,
  staffClinicOpenVialAvailability,
  staffClinicGenerateInjectionToken,
} from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace } from "@/src/components/dashboard";
import { toast } from "react-toastify";

const PERMS = ["clinic.billing.view", "medicine.dose.read", "medicine.dose.record", "injection.token.generate"];

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
  const [visitId, setVisitId] = useState("");
  const [serviceFee, setServiceFee] = useState("0");
  const [lastCreatedOrder, setLastCreatedOrder] = useState<{ id: number; orderNumber?: string } | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);

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
    setLastCreatedOrder(null);
    staffClinicTreatmentDayBillCreate(branchId, Number(courseId), {
      customerId: Number(customerId),
      treatmentDayId: Number(treatmentDayId),
      serviceFee: Number(serviceFee) || 0,
      visitId: visitId ? Number(visitId) : null,
    })
      .then((order: any) => {
        toast.success("Bill created");
        if (order?.id) setLastCreatedOrder({ id: order.id, orderNumber: order.orderNumber });
      })
      .catch((e) => toast.error(e?.message || "Failed"))
      .finally(() => setCreating(false));
  }, [branchId, courseId, customerId, treatmentDayId, serviceFee, visitId]);

  const canGenerateToken = (myAccess?.permissions as string[] || []).includes("injection.token.generate");
  const handleGenerateToken = useCallback(async () => {
    if (!branchId || !summary || !lastCreatedOrder?.id) return;
    const visitIdNum = visitId ? Number(visitId) : (summary.course as any)?.visitId ?? null;
    if (!visitIdNum) {
      toast.error("Visit ID is required for token generation. Enter it above and create the bill, or use Injection Tokens page.");
      return;
    }
    const course = summary.course as any;
    const patientId = course?.patientId ?? customerId;
    const petId = course?.visit?.petId ?? course?.petId ?? null;
    const currentDay = summary.currentDay as any;
    const dayId = currentDay?.id ?? treatmentDayId ? Number(treatmentDayId) : null;
    if (!dayId) {
      toast.error("Treatment day context missing.");
      return;
    }
    setGeneratingToken(true);
    let ok = 0;
    const items = summary.todayDueItems || [];
    for (const row of items) {
      try {
        await staffClinicGenerateInjectionToken(branchId, {
          visitId: visitIdNum,
          variantId: row.variantId,
          expectedDose: Number(row.dosageMl) || 1,
          orderId: lastCreatedOrder.id,
          patientId: patientId ? Number(patientId) : undefined,
          petId: petId ? Number(petId) : undefined,
          treatmentCourseId: Number(courseId),
          treatmentDayId: Number(dayId),
          unit: "ml",
        });
        ok += 1;
      } catch (e) {
        toast.error((e as Error)?.message || `Failed to generate token for ${row.medicineName}`);
      }
    }
    if (ok > 0) toast.success(ok === items.length ? "All tokens generated." : `${ok} token(s) generated.`);
    setGeneratingToken(false);
  }, [branchId, summary, lastCreatedOrder, visitId, customerId, treatmentDayId, courseId]);

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
      <div className="py-40 px-3 text-center">
        <div className="spinner-border text-primary" />
      </div>
    );
  }
  if (!hasAccess) {
    return <AccessDenied missingPerm="clinic.billing.view" onBack={() => window.history.back()} />;
  }

  return (
    <PageWorkspace>
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
                <div className="col-md-2">
                  <label className="form-label small">Customer ID</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                  />
                </div>
                <div className="col-md-2">
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
                  <label className="form-label small">Visit ID (for token)</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={visitId}
                    onChange={(e) => setVisitId(e.target.value)}
                    placeholder="Optional"
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
              {lastCreatedOrder && (
                <div className="mt-3 p-2 bg-light radius-8">
                  <span className="small fw-semibold">Order #{lastCreatedOrder.orderNumber ?? lastCreatedOrder.id} created.</span>
                  {canGenerateToken && (
                    <button
                      type="button"
                      className="btn btn-sm btn-success ms-2"
                      onClick={handleGenerateToken}
                      disabled={generatingToken || !summary.todayDueItems?.length}
                    >
                      {generatingToken ? "Generating…" : "Generate injection token(s)"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </PageWorkspace>
  );
}
