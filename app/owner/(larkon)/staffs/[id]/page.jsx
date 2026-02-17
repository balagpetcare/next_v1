"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ownerGet, ownerPatch, ownerDelete } from "@/app/owner/_lib/ownerApi";
import { getEntityConfig } from "@/app/owner/_lib/entityConfig";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import StatusBadge from "@/app/owner/_components/StatusBadge";

export default function OwnerStaffDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");
  const config = getEntityConfig("staff");

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState(null);
  const [err, setErr] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const name = useMemo(() => {
    return (
      row?.user?.profile?.fullName ||
      row?.user?.profile?.displayName ||
      row?.user?.profile?.username ||
      row?.user?.auth?.email ||
      row?.user?.auth?.phone ||
      `Staff #${row?.id || id}`
    );
  }, [row, id]);

  const getInitials = (nameStr) => {
    if (!nameStr) return "??";
    const parts = nameStr.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return nameStr.substring(0, 2).toUpperCase();
  };

  const formatDate = (date) => {
    if (!date) return "—";
    try {
      return new Date(date).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(date);
    }
  };

  const formatDateShort = (date) => {
    if (!date) return "—";
    try {
      return new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(date);
    }
  };

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const j = await ownerGet(`/api/v1/owner/staffs/${id}`);
      setRow(j?.data || j);
    } catch (e) {
      setErr(e?.message || "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus() {
    const currentStatus = row?.status || "ACTIVE";
    const newStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const action = newStatus === "ACTIVE" ? "activate" : "suspend";
    
    if (!confirm(`Are you sure you want to ${action} this staff member?`)) return;
    
    setActionLoading(true);
    setErr("");
    try {
      if (newStatus === "SUSPENDED") {
        await ownerPatch(`/api/v1/owner/staffs/${id}/disable`, {});
      } else {
        await ownerPatch(`/api/v1/owner/staffs/${id}`, { status: "ACTIVE" });
      }
      await load();
    } catch (e) {
      setErr(e?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteMember() {
    if (!confirm("Are you sure you want to delete this staff membership permanently?\n\nThis action cannot be undone.")) return;
    
    setActionLoading(true);
    setErr("");
    try {
      await ownerDelete(`/api/v1/owner/staffs/${id}`);
      router.push("/owner/staffs");
    } catch (e) {
      setErr(e?.message || "Delete failed");
      setActionLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const breadcrumbs = [
    { label: "Home", href: "/owner" },
    { label: "Staffs", href: "/owner/staffs" },
    { label: name, href: `/owner/staffs/${id}` },
  ];

  const getRoleBadgeColor = (role) => {
    const roleUpper = String(role || "").toUpperCase();
    if (roleUpper.includes("MANAGER")) return "info";
    if (roleUpper.includes("ADMIN")) return "primary";
    if (roleUpper.includes("STAFF")) return "secondary";
    if (roleUpper === "SELLER") return "success";
    return "secondary";
  };

  function InfoRow({ label, value, icon, link }) {
    return (
      <div className="col-12 col-md-6 col-lg-4">
        <div className="d-flex align-items-start gap-2">
          {icon && <i className={`${icon} text-muted mt-1`} style={{ fontSize: "16px" }} />}
          <div className="flex-fill">
            <div className="text-muted small mb-1">{label}</div>
            {link ? (
              <Link href={link} className="text-decoration-none fw-semibold text-primary">
                {value || "—"}
                <i className="ri-external-link-line ms-1" style={{ fontSize: "12px" }} />
              </Link>
            ) : (
              <div className="fw-semibold">{value || "—"}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <div className="text-muted mt-3">Loading staff details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (err && !row) {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Staff Details"
          subtitle="View staff member information"
          breadcrumbs={breadcrumbs}
        />
        <div className="alert alert-danger radius-12">
          <i className="ri-error-warning-line me-2" />
          {err}
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary radius-12" onClick={() => router.back()}>
            <i className="ri-arrow-left-line me-1" />
            Back
          </button>
          <button className="btn btn-primary radius-12" onClick={load}>
            <i className="ri-refresh-line me-1" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!row) {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Staff Details"
          subtitle="View staff member information"
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

  const isActive = (row?.status || "ACTIVE") === "ACTIVE";
  const branchId = row?.branchId || row?.branch?.id;
  const orgId = row?.orgId || row?.org?.id || row?.organizationId || row?.organization?.id;

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title={name}
        subtitle={`Staff member details • ID: ${row.id}`}
        breadcrumbs={breadcrumbs}
        actions={[
          <button
            key="refresh"
            className="btn btn-outline-secondary radius-12"
            onClick={load}
            disabled={loading || actionLoading}
          >
            <i className="ri-refresh-line me-1" />
            Refresh
          </button>,
          config?.editPath && (
            <Link
              key="edit"
              href={typeof config.editPath === "function" ? config.editPath(id) : config.editPath.replace("[id]", id)}
              className="btn btn-primary radius-12"
            >
              <i className="ri-edit-line me-1" />
              Edit
            </Link>
          ),
          <button
            key="toggle"
            className={`btn radius-12 ${isActive ? "btn-warning" : "btn-success"}`}
            onClick={toggleStatus}
            disabled={actionLoading}
          >
            <i className={`ri-${isActive ? "pause" : "play"}-line me-1`} />
            {isActive ? "Suspend" : "Activate"}
          </button>,
          <button
            key="delete"
            className="btn btn-outline-danger radius-12"
            onClick={deleteMember}
            disabled={actionLoading}
          >
            <i className="ri-delete-bin-line me-1" />
            Delete
          </button>,
          <button
            key="back"
            className="btn btn-outline-secondary radius-12"
            onClick={() => router.back()}
          >
            <i className="ri-arrow-left-line me-1" />
            Back
          </button>,
        ].filter(Boolean)}
      />

      {err && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {err}
        </div>
      )}

      {/* Overview Card */}
      <div className="card radius-12 mb-24">
        <div className="card-body p-24">
          <div className="d-flex align-items-center gap-3 mb-16">
            <div
              className="bg-primary-50 text-primary-600 rounded-circle d-flex align-items-center justify-content-center"
              style={{ width: "64px", height: "64px", fontSize: "24px", fontWeight: "600" }}
            >
              {getInitials(name)}
            </div>
            <div className="flex-fill">
              <h5 className="mb-1">{name}</h5>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <StatusBadge status={row?.status || row?.membershipStatus || "ACTIVE"} />
                <Badge tone={getRoleBadgeColor(row?.role)}>
                  {String(row?.role || "—").replace(/_/g, " ")}
                </Badge>
                <span className="text-muted small">ID: {row.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Membership Information */}
      <div className="card radius-12 mb-24">
        <div className="card-header">
          <h6 className="mb-0">
            <i className="ri-team-line me-2" />
            Membership Information
          </h6>
        </div>
        <div className="card-body p-24">
          <div className="row g-3">
            <InfoRow
              label="Organization"
              value={row?.org?.name || row?.organization?.name || (orgId ? `Organization #${orgId}` : "—")}
              icon="ri-building-line"
              link={orgId ? `/owner/organizations/${orgId}` : null}
            />
            <InfoRow
              label="Branch"
              value={row?.branch?.name || (branchId ? `Branch #${branchId}` : "—")}
              icon="ri-store-line"
              link={branchId ? `/owner/branches/${branchId}` : null}
            />
            <InfoRow
              label="Role"
              value={String(row?.role || "—").replace(/_/g, " ")}
              icon="ri-user-settings-line"
            />
            <InfoRow
              label="Status"
              value={<StatusBadge status={row?.status || row?.membershipStatus || "ACTIVE"} />}
              icon="ri-checkbox-circle-line"
            />
            <InfoRow
              label="Membership ID"
              value={String(row.id)}
              icon="ri-fingerprint-line"
            />
            {row?.createdAt && (
              <InfoRow
                label="Created"
                value={formatDate(row.createdAt)}
                icon="ri-calendar-line"
              />
            )}
            {row?.updatedAt && (
              <InfoRow
                label="Last Updated"
                value={formatDate(row.updatedAt)}
                icon="ri-time-line"
              />
            )}
          </div>
        </div>
      </div>

      {/* User Profile Information */}
      <div className="card radius-12 mb-24">
        <div className="card-header">
          <h6 className="mb-0">
            <i className="ri-user-line me-2" />
            User Profile
          </h6>
        </div>
        <div className="card-body p-24">
          <div className="row g-3">
            {row?.user?.profile?.fullName && (
              <InfoRow
                label="Full Name"
                value={row.user.profile.fullName}
                icon="ri-user-line"
              />
            )}
            {row?.user?.profile?.displayName && (
              <InfoRow
                label="Display Name"
                value={row.user.profile.displayName}
                icon="ri-user-smile-line"
              />
            )}
            {row?.user?.profile?.username && (
              <InfoRow
                label="Username"
                value={row.user.profile.username}
                icon="ri-at-line"
              />
            )}
            {row?.user?.auth?.email && (
              <InfoRow
                label="Email"
                value={
                  <a href={`mailto:${row.user.auth.email}`} className="text-decoration-none">
                    {row.user.auth.email}
                  </a>
                }
                icon="ri-mail-line"
              />
            )}
            {row?.user?.auth?.phone && (
              <InfoRow
                label="Phone"
                value={
                  <a href={`tel:${row.user.auth.phone}`} className="text-decoration-none">
                    {row.user.auth.phone}
                  </a>
                }
                icon="ri-phone-line"
              />
            )}
            {row?.user?.id && (
              <InfoRow
                label="User ID"
                value={String(row.user.id)}
                icon="ri-fingerprint-line"
              />
            )}
            {row?.user?.createdAt && (
              <InfoRow
                label="Account Created"
                value={formatDateShort(row.user.createdAt)}
                icon="ri-calendar-line"
              />
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card radius-12">
        <div className="card-header">
          <h6 className="mb-0">
            <i className="ri-links-line me-2" />
            Quick Links
          </h6>
        </div>
        <div className="card-body p-24">
          <div className="d-flex flex-wrap gap-2">
            {branchId && (
              <Link
                href={`/owner/branches/${branchId}`}
                className="btn btn-outline-primary radius-12"
              >
                <i className="ri-store-line me-1" />
                View Branch
              </Link>
            )}
            {branchId && (
              <Link
                href={`/owner/branches/${branchId}/team`}
                className="btn btn-outline-info radius-12"
              >
                <i className="ri-team-line me-1" />
                Branch Team
              </Link>
            )}
            {orgId && (
              <Link
                href={`/owner/organizations/${orgId}`}
                className="btn btn-outline-primary radius-12"
              >
                <i className="ri-building-line me-1" />
                View Organization
              </Link>
            )}
            <Link
              href="/owner/staffs"
              className="btn btn-outline-secondary radius-12"
            >
              <i className="ri-list-check me-1" />
              All Staffs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, tone = "secondary" }) {
  const cls =
    tone === "success"
      ? "badge text-bg-success"
      : tone === "danger"
      ? "badge text-bg-danger"
      : tone === "warning"
      ? "badge text-bg-warning"
      : tone === "info"
      ? "badge text-bg-info"
      : tone === "primary"
      ? "badge text-bg-primary"
      : "badge text-bg-secondary";
  return <span className={cls}>{children}</span>;
}
