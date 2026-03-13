"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffDoctorInvite } from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace, LoadingState } from "@/src/components/dashboard";

const STEPS = ["Basic Identity", "Professional Info", "Branch Assignment", "Credentials", "Review & Submit"];
const DOCTORS_PERMS = ["clinic.doctors.invite"];

export default function StaffClinicDoctorsInvitePage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    gender: "",
    qualification: "",
    registrationNumber: "",
    speciality: "",
    yearsExperience: "",
    roleInClinic: "CONSULTANT",
    defaultConsultationFee: "",
    note: "",
  });

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = DOCTORS_PERMS.some((p) => permissions.includes(p));

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await staffDoctorInvite(branchId, {
        name: form.name,
        phone: form.mobile,
        email: form.email,
        roleKey: form.roleInClinic,
        defaultConsultationFee: form.defaultConsultationFee ? Number(form.defaultConsultationFee) : undefined,
        note: form.note,
      });
      router.push(`/staff/branch/${branchId}/clinic/doctors`);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to send invite");
    } finally {
      setLoading(false);
    }
  }, [branchId, form, router]);

  if (ctxLoading) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading..." />
      </PageWorkspace>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="clinic.doctors.invite"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic/doctors`)}
      />
    );
  }

  return (
    <PageWorkspace>
      <div className="row g-0">
        <div className="col-12">
          <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <Link href={`/staff/branch/${branchId}/clinic/doctors`} className="btn btn-outline-secondary btn-sm radius-8">← Doctors</Link>
            <h5 className="mb-0">Invite Doctor</h5>
          </div>
          <div className="card radius-12 mb-3">
        <div className="card-body">
          <div className="d-flex gap-2 mb-4">
            {STEPS.map((label, i) => (
              <span
                key={i}
                className={`badge radius-8 ${i <= step ? "bg-primary" : "bg-secondary-subtle text-secondary-emphasis"}`}
              >
                {i + 1}. {label}
              </span>
            ))}
          </div>

          {step === 0 && (
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label">Full name</label><input type="text" className="form-control" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
              <div className="col-md-6"><label className="form-label">Mobile</label><input type="text" className="form-control" value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} /></div>
              <div className="col-md-6"><label className="form-label">Email</label><input type="email" className="form-control" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
              <div className="col-md-6"><label className="form-label">Gender</label><select className="form-select" value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}><option value="">—</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></div>
            </div>
          )}

          {step === 1 && (
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label">Qualification</label><input type="text" className="form-control" value={form.qualification} onChange={(e) => setForm((f) => ({ ...f, qualification: e.target.value }))} /></div>
              <div className="col-md-6"><label className="form-label">Registration number</label><input type="text" className="form-control" value={form.registrationNumber} onChange={(e) => setForm((f) => ({ ...f, registrationNumber: e.target.value }))} /></div>
              <div className="col-md-6"><label className="form-label">Speciality</label><input type="text" className="form-control" value={form.speciality} onChange={(e) => setForm((f) => ({ ...f, speciality: e.target.value }))} /></div>
              <div className="col-md-6"><label className="form-label">Years of experience</label><input type="text" className="form-control" value={form.yearsExperience} onChange={(e) => setForm((f) => ({ ...f, yearsExperience: e.target.value }))} /></div>
            </div>
          )}

          {step === 2 && (
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label">Role in clinic</label><select className="form-select" value={form.roleInClinic} onChange={(e) => setForm((f) => ({ ...f, roleInClinic: e.target.value }))}><option value="CONSULTANT">Consultant</option><option value="SURGEON">Surgeon</option><option value="VISITING">Visiting</option></select></div>
              <div className="col-md-6"><label className="form-label">Default consultation fee (BDT)</label><input type="number" className="form-control" value={form.defaultConsultationFee} onChange={(e) => setForm((f) => ({ ...f, defaultConsultationFee: e.target.value }))} /></div>
            </div>
          )}

          {step === 3 && (
            <p className="text-muted small mb-0">Credential upload can be done after the doctor accepts the invite.</p>
          )}

          {step === 4 && (
            <div>
              <p className="mb-2"><strong>Name:</strong> {form.name}</p>
              <p className="mb-2"><strong>Contact:</strong> {form.mobile} {form.email}</p>
              <p className="mb-2"><strong>Role:</strong> {form.roleInClinic} | Fee: {form.defaultConsultationFee ? `BDT ${form.defaultConsultationFee}` : "—"}</p>
              <label className="form-label">Internal note</label>
              <textarea className="form-control" rows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
          )}

          {error && <div className="alert alert-danger radius-12 mt-3">{error}</div>}

          <div className="d-flex justify-content-between mt-4">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              Previous
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setStep((s) => s + 1)}>
                Next
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={loading}>
                {loading ? "Submitting..." : "Submit for approval"}
              </button>
            )}
          </div>
        </div>
      </div>
        </div>
      </div>
    </PageWorkspace>
  );
}
