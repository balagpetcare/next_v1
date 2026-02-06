"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffPosProducts, staffStockRequestCreate } from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";

const REQUIRED_PERM = "inventory.update";

export default function StaffBranchStockRequestNewPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);

  const [products, setProducts] = useState([]);
  const [rows, setRows] = useState([{ productId: "", variantId: "", requestedQty: "", note: "" }]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const permissions = myAccess?.permissions ?? [];
  const canCreate = permissions.includes(REQUIRED_PERM) || permissions.includes("inventory.transfer");

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    staffPosProducts(branchId)
      .then((list) => {
        if (!cancelled) setProducts(Array.isArray(list) ? list : []);
      })
      .catch(() => { if (!cancelled) setProducts([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [branchId]);

  const addRow = () => setRows((r) => [...r, { productId: "", variantId: "", requestedQty: "", note: "" }]);
  const setRow = (idx, field, value) => {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
    if (field === "productId") {
      setRows((r) => r.map((row, i) => (i === idx ? { ...row, variantId: "", requestedQty: row.requestedQty, note: row.note } : row)));
    }
  };
  const removeRow = (idx) => setRows((r) => (r.length > 1 ? r.filter((_, i) => i !== idx) : r));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const items = rows
      .map((row) => ({
        productId: Number(row.productId),
        variantId: Number(row.variantId),
        requestedQty: Number(row.requestedQty),
        note: row.note || undefined,
      }))
      .filter((i) => i.productId && i.variantId && i.requestedQty > 0);
    if (items.length === 0) {
      setError("Add at least one item with product, variant, and quantity.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await staffStockRequestCreate({
        branchId: Number(branchId),
        items,
      });
      if (res?.data?.id) {
        router.push(`/staff/branch/${branchId}/inventory/stock-requests/${res.data.id}`);
        return;
      }
      setError(res?.message ?? "Request created but no ID returned.");
    } catch (err) {
      setError(err?.message ?? "Failed to create request");
    } finally {
      setSubmitting(false);
    }
  };

  const variantOptions = (productId) => {
    const p = products.find((x) => x.id === Number(productId));
    return p?.variants ?? [];
  };

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }
  if (errorCode === "forbidden" || !hasViewPermission || !canCreate) {
    return (
      <AccessDenied
        missingPerm={REQUIRED_PERM}
        onBack={() => router.push(`/staff/branch/${branchId}/inventory/stock-requests`)}
      />
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex flex-wrap align-items-center gap-16 mb-24">
        <Link href={`/staff/branch/${branchId}/inventory/stock-requests`} className="btn btn-outline-secondary btn-sm">← Back</Link>
        <h5 className="mb-0">New Stock Request</h5>
      </div>
      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}
      <Card>
        <form onSubmit={handleSubmit}>
          <p className="text-secondary-light small mb-16">Add product, variant, requested quantity and optional note. No batch selection here — owner will assign batches when fulfilling.</p>
          <div className="table-responsive mb-16">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Variant</th>
                  <th>Requested Qty</th>
                  <th>Note</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx}>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={row.productId}
                        onChange={(e) => setRow(idx, "productId", e.target.value)}
                        required
                      >
                        <option value="">Select product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={row.variantId}
                        onChange={(e) => setRow(idx, "variantId", e.target.value)}
                        required
                      >
                        <option value="">Select variant</option>
                        {variantOptions(row.productId).map((v) => (
                          <option key={v.id} value={v.id}>{v.title ?? v.sku}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        min="1"
                        value={row.requestedQty}
                        onChange={(e) => setRow(idx, "requestedQty", e.target.value)}
                        placeholder="0"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={row.note}
                        onChange={(e) => setRow(idx, "note", e.target.value)}
                        placeholder="Optional"
                      />
                    </td>
                    <td>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeRow(idx)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="d-flex flex-wrap gap-12">
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={addRow}>Add row</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
              {submitting ? "Creating…" : "Create draft"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
