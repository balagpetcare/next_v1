"use client";

import { useEffect, useState } from "react";
import { apiPost } from "../../../lib/api";

export default function Page() {
  const [msg, setMsg] = useState("Signing out...");

  useEffect(() => {
    (async () => {
      try {
        // 1) Ask the backend to invalidate the session (best-effort).
        // Some deployments may mount logout under different namespaces.
        try {
          await apiPost("/api/v1/auth/logout", {});
        } catch {
          // fallback (optional)
          await apiPost("/api/v1/admin/auth/logout", {}).catch(() => null);
        }

        // 2) Always clear the HttpOnly cookie at the Next.js origin.
        // This guarantees logout even if backend cookie-name/path differs.
        await fetch("/api/logout", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        setMsg("Signed out. Redirecting...");
      } catch (e) {
        // If logout endpoint doesn't exist yet, user can still clear cookies manually.
        setMsg(
          "Logout failed. If this persists, clear browser cookies for localhost and try again."
        );
      } finally {
        setTimeout(() => {
          window.location.href = "/admin/login";
        }, 600);
      }
    })();
  }, []);

  return (
    <div style={{ padding: 18 }}>
      <h2 style={{ margin: 0 }}>Logout</h2>
      <p style={{ color: "#6b7280" }}>{msg}</p>
    </div>
  );
}
