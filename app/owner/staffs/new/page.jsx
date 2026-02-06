"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";
import { getEntityConfig } from "@/app/owner/_lib/entityConfig";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

export default function OwnerStaffNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const config = getEntityConfig("staff");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);

  // Form state
  const [branchId, setBranchId] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");

  // Load branches
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

  // Pre-fill branch from ?branchId= when coming from branch staff page (only if not already set)
  const [hasAppliedQuery, setHasAppliedQuery] = useState(false);
  useEffect(() => {
    if (hasAppliedQuery || branches.length === 0) return;
    const q = searchParams.get("branchId");
    if (!q) return;
    const ok = branches.some((b) => String(b.id) === String(q));
    if (ok) {
      setBranchId(String(q));
      setHasAppliedQuery(true);
    }
  }, [searchParams, branches, hasAppliedQuery]);

  // Load branch details when branch is selected
  useEffect(() => {
    if (!branchId) {
      setSelectedBranch(null);
      setRole("");
      return;
    }

    async function loadBranch() {
      try {
        const branch = branches.find((b) => String(b.id) === String(branchId));
        if (branch) {
          // If branch has types, use it, otherwise fetch full details
          if (branch.types && branch.types.length > 0) {
            setSelectedBranch(branch);
          } else {
            const j = await ownerGet(`/api/v1/owner/branches/${branchId}`);
            setSelectedBranch(j?.data || j);
          }
        }
      } catch (e) {
        console.error("Failed to load branch details:", e);
      }
    }

    loadBranch();
  }, [branchId, branches]);

  // Determine role options based on branch type
  const roleOptions = useMemo(() => {
    if (!selectedBranch) return [];

    const branchTypes = selectedBranch?.types || [];
    const isDeliveryHub = branchTypes.some(
      (x) => String(x?.type?.code || "").toUpperCase() === "DELIVERY_HUB"
    );

    if (isDeliveryHub) {
      return [
        { value: "DELIVERY_MANAGER", label: "Delivery Manager" },
        { value: "DELIVERY_STAFF", label: "Delivery Staff" },
      ];
    }

    return [
      { value: "BRANCH_MANAGER", label: "Branch Manager" },
      { value: "BRANCH_STAFF", label: "Branch Staff" },
      { value: "SELLER", label: "Seller" },
    ];
  }, [selectedBranch]);

  // Reset role when branch changes
  useEffect(() => {
    if (roleOptions.length > 0 && !roleOptions.find((opt) => opt.value === role)) {
      setRole("");
    }
  }, [roleOptions, role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setInviteResult(null);

    // Validation
    if (!branchId) {
      setError("Please select a branch");
      return;
    }

    if (!role) {
      setError("Please select a role");
      return;
    }

    if (!phone?.trim() && !email?.trim()) {
      setError("Please provide at least phone or email");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        role,
        phone: phone?.trim() || undefined,
        email: email?.trim() || undefined,
        displayName: displayName?.trim() || undefined,
      };

      const j = await ownerPost(`/api/v1/owner/branches/${branchId}/members/invite`, payload);
      setInviteResult(j?.data || j);
      setSuccess(true);

      // Reset form
      setPhone("");
      setEmail("");
      setDisplayName("");
      setRole("");
    } catch (e) {
      setError(e?.message || "Failed to invite staff");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setBranchId("");
    setRole("");
    setPhone("");
    setEmail("");
    setDisplayName("");
    setError("");
    setSuccess(false);
    setInviteResult(null);
  };

  const breadcrumbs = [
    { label: "Home", href: "/owner" },
    { label: "Staffs", href: "/owner/staffs" },
    { label: "Invite Staff", href: "/owner/staffs/new" },
  ];

  const selectedBranchData = branches.find((b) => String(b.id) === String(branchId));

  if (loading) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <div className="text-muted mt-3">Loading branches...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Invite Staff"
        subtitle="Invite a new staff member to join a branch"
        breadcrumbs={breadcrumbs}
        actions={[
          <Link
            key="list"
            href="/owner/staffs"
            className="btn btn-outline-secondary radius-12"
          >
            <i className="ri-list-check me-1" />
            All Staffs
          </Link>,
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      {success && inviteResult && (
        <div className="alert alert-success radius-12 mb-24">
          <i className="ri-checkbox-circle-line me-2" />
          <strong>Staff invited successfully!</strong>
          <div className="mt-2">
            {inviteResult?.expiresAt && (
              <div>
                Invite expires at: <b>{new Date(inviteResult.expiresAt).toLocaleString()}</b>
              </div>
            )}
            {inviteResult?.devInviteToken && (
              <div className="mt-2">
                <div className="text-muted small mb-1">Dev token (only non-production):</div>
                <code
                  className="d-block p-2 bg-light radius-8"
                  style={{ userSelect: "all", fontSize: "12px" }}
                >
                  {inviteResult.devInviteToken}
                </code>
              </div>
            )}
          </div>
          <div className="d-flex gap-2 mt-3">
            {branchId && (
              <Link
                href={`/owner/branches/${branchId}/team`}
                className="btn btn-sm btn-primary radius-12"
              >
                <i className="ri-team-line me-1" />
                View Branch Team
              </Link>
            )}
            <button
              className="btn btn-sm btn-outline-secondary radius-12"
              onClick={handleReset}
            >
              <i className="ri-add-line me-1" />
              Invite Another
            </button>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="card radius-12 mb-24">
        <div className="card-header">
          <h6 className="mb-0">
            <i className="ri-information-line me-2" />
            About Staff Invitation
          </h6>
        </div>
        <div className="card-body p-24">
          <div className="text-muted small">
            <ul className="mb-0 ps-3">
              <li>Select a branch where the staff member will work</li>
              <li>Choose an appropriate role based on the branch type</li>
              <li>Provide at least phone or email for the invitation</li>
              <li>The staff member will receive an invitation to join the branch</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Invite Form Card */}
      <div className="card radius-12 mb-24">
        <div className="card-header">
          <h6 className="mb-0">
            <i className="ri-user-add-line me-2" />
            Staff Invitation Form
          </h6>
        </div>
        <div className="card-body p-24">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              {/* Branch Selection */}
              <div className="col-12">
                <label className="form-label">
                  Branch <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select radius-12"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  required
                  disabled={submitting}
                >
                  <option value="">Select a branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={String(branch.id)}>
                      {branch.name || `Branch #${branch.id}`}
                      {branch.org?.name ? ` (${branch.org.name})` : ""}
                    </option>
                  ))}
                </select>
                <small className="text-muted">
                  Select the branch where this staff member will work
                </small>
                {selectedBranchData && (
                  <div className="mt-2 p-2 bg-light radius-8">
                    <div className="small">
                      <strong>Branch:</strong> {selectedBranchData.name}
                      {selectedBranchData.org?.name && (
                        <span className="text-muted"> • {selectedBranchData.org.name}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Role Selection */}
              <div className="col-12 col-md-6">
                <label className="form-label">
                  Role <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select radius-12"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  disabled={submitting || !branchId || roleOptions.length === 0}
                >
                  <option value="">
                    {!branchId
                      ? "Select branch first"
                      : roleOptions.length === 0
                      ? "Loading roles..."
                      : "Select role"}
                  </option>
                  {roleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <small className="text-muted">
                  {branchId && roleOptions.length > 0 && (
                    <>
                      {selectedBranch?.types?.some(
                        (x) => String(x?.type?.code || "").toUpperCase() === "DELIVERY_HUB"
                      ) ? (
                        <span>Delivery Hub roles available</span>
                      ) : (
                        <span>Branch roles available</span>
                      )}
                    </>
                  )}
                  {!branchId && "Select a branch to see available roles"}
                </small>
              </div>

              {/* Display Name */}
              <div className="col-12 col-md-6">
                <label className="form-label">Display Name</label>
                <input
                  type="text"
                  className="form-control radius-12"
                  placeholder="Rahim"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={submitting}
                />
                <small className="text-muted">Optional display name for the staff member</small>
              </div>

              {/* Phone */}
              <div className="col-12 col-md-6">
                <label className="form-label">
                  Phone
                </label>
                <input
                  type="tel"
                  className="form-control radius-12"
                  placeholder="01XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={submitting}
                />
                <small className="text-muted">At least phone or email is required</small>
              </div>

              {/* Email */}
              <div className="col-12 col-md-6">
                <label className="form-label">
                  Email
                </label>
                <input
                  type="email"
                  className="form-control radius-12"
                  placeholder="staff@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                />
                <small className="text-muted">At least phone or email is required</small>
              </div>
            </div>

            {/* Form Actions */}
            <div className="d-flex gap-2 mt-24 pt-24 border-top">
              <button
                type="submit"
                className="btn btn-primary radius-12"
                disabled={submitting || !branchId || !role}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Sending Invite...
                  </>
                ) : (
                  <>
                    <i className="ri-send-plane-line me-1" />
                    Send Invite
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary radius-12"
                onClick={handleReset}
                disabled={submitting}
              >
                <i className="ri-refresh-line me-1" />
                Reset
              </button>
              <Link
                href="/owner/staffs"
                className="btn btn-outline-secondary radius-12"
              >
                <i className="ri-close-line me-1" />
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Help Card */}
      {branchId && selectedBranchData && (
        <div className="card radius-12">
          <div className="card-header">
            <h6 className="mb-0">
              <i className="ri-question-line me-2" />
              Selected Branch Information
            </h6>
          </div>
          <div className="card-body p-24">
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <div className="text-muted small mb-1">Branch Name</div>
                <div className="fw-semibold">{selectedBranchData.name || `Branch #${selectedBranchData.id}`}</div>
              </div>
              {selectedBranchData.org?.name && (
                <div className="col-12 col-md-6">
                  <div className="text-muted small mb-1">Organization</div>
                  <div className="fw-semibold">{selectedBranchData.org.name}</div>
                </div>
              )}
              {selectedBranchData.types && selectedBranchData.types.length > 0 && (
                <div className="col-12">
                  <div className="text-muted small mb-1">Branch Type</div>
                  <div>
                    {selectedBranchData.types.map((type, idx) => (
                      <span key={idx} className="badge text-bg-info me-2">
                        {type.type?.name || type.type?.code || "Unknown"}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="col-12">
                <Link
                  href={`/owner/branches/${branchId}`}
                  className="btn btn-sm btn-outline-primary radius-12"
                >
                  <i className="ri-store-line me-1" />
                  View Branch Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
