"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import Card from "@/src/bpa/components/ui/Card";
import { staffClinicOwnerLookup, staffClinicPatientsList } from "@/lib/api";

const CUSTOMERS_PERMS = ["customers.view", "customers.manage"];

export default function StaffBranchCustomersPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading } = useBranchContext(branchId);
  const [searchQuery, setSearchQuery] = useState("");
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = CUSTOMERS_PERMS.some((p) => permissions.includes(p));
  const hasClinic = branch?.clinicEnabled === true;

  async function handleSearch(e) {
    e.preventDefault();
    if (!branchId || !searchQuery.trim()) return;
    setLoading(true);
    setError("");
    setOwner(null);
    try {
      const data = await staffClinicOwnerLookup(branchId, searchQuery.trim());
      setOwner(data ?? null);
      if (!data) setError("No owner found for this phone or email.");
    } catch (e) {
      setError(e?.message ?? "Lookup failed");
      setOwner(null);
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="customers.view"
        onBack={() => router.push(`/staff/branch/${branchId}`)}
      />
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24 flex-wrap">
        <Link href={`/staff/branch/${branchId}`} className="btn btn-outline-secondary btn-sm">
          ← Branch
        </Link>
        <h5 className="mb-0">Customers</h5>
      </div>

      <Card title="Customer lookup" subtitle="Pet owners. Search by phone or email to find an owner and their linked pets.">
        {!hasClinic ? (
          <p className="text-muted small mb-0">Clinic is not enabled for this branch. Enable clinic to use customer lookup.</p>
        ) : (
          <>
            <form onSubmit={handleSearch} className="mb-3">
              <div className="d-flex gap-2 flex-wrap">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  style={{ maxWidth: 280 }}
                  placeholder="Phone or email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
                  {loading ? "Searching…" : "Search"}
                </button>
              </div>
            </form>
            {error && <div className="alert alert-warning py-2 small">{error}</div>}
            {owner && (
              <div className="border rounded p-3 bg-light">
                <h6 className="mb-2">Owner</h6>
                <p className="mb-1 small"><strong>{owner.profile?.displayName ?? "—"}</strong></p>
                <p className="mb-1 small text-muted">{owner.auth?.email ?? ""} {owner.auth?.phone ?? ""}</p>
                <Link href={`/staff/branch/${branchId}/clinic/patients?ownerId=${owner.id}`} className="btn btn-sm btn-outline-primary">
                  View pets (Clinic → Patients)
                </Link>
              </div>
            )}
          </>
        )}
      </Card>

      <div className="card radius-12 mt-3">
        <div className="card-body">
          <p className="small text-muted mb-0">
            For full patient (pet) list and registration, use <Link href={`/staff/branch/${branchId}/clinic/patients`}>Clinic → Patients</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
