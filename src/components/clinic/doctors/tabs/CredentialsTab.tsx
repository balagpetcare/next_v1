"use client";

import DoctorStatusBadgeGroup from "../DoctorStatusBadgeGroup";

type Props = {
  branchId: string;
  memberId: number;
  credentials: any;
  loading?: boolean;
  permissions: string[];
};

function licenseStatusVariant(expiryDate: string | null, licenseStatus: string): string {
  if (licenseStatus === "EXPIRED" || licenseStatus === "REVOKED") return "bg-danger-subtle text-danger-emphasis";
  if (licenseStatus === "SUSPENDED") return "bg-warning-subtle text-warning-emphasis";
  if (expiryDate) {
    const exp = new Date(expiryDate);
    const now = new Date();
    const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    if (daysLeft <= 0) return "bg-danger-subtle text-danger-emphasis";
    if (daysLeft <= 30) return "bg-warning-subtle text-warning-emphasis";
  }
  return "bg-success-subtle text-success-emphasis";
}

export default function CredentialsTab({ credentials, loading }: Props) {
  if (loading) {
    return (
      <div className="card radius-12">
        <div className="card-body text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="text-muted mt-2 mb-0">Loading credentials...</p>
        </div>
      </div>
    );
  }

  const status = credentials?.verificationStatus ?? "PENDING";
  const licenses = credentials?.licenses ?? [];
  const documents = credentials?.documents ?? [];
  const qualifications = credentials?.qualifications ?? [];
  const specializationTags = credentials?.specializationTags ?? [];
  const reviewNote = credentials?.reviewNote;

  return (
    <>
      <div className="card radius-12 mb-3">
        <div className="card-body">
          <h6 className="mb-2">Verification status</h6>
          <DoctorStatusBadgeGroup status={status} />
          {credentials?.submittedAt && (
            <p className="text-muted small mt-2 mb-0">Submitted: {new Date(credentials.submittedAt).toLocaleDateString()}</p>
          )}
          {credentials?.reviewedAt && (
            <p className="text-muted small mb-0">Reviewed: {new Date(credentials.reviewedAt).toLocaleDateString()}</p>
          )}
        </div>
      </div>

      {Array.isArray(specializationTags) && specializationTags.length > 0 && (
        <div className="card radius-12 mb-3">
          <div className="card-body">
            <h6 className="mb-2">Specialization</h6>
            <div className="d-flex flex-wrap gap-1">
              {specializationTags.map((tag: string, i: number) => (
                <span key={i} className="badge bg-primary-subtle text-primary-emphasis radius-8">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {Array.isArray(qualifications) && qualifications.length > 0 && (
        <div className="card radius-12 mb-3">
          <div className="card-body">
            <h6 className="mb-2">Qualifications</h6>
            <ul className="list-unstyled mb-0 small">
              {qualifications.map((q: any, i: number) => (
                <li key={i} className="mb-1">
                  {q.degree ?? "—"}
                  {q.university ? `, ${q.university}` : ""}
                  {q.year ? ` (${q.year})` : ""}
                  {q.country ? `, ${q.country}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {reviewNote && (
        <div className="card radius-12 mb-3 border-warning">
          <div className="card-body">
            <h6 className="mb-2">Review comments</h6>
            <p className="small mb-0 text-muted">{reviewNote}</p>
          </div>
        </div>
      )}

      {licenses.length > 0 && (
        <div className="card radius-12 mb-3">
          <div className="card-body">
            <h6 className="mb-3">Licenses</h6>
            <div className="row g-2">
              {licenses.map((lic: any) => {
                const exp = lic.expiryDate ? new Date(lic.expiryDate) : null;
                const isExpired = exp && exp < new Date();
                const daysLeft = exp ? Math.ceil((exp.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null;
                return (
                  <div key={lic.id} className="col-12 col-md-6">
                    <div className="border rounded-3 p-3">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <span className="fw-semibold small">{lic.regulatoryBody?.name ?? "License"}</span>
                          <p className="mb-1 small text-muted">{lic.licenseNumber}</p>
                          {lic.issueDate && <p className="mb-0 small">Issue: {new Date(lic.issueDate).toLocaleDateString()}</p>}
                          {lic.expiryDate && (
                            <p className={`mb-0 small ${isExpired ? "text-danger" : ""}`}>
                              Expiry: {new Date(lic.expiryDate).toLocaleDateString()}
                              {daysLeft != null && !isExpired && daysLeft <= 30 && (
                                <span className="text-warning"> ({daysLeft} days left)</span>
                              )}
                            </p>
                          )}
                        </div>
                        <span className={`badge radius-8 ${licenseStatusVariant(lic.expiryDate, lic.licenseStatus ?? "ACTIVE")}`}>
                          {lic.licenseStatus ?? "ACTIVE"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="card radius-12">
        <div className="card-body">
          <h6 className="mb-3">Documents</h6>
          {documents.length ? (
            <ul className="list-unstyled mb-0">
              {documents.map((d: any, i: number) => (
                <li key={d.id ?? i} className="mb-2 d-flex justify-content-between align-items-center">
                  <span>{d.documentType ?? "Document"}</span>
                  <span className="badge bg-secondary-subtle text-secondary-emphasis radius-8">{d.verificationStatus ?? "—"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted small mb-0">No credential documents on file.</p>
          )}
        </div>
      </div>
    </>
  );
}
