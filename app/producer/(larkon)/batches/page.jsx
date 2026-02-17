"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";

export default function ProducerBatchesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiGet("/api/v1/producer/batches?limit=50");
      setItems(res?.data?.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-4">
      <h2 className="h4 mb-3">Batches</h2>
      {loading ? (
        <p className="text-secondary">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-secondary">No batches found.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>ID</th>
                <th>Batch No</th>
                <th>Status</th>
                <th>Qty Planned</th>
                <th>Qty Generated</th>
                <th>Remaining</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link href={`/producer/batches/${b.id}`}>{b.id}</Link>
                  </td>
                  <td>{b.batchNo}</td>
                  <td>{b.status}</td>
                  <td>{b.qtyPlanned}</td>
                  <td>{b.qtyGenerated || 0}</td>
                  <td>{Math.max(0, (b.qtyPlanned || 0) - (b.qtyGenerated || 0))}</td>
                  <td className="d-flex gap-2 flex-wrap">
                    <Link className="btn btn-sm btn-outline-primary" href={`/producer/batches/${b.id}`}>
                      Details
                    </Link>
                    <Link className="btn btn-sm btn-outline-secondary" href={`/producer/batches/${b.id}/generate-codes`}>
                      Generate Codes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
