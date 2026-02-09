"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/src/lib/apiFetch";

interface Product {
  id: number;
  name: string;
  slug: string;
  status: string;
  variants: Array<{
    id: number;
    sku: string;
    title: string;
    isActive: boolean;
  }>;
  createdAt: string;
}

export default function ShopProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = (await apiFetch("/api/v1/products")) as unknown[] | { items?: unknown[]; data?: unknown[] };
      setProducts((Array.isArray(data) ? data : (data && typeof data === "object" ? ((data as { items?: unknown[] }).items ?? (data as { data?: unknown[] }).data) ?? [] : [])) as Product[]);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load products");
      console.error("Load products error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-main-body">
      <div className="row g-3">
        <div className="col-12">
          <div className="card radius-12">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h5 className="mb-1">Products</h5>
                  <small className="text-muted">View available products</small>
                </div>
                <div className="d-flex gap-2">
                  <a href="/shop/products/add-from-master" className="btn btn-outline-primary">
                    Add from Master Catalog
                  </a>
                </div>
              </div>

              {error && (
                <div className="alert alert-danger radius-12" role="alert">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <p>No products found.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Variants</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr key={product.id}>
                          <td>
                            <strong>{product.name}</strong>
                            <br />
                            <small className="text-muted">{product.slug}</small>
                          </td>
                          <td>
                            {product.variants?.length > 0 ? (
                              <span className="badge bg-info-focus text-info-main radius-12">
                                {product.variants.length} variant{product.variants.length > 1 ? "s" : ""}
                              </span>
                            ) : (
                              <span className="text-muted">No variants</span>
                            )}
                          </td>
                          <td>
                            <span
                              className={`badge radius-12 ${
                                product.status === "ACTIVE"
                                  ? "bg-success-focus text-success-main"
                                  : "bg-secondary-focus text-secondary-main"
                              }`}
                            >
                              {product.status}
                            </span>
                          </td>
                          <td>
                            {new Date(product.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
