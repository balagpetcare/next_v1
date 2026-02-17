"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";

export default function ProducerProductsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiGet("/api/v1/producer/products");
      setItems(res?.data || []);
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
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h4 mb-0">Products</h2>
        <Link className="btn btn-sm btn-primary" href="/producer/products/new">
          New Product
        </Link>
      </div>
      {loading ? (
        <p className="text-secondary">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-secondary">No products found.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>ID</th>
                <th>Brand</th>
                <th>Name</th>
                <th>SKU</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/producer/products/${p.id}`}>{p.id}</Link>
                  </td>
                  <td>{p.brandName}</td>
                  <td>{p.productName}</td>
                  <td>{p.sku}</td>
                  <td>{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
