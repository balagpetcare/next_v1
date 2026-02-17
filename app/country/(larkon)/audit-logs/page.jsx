import CountryPageShell from "../../_components/CountryPageShell";

export default function CountryAuditLogsPage() {
  return (
    <CountryPageShell
      title="Audit Logs"
      subtitle="Track actions by staff and system"
      filters={["Actor", "Action", "Module", "Date range"]}
      kpis={[
        { label: "Events (24h)", value: "—" },
        { label: "Admin Actions", value: "—" },
        { label: "Policy Changes", value: "—" },
        { label: "Security Alerts", value: "—" },
      ]}
      table={{
        title: "Audit Events",
        columns: ["Time", "Actor", "Action", "Target", "Metadata"],
      }}
      rightPanels={[
        { title: "Filters", items: ["Actor", "Module", "Action"] },
      ]}
    />
  );
}
