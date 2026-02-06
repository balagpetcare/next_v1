"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

export default function BranchPageShell({
  title,
  subtitle,
  breadcrumbLabel,
  children,
  actions = [],
  loading = false,
}) {
  const params = useParams();
  const branchId = String(params?.id || "");
  const base = `/owner/branches/${branchId}`;

  const breadcrumbs = [
    { label: "Home", href: "/owner/dashboard" },
    { label: "Branches", href: "/owner/branches" },
    { label: "Branch", href: base },
    ...(breadcrumbLabel ? [{ label: breadcrumbLabel }] : []),
  ];

  const defaultActions = [
    <Link key="dashboard" href={base} className="btn btn-outline-primary radius-12">
      <i className="ri-dashboard-line me-1" />
      Dashboard
    </Link>,
  ];

  const allActions = [...defaultActions, ...actions];

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs.map((b, i) => {
          const last = i === breadcrumbs.length - 1;
          return last && !b.href ? { label: b.label } : { label: b.label, href: b.href || "#" };
        })}
        actions={allActions}
      />
      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
