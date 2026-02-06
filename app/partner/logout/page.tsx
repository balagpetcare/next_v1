"use client";

import { useEffect, useState } from "react";
import { apiPost } from "@/lib/api";

export default function PartnerLogoutPage() {
  const [msg, setMsg] = useState("Signing out...");

  useEffect(() => {
    (async () => {
      try {
        try {
          await apiPost("/api/v1/auth/logout", {});
        } catch {
          try {
            await apiPost("/api/logout", {});
          } catch {}
        }

        try {
          localStorage.removeItem("access_token");
          sessionStorage.clear();
        } catch {}

        setMsg("Signed out. Redirecting...");
        setTimeout(() => {
          window.location.href = "/partner/login";
        }, 600);
      } catch {
        setMsg("Could not fully sign out. Redirecting...");
        setTimeout(() => {
          window.location.href = "/partner/login";
        }, 900);
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
