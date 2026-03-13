"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { profile, availability, serviceAssignment, packageAssignment } from "@/src/lib/doctorOperationsRoutes";

type Action = { key: string; label: string; href?: string; onClick?: () => void };

type Props = {
  branchId: string;
  doctor: { memberId: number; displayName: string };
  actions?: Action[];
  className?: string;
};

const DEFAULT_ACTIONS = (branchId: string, memberId: number): Action[] => [
  { key: "view", label: "View profile", href: profile(branchId, memberId) },
  { key: "schedule", label: "Manage schedule", href: availability(branchId, memberId) },
  { key: "services", label: "Assign services", href: serviceAssignment(branchId, memberId) },
  { key: "packages", label: "Assign packages", href: packageAssignment(branchId, memberId) },
];

export default function DoctorActionMenu({
  branchId,
  doctor,
  actions = DEFAULT_ACTIONS(branchId, doctor.memberId),
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`dropdown ${className}`} ref={ref}>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary radius-8 dropdown-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Actions"
      >
        <i className="ri-more-2-fill" aria-hidden />
      </button>
      {open && (
        <ul className="dropdown-menu dropdown-menu-end show radius-8 shadow-sm">
          {actions.map((a) => (
            <li key={a.key}>
              {a.href ? (
                <Link
                  className="dropdown-item"
                  href={a.href}
                  onClick={() => setOpen(false)}
                >
                  {a.label}
                </Link>
              ) : (
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => { a.onClick?.(); setOpen(false); }}
                >
                  {a.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
