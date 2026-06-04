"use client";

import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

type CatalogControlHeaderProps = {
  branchId: string;
};

export default function CatalogControlHeader({ branchId }: CatalogControlHeaderProps) {
  const base = `/owner/clinic/${branchId}/catalog`;
  return (
    <PageHeader
      title="Clinic Catalog"
      subtitle="Master data control center for clinical items, categories, and usage"
      breadcrumbs={[
        { label: "Home", href: "/owner" },
        { label: "Clinic", href: "/owner/clinic" },
        { label: "Branch", href: `/owner/clinic/${branchId}` },
        { label: "Catalog", href: base },
      ]}
      actions={[
        <Link key="vaccine-mappings" href={`${base}/vaccine-mappings`} className="btn btn-outline-primary radius-12" aria-label="Vaccine mappings">
          <i className="ri-link me-1" /> Vaccine Mappings
        </Link>,
        <Link key="category" href={`${base}/categories`} className="btn btn-outline-primary radius-12" aria-label="New category">
          <i className="ri-folder-add-line me-1" /> New Category
        </Link>,
        <button key="import" type="button" className="btn btn-outline-secondary radius-12" disabled aria-label="Import (coming soon)">
          <i className="ri-upload-2-line me-1" /> Import
        </button>,
        <button key="export" type="button" className="btn btn-outline-secondary radius-12" disabled aria-label="Export (coming soon)">
          <i className="ri-download-2-line me-1" /> Export
        </button>,
        <button key="settings" type="button" className="btn btn-outline-secondary radius-12" disabled aria-label="Settings (coming soon)">
          <i className="ri-settings-3-line me-1" /> Settings
        </button>,
        <Link key="new" href={`${base}/new`} className="btn btn-primary radius-12">
          <i className="ri-add-line me-1" /> New Item
        </Link>,
      ]}
    />
  );
}
