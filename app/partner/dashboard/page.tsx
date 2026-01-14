"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

export default function PartnerDashboardPage() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet("/api/v1/partner/applications")
      .then(setItems)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1>Partner Dashboard</h1>
      {error && <div style={{ color: "red" }}>{error}</div>}

      {items.map((a) => (
        <div key={a.id} style={{ border: "1px solid #ddd", padding: 12 }}>
          <div><b>{a.orgName}</b></div>
          <div>Status: {a.status}</div>
        </div>
      ))}
    </div>
  );
}
