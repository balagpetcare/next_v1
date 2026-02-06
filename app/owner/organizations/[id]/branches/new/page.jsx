"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import BranchForm from "@/src/components/branch/BranchForm";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

export default function NewBranchPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = String(params?.id || "");

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Create New Branch"
        subtitle="Register a new branch for your organization. Complete all steps to submit for verification."
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Organizations", href: "/owner/organizations" },
          { label: "Branches", href: `/owner/organizations/${orgId}/branches` },
          { label: "New Branch", href: `/owner/organizations/${orgId}/branches/new` },
        ]}
        actions={[
          <Link
            key="back"
            href={`/owner/organizations/${orgId}/branches`}
            className="btn btn-outline-secondary radius-12"
          >
            <i className="ri-arrow-left-line me-1" />
            Back to Branches
          </Link>,
        ]}
      />

      <div className="row">
        <div className="col-12">
          <BranchForm
            mode="create"
            organizationId={orgId}
            onDone={() => {
              router.push(`/owner/organizations/${orgId}/branches`);
              router.refresh();
            }}
          />
        </div>
      </div>
    </div>
  );
}
