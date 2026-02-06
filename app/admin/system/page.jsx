"use client";

import PageHeader from "@/src/bpa/components/PageHeader";
import SectionCard from "@/src/bpa/admin/components/SectionCard";

export default function SystemPage() {
  return (
    <div className="container-fluid">
      <PageHeader title="System & security" subtitle="Health, audit, integrations, sessions" />
      <SectionCard title="Quick links">
        <div className="d-grid gap-2">
          <a className="btn btn-outline-primary" href="/admin/health">Health</a>
          <a className="btn btn-outline-primary" href="/admin/audit">Audit logs</a>
          <a className="btn btn-outline-primary" href="/admin/system/integrations">Integrations</a>
          <a className="btn btn-outline-primary" href="/admin/system/sessions">Active sessions</a>
          <a className="btn btn-outline-primary" href="/admin/users">Admin team / users</a>
        </div>
      </SectionCard>
    </div>
  );
}
