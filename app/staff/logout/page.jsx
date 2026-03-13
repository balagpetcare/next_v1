"use client";

import { useEffect, useState } from "react";
import { apiPost } from "@/lib/api";
import { clearLogoutState } from "@/lib/logoutState";

/**
 * Staff logout: clear backend session, clear cookies via /api/logout,
 * clear all auth/branch/workspace client state, then redirect to staff login.
 * Ensures re-login does not see stale lastActiveBranchId or cached branch route.
 */
export default function Page() {
  const [msg, setMsg] = useState("Signing out...");

  useEffect(() => {
    (async () => {
      try {
        try {
          await apiPost("/api/v1/auth/logout", {});
        } catch {
          try {
            await apiPost("/api/logout", {}).catch(() => {});
          } catch {}
        }

        try {
          await fetch("/api/logout", { method: "POST", credentials: "include" });
        } catch {}

        clearLogoutState();

        setMsg("Signed out. Redirecting...");
        setTimeout(() => {
          window.location.href = "/staff/login";
        }, 400);
      } catch {
        setMsg("Signed out. Redirecting...");
        clearLogoutState();
        setTimeout(() => {
          window.location.href = "/staff/login";
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
