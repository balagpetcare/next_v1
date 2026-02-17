import CountryPageShell from "../../../_components/CountryPageShell";

export default function CountryFeatureTogglesPage() {
  return (
    <CountryPageShell
      title="Feature Toggles"
      subtitle="Enable/disable country features"
      filters={["Feature", "Status", "Updated"]}
      kpis={[
        { label: "Enabled", value: "—" },
        { label: "Disabled", value: "—" },
        { label: "Pending", value: "—" },
        { label: "Overrides", value: "—" },
      ]}
      table={{
        title: "Features",
        columns: ["Feature", "Key", "Status", "Config", "Last Changed"],
      }}
      rightPanels={[
        { title: "Notes", items: ["Impact of OFF", "Dependencies"] },
      ]}
    />
  );
}
