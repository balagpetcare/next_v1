"use client";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "credentials", label: "Credentials" },
  { key: "services", label: "Services" },
  { key: "packages", label: "Packages" },
  { key: "schedule", label: "Schedule" },
  { key: "fees", label: "Fees & Settlement" },
  { key: "performance", label: "Performance" },
  { key: "leave", label: "Leave & Availability" },
  { key: "approvals", label: "Approval History" },
  { key: "audit", label: "Audit Log" },
] as const;

export type DoctorProfileTabKey = (typeof TABS)[number]["key"];

type Props = {
  activeTab: DoctorProfileTabKey;
  onTabChange: (tab: DoctorProfileTabKey) => void;
};

export default function DoctorProfileTabs({ activeTab, onTabChange }: Props) {
  return (
    <ul className="nav nav-tabs nav-tabs-card mb-3" role="tablist">
      {TABS.map((tab) => (
        <li key={tab.key} className="nav-item" role="presentation">
          <button
            type="button"
            className={`nav-link radius-12 me-1 ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => onTabChange(tab.key)}
            role="tab"
            aria-selected={activeTab === tab.key}
          >
            {tab.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

export { TABS };
