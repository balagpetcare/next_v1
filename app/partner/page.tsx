import Link from "next/link";

export default function PartnerLandingPage() {
  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1>Open a Shop / Clinic</h1>
      <p style={{ color: "#6b7280" }}>
        Start your journey as a BPA Partner.
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <Link href="/partner/login">Login</Link>
        <Link href="/partner/apply">Apply</Link>
      </div>
    </div>
  );
}
