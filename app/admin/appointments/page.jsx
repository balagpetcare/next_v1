"use client";

import PageHeader from "@/src/bpa/components/PageHeader";
import SectionCard from "@/src/bpa/admin/components/SectionCard";

export default function AppointmentsPage() {
  return (
    <div className="container-fluid">
      <PageHeader
        title="Appointments"
        subtitle="Monitor and manage clinic appointments"
      />
      <SectionCard title="Appointments monitor">
        <p className="text-secondary mb-0">
          Appointments module is not yet implemented. Use <a href="/admin/services">Services</a> for now.
        </p>
      </SectionCard>
    </div>
  );
}
