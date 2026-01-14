import Link from "next/link";

const siteHome = {
  mother: "/",
  shop: "/",
  clinic: "/",
  admin: "/",
};

export default function SiteShell({ site, title, children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid #e5e7eb",
          padding: "14px 18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              BPA Multi-Site Starter
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
          </div>

          <nav style={{ display: "flex", gap: 10 }}>
            <Link href={siteHome[site]}>Home</Link>
            <Link href="/health">Health</Link>
            <Link href="/debug">Debug</Link>
          </nav>
        </div>
      </header>

      <main style={{ padding: 18 }}>{children}</main>

      <footer
        style={{
          borderTop: "1px solid #e5e7eb",
          padding: "14px 18px",
          fontSize: 12,
          opacity: 0.7,
        }}
      >
        Local dev ports: 3100 (mother), 3101 (shop), 3102 (clinic), 3103 (admin)
      </footer>
    </div>
  );
}
