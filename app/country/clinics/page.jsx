import CountryPageShell from "../_components/CountryPageShell";

export default function CountryClinicsPage() {
  return (
    <CountryPageShell
      title="Clinics"
      subtitle="Clinic directory and compliance view"
      filters={["Status", "State", "Search"]}
      kpis={[
        { label: "Total Clinics", value: "—" },
        { label: "Active", value: "—" },
        { label: "Pending Verification", value: "—" },
        { label: "Suspended", value: "—" },
      ]}
      table={{
        title: "Clinics",
        columns: ["Clinic", "Org", "State", "Status", "Updated", "Actions"],
      }}
      rightPanels={[
        { title: "Queues", items: ["Verification pending", "Compliance flags"] },
      ]}
    />
  );
}
