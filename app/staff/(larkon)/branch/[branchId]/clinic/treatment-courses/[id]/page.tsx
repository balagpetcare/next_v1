"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicTreatmentCourseSchedule,
  staffClinicTreatmentCourseHold,
  staffClinicTreatmentCourseResume,
  staffClinicTreatmentCourseStop,
} from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { toast } from "react-toastify";

const PERMS = ["medicine.dose.read", "medicine.dose.record"];

export default function TreatmentCourseDetailPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const courseId = useMemo(() => Number(params?.id), [params.id]);
  const { branch, myAccess, isLoading } = useBranchContext(branchId);
  const hasAccess = (myAccess?.permissions as string[] || []).some((p: string) => PERMS.includes(p));

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(() => {
    if (!branchId || !courseId) return;
    setLoading(true);
    staffClinicTreatmentCourseSchedule(branchId, courseId)
      .then(setCourse)
      .catch(() => setCourse(null))
      .finally(() => setLoading(false));
  }, [branchId, courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const hold = () => {
    if (!branchId || !courseId) return;
    setActing(true);
    staffClinicTreatmentCourseHold(branchId, courseId)
      .then(() => {
        toast.success("Course on hold");
        load();
      })
      .catch((e) => toast.error(e?.message || "Failed"))
      .finally(() => setActing(false));
  };

  const resume = () => {
    if (!branchId || !courseId) return;
    setActing(true);
    staffClinicTreatmentCourseResume(branchId, courseId)
      .then(() => {
        toast.success("Course resumed");
        load();
      })
      .catch((e) => toast.error(e?.message || "Failed"))
      .finally(() => setActing(false));
  };

  const stop = () => {
    if (!branchId || !courseId) return;
    if (!window.confirm("Stop this treatment course?")) return;
    setActing(true);
    staffClinicTreatmentCourseStop(branchId, courseId)
      .then(() => {
        toast.success("Course stopped");
        load();
      })
      .catch((e) => toast.error(e?.message || "Failed"))
      .finally(() => setActing(false));
  };

  if (isLoading) return <div className="container py-40 text-center"><div className="spinner-border text-primary" /></div>;
  if (!hasAccess) return <AccessDenied missingPerm="medicine.dose.read" onBack={() => window.history.back()} />;
  if (loading && !course) return <div className="container py-40 text-center"><div className="spinner-border text-primary" /></div>;
  if (!course) return <div className="container py-24"><p className="text-muted">Course not found.</p><Link href={`/staff/branch/${branchId}/clinic/treatment-courses`}>Back to list</Link></div>;

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex justify-content-between align-items-center mb-4">
        <nav aria-label="breadcrumb">
          <Link href={`/staff/branch/${branchId}/clinic/treatment-courses`} className="text-decoration-none">Treatment courses</Link>
          <span className="mx-2">/</span>
          <span>Course #{course.id}</span>
        </nav>
        <div className="d-flex gap-2">
          {course.status === "ACTIVE" && (
            <>
              <button type="button" className="btn btn-outline-warning btn-sm" onClick={hold} disabled={acting}>Hold</button>
              <button type="button" className="btn btn-outline-danger btn-sm" onClick={stop} disabled={acting}>Stop</button>
            </>
          )}
          {course.status === "HOLD" && (
            <button type="button" className="btn btn-outline-success btn-sm" onClick={resume} disabled={acting}>Resume</button>
          )}
          <Link href={`/staff/branch/${branchId}/clinic/treatment-billing`} className="btn btn-primary btn-sm">
            Billing
          </Link>
        </div>
      </div>
      <div className="card mb-4">
        <div className="card-body">
          <p className="mb-1"><strong>Patient:</strong> {course.patient?.profile?.displayName ?? `#${course.patientId}`}</p>
          <p className="mb-1"><strong>Status:</strong> <span className={`badge bg-${course.status === "ACTIVE" ? "success" : course.status === "HOLD" ? "warning" : "secondary"}`}>{course.status}</span></p>
          <p className="mb-0"><strong>Duration:</strong> {course.durationDays ?? "-"} days</p>
        </div>
      </div>
      <div className="card">
        <div className="card-header">Day-wise schedule</div>
        <div className="card-body">
          {course.days?.length === 0 ? (
            <p className="text-muted mb-0">No days defined.</p>
          ) : (
            <div className="accordion" id="daysAccordion">
              {course.days?.map((day: any) => (
                <div className="accordion-item" key={day.id}>
                  <h2 className="accordion-header">
                    <button
                      className="accordion-button collapsed"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target={`#day-${day.id}`}
                    >
                      Day {day.dayNumber} — {day.scheduledDate} — {day.items?.length ?? 0} items
                    </button>
                  </h2>
                  <div id={`day-${day.id}`} className="accordion-collapse collapse" data-bs-parent="#daysAccordion">
                    <div className="accordion-body">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Medicine</th>
                            <th>Dose (mL)</th>
                            <th>Route</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(day.items ?? []).map((item: any) => (
                            <tr key={item.id}>
                              <td>{item.medicineName ?? item.variant?.title}</td>
                              <td>{item.dosageMl}</td>
                              <td>{item.route ?? "-"}</td>
                              <td><span className="badge bg-secondary">{item.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
