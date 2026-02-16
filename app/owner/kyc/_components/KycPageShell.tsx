"use client";

import Link from "next/link";

const STEPS = [
  { id: 1, label: "Identity & Address" },
  { id: 2, label: "Documents" },
  { id: 3, label: "Review & Submit" },
];

export interface KycPageShellProps {
  step: number;
  onStepChange: (step: number) => void;
  step2Enabled: boolean;
  step3Enabled: boolean;
  status: string;
  statusBadgeClass: string;
  error?: string;
  message?: string;
  rejectionReason?: string;
  reviewNote?: string;
  locked?: boolean;
  children: React.ReactNode;
}

export default function KycPageShell({
  step,
  onStepChange,
  step2Enabled,
  step3Enabled,
  status,
  statusBadgeClass,
  error,
  message,
  rejectionReason,
  reviewNote,
  locked,
  children,
}: KycPageShellProps) {
  return (
    <div className="container-fluid">
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-12 mb-16">
        <div>
          <h4 className="mb-6">Owner KYC Verification</h4>
          <div className="text-secondary-light text-sm">
            Complete identity, address, and document upload. After approval, details are read-only.
          </div>
          {["SUBMITTED", "VERIFIED", "APPROVED", "REQUEST_CHANGES"].includes(status) && (
            <div className="mt-10">
              <Link href="/owner/dashboard" className="btn btn-primary btn-sm radius-12">
                Go to Dashboard
              </Link>
            </div>
          )}
        </div>
        <div className="d-flex align-items-center gap-10">
          <span className="text-sm text-secondary-light">Status</span>
          <span className={`badge radius-16 px-12 py-6 fw-semibold ${statusBadgeClass}`}>{status}</span>
        </div>
      </div>

      {error && (
        <div className="border border-danger-200 bg-danger-50 text-danger-700 radius-12 p-12 mb-16" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="border border-success-200 bg-success-50 text-success-700 radius-12 p-12 mb-16" role="status">
          {message}
        </div>
      )}

      {locked && (
        <div className="border border-success-200 bg-success-50 text-success-700 radius-12 p-12 mb-16">
          Your KYC is <b>{status}</b>. Everything is locked (view-only).
        </div>
      )}
      {(status === "REJECTED" || status === "REQUEST_CHANGES") && (rejectionReason || reviewNote) && (
        <div className="border border-danger-200 bg-danger-50 text-danger-700 radius-12 p-12 mb-16">
          <div className="fw-semibold mb-8">KYC was rejected or changes requested</div>
          {rejectionReason && <div><b>Reason:</b> {rejectionReason}</div>}
          {reviewNote && <div className="mt-4"><b>Note:</b> {reviewNote}</div>}
          <div className="mt-8">Update your information or documents and submit again.</div>
        </div>
      )}

      <div className="card border radius-16 mb-16">
        <div className="card-body p-16">
          <div className="mb-12">
            <div className="d-flex justify-content-between text-sm text-secondary-light mb-6">
              <span>Step {step} of {STEPS.length}</span>
              <span>{Math.round((step / STEPS.length) * 100)}%</span>
            </div>
            <div className="progress radius-12" style={{ height: 8 }}>
              <div
                className="progress-bar bg-primary"
                role="progressbar"
                style={{ width: `${(step / STEPS.length) * 100}%` }}
                aria-valuenow={(step / STEPS.length) * 100}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-10">
            <div className="d-flex align-items-center gap-10 flex-wrap">
              {STEPS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`btn radius-12 ${step === s.id ? "btn-primary" : "btn-light"}`}
                  onClick={() => {
                    if (s.id === 2 && !step2Enabled) return;
                    if (s.id === 3 && !step3Enabled) return;
                    onStepChange(s.id);
                  }}
                  disabled={
                    (s.id === 2 && !step2Enabled) || (s.id === 3 && !step3Enabled)
                  }
                >
                  {s.id} {s.label}
                </button>
              ))}
            </div>
            <div className="text-sm text-secondary-light">
              {!step2Enabled && "Save Step 1 to unlock Documents"}
              {step2Enabled && !step3Enabled && "Upload required docs to unlock Review"}
              {step3Enabled && "Complete declarations and submit"}
            </div>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
