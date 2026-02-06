"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ownerGet, ownerPatch } from "@/app/owner/_lib/ownerApi";

function formatCurrency(amount) {
  return `৳${Number(amount).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function OwnerPricingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      // Load branches
      const branchesRes = await ownerGet("/api/v1/owner/branches").catch(() => ({ success: false, data: [] }));
      const branchesList = branchesRes?.data || branchesRes || [];
      setBranches(Array.isArray(branchesList) ? branchesList : []);

      // Load products
      const productsRes = await ownerGet("/api/v1/products?limit=100").catch(() => ({ success: false, data: [] }));
      const productsList = productsRes?.data?.items || productsRes?.data || productsRes || [];
      setProducts(Array.isArray(productsList) ? productsList : []);
    } catch (e) {
      setError(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchesSearch = !searchTerm || p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="container py-3">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h2 className="mb-1">Pricing Management</h2>
          <div className="text-secondary">Manage product pricing across branches</div>
        </div>
        <Link className="btn btn-primary" href="/owner/products/new">
          <i className="solar:add-circle-outline me-1" />
          New Product
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Filters */}
      <div className="card radius-12 mb-4">
        <div className="card-body p-24">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label">Search Products</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by product name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">Filter by Branch</label>
              <select
                className="form-select"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
              >
                <option value="">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="card radius-12">
        <div className="card-body p-24">
          <h6 className="mb-3 fw-semibold">Products ({filteredProducts.length})</h6>
          {loading ? (
            <div className="text-center text-secondary py-4">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center text-secondary py-4">No products found</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th className="text-end">Base Price</th>
                    <th className="text-end">Branch Price</th>
                    <th>Status</th>
                    <th style={{ width: 120 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="fw-semibold">{product.name || "—"}</div>
                        {product.description && (
                          <div className="text-muted small">{product.description.substring(0, 50)}...</div>
                        )}
                      </td>
                      <td>{product.category?.name || product.category || "—"}</td>
                      <td className="text-end fw-semibold">{formatCurrency(product.price || 0)}</td>
                      <td className="text-end">
                        {product.branchPricing ? (
                          <span className="fw-semibold text-success">
                            {formatCurrency(product.branchPricing.price || product.price || 0)}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${product.status === "ACTIVE" ? "bg-success" : "bg-secondary"}`}>
                          {product.status || "—"}
                        </span>
                      </td>
                      <td className="text-end">
                        <Link href={`/owner/products/${product.id}/pricing`} className="btn btn-outline-primary btn-sm">
                          Manage
                        </Link>
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
  );
}
