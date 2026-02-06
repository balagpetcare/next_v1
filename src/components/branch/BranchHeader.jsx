"use client";

import Link from "next/link";

/**
 * BranchHeader – top bar for /staff/branch/[branchId].
 * WowDash style: branch name, type badge, role badge, branch switcher link.
 */
export default function BranchHeader({ branch, myAccess, branchId }) {
  const name = branch?.name ?? "Branch";
  const typeLabel = branch?.type ?? (branch?.types?.[0]?.type?.code ?? branch?.types?.[0]?.type?.nameEn) ?? "—";
  const role = myAccess?.role ?? "—";

  return (
    <div className="card radius-12 mb-24">
      <div className="card-body py-20">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-16">
          <div className="d-flex flex-wrap align-items-center gap-12">
            <h5 className="mb-0 fw-semibold">{name}</h5>
            <span className="badge bg-primary-100 text-primary-600">{typeLabel}</span>
            <span className="badge bg-secondary-100 text-secondary-600">{role}</span>
          </div>
          <div>
            <Link
              href="/staff/branch"
              className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-8"
            >
              <i className="ri-arrow-left-right-line" />
              Switch branch
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
