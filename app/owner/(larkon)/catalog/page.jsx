"use client";

import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

export default function OwnerCatalogPage() {
  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Catalog"
        subtitle="Product catalog, categories, and brands"
        breadcrumbs={[
          { label: "Home", href: "/owner/dashboard" },
          { label: "Catalog", href: "/owner/catalog" },
        ]}
      />
      <div className="row g-3">
        <div className="col-12 col-md-6 col-lg-4">
          <Link href="/owner/products" className="card radius-12 text-decoration-none text-dark h-100 hover-lift">
            <div className="card-body p-24">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <i className="solar:box-outline fs-2 text-primary" />
                <i className="solar:arrow-right-outline fs-5 text-muted" />
              </div>
              <h6 className="fw-semibold mb-1">Products</h6>
              <p className="text-muted small mb-0">Manage products and variants</p>
            </div>
          </Link>
        </div>
        <div className="col-12 col-md-6 col-lg-4">
          <Link href="/owner/products/master-catalog" className="card radius-12 text-decoration-none text-dark h-100 hover-lift">
            <div className="card-body p-24">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <i className="solar:document-text-outline fs-2 text-success" />
                <i className="solar:arrow-right-outline fs-5 text-muted" />
              </div>
              <h6 className="fw-semibold mb-1">Master Catalog</h6>
              <p className="text-muted small mb-0">Import and sync master product catalog</p>
            </div>
          </Link>
        </div>
        <div className="col-12 col-md-6 col-lg-4">
          <div className="card radius-12 border bg-light">
            <div className="card-body p-24">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <i className="solar:tag-outline fs-2 text-warning" />
                <span className="badge bg-secondary">Coming soon</span>
              </div>
              <h6 className="fw-semibold mb-1">Categories &amp; Brands</h6>
              <p className="text-muted small mb-0">Manage categories and brands</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
