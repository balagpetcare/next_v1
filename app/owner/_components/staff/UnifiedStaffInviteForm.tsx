"use client";

/**
 * UnifiedStaffInviteForm
 * 
 * A shared, reusable staff invitation form that works for all branch types.
 * This component replaces the duplicate invitation forms across warehouse,
 * clinic, pharmacy, and general staff pages.
 * 
 * Features:
 * - Branch type-aware role selection
 * - Preselected branch support (for branch-specific pages)
 * - Preselected role support (for warehouse/clinic specific invites)
 * - Validation and error handling
 * - Success feedback with toast notifications
 */

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

interface Branch {
  id: number;
  name: string;
  org?: { name: string };
  types?: Array<{ type: { code: string; name: string } }>;
}

interface UnifiedStaffInviteFormProps {
  branches: Branch[];
  preselectedBranchId?: number;
  preselectedRole?: string;
  allowedRoles?: string[]; // If provided, only these roles are shown
  submitAction: (data: {
    branchId: number;
    role: string;
    email: string;
    phone: string;
    displayName: string;
  }) => Promise<{ success: boolean; message?: string; data?: any }>;
  onSuccess?: (result: any) => void;
  onCancel?: () => void;
  showCancelButton?: boolean;
}

// Role definitions with labels
const ROLE_LABELS: Record<string, string> = {
  BRANCH_MANAGER: "Branch Manager",
  BRANCH_STAFF: "Branch Staff",
  SELLER: "Seller",
  DOCTOR: "Doctor",
  DELIVERY_MANAGER: "Delivery Manager",
  DELIVERY_STAFF: "Delivery Staff",
  WAREHOUSE_MANAGER: "Warehouse Manager",
  RECEIVING_STAFF: "Receiving Staff",
  DISPATCH_STAFF: "Dispatch Staff",
  INVENTORY_CONTROLLER: "Inventory Controller",
  QC_OFFICER: "QC Officer",
  AUDIT_OFFICER: "Audit Officer",
  PHARMACIST: "Pharmacist",
};

// Role categories by branch type
const ROLES_BY_BRANCH_TYPE: Record<string, string[]> = {
  CLINIC: ["BRANCH_MANAGER", "BRANCH_STAFF", "SELLER", "DOCTOR"],
  PHARMACY: ["BRANCH_MANAGER", "BRANCH_STAFF", "SELLER", "PHARMACIST"],
  SHOP: ["BRANCH_MANAGER", "BRANCH_STAFF", "SELLER"],
  DELIVERY_HUB: ["DELIVERY_MANAGER", "DELIVERY_STAFF"],
  WAREHOUSE: [
    "WAREHOUSE_MANAGER",
    "RECEIVING_STAFF",
    "DISPATCH_STAFF",
    "INVENTORY_CONTROLLER",
    "QC_OFFICER",
    "AUDIT_OFFICER",
  ],
  CENTRAL_WAREHOUSE: [
    "BRANCH_MANAGER",
    "WAREHOUSE_MANAGER",
    "RECEIVING_STAFF",
    "DISPATCH_STAFF",
    "INVENTORY_CONTROLLER",
    "QC_OFFICER",
    "AUDIT_OFFICER",
  ],
  DEFAULT: ["BRANCH_MANAGER", "BRANCH_STAFF", "SELLER"],
};

export function UnifiedStaffInviteForm({
  branches,
  preselectedBranchId,
  preselectedRole,
  allowedRoles,
  submitAction,
  onSuccess,
  onCancel,
  showCancelButton = true,
}: UnifiedStaffInviteFormProps) {
  // Form state
  const [branchId, setBranchId] = useState<string>(preselectedBranchId ? String(preselectedBranchId) : "");
  const [role, setRole] = useState<string>(preselectedRole || "");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  
  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [inviteResult, setInviteResult] = useState<any>(null);

  // Get selected branch
  const selectedBranch = useMemo(() => {
    return branches.find((b) => String(b.id) === branchId);
  }, [branches, branchId]);

  // Get available roles based on branch type
  const availableRoles = useMemo(() => {
    if (allowedRoles) {
      return allowedRoles.map((r) => ({ value: r, label: ROLE_LABELS[r] || r }));
    }

    if (!selectedBranch) return [];

    const typeCodes = selectedBranch.types?.map((t) => t.type.code.toUpperCase()) || [];
    const roles = new Set<string>();

    for (const typeCode of typeCodes) {
      const typeRoles = ROLES_BY_BRANCH_TYPE[typeCode] || ROLES_BY_BRANCH_TYPE.DEFAULT;
      typeRoles.forEach((r) => roles.add(r));
    }

    if (typeCodes.length === 0) {
      ROLES_BY_BRANCH_TYPE.DEFAULT.forEach((r) => roles.add(r));
    }

    return Array.from(roles).map((r) => ({
      value: r,
      label: ROLE_LABELS[r] || r,
    }));
  }, [selectedBranch, allowedRoles]);

  // Reset role when branch changes (unless preselected)
  useEffect(() => {
    if (!preselectedRole && availableRoles.length > 0) {
      const currentRoleValid = availableRoles.some((r) => r.value === role);
      if (!currentRoleValid) {
        setRole("");
      }
    }
  }, [availableRoles, role, preselectedRole]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
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
    if (!email.trim() && !phone.trim()) {
      setError("Please provide at least an email or phone number");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitAction({
        branchId: Number(branchId),
        role,
        email: email.trim(),
        phone: phone.trim(),
        displayName: displayName.trim(),
      });

      if (result.success) {
        setSuccess(true);
        setInviteResult({ ...(result.data || {}), _message: result.message });
        onSuccess?.(result.data);
        
        // Reset form for next invite
        if (!preselectedBranchId) setBranchId("");
        if (!preselectedRole) setRole("");
        setEmail("");
        setPhone("");
        setDisplayName("");
      } else {
        setError(result.message || "Failed to send invitation");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle form reset
  const handleReset = () => {
    if (!preselectedBranchId) setBranchId("");
    if (!preselectedRole) setRole("");
    setEmail("");
    setPhone("");
    setDisplayName("");
    setError("");
    setSuccess(false);
    setInviteResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger radius-12">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      {/* Success Alert */}
      {success && inviteResult && (
        <div
          className={`alert ${inviteResult?.existingPending ? "alert-info" : "alert-success"} radius-12`}
        >
          <i className={`ri-${inviteResult?.existingPending ? "information-line" : "checkbox-circle-line"} me-2`} />
          <strong>
            {inviteResult?.existingPending
              ? "Pending invitation already on file"
              : "Invitation sent successfully!"}
          </strong>
          {(inviteResult?._message || (inviteResult?.existingPending && !inviteResult?._message)) && (
            <div className="mt-2 small">
              {inviteResult._message ||
                "This person already has a non-expired pending invite for this branch with the same role. Use Resend from your invitations list if they need a new link."}
            </div>
          )}
          <div className="mt-2 small">
            {inviteResult?.expiresAt && (
              <div>
                Expires at: <b>{new Date(inviteResult.expiresAt).toLocaleString()}</b>
              </div>
            )}
            {inviteResult?.devInviteToken && (
              <div className="mt-2">
                <div className="text-muted small mb-1">Dev token:</div>
                <code className="d-block p-2 bg-light radius-8" style={{ fontSize: "12px", wordBreak: "break-all" }}>
                  {inviteResult.devInviteToken}
                </code>
              </div>
            )}
          </div>
          <div className="d-flex gap-2 mt-3">
            <button
              type="button"
              className="btn btn-sm btn-primary radius-12"
              onClick={handleReset}
            >
              <i className="ri-add-line me-1" />
              Invite Another
            </button>
          </div>
        </div>
      )}

      {/* Invite Form */}
      {!success && (
        <form onSubmit={handleSubmit} className="card radius-12">
          <div className="card-header">
            <h6 className="mb-0">
              <i className="ri-user-add-line me-2" />
              Staff Invitation
            </h6>
          </div>
          <div className="card-body p-4">
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
                  disabled={submitting || !!preselectedBranchId}
                >
                  <option value="">Select a branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={String(branch.id)}>
                      {branch.name}
                      {branch.org?.name ? ` (${branch.org.name})` : ""}
                    </option>
                  ))}
                </select>
                {preselectedBranchId && (
                  <small className="text-muted">Branch is pre-selected from context</small>
                )}
                {selectedBranch && (
                  <div className="mt-2 p-2 bg-light radius-8">
                    <small>
                      <strong>Branch:</strong> {selectedBranch.name}
                      {selectedBranch.types && selectedBranch.types.length > 0 && (
                        <span className="text-muted">
                          {" "}
                          •{" "}
                          {selectedBranch.types.map((t) => t.type.name || t.type.code).join(", ")}
                        </span>
                      )}
                    </small>
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
                  disabled={submitting || !branchId || availableRoles.length === 0 || !!preselectedRole}
                >
                  <option value="">
                    {!branchId
                      ? "Select branch first"
                      : availableRoles.length === 0
                      ? "Loading roles..."
                      : "Select role"}
                  </option>
                  {availableRoles.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                {preselectedRole && (
                  <small className="text-muted">Role is pre-selected from context</small>
                )}
                {selectedBranch && availableRoles.length === 0 && (
                  <small className="text-warning">No roles available for this branch type</small>
                )}
              </div>

              {/* Display Name */}
              <div className="col-12 col-md-6">
                <label className="form-label">Display Name</label>
                <input
                  type="text"
                  className="form-control radius-12"
                  placeholder="e.g., John Smith"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={submitting}
                />
                <small className="text-muted">Optional display name for the staff member</small>
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
                <small className="text-muted">At least email or phone is required</small>
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
                <small className="text-muted">At least email or phone is required</small>
              </div>
            </div>

            {/* Form Actions */}
            <div className="d-flex gap-2 mt-4 pt-3 border-top">
              <button
                type="submit"
                className="btn btn-primary radius-12"
                disabled={submitting || !branchId || !role}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Sending...
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
              {showCancelButton && onCancel && (
                <button
                  type="button"
                  className="btn btn-outline-secondary radius-12"
                  onClick={onCancel}
                  disabled={submitting}
                >
                  <i className="ri-close-line me-1" />
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export default UnifiedStaffInviteForm;
