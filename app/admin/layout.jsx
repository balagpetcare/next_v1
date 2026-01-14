import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

function pickRole(me) {
  return (
    me?.role ||
    me?.data?.role ||
    "USER"
  );
}

function pickPermissions(me) {
  return (
    me?.permissions ||
    me?.data?.permissions ||
    []
  );
}

function hasAll(perms, required) {
  return required.every((p) => perms.includes(p));
}

const NAV = [
  { href: "/admin", label: "Home", required: [] },
  { href: "/admin/dashboard", label: "Dashboard", required: ["dashboard.read"] },
  { href: "/admin/branches", label: "Branches", required: ["branch.read"] },
  { href: "/admin/staff", label: "Staff", required: ["staff.read"] },
  { href: "/admin/roles", label: "Roles", required: ["role.read"] },
  { href: "/admin/permissions", label: "Permissions", required: ["role.read"] },
  { href: "/admin/wallet", label: "Wallet", required: ["wallet.read"] },
  { href: "/admin/fundraising", label: "Fundraising", required: ["fundraising.read"] },
  { href: "/admin/users", label: "Users", required: ["users.read"] },
  { href: "/admin/settings", label: "Settings", required: ["settings.write"] },
];

async function fetchMe() {
  // Prefer server-side env (API_BASE_URL). Fallback to NEXT_PUBLIC_ for convenience.
  const base =
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:3000";

  const cookieHeader = cookies().toString();

  try {
    const url = new URL("/api/v1/auth/me", base);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    // Network-level failure (API down / wrong URL / docker DNS etc.)
    console.error("fetchMe() failed", { base, err });
    return null;
  }
}

export default async function Layout({ children }) {
  // If there's no auth cookie, don't call the API here.
  // Middleware already redirects protected routes to /admin/login.
  const token = cookies().get("access_token")?.value;
  if (!token) return children;

  const me = await fetchMe();

  // If cookie exists but API rejects -> force login
  if (!me) redirect("/admin/login");

  const role = pickRole(me);
  const perms = pickPermissions(me);

  // If this account is not allowed for admin, send to forbidden.
  // NOTE: during Phase-1 allowlist, non-admin accounts will be USER with no perms.
  const isAdminLike = role !== "USER" || perms.length > 0;
  if (!isAdminLike) redirect("/admin/forbidden");

  const displayName =
    me?.data?.profile?.displayName ||
    me?.data?.profile?.username ||
    me?.profile?.displayName ||
    me?.profile?.username ||
    "—";

  const visibleNav = NAV.filter((item) => hasAll(perms, item.required));

  return (
    <div style={{ padding: 18 }}>
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 800 }}>BPA Admin</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            Signed in as: <b>{displayName}</b> — Role: <b>{role}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link
            href="/admin/logout"
            style={{
              fontSize: 13,
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              textDecoration: "none",
              color: "#111827",
              background: "#fff",
            }}
          >
            Logout
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, marginTop: 14 }}>
        <aside
          style={{
            width: 220,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 12,
            height: "fit-content",
            background: "#fff",
          }}
        >
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
            Navigation
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {visibleNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  style={{
                    display: "block",
                    padding: "8px 10px",
                    borderRadius: 10,
                    textDecoration: "none",
                    color: "#111827",
                    border: "1px solid #f3f4f6",
                    background: "#fafafa",
                    fontSize: 14,
                  }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
            Tips: If a menu is missing, your account lacks permission.
          </div>
        </aside>

        <main style={{ flex: 1 }}>{children}</main>
      </div>
    </div>
  );
}
