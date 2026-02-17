import CountryPageShell from "../../_components/CountryPageShell";

export default function CountryDonationsPage() {
  return (
    <CountryPageShell
      title="Donations"
      subtitle="Country-level donation monitoring"
      filters={["Date range", "Status", "Org", "Channel"]}
      kpis={[
        { label: "Total (7d)", value: "—" },
        { label: "Failed", value: "—" },
        { label: "Refunded", value: "—" },
        { label: "Flagged", value: "—" },
      ]}
      table={{
        title: "Donation Transactions",
        columns: ["Donor", "Amount", "Currency", "Channel", "Status", "Created"],
      }}
      rightPanels={[
        { title: "Queues", items: ["Refund requests", "Flagged donations"] },
        { title: "Alerts", items: ["Fraud checks pending"] },
      ]}
    />
  );
}
