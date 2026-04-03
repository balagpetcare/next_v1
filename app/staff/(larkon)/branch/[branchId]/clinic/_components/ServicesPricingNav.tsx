"use client";

import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import {
  staffServicePricingAgreementsPath,
  staffServicePricingCatalogPath,
  staffServicePricingMatrixPath,
} from "@/src/lib/staffServicePricingRoutes";

/** Sub-nav for Services & Pricing (shared by flat routes + nested layout under services-pricing/). */
export default function ServicesPricingNav() {
  const params = useParams();
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const branchId = String(params?.branchId ?? "");

  const catalogHref = staffServicePricingCatalogPath(branchId);
  const matrixHref = staffServicePricingMatrixPath(branchId);
  const agreementsHref = staffServicePricingAgreementsPath(branchId);
  const packagesHref = `/staff/branch/${branchId}/clinic/catalog?tab=packages`;
  const tab = searchParams?.get("tab") ?? "";

  const onServiceContent =
    pathname.includes("/services-pricing-service-content") ||
    (pathname.includes("/services-pricing/services/") && pathname.includes("/content"));

  const tabs: { href: string; label: string; active: boolean }[] = [
    {
      href: catalogHref,
      label: "Services catalog",
      active:
        pathname.includes("/services-pricing-catalog") ||
        pathname.includes("/services-pricing/catalog") ||
        onServiceContent,
    },
    {
      href: matrixHref,
      label: "Pricing matrix",
      active: pathname.includes("/services-pricing-matrix") || pathname.includes("/services-pricing/matrix"),
    },
    {
      href: agreementsHref,
      label: "Doctor agreements",
      active: pathname.includes("/services-pricing-agreements") || pathname.includes("/services-pricing/agreements"),
    },
    {
      href: packagesHref,
      label: "Packages",
      active: pathname.includes("/clinic/catalog") && tab === "packages",
    },
  ];

  return (
    <ul className="nav nav-pills flex-wrap gap-2 mb-3">
      {tabs.map((t) => (
        <li className="nav-item" key={t.href}>
          <Link href={t.href} className={`nav-link radius-8 ${t.active ? "active" : ""}`}>
            {t.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
