"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffDoctorInviteSearch, staffDoctorAssignExisting } from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace, LoadingState } from "@/src/components/dashboard";

const DOCTORS_PERMS = ["clinic.doctors.assign"];

export default function StaffClinicDoctorsAssignExistingPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ userId: number; displayName: string; email?: string; phone?: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<{ userId: number; displayName: string } | null>(null);
  const [roleInClinic, setRoleInClinic] = useState("CONSULTANT");
  const [fee, setFee] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = DOCTORS_PERMS.some((p) => permissions.includes(p));

  const doSearch = useCallback(async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    setError("");
    try {
      const data = await staffDoctorInviteSearch(branchId, query.trim());
      setResults(Array.isArray(data) ? data : []);
      setSelected(null);
    } catch (e) {
      setError((e as Error)?.message ?? "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [branchId, query]);

  const handleAssign = useCallback(async () => {
    if (!selected) return;
    setSubmitting(true);
    setError("");
    try {
      await staffDoctorAssignExisting(branchId, {
        userId: selected.userId,
        roleInClinic,
        defaultConsultationFee: fee ? Number(fee) : undefined,
      });
      router.push(`/staff/branch/${branchId}/clinic/doctors`);
    } catch (e) {
      setError((e as Error)?.message ?? "Assign failed");
    } finally {
      setSubmitting(false);
    }
  }, [branchId, selected, roleInClinic, fee, router]);

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
        missingPerm="clinic.doctors.assign"
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
            <h5 className="mb-0">Assign Existing Doctor</h5>
          </div>
          <div className="card radius-12 mb-3">
        <div className="card-body">
          <label className="form-label">Search by name, email, or phone</label>
          <div className="d-flex gap-2">
            <input
              type="search"
              className="form-control"
              placeholder="Type at least 2 characters..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
            />
            <button type="button" className="btn btn-primary" onClick={doSearch} disabled={searching || query.trim().length < 2}>
              {searching ? "Searching..." : "Search"}
            </button>
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="card radius-12 mb-3">
          <div className="card-header bg-transparent p-24"><h6 className="mb-0">Select a user</h6></div>
          <div className="card-body p-0">
            <ul className="list-group list-group-flush">
              {results.map((r) => (
                <li
                  key={r.userId}
                  className={`list-group-item list-group-item-action cursor-pointer ${selected?.userId === r.userId ? "active" : ""}`}
                  onClick={() => setSelected({ userId: r.userId, displayName: r.displayName })}
                >
                  {r.displayName} {r.email && <span className="text-muted small">({r.email})</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {selected && (
        <div className="card radius-12 mb-3">
          <div className="card-body">
            <h6 className="mb-3">Assign &quot;{selected.displayName}&quot; to this branch</h6>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Role in clinic</label>
                <select className="form-select" value={roleInClinic} onChange={(e) => setRoleInClinic(e.target.value)}>
                  <option value="CONSULTANT">Consultant</option>
                  <option value="SURGEON">Surgeon</option>
                  <option value="VISITING">Visiting</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Default consultation fee (BDT)</label>
                <input type="number" className="form-control" value={fee} onChange={(e) => setFee(e.target.value)} />
              </div>
            </div>
            {error && <div className="alert alert-danger radius-12 mt-3">{error}</div>}
            <div className="mt-3">
              <button type="button" className="btn btn-primary btn-sm" onClick={handleAssign} disabled={submitting}>
                {submitting ? "Assigning..." : "Assign to branch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {query.trim().length >= 2 && !searching && results.length === 0 && (
        <div className="card radius-12">
          <div className="card-body text-center py-4 text-muted">No users found. They may already be assigned to this branch.</div>
        </div>
      )}
        </div>
      </div>
    </PageWorkspace>
  );
}
