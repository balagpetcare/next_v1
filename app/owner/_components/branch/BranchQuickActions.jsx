"use client";

import Link from "next/link";

const getActions = (branchId) => [
  { href: `/owner/branches/${branchId}/products`, label: "Products", icon: "solar:box-outline" },
  { href: `/owner/branches/${branchId}/inventory`, label: "Inventory", icon: "solar:box-minimalistic-outline" },
  { href: `/owner/branches/${branchId}/orders`, label: "Orders", icon: "solar:cart-large-2-outline" },
  { href: `/owner/branches/${branchId}/staff`, label: "Invite Staff", icon: "solar:user-id-outline" },
  { href: `/owner/branches/${branchId}/reports`, label: "Reports", icon: "solar:chart-outline" },
  { href: `/owner/branches/${branchId}/tasks`, label: "Tasks", icon: "solar:clipboard-list-outline" },
  { href: `/owner/branches/${branchId}/notifications`, label: "Notifications", icon: "solar:bell-outline" },
  { href: `/owner/branches/${branchId}/settings`, label: "Settings", icon: "solar:settings-outline" },
];

export default function BranchQuickActions({ branchId }) {
  const actions = getActions(String(branchId || ""));

  return (
    <div className="card radius-12">
      <div className="card-body p-24">
        <h6 className="mb-3 fw-semibold">
          <i className="ri-flashlight-line me-2 text-primary" />
          Quick Actions
        </h6>
        <div className="row g-2">
          {actions.map((a) => (
            <div key={a.href} className="col-6 col-md-4 col-lg-3">
              <Link
                href={a.href}
                className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center gap-2 radius-12"
                style={{ minHeight: 48 }}
              >
                <i className={a.icon} style={{ fontSize: "1.1rem" }} />
                <span className="small">{a.label}</span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
