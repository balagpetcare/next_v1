"use client";

import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

export default function NetworkCommandReversePage() {
  return (
    <>
      <PageHeader
        title="Reverse & compliance"
        subtitle="Vendor returns pipeline and active recalls — use command center for exception triage."
      />
      <div className="row g-3">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Reverse logistics</h5>
              <Link href="/owner/inventory/reverse-logistics" className="btn btn-primary btn-sm">
                Open reverse logistics
              </Link>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Exception command center</h5>
              <Link href="/owner/operations/command-center" className="btn btn-outline-primary btn-sm">
                Open command center
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
