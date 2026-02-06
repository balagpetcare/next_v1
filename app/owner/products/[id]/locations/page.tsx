"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/src/lib/apiFetch";
import { notify } from "../../../_components/Notification";

type Variant = {
  id: number;
  sku: string;
  title: string;
  attributes?: any;
};

type Location = {
  id: number;
  name: string;
  code?: string;
  type?: string;
  org?: {
    id: number;
    name: string;
  };
};

type InventoryItem = {
  id?: number;
  locationId: number;
  variantId: number;
  quantity: number;
  minStock?: number;
};

export default function ProductLocationsPage() {
  const params = useParams();
  const productId = params.id as string;
  const [product, setProduct] = useState<any>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [inventory, setInventory] = useState<Map<string, InventoryItem>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load product with variants
      const productRes = (await apiFetch(`/api/v1/products/${productId}`)) as { success?: boolean; data?: any };
      const productData = productRes?.data ?? productRes;
      setProduct(productData);
      setVariants(productData?.variants ?? []);

      // Load locations (branches)
      const locationsRes = (await apiFetch("/api/v1/owner/branches")) as { success?: boolean; data?: any };
      const locationsData = Array.isArray(locationsRes?.data) ? locationsRes.data : Array.isArray(locationsRes) ? locationsRes : [];
      setLocations(locationsData);

      // Load inventory for this product
      const inventoryRes = (await apiFetch(
        `/api/v1/inventory?productId=${productId}`
      )) as { success?: boolean; data?: any };
      const inventoryData = Array.isArray(inventoryRes?.data) ? inventoryRes.data : [];
      
      const inventoryMap = new Map<string, InventoryItem>();
      inventoryData.forEach((item: any) => {
        const vid = item.variantId ?? item.variant?.id;
        const bid = item.branchId ?? item.branch?.id;
        if (vid && bid) {
          const key = `${bid}-${vid}`;
          const existing = inventoryMap.get(key);
          const qty = (item.quantity ?? item.availableQty ?? 0) + (existing?.quantity ?? 0);
          inventoryMap.set(key, {
            id: item.id ?? key,
            locationId: item.locationId ?? bid,
            variantId: vid,
            quantity: qty,
            minStock: item.minStock ?? existing?.minStock ?? 10,
          });
        }
      });
      setInventory(inventoryMap);
    } catch (e: any) {
      setError(e?.message || "Failed to load data");
      notify.error("Error", e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [productId]);

  const getInventoryKey = (locationId: number, variantId: number) => {
    return `${locationId}-${variantId}`;
  };

  const handleSetInventory = async (_locationId: number, _variantId: number, _quantity: number, _minStock?: number) => {
    notify.error(
      "Stock flow changed",
      "Direct stock set is disabled. Use Inventory page to request adjustments or create opening stock with lot info."
    );
  };

  if (loading) {
    return (
      <div className="dashboard-main-body">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-danger radius-12">{error}</div>
        <Link href="/owner/products" className="btn btn-outline-primary radius-12">
          ← Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <div className="row g-3">
        <div className="col-12">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div>
              <h5 className="mb-0">Manage Locations & Inventory</h5>
              {product && <small className="text-muted">{product.name}</small>}
            </div>
            <Link href={`/owner/products/${productId}`} className="btn btn-sm btn-outline-primary radius-12">
              ← Back to Product
            </Link>
          </div>
        </div>

        {error && (
          <div className="col-12">
            <div className="alert alert-danger radius-12" role="alert">
              {error}
            </div>
          </div>
        )}

        {variants.length === 0 ? (
          <div className="col-12">
            <div className="alert alert-info radius-12">
              No variants found. Please add variants first.
            </div>
          </div>
        ) : locations.length === 0 ? (
          <div className="col-12">
            <div className="alert alert-info radius-12">
              No locations found. Please set up branches first.
            </div>
          </div>
        ) : (
          <div className="col-12">
            <div className="card radius-12">
              <div className="card-body">
                <h6 className="fw-semibold mb-3">Stock Management by Location</h6>
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Location</th>
                        {variants.map((variant) => (
                          <th key={variant.id} className="text-end">
                            <div className="small fw-normal">{variant.title}</div>
                            <div className="small text-muted">{variant.sku}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {locations.map((location) => (
                        <tr key={location.id}>
                          <td>
                            <div className="fw-semibold">{location.name}</div>
                            {location.code && (
                              <div className="small text-muted">{location.code}</div>
                            )}
                            {location.org && (
                              <div className="small text-muted">Org: {location.org.name}</div>
                            )}
                            {location.type && (
                              <span className="badge bg-primary-focus text-primary-main radius-12 small">
                                {location.type}
                              </span>
                            )}
                          </td>
                          {variants.map((variant) => {
                            const key = getInventoryKey(location.id, variant.id);
                            const currentInventory = inventory.get(key);
                            const isEditing = editingKey === key;

                            return (
                              <td key={variant.id} className="text-end">
                                {isEditing ? (
                                  <InventoryEditForm
                                    locationId={location.id}
                                    variantId={variant.id}
                                    currentQuantity={currentInventory?.quantity}
                                    currentMinStock={currentInventory?.minStock}
                                    onSave={(quantity, minStock) => {
                                      handleSetInventory(location.id, variant.id, quantity, minStock);
                                    }}
                                    onCancel={() => setEditingKey(null)}
                                  />
                                ) : (
                                  <div>
                                    {currentInventory ? (
                                      <div>
                                        <div className={`fw-semibold ${currentInventory.quantity <= (currentInventory.minStock || 0) ? "text-danger" : ""}`}>
                                          Qty: {currentInventory.quantity}
                                        </div>
                                        {currentInventory.minStock !== undefined && (
                                          <div className="small text-muted">
                                            Min: {currentInventory.minStock}
                                          </div>
                                        )}
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-outline-primary radius-12 mt-1"
                                          onClick={() => setEditingKey(key)}
                                        >
                                          Edit
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-primary radius-12"
                                        onClick={() => setEditingKey(key)}
                                      >
                                        Set Stock
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InventoryEditForm({
  locationId,
  variantId,
  currentQuantity,
  currentMinStock,
  onSave,
  onCancel,
}: {
  locationId: number;
  variantId: number;
  currentQuantity?: number;
  currentMinStock?: number;
  onSave: (quantity: number, minStock?: number) => void;
  onCancel: () => void;
}) {
  const [quantity, setQuantity] = useState<string>((currentQuantity || 0).toString());
  const [minStock, setMinStock] = useState<string>((currentMinStock || "").toString());
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = parseInt(quantity);
    const minStockNum = minStock.trim() ? parseInt(minStock) : undefined;
    
    if (isNaN(qtyNum) || qtyNum < 0) {
      notify.error("Invalid Quantity", "Please enter a valid quantity");
      return;
    }
    if (minStockNum !== undefined && (isNaN(minStockNum) || minStockNum < 0)) {
      notify.error("Invalid Min Stock", "Please enter a valid minimum stock");
      return;
    }
    
    setLoading(true);
    onSave(qtyNum, minStockNum);
    setTimeout(() => setLoading(false), 500);
  };

  return (
    <form onSubmit={handleSubmit} className="d-inline-block text-start" style={{ minWidth: "150px" }}>
      <div className="mb-2">
        <label className="form-label small">Quantity</label>
        <input
          type="number"
          className="form-control form-control-sm radius-12"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="0"
          min="0"
          required
          autoFocus
        />
      </div>
      <div className="mb-2">
        <label className="form-label small">Min Stock (Optional)</label>
        <input
          type="number"
          className="form-control form-control-sm radius-12"
          value={minStock}
          onChange={(e) => setMinStock(e.target.value)}
          placeholder="0"
          min="0"
        />
      </div>
      <div className="d-flex gap-1">
        <button
          type="submit"
          className="btn btn-sm btn-primary radius-12"
          disabled={loading}
        >
          Save
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary radius-12"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
