"use client";

import PageHeader from "@/src/bpa/components/PageHeader";
import SectionCard from "@/src/bpa/admin/components/SectionCard";

export default function ReviewsPage() {
  return (
    <div className="container-fluid">
      <PageHeader title="Reviews" subtitle="Moderation queue" />
      <SectionCard title="Reviews">Reviews moderation not yet implemented.</SectionCard>
    </div>
  );
}
