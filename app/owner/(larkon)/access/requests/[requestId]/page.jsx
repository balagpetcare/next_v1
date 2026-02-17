"use client";

// Canonical IA route: /owner/access/requests/[requestId] (alias for staff-access/requests/[id])
import OwnerAccessRequestDetail from "../../../staff-access/requests/[id]/page";

export default function AccessRequestDetailAlias({ params }) {
  const requestId = params?.requestId ?? params?.id;
  return <OwnerAccessRequestDetail params={{ id: requestId }} />;
}
