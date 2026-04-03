"use client";

import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

export default function NetworkCommandFinancePage() {
  return (
    <>
      <PageHeader
        title="Financial lens"
        subtitle="Cost-to-serve and financial intelligence live in the Wave-4 dashboard — no duplicate postings from this tower."
      />
      <Link href="/owner/inventory/financial-intelligence" className="btn btn-primary">
        Open financial intelligence
      </Link>
    </>
  );
}
