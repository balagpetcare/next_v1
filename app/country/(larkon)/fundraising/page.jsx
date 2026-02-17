import CountryPageShell from "../../_components/CountryPageShell";

export default function CountryFundraisingPage() {
  return (
    <CountryPageShell
      title="Fund Raising"
      subtitle="Campaign approvals and monitoring"
      filters={["Date range", "Status", "Org", "State"]}
      kpis={[
        { label: "Active Campaigns", value: "—" },
        { label: "Pending Approvals", value: "—" },
        { label: "Payout Requests", value: "—" },
        { label: "Flagged", value: "—" },
      ]}
      table={{
        title: "Campaigns",
        columns: ["Campaign", "Org", "Target/Raised", "Status", "Created", "Actions"],
      }}
      rightPanels={[
        { title: "Queues", items: ["Approval queue", "Payout requests"] },
        { title: "Compliance", items: ["Alerts pending review"] },
      ]}
    />
  );
}
