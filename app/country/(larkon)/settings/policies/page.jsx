import CountryPageShell from "../../../_components/CountryPageShell";

export default function CountryPolicyRulesPage() {
  return (
    <CountryPageShell
      title="Policy Rules"
      subtitle="Versioned policy management"
      filters={["Policy Group", "Status", "Version"]}
      kpis={[
        { label: "Active Policies", value: "—" },
        { label: "Drafts", value: "—" },
        { label: "Pending Review", value: "—" },
        { label: "Archived", value: "—" },
      ]}
      table={{
        title: "Policy Versions",
        columns: ["Policy", "Version", "Status", "Effective", "Actions"],
      }}
      rightPanels={[
        { title: "Policy Viewer", items: ["JSON view", "Summary rules"] },
      ]}
    />
  );
}
