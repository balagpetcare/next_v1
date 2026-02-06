"use client";

import Link from "next/link";

export default function ClinicAppointmentsPage() {
  return (
    <div className="dashboard-main-body">
      <div className="card radius-12">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h6 className="mb-0">Appointments</h6>
          <Link href="/clinic" className="btn btn-sm btn-outline-primary radius-12">
            Back
          </Link>
        </div>

        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered table-hover align-middle">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Pet</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No data yet (MVP placeholder). This page is wired for role-based menu.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <small className="text-muted d-block">
            Later: connect to API and render status badges (PENDING/CONFIRMED/DONE/CANCELLED).
          </small>
        </div>
      </div>
    </div>
  );
}
