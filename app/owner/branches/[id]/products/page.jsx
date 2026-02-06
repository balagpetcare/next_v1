"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";
import BranchPageShell from "@/app/owner/_components/branch/BranchPageShell";

function pickList(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp.data)) return resp.data;
  if (Array.isArray(resp.items)) return resp.items;
  return [];
}

export default function BranchProductsPage() {
  const params = useParams();
  const branchId = useMemo(() => String(params?.id || ""), [params]);
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [inventoryForm, setInventoryForm] = useState({ quantity: 0, minStock: 10 });

  useEffect(() => {
    if (!branchId) return;
    loadProducts();
  }, [branchId]);

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");
      const data = await ownerGet(`/api/v1/owner/branches/${branchId}/products-with-inventory`).catch(() => ({}));
      if (data?.success && data.data) {
        setProducts(data.data.products || []);
        setSummary(data.data.summary || null);
      } else {
        // Fallback to old endpoint
        const q = `?branchId=${branchId}&limit=200`;
        const fallbackData = await ownerGet(`/api/v1/products${q}`).catch(() => ({}));
        setProducts(pickList(fallbackData));
      }
    } catch (e) {
      setError(e?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddProduct(product) {
    setSelectedProduct(product);
    setInventoryForm({ quantity: 0, minStock: 10 });
    setShowAddModal(true);
  }

  async function handleSaveInventory() {
    if (!selectedProduct) return;
    try {
      const variantId = selectedProduct.variants && selectedProduct.variants.length > 0 
        ? selectedProduct.variants[0].variantId 
        : null;
      
      await ownerPost(`/api/v1/owner/branches/${branchId}/products/${selectedProduct.productId}/inventory`, {
        variantId,
        quantity: parseInt(inventoryForm.quantity),
        minStock: parseInt(inventoryForm.minStock),
      });
      
      setShowAddModal(false);
      setSelectedProduct(null);
      loadProducts();
    } catch (e) {
      alert(e?.message || "Failed to add inventory");
    }
  }

  return (
    <BranchPageShell
      title="Products"
      subtitle="Manage products for this branch"
      breadcrumbLabel="Products"
      loading={loading}
      actions={[
        <Link
          key="new"
          href="/owner/products/new"
          className="btn btn-primary radius-12"
        >
          <i className="ri-add-line me-1" />
          Add Product
        </Link>,
      ]}
    >
      {error && (
        <div className="alert alert-danger radius-12 mb-4">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      {summary && (
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="card radius-12">
              <div className="card-body text-center p-3">
                <div className="text-secondary-light mb-1" style={{ fontSize: 12 }}>Total Products</div>
                <h4 className="mb-0 fw-bold text-primary">{summary.totalProducts || 0}</h4>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card radius-12">
              <div className="card-body text-center p-3">
                <div className="text-secondary-light mb-1" style={{ fontSize: 12 }}>With Inventory</div>
                <h4 className="mb-0 fw-bold text-success">{summary.productsWithInventory || 0}</h4>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card radius-12">
              <div className="card-body text-center p-3">
                <div className="text-secondary-light mb-1" style={{ fontSize: 12 }}>Not Added</div>
                <h4 className="mb-0 fw-bold text-warning">{summary.productsNotAdded || 0}</h4>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card radius-12">
        <div className="card-body p-24">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Status</th>
                  <th>Inventory</th>
                  <th>Stock Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
                      No products. Add a product from the main Products page or create one for this branch.
                    </td>
                  </tr>
                )}
                {products.map((p) => {
                  const stockStatus = p.stockStatus || "not_added";
                  // Create unique key combining productId and slug (or name if slug not available)
                  const uniqueKey = `product-${p.productId}-${p.slug || p.productName || ''}`;
                  
                  return (
                    <tr key={uniqueKey}>
                      <td>
                        <div className="fw-semibold">{p.productName || "—"}</div>
                        {p.category && (
                          <small className="text-secondary-light">{p.category}</small>
                        )}
                      </td>
                      <td>
                        <span className={`badge radius-8 ${p.approvalStatus === "PUBLISHED" ? "bg-success" : "bg-secondary"}`}>
                          {p.approvalStatus || "—"}
                        </span>
                      </td>
                      <td>
                        {p.hasInventory ? (
                          <div>
                            <div className="fw-semibold">Qty: {p.totalQuantity || 0}</div>
                            {p.variants && p.variants.length > 0 ? (
                              <small className="text-secondary-light">
                                {p.variants.length} variant{p.variants.length > 1 ? "s" : ""}
                              </small>
                            ) : (
                              <small className="text-secondary-light">Min: {p.minStock || 10}</small>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted">Not added</span>
                        )}
                      </td>
                      <td>
                        {stockStatus === "not_added" ? (
                          <span className="badge bg-secondary radius-8">Not Added</span>
                        ) : stockStatus === "out_of_stock" ? (
                          <span className="badge bg-danger radius-8">Out of Stock</span>
                        ) : stockStatus === "low_stock" ? (
                          <span className="badge bg-warning radius-8">Low Stock</span>
                        ) : (
                          <span className="badge bg-success radius-8">In Stock</span>
                        )}
                      </td>
                      <td className="text-end">
                        {!p.hasInventory ? (
                          <button
                            onClick={() => handleAddProduct(p)}
                            className="btn btn-sm btn-primary radius-8"
                          >
                            <i className="ri-add-line me-1" />
                            Add Inventory
                          </button>
                        ) : (
                          <>
                            <Link
                              href={`/owner/products/${p.productId}`}
                              className="btn btn-sm btn-ghost-primary radius-8 me-1"
                            >
                              View
                            </Link>
                            <Link
                              href={`/owner/branches/${branchId}/inventory`}
                              className="btn btn-sm btn-outline-primary radius-8"
                            >
                              Manage Stock
                            </Link>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Inventory Modal */}
      {showAddModal && selectedProduct && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowAddModal(false)}
        >
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h6 className="modal-title">Add Inventory: {selectedProduct.productName}</h6>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAddModal(false)}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Initial Quantity *</label>
                  <input
                    type="number"
                    className="form-control radius-12"
                    value={inventoryForm.quantity}
                    onChange={(e) =>
                      setInventoryForm({ ...inventoryForm, quantity: e.target.value })
                    }
                    min="0"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Minimum Stock *</label>
                  <input
                    type="number"
                    className="form-control radius-12"
                    value={inventoryForm.minStock}
                    onChange={(e) =>
                      setInventoryForm({ ...inventoryForm, minStock: e.target.value })
                    }
                    min="0"
                    required
                  />
                </div>
                {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                  <div className="alert alert-info radius-8" style={{ fontSize: 12 }}>
                    This product has {selectedProduct.variants.length} variant(s). Inventory will be added for the first variant.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary radius-12"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary radius-12"
                  onClick={handleSaveInventory}
                >
                  Add Inventory
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </BranchPageShell>
  );
}
