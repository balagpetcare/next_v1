"use client";

import Link from "next/link";

export function SurgeryWidget({ items }: { items: any[] }) {
  return (
    <div className="card radius-12 h-100">
      <div className="card-header d-flex align-items-center justify-content-between">
        <h6 className="mb-0">Surgery / Procedure Cases</h6>
        <Link href="/doctor/cases" className="btn btn-sm btn-outline-primary radius-12">
          View All
        </Link>
      </div>
      <div className="card-body">
        {items.length === 0 ? (
          <p className="small text-muted mb-0">No active cases.</p>
        ) : (
          <ul className="list-group list-group-flush">
            {items.slice(0, 6).map((row) => (
              <li key={row.id} className="list-group-item px-0">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="fw-semibold">{row.pet?.name ?? "Case"}</div>
                    <div className="small text-muted">
                      {row.surgeryPackage?.packageName ?? "Procedure"} • {row.branch?.name ?? "Clinic"}
                    </div>
                  </div>
                  <span className={`badge radius-8 ${row.status === "COMPLETED" ? "bg-success" : "bg-warning text-dark"}`}>
                    {row.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
