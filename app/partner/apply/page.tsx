"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, apiPatch } from "@/lib/api";

export default function PartnerApplyPage() {
  const router = useRouter();
  const [app, setApp] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiPost("/api/v1/partner/applications/draft")
      .then(setApp)
      .catch((e) => setError(e.message));
  }, []);

  async function save(patch: any) {
    const updated = await apiPatch(
      `/api/v1/partner/applications/${app.id}`,
      patch
    );
    setApp(updated);
  }

  async function submit() {
    await apiPost(`/api/v1/partner/applications/${app.id}/submit`);
    router.push("/partner/dashboard");
  }

  if (!app) return <div>Loading...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1>Partner Application</h1>
      {error && <div style={{ color: "red" }}>{error}</div>}

      <input
        placeholder="Organization Name"
        value={app.orgName || ""}
        onChange={(e) => setApp({ ...app, orgName: e.target.value })}
        onBlur={() => save({ orgName: app.orgName })}
      />

      <input
        placeholder="Contact Phone"
        value={app.contactPhone || ""}
        onChange={(e) => setApp({ ...app, contactPhone: e.target.value })}
        onBlur={() => save({ contactPhone: app.contactPhone })}
      />

      <button onClick={submit}>Submit</button>
    </div>
  );
}
