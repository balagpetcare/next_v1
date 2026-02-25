"use client";

export default function ProducerTableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="table-responsive">
      <table className="table table-bordered align-middle mb-0">
        <thead className="table-light">
          <tr>
            {Array.from({ length: cols }, (_, i) => (
              <th key={i}>
                <span className="placeholder col-12" style={{ minWidth: 60 }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, ri) => (
            <tr key={ri}>
              {Array.from({ length: cols }, (_, ci) => (
                <td key={ci}>
                  <span className="placeholder col-12" style={{ minWidth: 40 }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
