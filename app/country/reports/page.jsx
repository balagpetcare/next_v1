import CountryPageShell from "../_components/CountryPageShell";

export default function CountryReportsPage() {
  return (
    <CountryPageShell
      title="Reports"
      subtitle="Country-level reporting and metrics"
      filters={["Date range", "Module", "Status"]}
      kpis={[
        { label: "Generated (7d)", value: "—" },
        { label: "Pending", value: "—" },
        { label: "Flagged", value: "—" },
        { label: "Exports", value: "—" },
      ]}
      table={{
        title: "Report Queue",
        columns: ["Report", "Module", "Status", "Created", "Actions"],
      }}
      rightPanels={[
        { title: "Quick Links", items: ["Compliance metrics", "Support metrics"] },
      ]}
    />
  );
}
