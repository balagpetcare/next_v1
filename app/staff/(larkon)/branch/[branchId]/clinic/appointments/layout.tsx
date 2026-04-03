// Force dynamic so this route (and children like /new) are resolved on all dev instances
// (e.g. OWNER port 3104) and avoids 404 on nested dynamic segment (Next 16 + Turbopack).
export const dynamic = "force-dynamic";

export default function StaffClinicAppointmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
