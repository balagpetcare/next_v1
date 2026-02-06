"use client";

import Link from "next/link";
import StatusBadge from "@/app/owner/_components/StatusBadge";

/**
 * Organization card component for card view display
 */
export default function OrganizationCard({ organization, config }) {
  const detailHref = config?.detailPath
    ? typeof config.detailPath === "function"
      ? config.detailPath(organization.id)
      : config.detailPath.replace("[id]", organization.id)
    : `/owner/organizations/${organization.id}`;

  return (
    <div className="card radius-12 h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h6 className="mb-1">
              <Link
                href={detailHref}
                className="text-decoration-none text-dark"
              >
                {organization.name || `Organization #${organization.id}`}
              </Link>
            </h6>
            <small className="text-muted">ID: {organization.id}</small>
          </div>
          <StatusBadge status={organization.status} />
        </div>

        <div className="mb-2">
          <small className="text-muted d-block">Verification</small>
          <StatusBadge
            status={organization.verificationStatus || "DRAFT"}
          />
        </div>

        {organization.email && (
          <div className="mb-2">
            <small className="text-muted d-block">Email</small>
            <div className="text-dark">{organization.email}</div>
          </div>
        )}

        {organization.supportPhone && (
          <div className="mb-2">
            <small className="text-muted d-block">Phone</small>
            <div className="text-dark">{organization.supportPhone}</div>
          </div>
        )}

        <div className="d-flex gap-2 mt-3 pt-3 border-top">
          <Link
            href={detailHref}
            className="btn btn-sm btn-outline-primary radius-12 flex-fill"
          >
            View
          </Link>
          {config?.editPath && (
            <Link
              href={
                typeof config.editPath === "function"
                  ? config.editPath(organization.id)
                  : config.editPath.replace("[id]", organization.id)
              }
              className="btn btn-sm btn-outline-secondary radius-12 flex-fill"
            >
              Edit
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
