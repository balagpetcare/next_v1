"use client";

import Link from "next/link";
import { useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import BranchForm from "@/src/components/branch/BranchForm";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

export default function EditBranchPage() {
  const router = useRouter();
  const params = useParams();

  const orgId = useMemo(() => String(params?.id || ""), [params]);
  const branchId = useMemo(() => String(params?.branchId || ""), [params]);

  // Debug: Log params
  useEffect(() => {
    console.log("EditBranchPage - Params:", { orgId, branchId, params });
  }, [orgId, branchId, params]);

  const detailsHref = `/owner/organizations/${orgId}/branches/${branchId}`;
  const listHref = `/owner/organizations/${orgId}/branches`;

  // Show error if IDs are missing
  if (!orgId || !branchId) {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Edit Branch"
          breadcrumbs={[
            { label: "Home", href: "/owner" },
            { label: "Organizations", href: "/owner/organizations" },
          ]}
        />
        <div className="alert alert-danger radius-12">
          <i className="ri-error-warning-line me-2" />
          Missing organization ID or branch ID. Please check the URL.
          <div className="mt-2" style={{ fontSize: "12px" }}>
            Org ID: {orgId || "missing"}, Branch ID: {branchId || "missing"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Edit Branch"
        subtitle="Update branch information. Complete all steps to save changes."
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Organizations", href: "/owner/organizations" },
          { label: "Branches", href: listHref },
          { label: "Edit Branch", href: detailsHref + "/edit" },
        ]}
        actions={[
          <Link
            key="view"
            href={detailsHref}
            className="btn btn-outline-primary radius-12"
          >
            <i className="ri-eye-line me-1" />
            View Details
          </Link>,
          <Link
            key="back"
            href={listHref}
            className="btn btn-outline-secondary radius-12"
          >
            <i className="ri-arrow-left-line me-1" />
            Back to List
          </Link>,
        ]}
      />

      <div className="row">
        <div className="col-12">
          <BranchForm
            mode="edit"
            organizationId={orgId}
            branchId={branchId}
            onDone={() => {
              router.replace(`${listHref}?updated=1`);
              router.refresh();
            }}
          />
        </div>
      </div>
    </div>
  );
}
