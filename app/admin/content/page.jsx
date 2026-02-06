"use client";

import PageHeader from "@/src/bpa/components/PageHeader";
import SectionCard from "@/src/bpa/admin/components/SectionCard";

export default function ContentPage() {
  return (
    <div className="container-fluid">
      <PageHeader title="Content & notifications" subtitle="Announcements, templates, CMS" />
      <SectionCard title="Quick links">
        <div className="d-grid gap-2">
          <a className="btn btn-outline-primary" href="/admin/content/announcements">Announcements</a>
          <a className="btn btn-outline-primary" href="/admin/content/notifications">Notification logs</a>
          <a className="btn btn-outline-primary" href="/admin/content/templates">Template library</a>
          <a className="btn btn-outline-primary" href="/admin/content/cms">CMS pages</a>
        </div>
      </SectionCard>
    </div>
  );
}
