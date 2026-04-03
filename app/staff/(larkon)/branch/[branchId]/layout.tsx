// Force dynamic so nested routes (e.g. clinic/appointments/new) resolve on all dev instances (e.g. 3104).
export const dynamic = "force-dynamic";

export default function StaffBranchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
