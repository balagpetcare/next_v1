"use client";

export function MasterCatalogSkeleton({ viewMode, count = 6 }: { viewMode: "grid" | "list"; count?: number }) {
  if (viewMode === "list") {
    return (
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th style={{ width: 44 }}><span className="placeholder col-2" /></th>
              <th><span className="placeholder col-8" /></th>
              <th><span className="placeholder col-4" /></th>
              <th><span className="placeholder col-3" /></th>
              <th><span className="placeholder col-2" /></th>
              <th><span className="placeholder col-2" /></th>
              <th style={{ width: 100 }}><span className="placeholder col-4" /></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: count }).map((_, i) => (
              <tr key={i}>
                <td><span className="placeholder col-2" /></td>
                <td>
                  <span className="placeholder col-6" />
                  <br /><span className="placeholder col-4" />
                </td>
                <td><span className="placeholder col-4" /></td>
                <td><span className="placeholder col-2" /></td>
                <td><span className="placeholder col-2" /></td>
                <td><span className="placeholder col-3" /></td>
                <td><span className="placeholder col-4" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className="row g-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="col-md-6 col-lg-4">
          <div className="card radius-12 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between mb-2">
                <span className="placeholder col-8" />
                <span className="placeholder rounded" style={{ width: 56, height: 24 }} />
              </div>
              <span className="placeholder col-4 d-block mb-1" />
              <span className="placeholder col-5 d-block mb-2" />
              <span className="placeholder col-12 mb-2" style={{ height: 40 }} />
              <span className="placeholder col-6 mb-2" />
              <span className="placeholder col-12" style={{ height: 40 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
