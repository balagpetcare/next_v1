"use client";

type Props = {
  fees: { current?: any; serviceFees?: Array<{ serviceId: number; serviceName?: string; fee: number | null }> };
  loading: boolean;
};

export default function FeeInfoPanel({ fees, loading }: Props) {
  if (loading) {
    return <p className="text-muted small">Loading fees…</p>;
  }
  const current = fees?.current ?? {};
  const rows = fees?.serviceFees ?? [];
  return (
    <div className="small">
      <h6 className="text-secondary">Consultation defaults</h6>
      <ul className="list-unstyled mb-3">
        <li>Consultation: {current.consultation != null ? `৳${Number(current.consultation).toLocaleString()}` : "—"}</li>
        <li>Follow-up: {current.followUp != null ? `৳${Number(current.followUp).toLocaleString()}` : "—"}</li>
        <li>Emergency: {current.emergency != null ? `৳${Number(current.emergency).toLocaleString()}` : "—"}</li>
      </ul>
      <h6 className="text-secondary">Per-service fees</h6>
      {rows.length === 0 ? (
        <p className="text-muted mb-0">No per-service fee rows.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Service</th>
                <th className="text-end">Fee</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 40).map((r) => (
                <tr key={r.serviceId}>
                  <td>{r.serviceName ?? `#${r.serviceId}`}</td>
                  <td className="text-end">{r.fee != null ? `৳${Number(r.fee).toLocaleString()}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 40 && <p className="text-muted mt-2 mb-0">Showing 40 of {rows.length}.</p>}
        </div>
      )}
    </div>
  );
}
