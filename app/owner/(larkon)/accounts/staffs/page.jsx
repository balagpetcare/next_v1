"use client";

import Link from "next/link";

export default function OwnerAccountsStaffsPage() {
  return (
    <div className="card radius-12">
      <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
        <h6 className="mb-0">Staff Accounts</h6>
        <Link className="btn btn-sm btn-primary radius-12" href="/owner/staff">
          Manage Staffs
        </Link>
      </div>

      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-bordered table-hover align-middle">
            <thead>
              <tr>
                <th>#</th>
                <th>Staff</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Status</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="text-center text-muted py-4">
                  UI ready (WowDash). Next patch will connect API: <code>GET /api/v1/owner/accounts/staffs</code>.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
