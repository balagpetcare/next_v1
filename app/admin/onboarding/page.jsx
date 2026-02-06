"use client";

export default function Page() {
  const box = {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 14,
    background: "#fff",
  };
  const link = {
    display: "inline-flex",
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    textDecoration: "none",
    gap: 8,
    alignItems: "center",
  };

  return (
    <div style={{ padding: 18 }}>
      <h2 style={{ margin: 0 }}>Onboarding Approvals</h2>
      <div style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>
        Admin review queue: KYC verifications + publish requests + partner applications.
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <div style={box}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>KYC / Verification</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a style={link} href="/admin/verifications/owners">Owners</a>
            <a style={link} href="/admin/verifications/organizations">Organizations</a>
            <a style={link} href="/admin/verifications/branches">Branches</a>
          </div>
        </div>

        <div style={box}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Branch Publish Requests</div>
          <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 10 }}>
            Approve/reject branches that request to go live.
          </div>
          <a style={link} href="/admin/onboarding/publish-requests">Open queue</a>
        </div>

        <div style={box}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Partner Applications</div>
          <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 10 }}>
            Approve/reject partner applications.
          </div>
          <a style={link} href="/admin/onboarding/partner-applications">Open queue</a>
        </div>
      </div>
    </div>
  );
}
