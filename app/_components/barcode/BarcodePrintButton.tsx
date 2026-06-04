"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export default function BarcodePrintButton({
  href,
  children = "Print label",
  className = "btn btn-sm btn-outline-secondary",
}: {
  href: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={className} target="_blank" rel="noopener noreferrer">
      <i className="ri-barcode-line me-1" aria-hidden />
      {children}
    </Link>
  );
}
