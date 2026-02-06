"use client";

import PageHeader from "@/src/bpa/components/PageHeader";
import SectionCard from "@/src/bpa/admin/components/SectionCard";

export default function PolicyPage() {
  return (
    <div className="container-fluid">
      <PageHeader title="Policy center" subtitle="Verification, refund, commission, version control" />
      <SectionCard title="Quick links">
        <div className="d-grid gap-2">
          <a className="btn btn-outline-primary" href="/admin/policy/verification">Verification requirements</a>
          <a className="btn btn-outline-primary" href="/admin/policy/refund">Refund / discount</a>
          <a className="btn btn-outline-primary" href="/admin/policy/commission">Commission</a>
        </div>
      </SectionCard>
      <SectionCard title="Policy management">
        <p className="text-secondary mb-0">Policy center (checklist editor, version control) not yet implemented.</p>
      </SectionCard>
    </div>
  );
}
