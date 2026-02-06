"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/owner/dashboard", label: "Dashboard" },
  { href: "/owner/organizations", label: "Organizations" },
  { href: "/owner/branches", label: "Branches" },
  { href: "/owner/staff-access", label: "Staff Access" },
  { href: "/owner/kyc", label: "KYC" },
  { href: "/owner/onboarding", label: "Onboarding" },
];

export default function OwnerTopNav() {
  const pathname = usePathname() || "";

  return (
    <nav style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            style={{
              fontSize: 13,
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              textDecoration: "none",
              color: active ? "white" : "#111827",
              background: active ? "#111827" : "#fff",
              fontWeight: 800,
            }}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
