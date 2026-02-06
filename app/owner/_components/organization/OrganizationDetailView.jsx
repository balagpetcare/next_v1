"use client";

import Link from "next/link";
import StatusBadge from "@/app/owner/_components/StatusBadge";
import StatusTimeline from "@/app/owner/_components/StatusTimeline";

/**
 * Organization detail view component
 * Displays comprehensive organization information
 */
export default function OrganizationDetailView({
  organization,
  config,
  onEdit,
}) {
  if (!organization) return null;

  const formatDate = (date) => {
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

  const InfoRow = ({ label, value, col = "col-md-4" }) => (
    <div className={col}>
      <div className="text-secondary mb-1" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div className="fw-semibold">{value || "—"}</div>
    </div>
  );

  return (
    <div className="d-flex flex-column gap-3">
      {/* Overview Section */}
      <div className="card radius-12">
        <div className="card-body p-24">
          <div className="d-flex justify-content-between align-items-start mb-16">
            <div>
              <h6 className="mb-0">Overview</h6>
              <div className="text-muted mt-6" style={{ fontSize: 12 }}>
                Organization information
              </div>
            </div>
            <div className="d-flex gap-2">
              <StatusBadge status={organization.status} />
              <StatusBadge
                status={organization.verificationStatus || "DRAFT"}
              />
            </div>
          </div>

          <div className="mb-16">
            <StatusTimeline status={organization.status} />
          </div>

          <div className="row g-3">
            <InfoRow
              label="Organization Name"
              value={organization.name}
              col="col-md-6"
            />
            <InfoRow
              label="Support Phone"
              value={organization.supportPhone}
              col="col-md-3"
            />
            <InfoRow label="Email" value={organization.email} col="col-md-3" />
            <InfoRow
              label="Created"
              value={formatDate(organization.createdAt)}
              col="col-md-6"
            />
            <InfoRow
              label="Last Updated"
              value={formatDate(organization.updatedAt)}
              col="col-md-6"
            />
          </div>
        </div>
      </div>

      {/* Location Section */}
      {organization.addressJson && (
        <div className="card radius-12">
          <div className="card-body p-24">
            <h6 className="mb-12">Location</h6>
            <div className="text-dark">
              {organization.addressJson?.fullPathText ||
                organization.addressJson?.locationText ||
                "—"}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="d-flex gap-2">
        {onEdit && (
          <button
            className="btn btn-primary radius-12"
            onClick={onEdit}
          >
            <i className="ri-edit-line me-1" />
            Edit Organization
          </button>
        )}
        {config?.editPath && (
          <Link
            href={
              typeof config.editPath === "function"
                ? config.editPath(organization.id)
                : config.editPath.replace("[id]", organization.id)
            }
            className="btn btn-outline-primary radius-12"
          >
            <i className="ri-edit-line me-1" />
            Edit
          </Link>
        )}
        <Link
          href={config?.listPath || "/owner/organizations"}
          className="btn btn-outline-secondary radius-12"
        >
          <i className="ri-arrow-left-line me-1" />
          Back to List
        </Link>
      </div>
    </div>
  );
}
