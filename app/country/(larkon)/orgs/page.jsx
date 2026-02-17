import CountryPageShell from "../../_components/CountryPageShell";

export default function CountryOrganizationsPage() {
  return (
    <CountryPageShell
      title="Organizations"
      subtitle="Country-level organization list"
      filters={["Status", "Type", "State", "Search"]}
      kpis={[
        { label: "Total Orgs", value: "—" },
        { label: "Verified", value: "—" },
        { label: "Pending", value: "—" },
        { label: "Suspended", value: "—" },
      ]}
      table={{
        title: "Organizations",
        columns: ["Organization", "Type", "State", "Status", "Updated", "Actions"],
      }}
      rightPanels={[
        { title: "Queues", items: ["Verification pending", "Compliance review"] },
      ]}
    />
  );
}
