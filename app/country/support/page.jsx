import CountryPageShell from "../_components/CountryPageShell";

export default function CountrySupportPage() {
  return (
    <CountryPageShell
      title="Support Tickets"
      subtitle="Inbox and ticket management"
      filters={["Status", "Assigned", "Priority", "Search"]}
      kpis={[
        { label: "Open", value: "—" },
        { label: "Assigned", value: "—" },
        { label: "Closed (7d)", value: "—" },
        { label: "SLA Breaches", value: "—" },
      ]}
      table={{
        title: "Tickets",
        columns: ["Ticket", "User", "Priority", "Status", "Updated", "Actions"],
      }}
      rightPanels={[
        { title: "Queues", items: ["Unassigned tickets", "High priority"] },
        { title: "Canned Responses", items: ["Refund", "Escalation", "Info Request"] },
      ]}
    />
  );
}
