"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";

export default function ProducerProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [product, setProduct] = useState(null);
  const [batchForm, setBatchForm] = useState({ batchNo: "", mfgDate: "", expDate: "", qtyPlanned: "" });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiGet(`/api/v1/producer/products/${id}`);
      setProduct(res?.data || null);
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  const createBatch = async () => {
    if (!batchForm.batchNo || !batchForm.qtyPlanned) return alert("batchNo and qtyPlanned required");
    setLoading(true);
    try {
      const res = await apiPost(`/api/v1/producer/products/${id}/batches`, {
        batchNo: batchForm.batchNo,
        mfgDate: batchForm.mfgDate || undefined,
        expDate: batchForm.expDate || undefined,
        qtyPlanned: Number(batchForm.qtyPlanned),
      });
      router.push(`/producer/batches/${res?.data?.id}`);
      router.refresh();
    } catch (e) {
      alert(e?.message || "Failed to create batch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="h4 mb-3">Product Detail</h2>
      {loading ? (
        <p className="text-secondary">Loading…</p>
      ) : !product ? (
        <p className="text-secondary">Product not found.</p>
      ) : (
        <div className="card mb-4">
          <div className="card-body">
            <div className="mb-2"><strong>ID:</strong> {product.id}</div>
            <div className="mb-2"><strong>Name:</strong> {product.productName}</div>
            <div className="mb-2"><strong>Brand:</strong> {product.brandName}</div>
            <div className="mb-2"><strong>SKU:</strong> {product.sku}</div>
            <div className="mb-2"><strong>Status:</strong> {product.status}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <h6 className="mb-3">Create Batch</h6>
          <div className="row g-2">
            <div className="col-md-3">
              <input
                className="form-control"
                placeholder="Batch No"
                value={batchForm.batchNo}
                onChange={(e) => setBatchForm({ ...batchForm, batchNo: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <input
                className="form-control"
                placeholder="MFG Date"
                value={batchForm.mfgDate}
                onChange={(e) => setBatchForm({ ...batchForm, mfgDate: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <input
                className="form-control"
                placeholder="EXP Date"
                value={batchForm.expDate}
                onChange={(e) => setBatchForm({ ...batchForm, expDate: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <input
                className="form-control"
                placeholder="Qty Planned"
                value={batchForm.qtyPlanned}
                onChange={(e) => setBatchForm({ ...batchForm, qtyPlanned: e.target.value })}
              />
            </div>
          </div>
          <button className="btn btn-primary btn-sm mt-3" onClick={createBatch} disabled={loading}>
            Create Batch
          </button>
        </div>
      </div>
    </div>
  );
}
