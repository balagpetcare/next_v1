export default function CountryDashboardPage() {
  return (
    <div className="p-4">
      <h2 className="h4 mb-3">Country Dashboard</h2>
      <div className="row g-3 mb-3">
        {[
          "Total Orgs",
          "Clinics",
          "Petshops",
          "Shelters",
          "Donations (7d)",
          "Fundraising (Active)",
          "Adoptions Pending",
          "Rescue Open",
        ].map((label) => (
          <div key={label} className="col-md-3 col-sm-6">
            <div className="card">
              <div className="card-body">
                <div className="text-secondary small">{label}</div>
                <div className="h4 mb-0">—</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-lg-8">
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="mb-2">Activity Timeline</h6>
              <div className="text-secondary small">Latest actions will appear here.</div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h6 className="mb-2">Quick Queues</h6>
              <div className="row g-2">
                {[
                  "Adoption approvals pending",
                  "Org verification pending",
                  "Fundraising approvals pending",
                  "Reports pending (abuse/fraud)",
                ].map((item) => (
                  <div key={item} className="col-md-6">
                    <div className="border rounded p-2 text-secondary small">{item}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="mb-2">Feature Status</h6>
              <div className="text-secondary small">ON/OFF snapshot (placeholder)</div>
            </div>
          </div>
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="mb-2">Compliance Alerts</h6>
              <div className="text-secondary small">No alerts</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h6 className="mb-2">Staff Online</h6>
              <div className="text-secondary small">Last activity summary (placeholder)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
