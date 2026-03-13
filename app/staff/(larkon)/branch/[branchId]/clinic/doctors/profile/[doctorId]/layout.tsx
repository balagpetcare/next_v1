// Force dynamic so this route is resolved on all dev instances (e.g. OWNER port 3104) and avoids 404 on nested dynamic segment.
export const dynamic = "force-dynamic";

export default function StaffClinicDoctorProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
