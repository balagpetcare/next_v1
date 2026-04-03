"use client";

import Link from "next/link";
import { ShieldCheck, Lock, CheckCircle2, AlertCircle, Info } from "lucide-react";

const STEPS = [
  { id: 1, label: "Identity & Address", desc: "Personal details" },
  { id: 2, label: "Documents", desc: "Official IDs" },
  { id: 3, label: "Review & Submit", desc: "Final confirmation" },
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
    <div className="min-vh-100" style={{ background: "linear-gradient(to bottom, #f8fafc 0%, #ffffff 100%)" }}>
      <div className="container-fluid py-4" style={{ maxWidth: 1200 }}>
        {/* Premium Hero Header */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">
            <div className="row align-items-center g-3">
              <div className="col-12 col-lg-8">
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-primary text-white p-3 rounded-3 d-flex align-items-center justify-content-center" style={{ width: 56, height: 56 }}>
                    <ShieldCheck size={32} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="mb-1 fw-bold">Owner Verification Workspace</h3>
                    <div className="d-flex align-items-center gap-2 text-muted">
                      <Lock size={14} />
                      <small>Secure identity verification • Bank-grade encryption</small>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-lg-4">
                <div className="d-flex flex-column align-items-lg-end gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <small className="text-muted fw-medium">Status:</small>
                    <span className={`badge ${statusBadgeClass} px-3 py-2`}>{status}</span>
                  </div>
                  {["SUBMITTED", "VERIFIED", "APPROVED", "REQUEST_CHANGES"].includes(status) && (
                    <Link href="/owner/dashboard" className="btn btn-sm btn-outline-primary">
                      Go to Dashboard
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="alert alert-danger d-flex align-items-start gap-3 mb-4" role="alert">
            <AlertCircle size={20} className="flex-shrink-0 mt-1" />
            <div>
              <div className="fw-semibold mb-1">Action Required</div>
              <div>{error}</div>
            </div>
          </div>
        )}
        {message && (
          <div className="alert alert-success d-flex align-items-start gap-3 mb-4" role="status">
            <CheckCircle2 size={20} className="flex-shrink-0 mt-1" />
            <div>
              <div className="fw-semibold mb-1">Success</div>
              <div>{message}</div>
            </div>
          </div>
        )}

        {locked && (
          <div className="alert alert-info d-flex align-items-start gap-3 mb-4">
            <Lock size={20} className="flex-shrink-0 mt-1" />
            <div>
              <div className="fw-semibold mb-1">Verification Complete</div>
              <div>Your KYC status is <strong>{status}</strong>. All information is safely locked and read-only.</div>
            </div>
          </div>
        )}
        {(status === "REJECTED" || status === "REQUEST_CHANGES") && (rejectionReason || reviewNote) && (
          <div className="alert alert-warning d-flex align-items-start gap-3 mb-4">
            <AlertCircle size={24} className="flex-shrink-0" />
            <div>
              <div className="fw-bold mb-2">Updates Needed for Verification</div>
              {rejectionReason && (
                <div className="mb-2">
                  <strong>Reason:</strong> {rejectionReason}
                </div>
              )}
              {reviewNote && (
                <div className="mb-2">
                  <strong>Reviewer Note:</strong> {reviewNote}
                </div>
              )}
              <small className="text-muted">Please update the required information or documents below and re-submit.</small>
            </div>
          </div>
        )}

        {/* Premium Progress Stepper */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-0">
            {/* Progress Bar */}
            <div className="position-relative" style={{ height: 4, background: "#e9ecef" }}>
              <div
                className="position-absolute top-0 start-0 h-100 bg-primary"
                style={{ 
                  width: `${(step / STEPS.length) * 100}%`,
                  transition: "width 0.3s ease",
                  boxShadow: "0 0 8px rgba(13, 110, 253, 0.4)"
                }}
              />
            </div>
            
            {/* Step Indicators */}
            <div className="p-4">
              <div className="row g-3">
                {STEPS.map((s, idx) => {
                  const isPast = step > s.id;
                  const isCurrent = step === s.id;
                  const isLocked = (s.id === 2 && !step2Enabled) || (s.id === 3 && !step3Enabled);
                  
                  return (
                    <div key={s.id} className="col-12 col-md-4">
                      <div
                        className={`d-flex align-items-center gap-3 p-3 rounded-3 ${isCurrent ? "bg-primary bg-opacity-10" : ""} ${!isLocked && !isCurrent ? "cursor-pointer" : ""}`}
                        style={{ opacity: isLocked ? 0.6 : 1, cursor: isLocked ? "not-allowed" : "pointer" }}
                        onClick={() => !isLocked && onStepChange(s.id)}
                      >
                        <div
                          className={`d-flex align-items-center justify-content-center rounded-circle fw-bold flex-shrink-0 ${
                            isPast ? "bg-success text-white" :
                            isCurrent ? "bg-primary text-white" :
                            "bg-light text-muted"
                          }`}
                          style={{ width: 40, height: 40 }}
                        >
                          {isPast ? <CheckCircle2 size={20} /> : s.id}
                        </div>
                        <div className="flex-grow-1">
                          <div className={`fw-semibold small ${isCurrent ? "text-primary" : isPast ? "text-success" : "text-muted"}`}>
                            {s.label}
                          </div>
                          <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                            {s.desc}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Helper Text */}
              <div className="mt-3 text-center">
                <small className="text-muted d-flex align-items-center justify-content-center gap-2">
                  <Info size={14} />
                  {!step2Enabled && "Save identity details to unlock document upload"}
                  {step2Enabled && !step3Enabled && "Upload all required documents to unlock review step"}
                  {step3Enabled && "Review your information and submit for verification"}
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="position-relative">
          {children}
        </div>
      </div>
    </div>
  );
}
