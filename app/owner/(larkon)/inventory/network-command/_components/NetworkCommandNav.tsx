"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string }[] = [
  { href: "/owner/inventory/network-command", label: "Overview" },
  { href: "/owner/inventory/network-command/fulfillment", label: "Fulfillment" },
  { href: "/owner/inventory/network-command/inbound-supplier", label: "Inbound & supplier" },
  { href: "/owner/inventory/network-command/reverse-compliance", label: "Reverse & compliance" },
  { href: "/owner/inventory/network-command/finance", label: "Financial lens" },
  { href: "/owner/inventory/network-command/recommendations", label: "Recommendations" },
  { href: "/owner/inventory/network-command/scenarios", label: "Scenarios" },
];

export default function NetworkCommandNav() {
  const pathname = usePathname();
  return (
    <div className="d-flex flex-wrap gap-2 mb-4 border-bottom pb-3">
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`btn btn-sm ${active ? "btn-primary" : "btn-outline-secondary"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
