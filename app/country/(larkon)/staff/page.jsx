import Link from "next/link";
import CountryPageShell from "../../_components/CountryPageShell";

export default function CountryStaffPage() {
  return (
    <CountryPageShell
      title="Country Staff"
      subtitle="Staff assignments for this country"
      headerAction={
        <Link href="/country/staff/invites" className="btn btn-primary btn-sm">
          Invite Staff
        </Link>
      }
      filters={["Role", "Status", "Scope Type", "Search"]}
      kpis={[
        { label: "Active Staff", value: "—" },
        { label: "Suspended", value: "—" },
        { label: "Pending Invites", value: "—" },
        { label: "New (7d)", value: "—" },
      ]}
      table={{
        title: "Staff List",
        columns: ["User", "Email", "Role", "Scope", "Status", "Assigned At", "Actions"],
      }}
      rightPanels={[
        { title: "Recent Accepts", items: ["Latest accepted invites"] },
        { title: "Pending Invites", items: ["View invites page"] },
      ]}
    />
  );
}
