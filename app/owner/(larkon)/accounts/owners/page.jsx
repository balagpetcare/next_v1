"use client";

export default function OwnerAccountsOwnersPage() {
  return (
    <div className="card radius-12">
      <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
        <h6 className="mb-0">Owner Accounts</h6>
        <button className="btn btn-sm btn-primary radius-12" type="button" disabled>
          Add Owner (Next)
        </button>
      </div>

      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-bordered table-hover align-middle">
            <thead>
              <tr>
                <th>#</th>
                <th>Owner</th>
                <th>Contact</th>
                <th>Status</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="text-center text-muted py-4">
                  UI ready (WowDash). Next patch will connect API: <code>GET /api/v1/owner/accounts/owners</code>.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
