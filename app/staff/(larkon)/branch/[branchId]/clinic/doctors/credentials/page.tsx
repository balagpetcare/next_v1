"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffDoctorCredentials,
  staffDoctorsEnriched,
  staffDoctorsCredentialsQueue,
} from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import {
  PageWorkspace,
  PageHeader,
  LoadingState,
  SectionCard,
  EmptyState,
} from "@/src/components/dashboard";
import { DoctorOperationsFilterBar, Doctor360Drawer } from "@/src/components/clinic/doctors";
import { doctors, approvals, credentials as credentialsRoute } from "@/src/lib/doctorOperationsRoutes";

function isExpiringSoon(expiryDate: string | null | undefined, days = 30): boolean {
  if (!expiryDate) return false;
  const exp = new Date(expiryDate);
  const now = new Date();
  const diff = (exp.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  return diff >= 0 && diff <= days;
}

const DOCTORS_PERMS = ["clinic.doctors.view", "clinic.doctors.manage_credentials"];

export default function StaffClinicDoctorsCredentialsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const memberIdFromUrl = useMemo(() => {
    const m = searchParams?.get("memberId");
    if (m == null || m === "") return undefined;
    const n = parseInt(m, 10);
    return Number.isNaN(n) ? undefined : n;
  }, [searchParams]);

  const [doctorOptions, setDoctorOptions] = useState<Array<{ memberId: number }>>([]);
  const [queue, setQueue] = useState<{
    missing: any[];
    pending: any[];
    expiringSoon: any[];
    rejected: any[];
    credentialsPending: any[];
    credentialsUnderReview: any[];
    credentialsApproved: any[];
    credentialsRejected: any[];
    credentialsExpiringSoon: any[];
  } | null>(null);
  const [queueLoading, setQueueLoading] = useState(true);
  const [credentials, setCredentials] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [drawerMemberId, setDrawerMemberId] = useState<number | null>(null);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = DOCTORS_PERMS.some((p) => permissions.includes(p));

  const loadDoctors = useCallback(async () => {
    if (!branchId || !hasAccess) return;
    try {
      const data = await staffDoctorsEnriched(branchId, { limit: 100, offset: 0 });
      const raw = Array.isArray(data?.items) ? data.items : [];
      setDoctorOptions(
        raw.map((d: any) => ({ memberId: d.memberId ?? d.branchMemberId ?? 0 }))
      );
    } catch {
      setDoctorOptions([]);
    }
  }, [branchId, hasAccess]);

  const loadQueue = useCallback(async () => {
    if (!branchId || !hasAccess) return;
    setQueueLoading(true);
    try {
      const data = await staffDoctorsCredentialsQueue(branchId);
      setQueue(data ?? null);
    } catch {
      setQueue(null);
    } finally {
      setQueueLoading(false);
    }
  }, [branchId, hasAccess]);

  const loadCredentials = useCallback(async () => {
    if (!branchId || memberIdFromUrl == null || !hasAccess) return;
    setDetailLoading(true);
    setError("");
    try {
      const data = await staffDoctorCredentials(branchId, memberIdFromUrl);
      setCredentials(data ?? null);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load credentials");
      setCredentials(null);
    } finally {
      setDetailLoading(false);
    }
  }, [branchId, memberIdFromUrl, hasAccess]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (memberIdFromUrl != null) loadCredentials();
    else setCredentials(null);
  }, [memberIdFromUrl, loadCredentials]);

  const setMemberIdInUrl = useCallback(
    (memberId: number | undefined) => {
      const path = credentialsRoute(branchId);
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      if (memberId != null) next.set("memberId", String(memberId));
      else next.delete("memberId");
      const q = next.toString();
      router.replace(q ? `${path}?${q}` : path, { scroll: false });
    },
    [branchId, router, searchParams]
  );

  const doctorExistsInBranch = useMemo(
    () => memberIdFromUrl == null || doctorOptions.some((d) => d.memberId === memberIdFromUrl),
    [memberIdFromUrl, doctorOptions]
  );
  const invalidDoctorInUrl = memberIdFromUrl != null && !doctorExistsInBranch;

  if (ctxLoading) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading..." />
      </PageWorkspace>
    );
  }

  if (!branch) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading branch…" />
      </PageWorkspace>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="clinic.doctors.view"
        onBack={() => router.push(doctors(branchId))}
      />
    );
  }

  return (
    <PageWorkspace>
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <PageHeader
        title="Credential Review"
        subtitle={
          memberIdFromUrl != null
            ? "Branch credential queue and selected doctor"
            : "Credentials and compliance across all doctors"
        }
      />
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Link href={doctors(branchId)} className="btn btn-outline-secondary btn-sm radius-8">
          ← Doctors
        </Link>
        <Link href={approvals(branchId)} className="btn btn-outline-primary btn-sm radius-8">
          Pending Approvals
        </Link>
      </div>

      <DoctorOperationsFilterBar
        branchId={branchId}
        doctorValue={memberIdFromUrl}
        onDoctorChange={setMemberIdInUrl}
        doctorPlaceholder="All doctors"
        enabled={hasAccess}
        className="mb-3"
      />

      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}

      {/* Branch-wide credential queue (default view) */}
      {queueLoading ? (
        <SectionCard>
          <LoadingState message="Loading credential queue…" />
        </SectionCard>
      ) : (
        <>
          <CredentialQueueSections branchId={branchId} queue={queue} />
        </>
      )}

      {/* Optional: selected doctor detail panel */}
      {memberIdFromUrl != null && (
        <SectionCard title="Selected doctor credentials" className="mt-4">
          {invalidDoctorInUrl ? (
            <EmptyState
              title="Doctor not found"
              description="The selected doctor is not assigned to this branch. Clear the filter to see the branch queue only."
              icon="ri:user-search-line"
              action={
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm radius-8"
                  onClick={() => setMemberIdInUrl(undefined)}
                >
                  Clear filter
                </button>
              }
            />
          ) : detailLoading ? (
            <LoadingState message="Loading credentials…" />
          ) : (
            <CredentialsContent branchId={branchId} credentials={credentials} />
          )}
        </SectionCard>
      )}

      <Doctor360Drawer
        open={drawerMemberId != null}
        onClose={() => setDrawerMemberId(null)}
        branchId={branchId}
        memberId={drawerMemberId}
      />
    </PageWorkspace>
  );
}

function CredentialQueueSections({ branchId, queue, onDoctorClick }: { branchId: string; queue: any; onDoctorClick?: (memberId: number) => void }) {
  const q = queue ?? {};
  const pending = q.credentialsPending ?? q.pending ?? [];
  const underReview = q.credentialsUnderReview ?? [];
  const expiringSoon = [...(q.credentialsExpiringSoon ?? []), ...(q.expiringSoon ?? [])];
  const missing = q.missing ?? [];
  const rejected = q.credentialsRejected ?? q.rejected ?? [];

  const hasAny = pending.length > 0 || underReview.length > 0 || expiringSoon.length > 0 || missing.length > 0 || rejected.length > 0;

  if (!hasAny) {
    return (
      <SectionCard>
        <EmptyState
          title="No credentials pending review"
          description="There are no credentials in the queue. Filter by doctor to view a specific doctor's credentials."
          icon="ri:file-shield-line"
          action={
            <Link href={doctors(branchId)} className="btn btn-outline-primary btn-sm radius-8">
              Back to Doctors
            </Link>
          }
        />
      </SectionCard>
    );
  }

  const doctorLink = (memberId: number, displayName: string) => (
    <>
      {onDoctorClick ? (
        <button
          type="button"
          className="btn btn-link btn-sm p-0 text-start text-body text-decoration-none fw-medium"
          onClick={() => onDoctorClick(memberId)}
        >
          {displayName}
        </button>
      ) : (
        <span className="fw-medium">{displayName}</span>
      )}
      <Link href={credentialsRoute(branchId, memberId)} className="ms-1 small">Filter</Link>
    </>
  );

  return (
    <>
      {pending.length > 0 && (
        <SectionCard title="Pending verification" subtitle={`${pending.length} item(s)`}>
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light">
                <tr><th>Doctor</th><th>License / Detail</th><th>Expiry</th><th>Action</th></tr>
              </thead>
              <tbody>
                {pending.map((row: any, i: number) => (
                  <tr key={row.id ?? i}>
                    <td>{doctorLink(row.memberId ?? row.doctorId, row.displayName ?? `#${row.memberId ?? row.doctorId}`)}</td>
                    <td className="small">{row.licenseNumber ?? "—"} {row.authority && `| ${row.authority}`}</td>
                    <td className="small">{row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : "—"}</td>
                    <td>
                      <Link href={credentialsRoute(branchId, row.memberId ?? row.doctorId)} className="btn btn-sm btn-outline-primary">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {underReview.length > 0 && (
        <SectionCard title="Under review" subtitle={`${underReview.length} item(s)`} className="mt-3">
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light">
                <tr><th>Doctor</th><th>License / Detail</th><th>Expiry</th></tr>
              </thead>
              <tbody>
                {underReview.map((row: any, i: number) => (
                  <tr key={row.id ?? i}>
                    <td>{doctorLink(row.memberId ?? row.doctorId, row.displayName ?? `#${row.memberId ?? row.doctorId}`)}</td>
                    <td className="small">{row.licenseNumber ?? "—"} {row.authority && `| ${row.authority}`}</td>
                    <td className="small">{row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {expiringSoon.length > 0 && (
        <SectionCard title="Expiring soon" subtitle="Within 30 days" className="mt-3">
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light">
                <tr><th>Doctor</th><th>Detail</th><th>Expiry</th></tr>
              </thead>
              <tbody>
                {expiringSoon.map((row: any, i: number) => (
                  <tr key={row.id ?? row.licenseId ?? i}>
                    <td>{doctorLink(row.memberId ?? row.doctorId, row.displayName ?? `#${row.memberId ?? row.doctorId}`)}</td>
                    <td className="small">{row.licenseNumber ?? row.regulatoryBody ?? "—"}</td>
                    <td className="small">{row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {missing.length > 0 && (
        <SectionCard title="Missing credentials" subtitle={`${missing.length} doctor(s)`} className="mt-3">
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light">
                <tr><th>Doctor</th><th>Action</th></tr>
              </thead>
              <tbody>
                {missing.map((row: any, i: number) => (
                  <tr key={row.verificationId ?? i}>
                    <td>{doctorLink(row.memberId, row.displayName ?? `#${row.memberId}`)}</td>
                    <td>
                      <Link href={credentialsRoute(branchId, row.memberId)} className="btn btn-sm btn-outline-primary">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {rejected.length > 0 && (
        <SectionCard title="Rejected" subtitle={`${rejected.length} item(s)`} className="mt-3">
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light">
                <tr><th>Doctor</th><th>Detail</th></tr>
              </thead>
              <tbody>
                {rejected.map((row: any, i: number) => (
                  <tr key={row.id ?? i}>
                    <td>{doctorLink(row.memberId ?? row.doctorId, row.displayName ?? `#${row.memberId ?? row.doctorId}`)}</td>
                    <td className="small">{row.licenseNumber ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </>
  );
}

function CredentialsContent({ branchId, credentials }: { branchId: string; credentials: any }) {
  const docs = credentials?.documents ?? [];
  const licenses = credentials?.licenses ?? [];
  const branchCreds = credentials?.branchCredentials ?? [];
  const hasAny = docs.length > 0 || licenses.length > 0 || branchCreds.length > 0;

  if (!hasAny) {
    return (
      <EmptyState
        title="No credentials on file"
        description="This doctor has no uploaded credentials or licenses yet."
        icon="ri:file-certificate-line"
      />
    );
  }

  return (
    <>
      {docs.length > 0 && (
        <div className="mb-3">
          <h6 className="small fw-semibold text-muted mb-2">Documents</h6>
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light"><tr><th>Type</th><th>Detail</th><th>Status</th></tr></thead>
              <tbody>
                {docs.map((item: any, i: number) => {
                  const expiring = isExpiringSoon(item.expiryDate);
                  return (
                    <tr key={i}>
                      <td>{item.type ?? "—"}</td>
                      <td className="small">
                        {item.licenseNumber && `License: ${item.licenseNumber}`}
                        {item.authority && ` | ${item.authority}`}
                        {item.expiryDate && ` | Expires: ${new Date(item.expiryDate).toLocaleDateString()}`}
                      </td>
                      <td>{expiring && <span className="badge bg-warning text-dark radius-8">Expiring soon</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {licenses.length > 0 && (
        <div className="mb-3">
          <h6 className="small fw-semibold text-muted mb-2">Licenses</h6>
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light"><tr><th>Detail</th><th>Status</th></tr></thead>
              <tbody>
                {licenses.map((item: any, i: number) => {
                  const expiring = isExpiringSoon(item.expiryDate);
                  return (
                    <tr key={i}>
                      <td className="small">
                        {item.licenseNumber && `License: ${item.licenseNumber}`}
                        {item.authority && ` | ${item.authority}`}
                        {item.expiryDate && ` | Expires: ${new Date(item.expiryDate).toLocaleDateString()}`}
                      </td>
                      <td>{expiring && <span className="badge bg-warning text-dark radius-8">Expiring soon</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {branchCreds.length > 0 && (
        <div>
          <h6 className="small fw-semibold text-muted mb-2">Branch credentials</h6>
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light"><tr><th>Detail</th><th>Status</th></tr></thead>
              <tbody>
                {branchCreds.map((item: any, i: number) => {
                  const expiring = isExpiringSoon(item.expiryDate);
                  return (
                    <tr key={i}>
                      <td className="small">
                        {item.licenseNumber && `License: ${item.licenseNumber}`}
                        {item.authority && ` | ${item.authority}`}
                        {item.expiryDate && ` | Expires: ${new Date(item.expiryDate).toLocaleDateString()}`}
                      </td>
                      <td>{expiring && <span className="badge bg-warning text-dark radius-8">Expiring soon</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
