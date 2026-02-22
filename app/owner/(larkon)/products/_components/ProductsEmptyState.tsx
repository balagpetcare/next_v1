"use client";

import Link from "next/link";

export function ProductsEmptyState() {
  return (
    <div className="text-center py-5 px-3">
      <div className="mb-3 text-muted">
        <i className="ri-box-3-line display-4" aria-hidden />
      </div>
      <h6 className="fw-semibold mb-2">No products found</h6>
      <p className="text-muted small mb-4">
        Create your first product or browse the master catalog to add pre-configured products.
      </p>
      <div className="d-flex flex-wrap justify-content-center gap-2">
        <Link href="/owner/products/new" className="btn btn-primary radius-12">
          <i className="ri-add-line me-1" aria-hidden />
          Create product
        </Link>
        <Link href="/owner/products/master-catalog" className="btn btn-outline-success radius-12">
          <i className="ri-book-open-line me-1" aria-hidden />
          Browse catalog
        </Link>
      </div>
    </div>
  );
}
