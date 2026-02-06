// @ts-nocheck
"use client";

import Link from "next/link";

export default function OwnerDashboard() {
  return (
    <div className="dashboard-main-body">
      <div className="row g-3">
        <div className="col-12">
          <div className="card radius-12">
            <div className="card-body">
              <h5 className="mb-1">Owner Dashboard</h5>
              <div className="text-secondary-light">
                Manage your organizations, branches and staff from the left sidebar.
              </div>

              <div className="d-flex gap-2 flex-wrap mt-3">
                <Link className="btn btn-primary radius-12" href="/owner/organizations">
                  Organizations
                </Link>
                <Link className="btn btn-outline-primary radius-12" href="/owner/branches">
                  Branches
                </Link>
                <Link className="btn btn-outline-primary radius-12" href="/owner/staff">
                  Staff
                </Link>
                <Link className="btn btn-outline-secondary radius-12" href="/owner/kyc">
                  KYC
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
