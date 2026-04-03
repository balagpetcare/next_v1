"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { UnifiedStaffInviteForm } from "@/app/owner/_components/staff/UnifiedStaffInviteForm";

function OwnerStaffNewContent() {
  const searchParams = useSearchParams();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const preselectedBranchId = searchParams.get("branchId");

  useEffect(() => {
    async function loadBranches() {
      setLoading(true);
      setError("");
      try {
        const res = await ownerGet("/api/v1/owner/branches");
        const items = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        setBranches(items);
      } catch (e) {
        setError(e?.message || "Failed to load branches");
      } finally {
        setLoading(false);
      }
    }
    loadBranches();
  }, []);

  const handleSubmit = async (data) => {
    const payload = {
      role: data.role,
      phone: data.phone || undefined,
      email: data.email || undefined,
      displayName: data.displayName || undefined,
    };

    try {
      const res = await ownerPost(`/api/v1/owner/branches/${data.branchId}/members/invite`, payload);
      return {
        success: true,
        message: res?.message,
        data: res?.data || res,
      };
    } catch (e) {
      const resp = e?.response;
      if (resp?.error?.code === "INVITE_PENDING_DUPLICATE") {
        const meta = resp?.error?.meta;
        const hint =
          meta?.inviteId != null
            ? ` You can resend invite #${meta.inviteId} from Staff / Invitations, or revoke it and try again.`
            : "";
        return {
          success: false,
          message: (resp?.message || e?.message || "A conflicting invitation is already pending.") + hint,
        };
      }
      throw e;
    }
  };

  if (loading) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <div className="text-muted mt-3">Loading branches...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-danger radius-12">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
        <Link href="/owner/staffs" className="btn btn-outline-secondary radius-12">
          Back to Staff List
        </Link>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Invite Staff"
        subtitle="Invite a new staff member to join a branch"
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Staffs", href: "/owner/staffs" },
          { label: "Invite Staff", href: "/owner/staffs/new" },
        ]}
        actions={[
          <Link key="list" href="/owner/staffs" className="btn btn-outline-secondary radius-12">
            <i className="ri-list-check me-1" />
            All Staffs
          </Link>,
        ]}
      />

      <div className="card radius-12 mb-4">
        <div className="card-header">
          <h6 className="mb-0">
            <i className="ri-information-line me-2" />
            About Staff Invitation
          </h6>
        </div>
        <div className="card-body p-4">
          <ul className="mb-0 ps-3 text-muted small">
            <li>Select a branch where the staff member will work</li>
            <li>Choose an appropriate role based on the branch type</li>
            <li>Provide at least phone or email for the invitation</li>
            <li>The staff member will receive an invitation to join the branch</li>
          </ul>
        </div>
      </div>

      <UnifiedStaffInviteForm
        branches={branches}
        preselectedBranchId={preselectedBranchId ? Number(preselectedBranchId) : undefined}
        submitAction={handleSubmit}
        onCancel={() => window.location.href = "/owner/staffs"}
      />
    </div>
  );
}

export default function OwnerStaffNewPage() {
  return (
    <Suspense fallback={<div className="container py-4 text-secondary">Loading…</div>}>
      <OwnerStaffNewContent />
    </Suspense>
  );
}
