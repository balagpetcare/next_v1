"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ownerClinicStaff } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

type ProfileSummary = {
  staffType?: string;
  visiting?: boolean;
  defaultConsultationFee?: number | null;
  status?: string;
};

type Member = {
  id: number;
  userId: number;
  role: string;
  status: string;
  profileSummary?: ProfileSummary | null;
  user?: {
    id: number;
    profile?: { displayName?: string };
    auth?: { phone?: string; email?: string };
  };
};

export default function ClinicStaffPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [branchName, setBranchName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof branchId !== "string" || branchId === "") return;
    const id = branchId;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await ownerClinicStaff(id);
        const d = data as { branch?: { name: string }; members?: Member[] } | null;
        setBranchName(d?.branch?.name ?? `Branch #${id}`);
        setMembers(Array.isArray(d?.members) ? d.members : []);
      } catch (e) {
        setError((e as Error)?.message || "Failed to load staff");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [branchId]);

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
        title="Clinic staff"
        subtitle={branchName}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Staff", href: `/owner/clinic/${branchId}/staff` },
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status" />
          </div>
        </div>
      ) : members.length === 0 ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <i className="ri-user-line fs-1 text-muted mb-3 d-block" />
            <h5 className="mb-3">No staff assigned</h5>
            <p className="text-muted mb-4">
              Assign branch members from the branch or access management pages.
            </p>
            <Link href={`/owner/branches/${branchId}`} className="btn btn-outline-primary radius-12">
              <i className="ri-user-shared-line me-1" />
              Branch details
            </Link>
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
                    <th>Role</th>
                    <th>Clinic profile</th>
                    <th>Status</th>
                    <th>Contact</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td className="fw-semibold">
                        {m.user?.profile?.displayName ?? `User #${m.userId}`}
                      </td>
                      <td>
                        <span className="badge bg-primary-light text-primary radius-8">
                          {m.role}
                        </span>
                      </td>
                      <td className="small">
                        {m.profileSummary ? (
                          <>
                            <span className="badge bg-info-light text-info radius-8 me-1">
                              {m.profileSummary.staffType ?? "—"}
                            </span>
                            {m.profileSummary.visiting && (
                              <span className="badge bg-warning-light text-warning radius-8 me-1">
                                Visiting
                              </span>
                            )}
                            {m.profileSummary.defaultConsultationFee != null && (
                              <span className="text-muted">
                                Fee: {m.profileSummary.defaultConsultationFee}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge radius-8 ${
                            m.status === "ACTIVE" ? "bg-success" : "bg-secondary"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="text-muted small">
                        {m.user?.auth?.email ?? m.user?.auth?.phone ?? "—"}
                      </td>
                      <td>
                        <Link
                          href={`/owner/clinic/${branchId}/staff/${m.id}`}
                          className="btn btn-sm btn-outline-primary radius-12"
                        >
                          Edit profile
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
