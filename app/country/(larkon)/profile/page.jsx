import CountryPageShell from "../../_components/CountryPageShell";

export default function CountryProfilePage() {
  return (
    <CountryPageShell
      title="Profile"
      subtitle="Your country staff profile"
      filters={["Profile info", "Security", "Notifications"]}
      kpis={[
        { label: "Role", value: "—" },
        { label: "Country", value: "—" },
        { label: "Status", value: "—" },
        { label: "Last Login", value: "—" },
      ]}
      table={{
        title: "Profile Details",
        columns: ["Field", "Value", "Updated"],
      }}
      rightPanels={[
        { title: "Quick Actions", items: ["Update profile", "Change password"] },
      ]}
    />
  );
}
