"use client";

import Link from "next/link";

const ACTIONS = [
  { href: "/doctor/appointments", label: "New Consultation" },
  { href: "/doctor/prescriptions", label: "E-Prescription" },
  { href: "/doctor/follow-ups", label: "Follow-up" },
  { href: "/doctor/cases", label: "Surgery Cases" },
  { href: "/doctor/appointments?tab=emergency", label: "Emergency Queue" },
  { href: "/doctor/services", label: "My Services" },
  { href: "/doctor/schedule", label: "Availability" },
  { href: "/doctor/settlement", label: "Earnings" },
  { href: "/doctor/notifications", label: "Notifications" },
];

export function QuickActionsPanel() {
  return (
    <div className="card radius-12 h-100">
      <div className="card-header">
        <h6 className="mb-0">Clinical Action Center</h6>
      </div>
      <div className="card-body">
        <div className="row g-2">
          {ACTIONS.map((item) => (
            <div key={item.href} className="col-6 col-md-4">
              <Link href={item.href} className="btn btn-sm btn-outline-primary w-100 radius-12">
                {item.label}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
