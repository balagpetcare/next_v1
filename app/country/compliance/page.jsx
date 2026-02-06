import CountryPageShell from "../_components/CountryPageShell";

export default function CountryCompliancePage() {
  return (
    <CountryPageShell
      title="Compliance Center"
      subtitle="Verification queues and policy violations"
      filters={["Type", "Status", "SLA", "Search"]}
      kpis={[
        { label: "Verification Queue", value: "—" },
        { label: "Policy Violations", value: "—" },
        { label: "Suspicious Flags", value: "—" },
        { label: "Resolved (7d)", value: "—" },
      ]}
      table={{
        title: "Compliance Queue",
        columns: ["Entity", "Type", "Status", "SLA", "Submitted", "Actions"],
      }}
      rightPanels={[
        { title: "Tabs", items: ["Verification", "Donations", "Suspicious", "Violations"] },
      ]}
    />
  );
}
