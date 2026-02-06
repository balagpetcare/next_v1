"use client";

import Link from "next/link";
import { RevenueAreaChart } from "@/app/owner/_components/branch/BranchCharts";

export default function OwnerReportsPage() {
  return (
    <div className="container py-3">
      <div className="mb-4">
        <h2 className="mb-1">Reports & Analytics</h2>
        <div className="text-secondary">View comprehensive business reports and analytics</div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-md-6 col-lg-4">
          <Link href="/owner/reports/revenue" className="card radius-12 text-decoration-none h-100">
            <div className="card-body p-24">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <i className="solar:chart-2-outline fs-2 text-success" />
                <i className="solar:arrow-right-outline fs-5 text-muted" />
              </div>
              <h6 className="fw-semibold mb-1">Revenue Reports</h6>
              <p className="text-muted small mb-0">View revenue trends and analytics</p>
            </div>
          </Link>
        </div>
        <div className="col-12 col-md-6 col-lg-4">
          <Link href="/owner/reports/sales" className="card radius-12 text-decoration-none h-100">
            <div className="card-body p-24">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <i className="solar:cart-large-2-outline fs-2 text-primary" />
                <i className="solar:arrow-right-outline fs-5 text-muted" />
              </div>
              <h6 className="fw-semibold mb-1">Sales Reports</h6>
              <p className="text-muted small mb-0">Analyze sales performance</p>
            </div>
          </Link>
        </div>
        <div className="col-12 col-md-6 col-lg-4">
          <Link href="/owner/reports/stock" className="card radius-12 text-decoration-none h-100">
            <div className="card-body p-24">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <i className="solar:box-outline fs-2 text-warning" />
                <i className="solar:arrow-right-outline fs-5 text-muted" />
              </div>
              <h6 className="fw-semibold mb-1">Stock Reports</h6>
              <p className="text-muted small mb-0">Inventory and stock analytics</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
