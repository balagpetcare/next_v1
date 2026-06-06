"use client";

import { useEffect, useState } from "react";
import { apiPost } from "@/lib/api";
import { clearLogoutState } from "@/lib/logoutState";

export default function Page() {
  const [msg, setMsg] = useState("Signing out...");

  useEffect(() => {
    (async () => {
      try {
        try {
          await apiPost("/api/v1/auth/logout", {});
        } catch {
          try {
            await apiPost("/api/v1/doctor/auth/logout", {}).catch(() => null);
          } catch {}
        }

        try {
          await fetch("/api/logout", { method: "POST", credentials: "include" });
        } catch {}

        clearLogoutState();
        setMsg("Signed out. Redirecting...");
        setTimeout(() => {
          window.location.href = "/login?app=doctor&returnTo=" + encodeURIComponent(`${window.location.origin}/doctor/dashboard`);
        }, 400);
      } catch {
        clearLogoutState();
        setTimeout(() => {
          window.location.href = "/login?app=doctor";
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
