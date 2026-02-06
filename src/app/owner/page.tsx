import Link from "next/link";

export default function OwnerHome() {
  return (
    <div className="grid">
      <div className="card">
        <h2 style={{ margin: 0 }}>Welcome 👋</h2>
        <p style={{ color: "var(--muted)", marginTop: 8 }}>
          This is the Owner Panel starter UI. Start by creating your first branch.
        </p>
        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btnPrimary" href="/owner/branches/new">Add Branch</Link>
          <Link className="btn" href="/owner/branches">View Branches</Link>
        </div>
      </div>

      <div className="card">
        <h2 style={{ margin: 0 }}>Next steps</h2>
        <ul style={{ margin: "10px 0 0 18px", color: "var(--muted)", lineHeight: 1.7 }}>
          <li>Connect Branch APIs (list, create, update, details)</li>
          <li>Connect location dropdowns (division/district/upazila)</li>
          <li>Add map picker (Leaflet/Google) if needed</li>
        </ul>
      </div>

      <div className="card">
        <h2 style={{ margin: 0 }}>Quick links</h2>
        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="pill" href="/owner/business">My Business</Link>
          <Link className="pill" href="/owner/staff">Staff & Roles</Link>
          <Link className="pill" href="/owner/services">Services</Link>
          <Link className="pill" href="/owner/settings">Settings</Link>
        </div>
      </div>
    </div>
  );
}
