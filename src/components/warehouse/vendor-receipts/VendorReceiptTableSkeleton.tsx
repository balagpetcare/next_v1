"use client";

/** Fixed layout to match loaded table — avoids CLS when list data arrives. */
export function VendorReceiptTableSkeleton() {
  const rows = Array.from({ length: 10 }, (_, i) => i);
  return (
    <div className="card radius-12 border">
      <div className="table-responsive" style={{ minHeight: 420 }}>
        <table className="table table-sm align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: "8%" }}>GRN</th>
              <th style={{ width: "18%" }}>Vendor</th>
              <th style={{ width: "12%" }}>PO</th>
              <th className="text-end" style={{ width: "8%" }}>
                Lines
              </th>
              <th className="text-end" style={{ width: "14%" }}>
                Qty
              </th>
              <th style={{ width: "12%" }}>Status</th>
              <th style={{ width: "16%" }}>Activity</th>
              <th className="text-center" style={{ width: "6%" }}>
                Δ
              </th>
              <th className="text-end" style={{ width: "6%" }} />
            </tr>
          </thead>
          <tbody className="placeholder-glow">
            {rows.map((i) => (
              <tr key={i}>
                <td>
                  <span className="placeholder col-8 rounded" />
                </td>
                <td>
                  <span className="placeholder col-11 rounded" />
                </td>
                <td>
                  <span className="placeholder col-9 rounded" />
                </td>
                <td className="text-end">
                  <span className="placeholder col-5 rounded ms-auto d-block" />
                </td>
                <td className="text-end">
                  <span className="placeholder col-6 rounded ms-auto d-block" />
                </td>
                <td>
                  <span className="placeholder col-10 rounded" />
                </td>
                <td>
                  <span className="placeholder col-12 rounded" />
                </td>
                <td className="text-center">
                  <span className="placeholder col-4 rounded mx-auto d-block" />
                </td>
                <td className="text-end">
                  <span className="placeholder col-6 rounded ms-auto d-block" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
