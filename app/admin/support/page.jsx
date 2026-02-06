"use client";

import PageHeader from "@/src/bpa/components/PageHeader";
import SectionCard from "@/src/bpa/admin/components/SectionCard";

export default function SupportPage() {
  return (
    <div className="container-fluid">
      <PageHeader title="Support" subtitle="Tickets, reviews, reports" />
      <SectionCard title="Quick links">
        <div className="d-grid gap-2">
          <a className="btn btn-outline-primary" href="/admin/support/tickets">Tickets queue</a>
          <a className="btn btn-outline-primary" href="/admin/support/reviews">Reviews moderation</a>
          <a className="btn btn-outline-primary" href="/admin/support/reports">Reports / abuse</a>
        </div>
      </SectionCard>
      <SectionCard title="Tickets queue">
        <p className="text-secondary mb-0">Support tickets module not yet implemented.</p>
      </SectionCard>
    </div>
  );
}
