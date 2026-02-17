"use client";

import { useMemo, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import BranchForm from "@/src/components/branch/BranchForm";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

function pickBranch(resp) {
  if (!resp) return null;
  if (Array.isArray(resp)) return resp[0] ?? null;
  if (resp?.data) return resp.data;
  return resp;
}

export default function EditBranchPage() {
  const router = useRouter();
  const params = useParams();
  const branchId = useMemo(() => String(params?.id || ""), [params]);
  const [branch, setBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const base = `/owner/branches/${branchId}`;

  useEffect(() => {
    if (!branchId) return;
    (async () => {
      try {
        setLoading(true);
        const data = await ownerGet(`/api/v1/owner/branches/${branchId}`);
        setBranch(pickBranch(data));
      } catch (e) {
        console.error("Load branch error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [branchId]);

  if (!branchId) {
    return (
      <div className="dashboard-main-body">
        <PageHeader title="Edit Branch" breadcrumbs={[{ label: "Home", href: "/owner/dashboard" }, { label: "Branches", href: "/owner/branches" }]} />
        <div className="alert alert-danger radius-12">
          <i className="ri-error-warning-line me-2" />
          Missing branch ID.
        </div>
      </div>
    );
  }

  const orgId = branch?.orgId != null ? String(branch.orgId) : null;

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Edit Branch"
        subtitle="Update branch information. Complete all steps to save changes."
        breadcrumbs={[
          { label: "Home", href: "/owner/dashboard" },
          { label: "Branches", href: "/owner/branches" },
          { label: "Branch", href: base },
          { label: "Edit" },
        ]}
        actions={[
          <Link key="view" href={base} className="btn btn-outline-primary radius-12">
            <i className="ri-eye-line me-1" />
            View Dashboard
          </Link>,
          <Link key="back" href="/owner/branches" className="btn btn-outline-secondary radius-12">
            <i className="ri-arrow-left-line me-1" />
            All Branches
          </Link>,
        ]}
      />
      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="row">
          <div className="col-12">
            <BranchForm
              mode="edit"
              organizationId={orgId}
              branchId={branchId}
              onDone={() => {
                router.replace(base);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
