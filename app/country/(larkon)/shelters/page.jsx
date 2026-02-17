import CountryPageShell from "../../_components/CountryPageShell";

export default function CountrySheltersPage() {
  return (
    <CountryPageShell
      title="Shelter Homes"
      subtitle="Shelter directory and status"
      filters={["Status", "State", "Search"]}
      kpis={[
        { label: "Total Shelters", value: "—" },
        { label: "Active", value: "—" },
        { label: "Pending Verification", value: "—" },
        { label: "Suspended", value: "—" },
      ]}
      table={{
        title: "Shelter Homes",
        columns: ["Shelter", "Org", "State", "Status", "Updated", "Actions"],
      }}
      rightPanels={[
        { title: "Queues", items: ["Verification pending", "Compliance flags"] },
      ]}
    />
  );
}
