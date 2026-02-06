"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "@/lib/api";

export default function ProducerExportCodesPage() {
  const params = useParams();
  const id = params?.id;
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);

  const downloadCsv = (codesList) => {
    if (!codesList.length) return;
    const header = "code\n";
    const body = codesList.join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch_${id}_codes_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCodes = async () => {
    setLoading(true);
    try {
      const res = await apiGet(`/api/v1/producer/batches/${id}/codes/export`);
      const list = res?.data?.codes || [];
      setCodes(list);
      downloadCsv(list);
    } catch (e) {
      alert(e?.message || "Failed to export codes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="h4 mb-3">Export Codes</h2>
      <button className="btn btn-primary" onClick={exportCodes} disabled={loading}>
        Export CSV
      </button>
      <div className="card mt-3">
        <div className="card-body">
          <h6 className="mb-2">Codes (first 100)</h6>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {codes.length ? codes.slice(0, 100).join("\n") : "No codes exported yet."}
          </pre>
        </div>
      </div>
    </div>
  );
}
