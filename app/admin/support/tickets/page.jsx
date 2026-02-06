"use client";

import PageHeader from "@/src/bpa/components/PageHeader";
import SectionCard from "@/src/bpa/admin/components/SectionCard";

export default function TicketsPage() {
  return (
    <div className="container-fluid">
      <PageHeader title="Tickets" subtitle="SLA board" />
      <SectionCard title="Tickets queue">Tickets queue not yet implemented.</SectionCard>
    </div>
  );
}
