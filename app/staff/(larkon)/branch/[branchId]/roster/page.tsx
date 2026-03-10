"use client";

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import AccessDenied from "@/src/components/branch/AccessDenied";

type StaffItem = {
  memberId: number;
  userId: number;
  role: string;
  status: string;
  user: { id: number; displayName: string | null; username: string | null } | null;
};

export default function StaffRosterPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    setLoading(true);
    apiGet<{ success: boolean; data?: StaffItem[]; message?: string }>(`/api/v1/manager/staff/${branchId}`)
      .then((res) => {
        if (cancelled) return;
        if (res.success && Array.isArray(res.data)) setStaff(res.data);
        else setError(res.message || "Failed to load staff");
      })
      .catch((e: Error & { status?: number }) => {
        if (cancelled) return;
        setError(e?.message || "Server error");
        if (e?.status === 403) setErrorCode("forbidden");
        else if (e?.status === 404) setErrorCode("not_found");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  if (loading) {
    return (
      <div className="container py-4">
        <Card><div className="placeholder-glow"><span className="placeholder col-6"></span></div></Card>
      </div>
    );
  }

  if (errorCode === "forbidden" || errorCode === "not_found") {
    return (
      <AccessDenied
        message="You need manager access to view the roster."
        onBack={() => router.push("/staff/branch/" + branchId)}
      />
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="mb-0">Staff Roster</h5>
        <Link href={`/staff/branch/${branchId}`} className="btn btn-outline-secondary btn-sm">Back to branch</Link>
      </div>
      <Card>
        <p className="text-muted small mb-3">Weekly shift view and duty roster. Use Staff & Shifts for assignment.</p>
        <div className="table-responsive">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.memberId}>
                  <td>{s.user?.displayName ?? s.user?.username ?? "—"}</td>
                  <td><span className="badge bg-secondary">{s.role}</span></td>
                  <td>{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {staff.length === 0 && !error && <p className="mb-0 text-muted">No staff in this branch.</p>}
      </Card>
    </div>
  );
}
