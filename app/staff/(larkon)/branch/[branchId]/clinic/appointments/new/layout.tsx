import React from "react";

// Force dynamic so this route is resolved on all dev instances (e.g. owner 3104)
// and avoids 404 when visiting /staff/branch/:id/clinic/appointments/new.
export const dynamic = "force-dynamic";

export default function NewAppointmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
