"use client";

import PageHeader from "@/app/owner/_components/shared/PageHeader";

export default function OwnerAuditPage() {
  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Audit &amp; System"
        subtitle="Audit logs, security sessions, and integrations"
        breadcrumbs={[
          { label: "Home", href: "/owner/dashboard" },
          { label: "Audit", href: "/owner/audit" },
        ]}
      />
      <div className="card radius-12">
        <div className="card-body p-24">
          <h6 className="fw-semibold mb-2">Audit logs</h6>
          <p className="text-muted small mb-0">Activity and change logs will appear here. This section is coming soon.</p>
        </div>
      </div>
      <div className="card radius-12 mt-3">
        <div className="card-body p-24">
          <h6 className="fw-semibold mb-2">Security &amp; sessions</h6>
          <p className="text-muted small mb-0">Active sessions and security settings will be available here. Coming soon.</p>
        </div>
      </div>
      <div className="card radius-12 mt-3">
        <div className="card-body p-24">
          <h6 className="fw-semibold mb-2">Integrations</h6>
          <p className="text-muted small mb-0">Third-party integrations and API keys. Coming soon.</p>
        </div>
      </div>
    </div>
  );
}
