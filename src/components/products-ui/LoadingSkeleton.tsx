"use client";

type Props = {
  rows?: number;
  mode?: "table" | "grid";
};

export function ProductsLoadingSkeleton({ rows = 8, mode = "table" }: Props) {
  if (mode === "grid") {
    return (
      <div className="row g-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="col-12 col-sm-6 col-lg-4 col-xl-3">
            <div className="card radius-12 border">
              <div className="card-body p-3">
                <div className="d-flex align-items-start gap-2">
                  <span className="placeholder rounded" style={{ width: 56, height: 56 }} />
                  <div className="flex-grow-1">
                    <span className="placeholder col-8" />
                    <span className="placeholder col-5 d-block mt-1" />
                    <span className="placeholder col-4 mt-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th style={{ width: 40 }}><span className="placeholder col-2" /></th>
            <th><span className="placeholder col-8" /></th>
            <th><span className="placeholder col-4" /></th>
            <th><span className="placeholder col-2" /></th>
            <th><span className="placeholder col-3" /></th>
            <th><span className="placeholder col-3" /></th>
            <th><span className="placeholder col-4" /></th>
            <th><span className="placeholder col-4" /></th>
            <th className="text-end" style={{ width: 200 }}><span className="placeholder col-6" /></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td><span className="placeholder col-2" /></td>
              <td>
                <div className="d-flex align-items-center gap-2">
                  <span className="placeholder rounded" style={{ width: 40, height: 40 }} />
                  <span className="placeholder col-6" />
                </div>
              </td>
              <td><span className="placeholder col-5" /></td>
              <td><span className="placeholder col-2" /></td>
              <td><span className="placeholder col-2" /></td>
              <td><span className="placeholder col-3" /></td>
              <td><span className="placeholder col-4" /></td>
              <td><span className="placeholder col-3" /></td>
              <td className="text-end"><span className="placeholder col-4" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
