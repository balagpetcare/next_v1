"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicDoctors,
  ownerClinicDoctorInvite,
  type ClinicDoctorListItem,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

export default function ClinicDoctorsPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [branchName, setBranchName] = useState("");
  const [doctors, setDoctors] = useState<ClinicDoctorListItem[]>([]);
  const [contractStatusFilter, setContractStatusFilter] = useState<string>("");
  const [onboardingFilter, setOnboardingFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    phone: "",
    displayName: "",
    roleInClinic: "",
    defaultConsultationFee: "" as string | number,
    scheduleEditPolicy: "",
    message: "",
  });

  const loadDoctors = useCallback(async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError("");
      const data = await ownerClinicDoctors(branchId, contractStatusFilter ? { contractStatus: contractStatusFilter } : undefined);
      setBranchName(data?.branch?.name ?? `Branch #${branchId}`);
      setDoctors(Array.isArray(data?.doctors) ? data.doctors : []);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load doctors");
    } finally {
      setLoading(false);
    }
  }, [branchId, contractStatusFilter]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) return;
    setInviteSubmitting(true);
    setInviteError("");
    setInviteSuccess(false);
    try {
      await ownerClinicDoctorInvite(branchId, {
        email: inviteForm.email || undefined,
        phone: inviteForm.phone || undefined,
        displayName: inviteForm.displayName || undefined,
        roleInClinic: inviteForm.roleInClinic || undefined,
        defaultConsultationFee: inviteForm.defaultConsultationFee === "" ? undefined : Number(inviteForm.defaultConsultationFee),
        scheduleEditPolicy: inviteForm.scheduleEditPolicy || undefined,
        message: inviteForm.message || undefined,
      });
      setInviteSuccess(true);
      setInviteForm({ email: "", phone: "", displayName: "", roleInClinic: "", defaultConsultationFee: "", scheduleEditPolicy: "", message: "" });
      await loadDoctors();
      setTimeout(() => {
        setInviteOpen(false);
        setInviteSuccess(false);
      }, 1500);
    } catch (err) {
      setInviteError((err as Error)?.message || "Invite failed");
    } finally {
      setInviteSubmitting(false);
    }
  };

  if (!branchId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Manage doctors"
        subtitle={branchName}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Doctors", href: `/owner/clinic/${branchId}/doctors` },
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <select
          className="form-select form-select-sm w-auto radius-12"
          value={onboardingFilter}
          onChange={(e) => setOnboardingFilter(e.target.value)}
        >
          <option value="">All onboarding</option>
          <option value="PENDING">Pending onboarding</option>
          <option value="COMPLETED">Completed onboarding</option>
        </select>
        <select
          className="form-select form-select-sm w-auto radius-12"
          value={contractStatusFilter}
          onChange={(e) => setContractStatusFilter(e.target.value)}
        >
          <option value="">All contract statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="ENDED">Ended</option>
        </select>
        <button
          type="button"
          className="btn btn-primary radius-12"
          onClick={() => setInviteOpen(true)}
        >
          <i className="ri-user-add-line me-1" />
          Invite doctor
        </button>
      </div>

      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status" />
          </div>
        </div>
      ) : (() => {
        const filteredDoctors = onboardingFilter
          ? doctors.filter((d) => (d.profile?.onboardingStatus ?? "PENDING") === onboardingFilter)
          : doctors;
        return filteredDoctors.length === 0 ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <i className="ri-stethoscope-line fs-1 text-muted mb-3 d-block" />
            <h5 className="mb-3">No doctors assigned</h5>
            <p className="text-muted mb-4">
              Invite a doctor to this clinic branch. They will receive an invite to join and set up their profile.
            </p>
            <button
              type="button"
              className="btn btn-primary radius-12"
              onClick={() => setInviteOpen(true)}
            >
              <i className="ri-user-add-line me-1" />
              Invite doctor
            </button>
          </div>
        </div>
      ) : (
        <div className="card radius-12">
          <div className="card-body p-24">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contract</th>
                    <th>Verification</th>
                    <th>Fees</th>
                    <th>Schedule policy</th>
                    <th>Status</th>
                    <th>Contact</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDoctors.map((d) => (
                    <tr key={d.member.id}>
                      <td className="fw-semibold">
                        {d.member.user?.profile?.displayName ?? `User #${d.member.userId}`}
                      </td>
                      <td>
                        <span className={`badge radius-8 ${d.profile.contractStatus === "ACTIVE" ? "bg-success" : d.profile.contractStatus === "PENDING" ? "bg-warning" : "bg-secondary"}`}>
                          {d.profile.contractStatus ?? "—"}
                        </span>
                        {d.profile.roleInClinic && (
                          <span className="ms-1 text-muted small">{d.profile.roleInClinic}</span>
                        )}
                        {d.profile.onboardingStatus === "PENDING" && (
                          <span className="badge bg-warning-subtle text-warning radius-8 ms-1" title="Setup incomplete">Onboarding</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge radius-8 ${(d.verificationStatus ?? d.member.user?.verificationStatus) === "VERIFIED" ? "bg-success" : (d.verificationStatus ?? d.member.user?.verificationStatus) === "PENDING" ? "bg-warning" : "bg-secondary"}`}>
                          {(d.verificationStatus ?? d.member.user?.verificationStatus) ?? "—"}
                        </span>
                      </td>
                      <td className="small">
                        {d.profile.followUpFee != null && <span className="me-2">Follow-up: {d.profile.followUpFee}</span>}
                        {d.profile.emergencyFee != null && <span>Emergency: {d.profile.emergencyFee}</span>}
                        {d.profile.followUpFee == null && d.profile.emergencyFee == null && "—"}
                      </td>
                      <td className="small">{d.profile.scheduleEditPolicy ?? "—"}</td>
                      <td>
                        <span className={`badge radius-8 ${d.member.status === "ACTIVE" ? "bg-success" : "bg-secondary"}`}>
                          {d.member.status}
                        </span>
                      </td>
                      <td className="text-muted small">
                        {d.member.user?.auth?.email ?? d.member.user?.auth?.phone ?? "—"}
                      </td>
                      <td>
                        <Link
                          href={`/owner/clinic/${branchId}/doctors/${d.member.id}`}
                          className="btn btn-sm btn-outline-primary radius-12"
                        >
                          View / Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        );
      })()}

      {inviteOpen && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h5 className="modal-title">Invite doctor</h5>
                <button type="button" className="btn-close" onClick={() => setInviteOpen(false)} aria-label="Close" />
              </div>
              <form onSubmit={handleInviteSubmit}>
                <div className="modal-body">
                  {inviteError && (
                    <div className="alert alert-danger radius-12 mb-3">
                      <i className="ri-error-warning-line me-2" />
                      {inviteError}
                    </div>
                  )}
                  {inviteSuccess && (
                    <div className="alert alert-success radius-12 mb-3">
                      <i className="ri-check-line me-2" />
                      Invite sent successfully.
                    </div>
                  )}
                  <p className="text-muted small mb-3">Provide at least email or phone. The doctor will receive an invite to join this clinic.</p>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control radius-12"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="doctor@example.com"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Phone</label>
                    <input
                      type="text"
                      className="form-control radius-12"
                      value={inviteForm.phone}
                      onChange={(e) => setInviteForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Display name</label>
                    <input
                      type="text"
                      className="form-control radius-12"
                      value={inviteForm.displayName}
                      onChange={(e) => setInviteForm((f) => ({ ...f, displayName: e.target.value }))}
                      placeholder="Dr. Jane Smith"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Role in clinic (optional)</label>
                    <input
                      type="text"
                      className="form-control radius-12"
                      value={inviteForm.roleInClinic}
                      onChange={(e) => setInviteForm((f) => ({ ...f, roleInClinic: e.target.value }))}
                      placeholder="e.g. Consulting vet"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Default consultation fee (optional)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="form-control radius-12"
                      value={inviteForm.defaultConsultationFee}
                      onChange={(e) => setInviteForm((f) => ({ ...f, defaultConsultationFee: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Schedule edit policy (optional)</label>
                    <select
                      className="form-select radius-12"
                      value={inviteForm.scheduleEditPolicy}
                      onChange={(e) => setInviteForm((f) => ({ ...f, scheduleEditPolicy: e.target.value }))}
                    >
                      <option value="">—</option>
                      <option value="CLINIC_ONLY">Clinic only</option>
                      <option value="DOCTOR_PROPOSE_CLINIC_APPROVES">Doctor proposes, clinic approves</option>
                      <option value="DOCTOR_EDIT">Doctor can edit</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Personal message (optional)</label>
                    <textarea
                      className="form-control radius-12"
                      rows={2}
                      value={inviteForm.message}
                      onChange={(e) => setInviteForm((f) => ({ ...f, message: e.target.value }))}
                      placeholder="Add a note for the invite email"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary radius-12" onClick={() => setInviteOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary radius-12" disabled={inviteSubmitting || (!inviteForm.email && !inviteForm.phone)}>
                    {inviteSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" />
                        Sending…
                      </>
                    ) : (
                      "Send invite"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
