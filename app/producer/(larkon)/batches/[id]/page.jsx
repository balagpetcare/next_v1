"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";

export default function ProducerBatchDetailPage() {
  const params = useParams();
  const id = params?.id;
  const [batch, setBatch] = useState(null);
  const [codes, setCodes] = useState({ items: [], pagination: { page: 1, limit: 50, total: 0 } });
  const [codesPage, setCodesPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState("100");
  const [length, setLength] = useState("12");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [filterText, setFilterText] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiGet(`/api/v1/producer/batches/${id}?codesPage=${codesPage}&codesLimit=50`);
      setBatch(res?.data?.batch || null);
      setCodes(res?.data?.codes || { items: [], pagination: { page: 1, limit: 50, total: 0 } });
    } catch {
      setBatch(null);
      setCodes({ items: [], pagination: { page: 1, limit: 50, total: 0 } });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
  }, [id, codesPage]);

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
    setGenerating(true);
    setGeneratedCount(0);
    try {
      const res = await apiPost(`/api/v1/producer/batches/${id}/codes/generate`, {
        quantity: Number(quantity),
        length: Number(length),
        prefix: prefix || undefined,
        suffix: suffix || undefined,
      });
      const count = res?.data?.codes?.length || 0;
      setGeneratedCount(count);
      await load();
    } catch (e) {
      alert(e?.message || "Failed to generate codes");
    } finally {
      setGenerating(false);
    }
  };

  const filteredCodes = codes.items.filter((c) => {
    const byStatus = filterStatus === "ALL" ? true : c.status === filterStatus;
    const term = filterText.trim().toUpperCase();
    const byText = term ? String(c.code || "").toUpperCase().includes(term) : true;
    return byStatus && byText;
  });

  return (
    <div className="p-4">
      <h2 className="h4 mb-3">Batch Detail</h2>
      {loading ? (
        <p className="text-secondary">Loading…</p>
      ) : !batch ? (
        <p className="text-secondary">Batch not found.</p>
      ) : (
        <>
          <div className="card mb-4">
            <div className="card-body">
              <div className="mb-2"><strong>ID:</strong> {batch.id}</div>
              <div className="mb-2"><strong>Batch No:</strong> {batch.batchNo}</div>
              <div className="mb-2"><strong>Status:</strong> {batch.status}</div>
              <div className="mb-2"><strong>Qty Planned:</strong> {batch.qtyPlanned}</div>
              <div className="mb-2"><strong>Qty Generated:</strong> {batch.qtyGenerated || 0}</div>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Link className="btn btn-sm btn-primary" href={`/producer/batches/${batch.id}/generate-codes`}>
              Generate Codes
            </Link>
            <Link className="btn btn-sm btn-outline-secondary" href={`/producer/batches/${batch.id}/exports`}>
              Export Codes
            </Link>
          </div>
          <div className="card mt-4">
            <div className="card-body">
              <h6 className="mb-2">Generate Codes</h6>
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
                <button className="btn btn-primary" onClick={generate} disabled={generating}>
                  {generating ? "Generating..." : "Generate"}
                </button>
              </div>
              <div className="text-secondary small mt-2">
                Default length 12. Prefix (3) + Suffix (2) only A-Z/0-9. Remaining capacity: {Math.max(0, (batch.qtyPlanned || 0) - (batch.qtyGenerated || 0))}.
              </div>
              {generatedCount ? (
                <div className="text-success small mt-2">{generatedCount} codes generated.</div>
              ) : null}
            </div>
          </div>
          <div className="card mt-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Codes History</h6>
                <span className="text-secondary small">
                  {codes.pagination.total || 0} total
                </span>
              </div>
              <div className="d-flex gap-2 flex-wrap mb-3">
                <input
                  className="form-control"
                  placeholder="Search code"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  style={{ maxWidth: 220 }}
                />
                <select
                  className="form-select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ maxWidth: 180 }}
                >
                  {["ALL", "UNUSED", "VERIFIED", "SOLD", "BLOCKED", "EXPIRED"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              {filteredCodes.length ? (
                <div className="table-responsive">
                  <table className="table table-sm table-bordered">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Status</th>
                        <th>Verified</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCodes.map((c) => (
                        <tr key={c.id}>
                          <td style={{ fontFamily: "monospace" }}>{c.code}</td>
                          <td>{c.status}</td>
                          <td>{c.firstVerifiedAt ? new Date(c.firstVerifiedAt).toLocaleString() : "—"}</td>
                          <td>{c.createdAt ? new Date(c.createdAt).toLocaleString() : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-secondary mb-0">No codes found.</p>
              )}
              <div className="d-flex justify-content-end gap-2 mt-3">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setCodesPage((p) => Math.max(1, p - 1))}
                  disabled={codes.pagination.page <= 1}
                >
                  Prev
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setCodesPage((p) => p + 1)}
                  disabled={codes.pagination.page * codes.pagination.limit >= codes.pagination.total}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
