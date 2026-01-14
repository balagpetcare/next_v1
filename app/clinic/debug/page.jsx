import { headers } from "next/headers";

export default function DebugPage() {
  const h = headers();
  const host = h.get("host") || "";
  const ua = h.get("user-agent") || "";

  return (
    <div>
      <h2>communitypetclinic.com — Debug</h2>

      <pre
        style={{
          padding: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          overflowX: "auto",
          whiteSpace: "pre-wrap",
        }}
      >
        {`CLINIC
      Host: ${host}
      User-Agent: ${ua}
      `}
      </pre>

      <p>
        If you see <strong>CLINIC</strong> here and the host/port is correct, routing is working ✅
      </p>
    </div>
  );
}
