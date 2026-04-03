"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

/**
 * Staff shortcut: reverse logistics workflows are managed in the owner panel (org-wide).
 * Deep links to hub; branch staff can coordinate receive/disposition with warehouse on the ground.
 */
export default function StaffReverseLogisticsPage() {
  const params = useParams();
  const branchId = params?.branchId as string;
  return (
    <div className="container-fluid py-4">
      <h4 className="mb-2">Reverse logistics</h4>
      <p className="text-muted">
        Org-level stock returns, dispositions, and recall coordination run in the owner inventory workspace.
      </p>
      <Link href="/owner/inventory/reverse-logistics" className="btn btn-primary btn-sm">
        Open owner reverse logistics
      </Link>
      <Link href={`/staff/branch/${branchId}/inventory`} className="btn btn-link btn-sm ms-2">
        Back to branch inventory
      </Link>
    </div>
  );
}
