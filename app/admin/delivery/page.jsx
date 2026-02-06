"use client";

import PageHeader from "@/src/bpa/components/PageHeader";
import SectionCard from "@/src/bpa/admin/components/SectionCard";

export default function DeliveryPage() {
  return (
    <div className="container-fluid">
      <PageHeader title="Delivery & logistics" subtitle="Jobs, riders, hubs, incidents" />
      <SectionCard title="Quick links">
        <div className="d-grid gap-2">
          <a className="btn btn-outline-primary" href="/admin/delivery/jobs">Delivery jobs</a>
          <a className="btn btn-outline-primary" href="/admin/delivery/riders">Riders</a>
          <a className="btn btn-outline-primary" href="/admin/delivery/hubs">Hubs</a>
          <a className="btn btn-outline-primary" href="/admin/delivery/incidents">Incidents</a>
        </div>
      </SectionCard>
    </div>
  );
}
