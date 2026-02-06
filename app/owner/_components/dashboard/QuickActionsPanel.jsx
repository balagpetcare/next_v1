"use client";

import Link from "next/link";

const actions = [
  { href: "/owner/products/new", label: "Create Product", icon: "solar:box-outline", variant: "primary" },
  { href: "/owner/organizations/new", label: "Add Branch", icon: "solar:shop-2-outline", variant: "success" },
  { href: "/owner/staffs/new", label: "Invite Staff", icon: "solar:user-id-outline", variant: "info" },
  { href: "/owner/access/requests", label: "Approve Requests", icon: "solar:user-check-outline", variant: "warning" },
  { href: "/owner/orders/new", label: "Create Order", icon: "solar:cart-large-2-outline", variant: "warning" },
  { href: "/owner/manager-decisions", label: "Manager Decisions", icon: "solar:checklist-outline", variant: "secondary" },
  { href: "/owner/reports", label: "View Reports", icon: "solar:chart-outline", variant: "secondary" },
  { href: "/owner/transfers", label: "Stock Transfer", icon: "solar:transfer-outline", variant: "primary" },
];

export default function QuickActionsPanel() {
  return (
    <div className="card radius-12">
      <div className="card-body p-24">
        <h6 className="mb-3 fw-semibold">Quick Actions</h6>
        <div className="row g-2">
          {actions.map((action) => (
            <div key={action.href} className="col-6 col-md-4 col-lg-3">
              <Link href={action.href} className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center gap-2" style={{ minHeight: 50 }}>
                <i className={`${action.icon} fs-5`} />
                <span className="small">{action.label}</span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
