"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import BranchPageShell from "@/app/owner/_components/branch/BranchPageShell";

function pickList(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.data)) return resp.data;
  if (Array.isArray(resp?.items)) return resp.items;
  return [];
}

export default function BranchStaffPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.id || ""), [params]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!branchId) return;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await ownerGet(`/api/v1/owner/branches/${branchId}/members`).catch(() => ({}));
        setMembers(pickList(data));
      } catch (e) {
        setError(e?.message || "Failed to load staff");
      } finally {
        setLoading(false);
      }
    })();
  }, [branchId]);

  return (
    <BranchPageShell
      title="Staff"
      subtitle="Branch team members"
      breadcrumbLabel="Staff"
      loading={loading}
      actions={[
        <Link
          key="invite"
          href={`/owner/staffs/new?branchId=${branchId}`}
          className="btn btn-primary radius-12"
        >
          <i className="ri-user-add-line me-1" />
          Invite Staff
        </Link>,
      ]}
    >
      {error && (
        <div className="alert alert-danger radius-12 mb-4">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}
      <div className="card radius-12">
        <div className="card-body p-24">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email / Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
                      No staff members yet. Invite staff to add them to this branch.
                    </td>
                  </tr>
                )}
                {members.map((m) => {
                  const u = m.user ?? m;
                  const profile = u?.profile ?? {};
                  return (
                    <tr key={m.id ?? u?.id}>
                      <td className="fw-semibold">{profile?.displayName ?? u?.name ?? "—"}</td>
                      <td>{u?.email ?? u?.phone ?? m?.email ?? m?.phone ?? "—"}</td>
                      <td>
                        <span className="badge bg-primary-focus text-primary radius-8">
                          {m.role ?? "—"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge radius-8 ${(m.status ?? "ACTIVE") === "ACTIVE" ? "bg-success" : "bg-secondary"}`}>
                          {m.status ?? "ACTIVE"}
                        </span>
                      </td>
                      <td className="text-end">
                        <Link
                          href={m.userId ? `/owner/staffs/${m.userId}` : "/owner/staffs"}
                          className="btn btn-sm btn-ghost-primary radius-8"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </BranchPageShell>
  );
}
