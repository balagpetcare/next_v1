"use client";

import Link from "next/link";

/**
 * BranchKpiRow – 4–6 KPI cards from useBranchContext kpis.
 * Permission-aware; financial KPIs require reports.view; low stock inventory.read; appointments appointments.view; cash permission for cashSnapshot.
 */
export default function BranchKpiRow({ kpis = {}, permissions = [], branch = {}, branchId }) {
  const perms = Array.isArray(permissions) ? permissions : [];
  const canReports = perms.includes("reports.view");
  const canInventory = perms.includes("inventory.read");
  const canAppointments = perms.includes("appointments.view");
  const isClinic = (branch?.type ?? "").toUpperCase() === "CLINIC";
  const bid = String(branchId ?? "");

  const cards = [];

  if (canReports) {
    cards.push({
      key: "todaySales",
      label: "Today's Sales",
      value: kpis.todaySales != null ? Number(kpis.todaySales).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "—",
      icon: "ri-money-dollar-circle-line",
      href: bid ? `/staff/branch/${bid}/reports` : null,
    });
    cards.push({
      key: "pendingOrders",
      label: "Pending Orders",
      value: kpis.pendingOrders != null ? Number(kpis.pendingOrders) : "—",
      icon: "ri-shopping-cart-line",
      href: bid ? `/staff/branch/${bid}/pos` : null,
    });
  }
  cards.push({
    key: "returnsToday",
    label: "Returns Today",
    value: kpis.returnsToday != null ? Number(kpis.returnsToday) : "—",
    icon: "ri-arrow-go-back-line",
    href: null,
  });
  if (canInventory) {
    cards.push({
      key: "lowStock",
      label: "Low Stock",
      value: kpis.lowStockCount != null ? Number(kpis.lowStockCount) : "—",
      icon: "ri-archive-line",
      href: bid ? `/staff/branch/${bid}/inventory` : null,
    });
  }
  if (isClinic && canAppointments) {
    cards.push({
      key: "todayAppointments",
      label: "Today Appointments",
      value: kpis.todayAppointments != null ? Number(kpis.todayAppointments) : "—",
      icon: "ri-calendar-check-line",
      href: bid ? `/staff/branch/${bid}/services` : null,
    });
  }
  if (canReports && kpis.cashSnapshot != null) {
    cards.push({
      key: "cashSnapshot",
      label: "Cash Snapshot",
      value: typeof kpis.cashSnapshot === "number" ? Number(kpis.cashSnapshot).toLocaleString() : String(kpis.cashSnapshot ?? "—"),
      icon: "ri-bank-line",
      href: null,
    });
  }

  if (cards.length === 0) return null;

  return (
    <div className="row g-20 mb-24">
      {cards.map((card) => {
        const content = (
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <p className="text-secondary-light text-sm mb-4">{card.label}</p>
              <p className="mb-0 fw-semibold">{card.value}</p>
            </div>
            <i className={`${card.icon} text-primary-600 fs-24`} aria-hidden />
          </div>
        );
        return (
          <div key={card.key} className="col-6 col-md-3 col-lg-2">
            {card.href ? (
              <Link href={card.href} className="card radius-12 h-100 text-decoration-none text-body d-block card-hover">
                <div className="card-body">{content}</div>
              </Link>
            ) : (
              <div className="card radius-12 h-100">
                <div className="card-body">{content}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
