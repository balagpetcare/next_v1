"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";

export default function ProducerProductNewPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    brandName: "",
    productName: "",
    sku: "",
    packSize: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.productName || !form.sku) return alert("productName and sku required");
    setLoading(true);
    try {
      const res = await apiPost("/api/v1/producer/products", form);
      router.push(`/producer/products/${res?.data?.id || ""}`);
      router.refresh();
    } catch (e) {
      alert(e?.message || "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="h4 mb-3">New Product</h2>
      <div className="card">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="Brand name"
                value={form.brandName}
                onChange={(e) => setForm({ ...form, brandName: e.target.value })}
              />
            </div>
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="Product name"
                value={form.productName}
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
              />
            </div>
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="SKU"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </div>
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="Pack size"
                value={form.packSize}
                onChange={(e) => setForm({ ...form, packSize: e.target.value })}
              />
            </div>
            <div className="col-md-8">
              <input
                className="form-control"
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <button className="btn btn-primary btn-sm mt-3" onClick={submit} disabled={loading}>
            Create Product
          </button>
        </div>
      </div>
    </div>
  );
}
