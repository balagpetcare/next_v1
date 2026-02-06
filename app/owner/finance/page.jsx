"use client";

import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

export default function OwnerFinancePage() {
  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Finance"
        subtitle="Payouts, transactions, and invoices"
        breadcrumbs={[
          { label: "Home", href: "/owner/dashboard" },
          { label: "Finance", href: "/owner/finance" },
        ]}
      />
      <div className="row g-3">
        <div className="col-12 col-md-6 col-lg-4">
          <Link href="/owner/wallet" className="card radius-12 text-decoration-none text-dark h-100 hover-lift">
            <div className="card-body p-24">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <i className="solar:wallet-outline fs-2 text-primary" />
                <i className="solar:arrow-right-outline fs-5 text-muted" />
              </div>
              <h6 className="fw-semibold mb-1">Wallet</h6>
              <p className="text-muted small mb-0">Balance and wallet settings</p>
            </div>
          </Link>
        </div>
        <div className="col-12 col-md-6 col-lg-4">
          <div className="card radius-12 border bg-light">
            <div className="card-body p-24">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <i className="solar:card-send-outline fs-2 text-success" />
                <span className="badge bg-secondary">Coming soon</span>
              </div>
              <h6 className="fw-semibold mb-1">Payouts</h6>
              <p className="text-muted small mb-0">Payout history and requests</p>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-lg-4">
          <div className="card radius-12 border bg-light">
            <div className="card-body p-24">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <i className="solar:list-outline fs-2 text-info" />
                <span className="badge bg-secondary">Coming soon</span>
              </div>
              <h6 className="fw-semibold mb-1">Transactions</h6>
              <p className="text-muted small mb-0">Transaction history</p>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-lg-4">
          <div className="card radius-12 border bg-light">
            <div className="card-body p-24">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <i className="solar:document-text-outline fs-2 text-warning" />
                <span className="badge bg-secondary">Coming soon</span>
              </div>
              <h6 className="fw-semibold mb-1">Invoices</h6>
              <p className="text-muted small mb-0">View and download invoices</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
