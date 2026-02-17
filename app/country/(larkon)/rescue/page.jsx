import CountryPageShell from "../../_components/CountryPageShell";

export default function CountryRescuePage() {
  return (
    <CountryPageShell
      title="Rescue Teams"
      subtitle="Rescue team operations"
      filters={["Status", "State", "Search"]}
      kpis={[
        { label: "Active Teams", value: "—" },
        { label: "Open Rescues", value: "—" },
        { label: "Pending Approvals", value: "—" },
        { label: "Flagged", value: "—" },
      ]}
      table={{
        title: "Rescue Teams",
        columns: ["Team", "Org", "State", "Status", "Updated", "Actions"],
      }}
      rightPanels={[
        { title: "Queues", items: ["Open rescues", "Flagged reports"] },
      ]}
    />
  );
}
