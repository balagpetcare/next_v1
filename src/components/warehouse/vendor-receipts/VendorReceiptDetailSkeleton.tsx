"use client";

/** Matches detail page block heights to reduce CLS while GRN loads. */
export function VendorReceiptDetailSkeleton() {
  return (
    <div className="container-fluid py-3">
      <div className="placeholder-glow mb-3">
        <span className="placeholder col-4 col-md-3 rounded" style={{ height: 14 }} />
      </div>
      <div className="d-flex flex-wrap justify-content-between gap-2 mb-4">
        <div className="d-flex gap-2 align-items-center">
          <span className="placeholder rounded" style={{ width: 100, height: 31 }} />
          <span className="placeholder rounded" style={{ width: 160, height: 24 }} />
        </div>
        <div className="d-flex gap-1">
          <span className="placeholder rounded" style={{ width: 96, height: 31 }} />
          <span className="placeholder rounded" style={{ width: 120, height: 31 }} />
        </div>
      </div>
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card radius-12 border">
            <div className="card-header py-2 px-3">
              <span className="placeholder col-5 rounded" style={{ height: 16 }} />
            </div>
            <div className="card-body px-3 py-3">
              <span className="placeholder col-12 rounded mb-2" style={{ height: 14 }} />
              <span className="placeholder col-10 rounded mb-2" style={{ height: 14 }} />
              <span className="placeholder col-8 rounded" style={{ height: 14 }} />
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card radius-12 border">
            <div className="card-header py-2 px-3">
              <span className="placeholder col-6 rounded" style={{ height: 16 }} />
            </div>
            <div className="card-body px-3 py-3">
              <span className="placeholder col-12 rounded mb-2" style={{ height: 14 }} />
              <span className="placeholder col-11 rounded mb-2" style={{ height: 14 }} />
              <span className="placeholder col-9 rounded" style={{ height: 14 }} />
            </div>
          </div>
        </div>
      </div>
      <div className="card radius-12 border mb-4">
        <div className="card-header py-2 px-3">
          <span className="placeholder col-3 rounded" style={{ height: 16 }} />
        </div>
        <div className="card-body py-3 px-3">
          <div className="d-flex gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex-grow-1" style={{ minWidth: 120 }}>
                <span className="placeholder col-8 rounded mb-2 d-block" style={{ height: 28 }} />
                <span className="placeholder col-10 rounded d-block" style={{ height: 14 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card radius-12 border mb-0">
        <div className="card-header py-2 px-3 d-flex justify-content-between">
          <span className="placeholder col-4 rounded" style={{ height: 16 }} />
          <span className="placeholder col-2 rounded" style={{ height: 22 }} />
        </div>
        <div className="card-body p-0">
          <div className="table-responsive" style={{ minHeight: 200 }}>
            <table className="table table-sm mb-0">
              <tbody className="placeholder-glow">
                {Array.from({ length: 5 }, (_, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">
                      <span className="placeholder col-10 rounded" />
                    </td>
                    <td className="px-3 py-2">
                      <span className="placeholder col-12 rounded" />
                    </td>
                    <td className="px-3 py-2">
                      <span className="placeholder col-6 rounded" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
