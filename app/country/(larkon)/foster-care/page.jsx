import CountryPageShell from "../../_components/CountryPageShell";

export default function CountryFosterCarePage() {
  return (
    <CountryPageShell
      title="Foster Care"
      subtitle="Foster network monitoring"
      filters={["Status", "State", "Search"]}
      kpis={[
        { label: "Active Foster Homes", value: "—" },
        { label: "Pending Approvals", value: "—" },
        { label: "Reported", value: "—" },
        { label: "Suspended", value: "—" },
      ]}
      table={{
        title: "Foster Homes",
        columns: ["Home", "Org", "State", "Status", "Updated", "Actions"],
      }}
      rightPanels={[
        { title: "Queues", items: ["Approval queue", "Reported cases"] },
      ]}
    />
  );
}
