"use client";

import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

const CARDS = [
  {
    title: "Staff directory",
    description: "View every staff member and the branches they can access.",
    href: "/owner/staff",
    icon: "ri-team-line",
  },
  {
    title: "Pending requests",
    description: "Approve, reject, or assign roles for new branch access requests.",
    href: "/owner/access/requests",
    icon: "ri-shield-user-line",
  },
  {
    title: "Access matrix",
    description: "Export-friendly overview of staff × branches.",
    href: "/owner/access/matrix",
    icon: "ri-table-line",
  },
];

export default function OwnerStaffAccessHome() {
  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Staff Access & Permissions"
        subtitle="Manage who can work in each branch, approve requests, and monitor notifications."
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Staff Access", href: "/owner/staff-access" },
        ]}
      />

      <div className="row g-20">
        {CARDS.map((card) => (
          <div className="col-md-4" key={card.href}>
            <div className="card radius-12 h-100">
              <div className="card-body d-flex flex-column gap-16">
                <div className="d-flex align-items-center gap-12">
                  <i className={card.icon} style={{ fontSize: 24 }} />
                  <h6 className="mb-0">{card.title}</h6>
                </div>
                <p className="text-secondary-light flex-grow-1">{card.description}</p>
                <Link href={card.href} className="btn btn-outline-primary btn-sm align-self-start">
                  Open
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
