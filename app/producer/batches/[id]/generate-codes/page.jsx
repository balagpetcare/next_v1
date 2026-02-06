"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { apiPost } from "@/lib/api";

export default function ProducerGenerateCodesPage() {
  const params = useParams();
  const id = params?.id;
  const [quantity, setQuantity] = useState("100");
  const [length, setLength] = useState("12");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);

  const downloadCsv = () => {
    if (!codes.length) return;
    const header = "code\n";
    const body = codes.join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch_${id}_codes.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const normalizePart = (value, maxLen) => {
    const clean = String(value || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    return clean.slice(0, maxLen);
  };

  const validate = () => {
    const qty = Number(quantity);
    if (!qty || qty <= 0) return "Quantity required";
    const len = Number(length);
    if (!len || len < 8 || len > 15) return "Length must be between 8 and 15";
    if (prefix && prefix.length !== 3) return "Prefix must be exactly 3 characters";
    if (suffix && suffix.length !== 2) return "Suffix must be exactly 2 characters";
    if (prefix && !/^[A-Z0-9]+$/.test(prefix)) return "Prefix must be A-Z and 0-9";
    if (suffix && !/^[A-Z0-9]+$/.test(suffix)) return "Suffix must be A-Z and 0-9";
    if (len <= (prefix ? prefix.length : 0) + (suffix ? suffix.length : 0)) {
      return "Length is too short for prefix/suffix";
    }
    return null;
  };

  const generate = async () => {
    const err = validate();
    if (err) return alert(err);
    setLoading(true);
    try {
      const res = await apiPost(`/api/v1/producer/batches/${id}/codes/generate`, {
        quantity: Number(quantity),
        length: Number(length),
        prefix: prefix || undefined,
        suffix: suffix || undefined,
      });
      setCodes(res?.data?.codes || []);
    } catch (e) {
      alert(e?.message || "Failed to generate codes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="h4 mb-3">Generate Codes</h2>
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex gap-2 flex-wrap">
            <input
              className="form-control"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={{ width: 160 }}
            />
            <input
              className="form-control"
              placeholder="Length (8-15)"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              style={{ width: 160 }}
            />
            <input
              className="form-control"
              placeholder="Prefix (3 chars)"
              value={prefix}
              onChange={(e) => setPrefix(normalizePart(e.target.value, 3))}
              style={{ width: 160 }}
            />
            <input
              className="form-control"
              placeholder="Suffix (2 chars)"
              value={suffix}
              onChange={(e) => setSuffix(normalizePart(e.target.value, 2))}
              style={{ width: 160 }}
            />
            <button className="btn btn-primary" onClick={generate} disabled={loading}>
              Generate
            </button>
            <button className="btn btn-outline-secondary" onClick={downloadCsv} disabled={!codes.length}>
              Download CSV
            </button>
          </div>
          <div className="text-secondary small mt-2">
            Default length 12. Prefix (3) + Suffix (2) only A-Z/0-9; no symbols.
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <h6 className="mb-2">Codes (first 100)</h6>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {codes.length ? codes.slice(0, 100).join("\n") : "No codes generated."}
          </pre>
        </div>
      </div>
    </div>
  );
}
