"use client";

type QueueItem = {
  id: number;
  tokenNo?: string | null;
  status?: string;
  priorityTag?: string;
  petName?: string;
  ownerName?: string;
  serviceName?: string | null;
  branchName?: string | null;
  scheduledStartAt?: string | null;
};

export function DoctorQueueWidget({ queue }: { queue: QueueItem[] }) {
  return (
    <div className="card radius-12 h-100">
      <div className="card-header d-flex align-items-center justify-content-between">
        <h6 className="mb-0">Live Queue</h6>
        <span className="badge bg-primary">{queue.length}</span>
      </div>
      <div className="card-body">
        {queue.length === 0 ? (
          <p className="text-muted small mb-0">No queue items right now.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Patient</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((row) => (
                  <tr key={row.id}>
                    <td>{row.tokenNo ?? "-"}</td>
                    <td>
                      <div className="fw-semibold">{row.petName ?? "—"}</div>
                      <div className="small text-muted">
                        {row.ownerName ?? "—"}{row.serviceName ? ` • ${row.serviceName}` : ""}
                      </div>
                    </td>
                    <td>
                      <span className={`badge radius-8 ${row.priorityTag === "EMERGENCY" ? "bg-danger" : "bg-info"}`}>
                        {row.status ?? "WAITING"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
