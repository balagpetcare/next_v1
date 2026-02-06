import CountryPageShell from "../_components/CountryPageShell";

export default function CountryAdoptionsPage() {
  return (
    <CountryPageShell
      title="Adoptions"
      subtitle="Review and approve adoption cases"
      filters={["Date range", "Status", "Org/Shelter", "State"]}
      kpis={[
        { label: "Pending", value: "—" },
        { label: "Approved (7d)", value: "—" },
        { label: "Rejected (7d)", value: "—" },
        { label: "Flagged Reports", value: "—" },
      ]}
      table={{
        title: "Adoption Requests",
        columns: ["Pet", "Adopter", "Org/Shelter", "Status", "Created", "Actions"],
      }}
      rightPanels={[
        { title: "Queues", items: ["Pending approvals", "Flagged cases"] },
        { title: "Notes", items: ["Use actions to approve/reject"] },
      ]}
    />
  );
}
