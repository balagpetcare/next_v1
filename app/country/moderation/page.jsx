import CountryPageShell from "../_components/CountryPageShell";

export default function CountryModerationPage() {
  return (
    <CountryPageShell
      title="Content Moderation"
      subtitle="Reported content and listings"
      filters={["Type", "Status", "State", "Search"]}
      kpis={[
        { label: "Reported Content", value: "—" },
        { label: "Reported Listings", value: "—" },
        { label: "Banned", value: "—" },
        { label: "Restored (7d)", value: "—" },
      ]}
      table={{
        title: "Moderation Queue",
        columns: ["Item", "Type", "Reporter", "Status", "Created", "Actions"],
      }}
      rightPanels={[
        { title: "Queues", items: ["Pending reviews", "Escalations"] },
        { title: "Notes", items: ["Remove / Restore / Warn / Escalate"] },
      ]}
    />
  );
}
