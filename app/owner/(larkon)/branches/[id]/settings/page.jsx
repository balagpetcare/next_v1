"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import BranchPageShell from "@/app/owner/_components/branch/BranchPageShell";

function pickBranch(resp) {
  if (!resp) return null;
  if (Array.isArray(resp)) return resp[0] ?? null;
  if (resp?.data) return resp.data;
  return resp;
}

export default function BranchSettingsPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.id || ""), [params]);
  const [branch, setBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!branchId) return;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await ownerGet(`/api/v1/owner/branches/${branchId}`);
        setBranch(pickBranch(data));
      } catch (e) {
        setError(e?.message || "Failed to load branch");
      } finally {
        setLoading(false);
      }
    })();
  }, [branchId]);

  const base = `/owner/branches/${branchId}`;
  const profile = branch?.profileDetails ?? {};
  const addressJson = profile?.addressJson ?? branch?.addressJson ?? {};
  const addressText = addressJson?.text ?? addressJson?.fullPathText ?? profile?.addressText ?? branch?.address ?? "";

  return (
    <BranchPageShell
      title="Branch Settings"
      subtitle="Configure and set up this branch"
      breadcrumbLabel="Settings"
      loading={loading}
      actions={[
        <Link key="edit" href={`${base}/edit`} className="btn btn-primary radius-12">
          <i className="ri-edit-line me-1" />
          Edit Branch
        </Link>,
      ]}
    >
      {error && (
        <div className="alert alert-danger radius-12 mb-4">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}
      {branch && (
        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <div className="card radius-12">
              <div className="card-body p-24">
                <h6 className="mb-3 fw-semibold">
                  <i className="ri-information-line me-2 text-primary" />
                  Basic Information
                </h6>
                <div className="mb-3">
                  <div className="text-secondary-light small mb-1">Name</div>
                  <div className="fw-semibold">{branch.name ?? "—"}</div>
                </div>
                <div className="mb-3">
                  <div className="text-secondary-light small mb-1">Status</div>
                  <span className={`badge radius-8 ${(branch.status ?? "ACTIVE") === "ACTIVE" ? "bg-success" : "bg-secondary"}`}>
                    {branch.status ?? "ACTIVE"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="card radius-12">
              <div className="card-body p-24">
                <h6 className="mb-3 fw-semibold">
                  <i className="ri-phone-line me-2 text-primary" />
                  Contact
                </h6>
                <div className="mb-3">
                  <div className="text-secondary-light small mb-1">Phone</div>
                  <div className="fw-semibold">{profile.branchPhone ?? branch.branchPhone ?? branch.phone ?? "—"}</div>
                </div>
                <div className="mb-3">
                  <div className="text-secondary-light small mb-1">Email</div>
                  <div className="fw-semibold">{profile.branchEmail ?? branch.branchEmail ?? branch.email ?? "—"}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-12">
            <div className="card radius-12">
              <div className="card-body p-24">
                <h6 className="mb-3 fw-semibold">
                  <i className="ri-map-pin-line me-2 text-primary" />
                  Address
                </h6>
                <div className="fw-semibold">{addressText || "—"}</div>
                <div className="mt-3">
                  <Link href={`${base}/edit`} className="btn btn-sm btn-outline-primary radius-12">
                    Edit branch profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </BranchPageShell>
  );
}
