import { apiFetch } from "@/src/lib/apiFetch";

export default async function VerifySerialPage({ params }: { params: { serial: string } }) {
  const serial = params?.serial || "";
  let data: any = null;
  let error: string | null = null;

  try {
    data = await apiFetch(`/api/v1/serials/${encodeURIComponent(serial)}/verify`, {
      cache: "no-store",
    });
  } catch (e: any) {
    error = e?.message || "Verification failed";
  }

  return (
    <div className="p-4">
      <h2 className="h4 mb-2">Serial Verification</h2>
      <p className="text-secondary mb-4">Serial: {serial || "—"}</p>

      {error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <div className="card">
          <div className="card-body">
            <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(data, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
