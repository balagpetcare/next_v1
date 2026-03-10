"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ownerGet, ownerPatch, ownerPost } from "@/app/owner/_lib/ownerApi";
import { getEntityConfig } from "@/app/owner/_lib/entityConfig";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import StatusBadge from "@/app/owner/_components/StatusBadge";

export default function OwnerStaffEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");
  const config = getEntityConfig("staff");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form state
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [branchId, setBranchId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [branches, setBranches] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [accessRole, setAccessRole] = useState("");
  const [accessRoleSaving, setAccessRoleSaving] = useState(false);

  // Load staff data and branches
  useEffect(() => {
    if (!id) return;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [staffRes, branchesRes] = await Promise.all([
          ownerGet(`/api/v1/owner/staffs/${id}`),
          ownerGet("/api/v1/owner/branches"),
        ]);
        const data = staffRes?.data || staffRes;
        setStaff(data);
        setRole(data?.role || "");
        setStatus(data?.status || data?.membershipStatus || "ACTIVE");
        setBranchId(data?.branchId != null ? String(data.branchId) : data?.branch?.id != null ? String(data.branch.id) : "");
        setDisplayName(data?.user?.profile?.displayName ?? "");
        setEmail(data?.user?.auth?.email ?? "");
        setPhone(data?.user?.auth?.phone ?? "");
        setAccessRole(data?.branchAccess?.role ?? data?.role ?? "");

        const branchList = branchesRes?.data ?? branchesRes;
        setBranches(Array.isArray(branchList) ? branchList : []);
      } catch (e) {
        setError(e?.message || "Failed to load staff");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  // Check for changes (membership + contact)
  useEffect(() => {
    if (!staff) return;
    const origBranchId = staff?.branchId != null ? String(staff.branchId) : staff?.branch?.id != null ? String(staff.branch.id) : "";
    const origRole = staff?.role || "";
    const origStatus = staff?.status || staff?.membershipStatus || "ACTIVE";
    const origDisplayName = staff?.user?.profile?.displayName ?? "";
    const origEmail = staff?.user?.auth?.email ?? "";
    const origPhone = staff?.user?.auth?.phone ?? "";
    setHasChanges(
      role !== origRole ||
        status !== origStatus ||
        branchId !== origBranchId ||
        displayName !== origDisplayName ||
        email !== origEmail ||
        phone !== origPhone
    );
  }, [role, status, branchId, displayName, email, phone, staff]);

  // Determine available roles based on branch type
  const roleOptions = useMemo(() => {
    if (!staff) return [];
    
    const branch = staff?.branch;
    const branchTypes = branch?.types || [];
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
  }, [staff]);

  const statusOptions = [
    { value: "ACTIVE", label: "Active" },
    { value: "SUSPENDED", label: "Suspended" },
  ];

  // Full role list for dashboard access dropdown
  const accessRoleOptions = [
    { value: "BRANCH_MANAGER", label: "Branch Manager" },
    { value: "BRANCH_STAFF", label: "Branch Staff" },
    { value: "SELLER", label: "Seller" },
    { value: "DELIVERY_MANAGER", label: "Delivery Manager" },
    { value: "DELIVERY_STAFF", label: "Delivery Staff" },
    { value: "ACCOUNTANT", label: "Accountant" },
    { value: "CLINIC_STAFF", label: "Clinic Staff" },
  ];

  const handleAccessRoleChange = async (newRole) => {
    if (!staff?.branchAccess?.id || !newRole) return;
    setAccessRoleSaving(true);
    setError("");
    try {
      await ownerPost(`/api/v1/owner/branch-access/${staff.branchAccess.id}/role`, { role: newRole });
      setAccessRole(newRole);
      setStaff((prev) => ({
        ...prev,
        branchAccess: prev?.branchAccess ? { ...prev.branchAccess, role: newRole } : null,
      }));
    } catch (e) {
      setError(e?.message || "Failed to update access role");
    } finally {
      setAccessRoleSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validation
    if (!role) {
      setError("Role is required");
      return;
    }

    if (!status) {
      setError("Status is required");
      return;
    }

    // Confirmation for status change to SUSPENDED
    if (status === "SUSPENDED" && staff?.status !== "SUSPENDED") {
      if (!confirm("Are you sure you want to suspend this staff member?")) {
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        role: role.trim(),
        status: status,
      };
      if (branchId && branchId !== String(staff?.branchId ?? staff?.branch?.id ?? "")) {
        const numBranchId = parseInt(branchId, 10);
        if (!isNaN(numBranchId)) payload.branchId = numBranchId;
      }
      if (displayName !== undefined) payload.displayName = displayName.trim() || undefined;
      if (email !== undefined) payload.email = email.trim() || undefined;
      if (phone !== undefined) payload.phone = phone.trim() || undefined;

      await ownerPatch(`/api/v1/owner/staffs/${id}`, payload);
      setSuccess(true);
      
      // Redirect to detail page after short delay
      setTimeout(() => {
        router.push(`/owner/staffs/${id}`);
      }, 1500);
    } catch (e) {
      setError(e?.message || "Failed to update staff");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!staff) return;
    setRole(staff?.role || "");
    setStatus(staff?.status || staff?.membershipStatus || "ACTIVE");
    setBranchId(staff?.branchId != null ? String(staff.branchId) : staff?.branch?.id != null ? String(staff.branch.id) : "");
    setDisplayName(staff?.user?.profile?.displayName ?? "");
    setEmail(staff?.user?.auth?.email ?? "");
    setPhone(staff?.user?.auth?.phone ?? "");
    setAccessRole(staff?.branchAccess?.role ?? staff?.role ?? "");
    setError("");
    setSuccess(false);
  };

  const getName = () => {
    if (!staff) return "Staff";
    return (
      staff?.user?.profile?.fullName ||
      staff?.user?.profile?.displayName ||
      staff?.user?.profile?.username ||
      staff?.user?.auth?.email ||
      `Staff #${staff.id}`
    );
  };

  const breadcrumbs = [
    { label: "Home", href: "/owner" },
    { label: "Staffs", href: "/owner/staffs" },
    { label: getName(), href: `/owner/staffs/${id}` },
    { label: "Edit", href: `/owner/staffs/${id}/edit` },
  ];

  if (loading) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <div className="text-muted mt-3">Loading staff information...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !staff) {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Edit Staff"
          subtitle="Update staff member information"
          breadcrumbs={breadcrumbs}
        />
        <div className="alert alert-danger radius-12">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary radius-12" onClick={() => router.back()}>
            <i className="ri-arrow-left-line me-1" />
            Back
          </button>
          <button className="btn btn-primary radius-12" onClick={() => window.location.reload()}>
            <i className="ri-refresh-line me-1" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Edit Staff"
          subtitle="Update staff member information"
          breadcrumbs={breadcrumbs}
        />
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <i className="ri-user-line fs-1 text-muted mb-3 d-block" />
            <div className="text-muted">Staff member not found.</div>
            <button className="btn btn-outline-primary radius-12 mt-3" onClick={() => router.back()}>
              <i className="ri-arrow-left-line me-1" />
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Edit Staff"
        subtitle={`Update information for ${getName()}`}
        breadcrumbs={breadcrumbs}
        actions={[
          <Link
            key="view"
            href={`/owner/staffs/${id}`}
            className="btn btn-outline-primary radius-12"
          >
            <i className="ri-eye-line me-1" />
            View Details
          </Link>,
          <button
            key="cancel"
            className="btn btn-outline-secondary radius-12"
            onClick={() => router.back()}
          >
            <i className="ri-close-line me-1" />
            Cancel
          </button>,
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success radius-12 mb-24">
          <i className="ri-checkbox-circle-line me-2" />
          Staff updated successfully! Redirecting...
        </div>
      )}

      {/* Current Info Card */}
      <div className="card radius-12 mb-24">
        <div className="card-header">
          <h6 className="mb-0">
            <i className="ri-information-line me-2" />
            Current Information
          </h6>
        </div>
        <div className="card-body p-24">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <div className="text-muted small mb-1">Name</div>
              <div className="fw-semibold">{getName()}</div>
            </div>
            <div className="col-12 col-md-3">
              <div className="text-muted small mb-1">Current Role</div>
              <div>
                <span className="badge text-bg-secondary">
                  {String(staff?.role || "—").replace(/_/g, " ")}
                </span>
              </div>
            </div>
            <div className="col-12 col-md-3">
              <div className="text-muted small mb-1">Current Status</div>
              <div>
                <StatusBadge status={staff?.status || staff?.membershipStatus || "ACTIVE"} />
              </div>
            </div>
            {staff?.branch?.name && (
              <div className="col-12 col-md-6">
                <div className="text-muted small mb-1">Branch</div>
                <div className="fw-semibold">{staff.branch.name}</div>
              </div>
            )}
            {staff?.org?.name && (
              <div className="col-12 col-md-6">
                <div className="text-muted small mb-1">Organization</div>
                <div className="fw-semibold">{staff.org.name}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Form Card */}
      <div className="card radius-12 mb-24">
        <div className="card-header">
          <h6 className="mb-0">
            <i className="ri-edit-line me-2" />
            Edit Staff Information
          </h6>
        </div>
        <div className="card-body p-24">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              {/* Role Field */}
              <div className="col-12 col-md-6">
                <label className="form-label">
                  Role <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select radius-12"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  disabled={saving}
                >
                  <option value="">Select Role</option>
                  {roleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <small className="text-muted">
                  Select the role for this staff member
                </small>
              </div>

              {/* Status Field */}
              <div className="col-12 col-md-6">
                <label className="form-label">
                  Status <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select radius-12"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  required
                  disabled={saving}
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <small className="text-muted">
                  {status === "SUSPENDED" && (
                    <span className="text-warning">
                      <i className="ri-alert-line me-1" />
                      Suspending will restrict access
                    </span>
                  )}
                  {status === "ACTIVE" && "Active staff can access the system"}
                </small>
              </div>

              {/* Branch */}
              <div className="col-12 col-md-6">
                <label className="form-label">Branch</label>
                <select
                  className="form-select radius-12"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  disabled={saving}
                >
                  <option value="">Select branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.name || `Branch #${b.id}`}
                    </option>
                  ))}
                </select>
                <small className="text-muted">Assign or change the branch for this staff member</small>
              </div>
            </div>

            {/* Contact / Profile */}
            <div className="row g-3 mt-2">
              <div className="col-12">
                <h6 className="mb-2">
                  <i className="ri-user-smile-line me-2" />
                  Contact & profile
                </h6>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">Display name</label>
                <input
                  type="text"
                  className="form-control radius-12"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={saving}
                  placeholder="Display name"
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control radius-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={saving}
                  placeholder="email@example.com"
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  className="form-control radius-12"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={saving}
                  placeholder="Phone number"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="d-flex gap-2 mt-24 pt-24 border-top">
              <button
                type="submit"
                className="btn btn-primary radius-12"
                disabled={saving || !hasChanges}
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="ri-save-line me-1" />
                    Save Changes
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary radius-12"
                onClick={handleReset}
                disabled={saving || !hasChanges}
              >
                <i className="ri-refresh-line me-1" />
                Reset
              </button>
              <Link
                href={`/owner/staffs/${id}`}
                className="btn btn-outline-secondary radius-12"
              >
                <i className="ri-close-line me-1" />
                Cancel
              </Link>
            </div>

            {!hasChanges && (
              <div className="alert alert-info radius-12 mt-3 mb-0">
                <i className="ri-information-line me-2" />
                No changes made
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Dashboard access */}
      <div className="card radius-12 mb-24">
        <div className="card-header">
          <h6 className="mb-0">
            <i className="ri-lock-keyhole-line me-2" />
            Dashboard access
          </h6>
        </div>
        <div className="card-body p-24">
          {staff?.branchAccess ? (
            <div className="row g-3 align-items-end">
              <div className="col-12 col-md-4">
                <label className="form-label">Access status</label>
                <div className="fw-semibold">
                  <span className="badge text-bg-secondary me-1">{String(staff.branchAccess.status || "—")}</span>
                  {staff.branchAccess.expiresAt && (
                    <span className="text-muted small ms-1">
                      Expires {new Date(staff.branchAccess.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">Dashboard role</label>
                <select
                  className="form-select radius-12"
                  value={accessRole || ""}
                  onChange={(e) => handleAccessRoleChange(e.target.value)}
                  disabled={accessRoleSaving}
                >
                  {accessRoleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {accessRoleSaving && (
                  <small className="text-muted">
                    <span className="spinner-border spinner-border-sm me-1" />
                    Updating...
                  </small>
                )}
              </div>
              <div className="col-12 col-md-4">
                {staff?.user?.id && (
                  <Link
                    href={`/owner/staff-access/staff/${staff.user.id}`}
                    className="btn btn-outline-primary radius-12"
                  >
                    <i className="ri-lock-keyhole-line me-1" />
                    Manage access
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-muted mb-2">No dashboard access record for this branch.</p>
              {staff?.user?.id && (
                <Link
                  href={`/owner/staff-access/staff/${staff.user.id}`}
                  className="btn btn-outline-primary radius-12"
                >
                  <i className="ri-lock-keyhole-line me-1" />
                  Manage access
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Help Card */}
      <div className="card radius-12">
        <div className="card-header">
          <h6 className="mb-0">
            <i className="ri-question-line me-2" />
            About Editing Staff
          </h6>
        </div>
        <div className="card-body p-24">
          <div className="text-muted small">
            <ul className="mb-0 ps-3">
              <li>Role determines the permissions and access level for the staff member</li>
              <li>Changing status to "Suspended" will immediately restrict access</li>
              <li>Changes take effect immediately after saving</li>
              <li>You can always revert changes by editing again</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
