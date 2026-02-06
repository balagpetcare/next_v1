"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { apiGet, apiPost } from "@/lib/api";

interface MasterProduct {
  id: number;
  name: string;
  shortName?: string;
  barcode?: string;
  imageUrl?: string;
  primaryMedia?: { id: number; url: string };
  brand?: { id: number; name: string };
  category?: { id: number; name: string };
}

export default function AddFromMasterCatalogPage() {
  const [items, setItems] = useState<MasterProduct[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [cloningId, setCloningId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res: any = await apiGet("/api/v1/products/master-catalog");
      const data = Array.isArray(res?.data) ? res.data : res?.data?.items || res || [];
      setItems(data);
    } catch (e: any) {
      console.error("Load master catalog error:", e);
      setError(e?.message || "Failed to load master catalog");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const short = (item.shortName || "").toLowerCase();
      const brand = (item.brand?.name || "").toLowerCase();
      const category = (item.category?.name || "").toLowerCase();
      const barcode = (item.barcode || "").toLowerCase();
      return (
        name.includes(q) ||
        short.includes(q) ||
        brand.includes(q) ||
        category.includes(q) ||
        barcode.includes(q)
      );
    });
  }, [items, search]);

  async function handleClone(id: number) {
    try {
      setCloningId(id);
      setError(null);
      setSuccess(null);
      const res: any = await apiPost(`/api/v1/products/master-catalog/${id}/clone`, {});
      if (!res?.success) {
        throw new Error(res?.message || "Clone failed");
      }
      setSuccess("Product cloned into your organization. You can now configure stock and price.");
    } catch (e: any) {
      console.error("Clone master product error:", e);
      setError(e?.message || "Failed to clone product");
    } finally {
      setCloningId(null);
    }
  }

  return (
    <div className="dashboard-main-body">
      <div className="row g-3">
        <div className="col-12">
          <div className="card radius-12">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h5 className="mb-1">Add Product from Master Catalog</h5>
                  <small className="text-muted">
                    Pick a product template; descriptions and images come from the central catalog.
                  </small>
                </div>
                <div className="d-flex gap-2">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search name, brand, barcode..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ maxWidth: 260 }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-primary d-flex align-items-center gap-2"
                    onClick={load}
                    disabled={loading}
                  >
                    <Icon icon="solar:refresh-outline" />
                    {loading ? "Loading..." : "Refresh"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="alert alert-danger radius-12" role="alert">
                  {error}
                </div>
              )}
              {success && (
                <div className="alert alert-success radius-12" role="alert">
                  {success}
                </div>
              )}

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <p>No master catalog products found.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Brand</th>
                        <th>Category</th>
                        <th>Barcode</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((item) => (
                        <tr key={item.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {(item.primaryMedia?.url || item.imageUrl) && (
                              <img
                                src={item.primaryMedia?.url || item.imageUrl!}
                                alt={item.name || "Product image"}
                                style={{
                                  width: 40,
                                  height: 40,
                                  objectFit: "cover",
                                  borderRadius: 6,
                                }}
                              />
                            )}
                            <div>
                              <strong>{item.name}</strong>
                              {item.shortName && (
                                <>
                                  <br />
                                  <small className="text-muted">{item.shortName}</small>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                          <td>{item.brand?.name || "—"}</td>
                          <td>{item.category?.name || "—"}</td>
                          <td>{item.barcode || "—"}</td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-primary d-flex align-items-center gap-2 ms-auto"
                              onClick={() => handleClone(item.id)}
                              disabled={cloningId === item.id}
                            >
                              <Icon icon="solar:box-minimalistic-linear" />
                              {cloningId === item.id ? "Cloning..." : "Clone to Shop"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-3">
                <a href="/shop/products" className="btn btn-light">
                  Back to Products
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

