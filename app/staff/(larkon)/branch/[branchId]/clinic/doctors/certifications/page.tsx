"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffCertificationsBoard } from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import {
  PageWorkspace,
  PageHeader,
  LoadingState,
  StatCard,
  SectionCard,
  EmptyState,
} from "@/src/components/dashboard";
import { DoctorOperationsFilterBar, Doctor360Drawer } from "@/src/components/clinic/doctors";
import { humanizeEnum } from "@/src/lib/displayFormatters";
import { doctors, credentials } from "@/src/lib/doctorOperationsRoutes";

const DOCTORS_PERMS = ["clinic.doctors.view", "clinic.doctors.view_certifications"];

function formatDate(val: string | Date | null | undefined): string {
  if (!val) return "—";
  const d = new Date(val);
  return d.toLocaleDateString(undefined, { dateStyle: "short" });
}

export default function StaffClinicDoctorsCertificationsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const [data, setData] = useState<{ items: any[]; summary: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerMemberId, setDrawerMemberId] = useState<number | null>(null);
  const [memberIdFilter, setMemberIdFilter] = useState<number | undefined>(undefined);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = DOCTORS_PERMS.some((p) => permissions.includes(p));

  const load = useCallback(async () => {
    if (!branchId || !hasAccess) return;
    setLoading(true);
    try {
      const res = await staffCertificationsBoard(branchId);
      setData(res ?? null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [branchId, hasAccess]);

  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo(() => {
    const list = data?.items ?? [];
    if (memberIdFilter == null) return list;
    return list.filter((r: any) => r.memberId === memberIdFilter);
  }, [data?.items, memberIdFilter]);

  const summary = data?.summary ?? { total: 0, verified: 0, expiringSoon: 0, expired: 0, unverified: 0 };

  if (ctxLoading || !branch) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading branch…" />
      </PageWorkspace>
    );
  }

  if (!hasAccess) {
    return (
      <PageWorkspace>
        <BranchHeader branch={branch} />
        <AccessDenied requiredPerm="clinic.doctors.view" />
      </PageWorkspace>
    );
  }

  const basePath = doctors(branchId);

  return (
    <PageWorkspace>
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Link href={basePath} className="btn btn-outline-secondary btn-sm radius-8">
          ← Doctors
        </Link>
      </div>
      <PageHeader
        title="Certifications"
        subtitle="Branch-wide doctor certifications and credential verification status"
      />

      <DoctorOperationsFilterBar
        branchId={branchId}
        doctorValue={memberIdFilter}
        onDoctorChange={setMemberIdFilter}
        doctorPlaceholder="All doctors"
        enabled={hasAccess}
        className="mb-3"
      />

      <div className="row g-3 mb-4">
        <div className="col-6 col-md">
          <StatCard
            label="Total"
            value={loading ? "—" : summary.total}
            icon="ri:award-line"
            variant="primary"
            loading={loading}
          />
        </div>
        <div className="col-6 col-md">
          <StatCard
            label="Verified"
            value={loading ? "—" : summary.verified}
            icon="ri:checkbox-circle-line"
            variant="success"
            loading={loading}
          />
        </div>
        <div className="col-6 col-md">
          <StatCard
            label="Expiring Soon"
            value={loading ? "—" : summary.expiringSoon}
            icon="ri:time-line"
            variant="warning"
            loading={loading}
          />
        </div>
        <div className="col-6 col-md">
          <StatCard
            label="Expired"
            value={loading ? "—" : summary.expired}
            icon="ri:error-warning-line"
            variant="danger"
            loading={loading}
          />
        </div>
        <div className="col-6 col-md">
          <StatCard
            label="Unverified"
            value={loading ? "—" : summary.unverified}
            icon="ri:file-edit-line"
            variant="secondary"
            loading={loading}
          />
        </div>
      </div>

      <SectionCard
        title="Certifications"
        subtitle={items.length > 0 ? `${items.length} record(s)` : undefined}
      >
        {loading ? (
          <LoadingState message="Loading…" />
        ) : items.length === 0 ? (
          <EmptyState
            title="No certifications"
            description="No certification records for this branch. Add credentials from the Credential Review page."
            icon="ri:award-line"
            action={
              <Link href={credentials(branchId)} className="btn btn-outline-primary btn-sm radius-8">
                Credential Review
              </Link>
            }
          />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Certification</th>
                  <th>Issuing Body</th>
                  <th>Issue Date</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Linked Specialty</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row: any) => (
                  <tr key={`${row.memberId}-${row.id}`}>
                    <td>
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 text-start text-body text-decoration-none"
                        onClick={() => setDrawerMemberId(row.memberId)}
                      >
                        {row.displayName ?? `Doctor #${row.memberId}`}
                      </button>
                    </td>
                    <td>{row.certification ?? "—"}</td>
                    <td>{row.issuingBody ?? "—"}</td>
                    <td className="text-nowrap">{formatDate(row.issueDate)}</td>
                    <td className="text-nowrap">{formatDate(row.expiryDate)}</td>
                    <td>
                      <span className={`badge ${row.verificationStatus === "APPROVED" ? "bg-success" : row.verificationStatus === "REJECTED" ? "bg-danger" : "bg-secondary"} radius-8`}>
                        {humanizeEnum(row.verificationStatus) ?? row.verificationStatus ?? "—"}
                      </span>
                    </td>
                    <td>{row.linkedSpecialty ?? "—"}</td>
                    <td className="text-end">
                      <Link
                        href={credentials(branchId, row.memberId)}
                        className="btn btn-sm btn-outline-primary"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Doctor360Drawer
        open={drawerMemberId != null}
        onClose={() => setDrawerMemberId(null)}
        branchId={branchId}
        memberId={drawerMemberId}
      />
    </PageWorkspace>
  );
}
