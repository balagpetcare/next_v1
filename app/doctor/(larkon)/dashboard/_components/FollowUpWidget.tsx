"use client";

import Link from "next/link";

export function FollowUpWidget({ items }: { items: any[] }) {
  return (
    <div className="card radius-12 h-100">
      <div className="card-header d-flex align-items-center justify-content-between">
        <h6 className="mb-0">Follow-ups Due</h6>
        <Link href="/doctor/follow-ups" className="btn btn-sm btn-outline-primary radius-12">
          Open
        </Link>
      </div>
      <div className="card-body">
        {items.length === 0 ? (
          <p className="small text-muted mb-0">No follow-ups due today.</p>
        ) : (
          <ul className="list-group list-group-flush">
            {items.slice(0, 6).map((row) => (
              <li key={row.id} className="list-group-item px-0">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="fw-semibold">{row.pet?.name ?? "Pet"}</div>
                    <div className="small text-muted">
                      {row.patient?.profile?.displayName ?? "Owner"} • {row.branch?.name ?? "Clinic"}
                    </div>
                  </div>
                  <div className="small text-muted">
                    {row.followUpDate ? new Date(row.followUpDate).toLocaleDateString() : "—"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
