"use client";

import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

export default function OwnerAuditPage() {
  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Audit &amp; System"
        subtitle="Audit logs, clinic audit, and security"
        breadcrumbs={[
          { label: "Home", href: "/owner/dashboard" },
          { label: "Audit", href: "/owner/audit" },
        ]}
      />
      <div className="card radius-12">
        <div className="card-body p-24">
          <h6 className="fw-semibold mb-2">Clinic audit</h6>
          <p className="text-muted small mb-3">View discount and settlement audit per branch from the clinic console.</p>
          <ul className="mb-0">
            <li><Link href="/owner/clinic">Clinic network</Link> — Select a branch, then use <strong>Billing</strong> (settlement batches) and <strong>Discount policies</strong> for discount audit.</li>
            <li>Admin <Link href="/admin/clinical-catalog">Clinical catalog</Link> — <strong>Audit logs</strong> tab for catalog item change history.</li>
          </ul>
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
