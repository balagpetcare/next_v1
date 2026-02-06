function renderFilters(filters) {
  if (!filters || filters.length === 0) return null;
  return (
    <div className="card mb-3">
      <div className="card-body d-flex flex-wrap gap-8 align-items-center">
        <span className="text-secondary small">Filters:</span>
        {filters.map((f) => (
          <span key={f} className="badge bg-light text-dark border">
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

function renderKpis(kpis) {
  if (!kpis || kpis.length === 0) return null;
  return (
    <div className="row g-3 mb-3">
      {kpis.map((k) => (
        <div key={k.label} className="col-md-3 col-sm-6">
          <div className="card">
            <div className="card-body">
              <div className="text-secondary small">{k.label}</div>
              <div className="h4 mb-0">{k.value ?? "—"}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function renderTable(table) {
  const columns = table?.columns || [];
  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="mb-0">{table?.title || "Items"}</h6>
          {table?.actions ? <div>{table.actions}</div> : null}
        </div>
        <div className="table-responsive">
          <table className="table table-sm">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {columns.map((c, idx) => (
                  <td key={`${c}-${idx}`} className="text-secondary">
                    —
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function renderRightPanels(panels) {
  if (!panels || panels.length === 0) return null;
  return panels.map((panel) => (
    <div key={panel.title} className="card mb-3">
      <div className="card-body">
        <h6 className="mb-2">{panel.title}</h6>
        <ul className="list-unstyled mb-0">
          {(panel.items || []).map((it) => (
            <li key={it} className="text-secondary small mb-1">
              {it}
            </li>
          ))}
        </ul>
      </div>
    </div>
  ));
}

export default function CountryPageShell({ title, subtitle, filters, kpis, table, rightPanels, headerAction }) {
  return (
    <div className="p-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="h4 mb-1">{title}</h2>
          {subtitle ? <div className="text-secondary small">{subtitle}</div> : null}
        </div>
        {headerAction ? <div>{headerAction}</div> : null}
      </div>

      {renderFilters(filters)}
      {renderKpis(kpis)}

      <div className="row g-3">
        <div className="col-lg-8">{renderTable(table)}</div>
        <div className="col-lg-4">{renderRightPanels(rightPanels)}</div>
      </div>
    </div>
  );
}
