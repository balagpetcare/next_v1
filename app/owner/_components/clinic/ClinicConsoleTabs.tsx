"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type ClinicConsoleTabsProps = {
  branchId: string;
};

type ClinicTabItem = {
  key: string;
  label: string;
  href: string;
  icon: string;
  matchers?: string[];
};

function isActivePath(pathname: string, href: string, matchers: string[] = []): boolean {
  if (pathname === href) return true;
  if (pathname.startsWith(`${href}/`)) return true;
  return matchers.some((m) => pathname.startsWith(m));
}

export default function ClinicConsoleTabs({ branchId }: ClinicConsoleTabsProps) {
  const pathname = usePathname();
  const base = `/owner/clinic/${branchId}`;

  const tabs: ClinicTabItem[] = [
    { key: "overview", label: "Overview", href: base, icon: "ri-dashboard-line" },
    { key: "doctors", label: "Doctors", href: `${base}/doctors`, icon: "ri-stethoscope-line" },
    { key: "services", label: "Services", href: `${base}/services`, icon: "ri-service-line" },
    { key: "catalog", label: "Catalog", href: `${base}/catalog`, icon: "ri-archive-line", matchers: [`${base}/catalog/`] },
    { key: "vaccine-mapping", label: "Vaccine Mapping", href: `${base}/catalog/vaccine-mappings`, icon: "ri-syringe-line" },
    { key: "packages", label: "Packages", href: `${base}/packages`, icon: "ri-box-3-line" },
    { key: "inventory", label: "Inventory", href: `${base}/inventory`, icon: "ri-stack-line" },
    { key: "sterilization", label: "Sterilization", href: `${base}/sterilization`, icon: "ri-temp-cold-line" },
    { key: "audit", label: "Stock audit", href: `${base}/audit`, icon: "ri-file-list-3-line" },
    { key: "wastage", label: "Wastage", href: `${base}/wastage`, icon: "ri-error-warning-line" },
    { key: "refill", label: "Refill", href: `${base}/refill`, icon: "ri-refresh-line" },
    {
      key: "schedule",
      label: "Schedule",
      href: `${base}/schedule`,
      icon: "ri-calendar-event-line",
      matchers: [`${base}/schedule-proposals`],
    },
    { key: "rooms", label: "Rooms", href: `${base}/rooms`, icon: "ri-door-open-line" },
    { key: "staff", label: "Staff", href: `${base}/staff`, icon: "ri-team-line" },
    {
      key: "appointments",
      label: "Appointments",
      href: `${base}/appointments`,
      icon: "ri-calendar-check-line",
      matchers: [`${base}/calendar`],
    },
    { key: "fees", label: "Fees", href: `${base}/fees`, icon: "ri-money-dollar-circle-line" },
    {
      key: "billing",
      label: "Billing",
      href: `${base}/settlement-batches`,
      icon: "ri-bank-card-line",
      matchers: [`${base}/discount-policies`, `${base}/finance-config`],
    },
    { key: "reports", label: "Reports", href: `${base}/reports`, icon: "ri-bar-chart-box-line" },
    { key: "settings", label: "Settings", href: `${base}/settings`, icon: "ri-settings-3-line" },
  ];

  return (
    <div className="card radius-12 mb-4">
      <div className="card-body p-16">
        <div className="d-flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const active = isActivePath(pathname, tab.href, tab.matchers);
            return (
              <Link
                key={tab.key}
                href={tab.href}
                className={`btn btn-sm radius-12 ${active ? "btn-primary" : "btn-outline-secondary"}`}
              >
                <i className={`${tab.icon} me-1`} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

