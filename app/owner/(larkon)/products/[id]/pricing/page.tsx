"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/src/lib/apiFetch";
import { notify } from "@/app/owner/_components/Notification";
import LkInput from "@larkon-ui/components/LkInput";

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

type Price = {
  id?: number;
  locationId: number;
  variantId: number;
  price: number;
  effectiveFrom?: string;
  effectiveTo?: string;
};

export default function ProductPricingPage() {
  const params = useParams();
  const productId = params.id as string;
  const [product, setProduct] = useState<any>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [prices, setPrices] = useState<Map<string, Price>>(new Map());
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

      // Load existing prices
      const pricesMap = new Map<string, Price>();
      // Note: You may need to implement a bulk price fetch endpoint
      // For now, we'll load prices individually or from a product prices endpoint
      setPrices(pricesMap);
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

  const getPriceKey = (locationId: number, variantId: number) => {
    return `${locationId}-${variantId}`;
  };

  const handleSetPrice = async (locationId: number, variantId: number, price: number) => {
    try {
      setError(null);
      await apiFetch("/api/v1/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          variantId,
          price: parseFloat(price.toString()),
        }),
      });

      const key = getPriceKey(locationId, variantId);
      setPrices((prev) => {
        const newMap = new Map(prev);
        newMap.set(key, { locationId, variantId, price });
        return newMap;
      });

      setEditingKey(null);
      notify.success("Success", "Price updated successfully");
    } catch (e: any) {
      const errorMsg = e?.message || "Failed to set price";
      setError(errorMsg);
      notify.error("Error", errorMsg);
    }
  };

  const loadPrice = async (locationId: number, variantId: number) => {
    try {
      const res = (await apiFetch(
        `/api/v1/pricing?locationId=${locationId}&variantId=${variantId}`
      )) as { success?: boolean; data?: any };
      const priceData = res?.data ?? res;
      if (priceData?.price !== undefined) {
        const key = getPriceKey(locationId, variantId);
        setPrices((prev) => {
          const newMap = new Map(prev);
          newMap.set(key, priceData);
          return newMap;
        });
      }
    } catch (e) {
      // Price doesn't exist yet, that's okay
    }
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
              <h5 className="mb-0">Manage Pricing</h5>
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
                <h6 className="fw-semibold mb-3">Set Prices by Location</h6>
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
                          </td>
                          {variants.map((variant) => {
                            const key = getPriceKey(location.id, variant.id);
                            const currentPrice = prices.get(key);
                            const isEditing = editingKey === key;

                            return (
                              <td key={variant.id} className="text-end">
                                {isEditing ? (
                                  <PriceEditForm
                                    locationId={location.id}
                                    variantId={variant.id}
                                    currentPrice={currentPrice?.price}
                                    onSave={(price) => {
                                      handleSetPrice(location.id, variant.id, price);
                                    }}
                                    onCancel={() => setEditingKey(null)}
                                    onLoad={() => loadPrice(location.id, variant.id)}
                                  />
                                ) : (
                                  <div>
                                    {currentPrice ? (
                                      <div>
                                        <div className="fw-semibold">৳{currentPrice.price.toFixed(2)}</div>
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
                                        onClick={() => {
                                          setEditingKey(key);
                                          loadPrice(location.id, variant.id);
                                        }}
                                      >
                                        Set Price
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

function PriceEditForm({
  locationId,
  variantId,
  currentPrice,
  onSave,
  onCancel,
  onLoad,
}: {
  locationId: number;
  variantId: number;
  currentPrice?: number;
  onSave: (price: number) => void;
  onCancel: () => void;
  onLoad: () => void;
}) {
  const [price, setPrice] = useState<string>(currentPrice?.toString() || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentPrice === undefined) {
      onLoad();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      notify.error("Invalid Price", "Please enter a valid price");
      return;
    }
    setLoading(true);
    onSave(priceNum);
    setTimeout(() => setLoading(false), 500);
  };

  return (
    <form onSubmit={handleSubmit} className="d-inline-block" style={{ minWidth: "120px" }}>
      <div className="input-group input-group-sm">
        <span className="input-group-text">৳</span>
        <LkInput
          type="number"
          size="sm"
          className="radius-12"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
          step="0.01"
          min="0"
          required
          autoFocus
        />
      </div>
      <div className="d-flex gap-1 mt-1">
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
