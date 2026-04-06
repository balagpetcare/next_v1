"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";
import { getUniqueVariants } from "@/src/lib/getUniqueVariants";

/**
 * @deprecated This page creates legacy StockTransfers.
 * Users should use Stock Requests → Allocation → Dispatch flow instead.
 */
export default function NewTransferPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [items, setItems] = useState<Array<{ variantId: string; quantity: string }>>([{ variantId: "", quantity: "" }]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showDeprecatedForm, setShowDeprecatedForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [locRes, prodRes] = await Promise.all([
        ownerGet("/api/v1/inventory/locations").catch(() => ({ data: [] as unknown[] })),
        ownerGet("/api/v1/products?limit=200").catch(() => ({ data: { items: [] as unknown[] } })),
      ]);
      const locData = (locRes as { data?: unknown[] | { items?: unknown[] } })?.data;
      const prodData = (prodRes as { data?: { items?: unknown[] } | unknown[] })?.data;
      setLocations(Array.isArray(locData) ? locData : (locData && typeof locData === "object" && "items" in locData ? (locData as { items: unknown[] }).items : []));
      const prods = prodData && typeof prodData === "object" && "items" in prodData ? (prodData as { items: unknown[] }).items : Array.isArray(prodData) ? prodData : [];
      setProducts(Array.isArray(prods) ? prods : []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => setItems((prev) => [...prev, { variantId: "", quantity: "" }]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, val: string) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: val } : it)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fromLocationId || !toLocationId || fromLocationId === toLocationId) {
      setError("Select different from and to locations");
      return;
    }
    const validItems = items.filter((it) => it.variantId && it.quantity && parseInt(it.quantity) > 0);
    if (!validItems.length) {
      setError("Add at least one item with quantity");
      return;
    }
    try {
      setSubmitting(true);
      await ownerPost("/api/v1/transfers", {
        fromLocationId: parseInt(fromLocationId),
        toLocationId: parseInt(toLocationId),
        items: validItems.map((it) => ({
          variantId: parseInt(it.variantId),
          quantity: parseInt(it.quantity),
        })),
      });
      router.push("/owner/transfers");
    } catch (err: any) {
      setError(err?.message || "Failed to create transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const variantOptions = useMemo(() => {
    const flat = products.flatMap((p: any) =>
      (p.variants ?? []).map((v: any) => ({
        id: v.id,
        sku: v.sku,
        title: v.title,
        productName: p.name as string,
      }))
    );
    return getUniqueVariants(flat);
  }, [products]);

  if (loading) {
    return (
      <div className="container py-4">
        <div className="text-center py-5">Loading...</div>
      </div>
    );
  }

  // Show deprecation notice by default, with option to proceed
  if (!showDeprecatedForm) {
    return (
      <div className="container py-4">
        <div className="d-flex align-items-center gap-2 mb-4">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => router.back()}>
            Back
          </button>
          <h5 className="mb-0">Create Stock Transfer</h5>
        </div>

        <div className="alert alert-warning">
          <h5 className="alert-heading">Legacy Feature - Use Stock Requests Instead</h5>
          <p>
            This Stock Transfer feature is <strong>deprecated</strong>. For new transfers, please use the
            modern workflow which provides:
          </p>
          <ul className="mb-3">
            <li>Manager confirmation before stock posts</li>
            <li>Controlled receiving with discrepancy tracking</li>
            <li>Full audit trail with transport/challan details</li>
            <li>Integration with allocation plans and pick lists</li>
          </ul>
          <hr />
          <div className="d-flex gap-2">
            <Link href="/owner/inventory/stock-requests" className="btn btn-primary">
              Create Stock Request (Recommended)
            </Link>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowDeprecatedForm(true)}
            >
              Continue with Legacy Transfer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center gap-2 mb-4">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => router.back()}>
          Back
        </button>
        <h5 className="mb-0">Create Stock Transfer (Legacy)</h5>
        <span className="badge bg-warning text-dark">Deprecated</span>
      </div>

      <div className="alert alert-warning mb-3">
        <small>
          <strong>Note:</strong> This is a legacy feature. Consider using{" "}
          <Link href="/owner/inventory/stock-requests">Stock Requests</Link> for better control and audit trail.
        </small>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit} className="card radius-12">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">From Location</label>
              <select
                className="form-select"
                value={fromLocationId}
                onChange={(e) => setFromLocationId(e.target.value)}
                required
              >
                <option value="">Select...</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.branch ? `(${loc.branch.name})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">To Location</label>
              <select
                className="form-select"
                value={toLocationId}
                onChange={(e) => setToLocationId(e.target.value)}
                required
              >
                <option value="">Select...</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.branch ? `(${loc.branch.name})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <hr className="my-4" />
          <div className="d-flex justify-content-between align-items-center mb-2">
            <label className="form-label mb-0">Items</label>
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={addItem}>
              Add item
            </button>
          </div>
          {items.map((it, i) => (
            <div key={i} className="row g-2 mb-2 align-items-end">
              <div className="col-md-6">
                <select
                  className="form-select form-select-sm"
                  value={it.variantId}
                  onChange={(e) => updateItem(i, "variantId", e.target.value)}
                  required={i === 0}
                >
                  <option value="">Variant...</option>
                  {variantOptions.map((v) => (
                    <option key={`variant-${v.id}`} value={v.id}>
                      {v.productName ? `${v.productName} - ` : ""}{v.title ?? v.sku ?? v.id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <input
                  type="number"
                  className="form-control form-control-sm"
                  placeholder="Qty"
                  value={it.quantity}
                  onChange={(e) => updateItem(i, "quantity", e.target.value)}
                  min={1}
                  required={i === 0}
                />
              </div>
              <div className="col-md-3">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => removeItem(i)}
                  disabled={items.length === 1}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div className="mt-4">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Creating..." : "Create Transfer"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
