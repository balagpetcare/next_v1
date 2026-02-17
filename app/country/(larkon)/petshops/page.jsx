import CountryPageShell from "../../_components/CountryPageShell";

export default function CountryPetshopsPage() {
  return (
    <CountryPageShell
      title="Petshops"
      subtitle="Petshop directory and status"
      filters={["Status", "State", "Search"]}
      kpis={[
        { label: "Total Petshops", value: "—" },
        { label: "Active", value: "—" },
        { label: "Pending Verification", value: "—" },
        { label: "Suspended", value: "—" },
      ]}
      table={{
        title: "Petshops",
        columns: ["Petshop", "Org", "State", "Status", "Updated", "Actions"],
      }}
      rightPanels={[
        { title: "Queues", items: ["Verification pending", "Compliance flags"] },
      ]}
    />
  );
}
