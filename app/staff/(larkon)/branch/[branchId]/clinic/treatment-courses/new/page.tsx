"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffClinicTreatmentCourseCreateFull } from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { toast } from "react-toastify";

const PERMS = ["medicine.dose.record"];

export default function NewTreatmentCoursePage() {
  const params = useParams();
  const router = useRouter();
  const branchId = String(params?.branchId ?? "");
  const { branch, myAccess, isLoading } = useBranchContext(branchId);
  const hasAccess = (myAccess?.permissions as string[] || []).includes("medicine.dose.record");

  const [patientId, setPatientId] = useState("");
  const [durationDays, setDurationDays] = useState("7");
  const [visitId, setVisitId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dayItems, setDayItems] = useState<{ dayNumber: number; scheduledDate: string; variantId: number; medicineName: string; dosageMl: number; route?: string }[]>([]);

  const addDay = () => {
    const dayNum = dayItems.length + 1;
    const d = new Date();
    d.setDate(d.getDate() + dayNum - 1);
    setDayItems([
      ...dayItems,
      {
        dayNumber: dayNum,
        scheduledDate: d.toISOString().slice(0, 10),
        variantId: 0,
        medicineName: "",
        dosageMl: 0,
      },
    ]);
  };

  const updateDay = (idx: number, field: string, value: any) => {
    const next = [...dayItems];
    (next[idx] as any)[field] = value;
    setDayItems(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !durationDays || dayItems.length === 0) {
      toast.error("Patient ID, duration and at least one day item required");
      return;
    }
    const daysMap: Record<number, { dayNumber: number; scheduledDate: string; items: any[] }> = {};
    for (const row of dayItems) {
      if (!daysMap[row.dayNumber]) {
        daysMap[row.dayNumber] = {
          dayNumber: row.dayNumber,
          scheduledDate: row.scheduledDate,
          items: [],
        };
      }
      daysMap[row.dayNumber].items.push({
        variantId: row.variantId,
        medicineName: row.medicineName,
        dosageMl: row.dosageMl,
        route: row.route,
      });
    }
    const days = Object.values(daysMap).filter((d) => d.items.some((i) => i.variantId && i.medicineName));
    if (days.length === 0) {
      toast.error("Add at least one medicine per day");
      return;
    }
    setSubmitting(true);
    staffClinicTreatmentCourseCreateFull(branchId, {
      patientId: Number(patientId),
      visitId: visitId ? Number(visitId) : null,
      durationDays: Number(durationDays),
      days,
    })
      .then((data) => {
        toast.success("Treatment course created");
        router.push(`/staff/branch/${branchId}/clinic/treatment-courses/${data?.id ?? ""}`);
      })
      .catch((e) => toast.error(e?.message || "Failed"))
      .finally(() => setSubmitting(false));
  };

  if (isLoading) return <div className="container py-40 text-center"><div className="spinner-border text-primary" /></div>;
  if (!hasAccess) return <AccessDenied missingPerm="medicine.dose.record" onBack={() => router.back()} />;

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <h1 className="h4 mb-4">New treatment course</h1>
      <form onSubmit={handleSubmit} className="card">
        <div className="card-body">
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <label className="form-label">Patient ID *</label>
              <input
                type="number"
                className="form-control"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Visit ID</label>
              <input
                type="number"
                className="form-control"
                value={visitId}
                onChange={(e) => setVisitId(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Duration (days) *</label>
              <input
                type="number"
                className="form-control"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                min={1}
                required
              />
            </div>
          </div>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0">Day-wise items</h6>
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={addDay}>
              Add day
            </button>
          </div>
          {dayItems.length > 0 && (
            <div className="table-responsive mb-4">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Date</th>
                    <th>Variant ID</th>
                    <th>Medicine name</th>
                    <th>Dose (mL)</th>
                    <th>Route</th>
                  </tr>
                </thead>
                <tbody>
                  {dayItems.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.dayNumber}</td>
                      <td>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={row.scheduledDate}
                          onChange={(e) => updateDay(idx, "scheduledDate", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={row.variantId || ""}
                          onChange={(e) => updateDay(idx, "variantId", Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={row.medicineName}
                          onChange={(e) => updateDay(idx, "medicineName", e.target.value)}
                          placeholder="Medicine name"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={row.dosageMl || ""}
                          onChange={(e) => updateDay(idx, "dosageMl", Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={row.route || ""}
                          onChange={(e) => updateDay(idx, "route", e.target.value)}
                          placeholder="e.g. IV"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Creating…" : "Create course"}
          </button>
        </div>
      </form>
    </div>
  );
}
