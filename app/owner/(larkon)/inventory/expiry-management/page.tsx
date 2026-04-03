"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

interface ExpiredStockItem {
  lotId: number;
  lotCode: string;
  variantId: number;
  productName: string;
  productId: number;
  locationId: number;
  locationName: string;
  branchId: number;
  branchName: string;
  onHandQty: number;
  expDate: string;
  daysExpired: number;
}

interface WriteOffLogItem {
  id: number;
  lotId: number;
  lotCode: string;
  expDate: string;
  variantId: number;
  productName: string;
  locationId: number;
  locationName: string;
  branchId: number;
  branchName: string;
  quantity: number;
  method: string;
  createdBy: { id: number; name: string } | null;
  createdAt: string;
}

export default function ExpiryManagementPage() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "expired";
  const daysFilter = searchParams.get("days") || "30";

  const [expiredStock, setExpiredStock] = useState<ExpiredStockItem[]>([]);
  const [writeOffLog, setWriteOffLog] = useState<WriteOffLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [orgId, setOrgId] = useState<number | null>(null);
  const [orgLoaded, setOrgLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        type MeRes = { organizations?: { id: number }[]; data?: { organizations?: { id: number }[] } };
        const me = await ownerGet<MeRes>("/api/v1/owner/me").catch(() => ({}));
        if (cancelled) return;
        const orgs = me?.organizations ?? me?.data?.organizations ?? [];
        setOrgId(orgs[0]?.id ?? null);
      } finally {
        if (!cancelled) setOrgLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!orgLoaded) return;
    loadData();
  }, [activeTab, daysFilter, orgLoaded, orgId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!orgId) {
        setExpiredStock([]);
        setWriteOffLog([]);
        setError("No organization found for your account. Inventory endpoints require orgId.");
        return;
      }
      const orgQs = `orgId=${encodeURIComponent(String(orgId))}`;
      if (activeTab === "expired") {
        const res = await fetch(`/api/v1/inventory/expired-stock?${orgQs}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setExpiredStock(data.items || []);
        } else {
          setError("Failed to load expired stock");
        }
      } else if (activeTab === "history") {
        const res = await fetch(`/api/v1/inventory/expiry-writeoff/log?${orgQs}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setWriteOffLog(data.items || []);
        } else {
          setError("Failed to load write-off history");
        }
      } else if (activeTab === "near") {
        const res = await fetch(
          `/api/v1/inventory/expiring?daysAhead=${encodeURIComponent(daysFilter)}&${orgQs}`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );
        if (res.ok) {
          const data = await res.json();
          const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
          setExpiredStock(rows);
        } else {
          setError("Failed to load near-expiry items");
        }
      }
    } catch (err) {
      console.error("Failed to load expiry data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkWriteOff = async () => {
    if (selectedItems.size === 0) {
      alert("Please select at least one item to write off");
      return;
    }

    if (!confirm(`Write off ${selectedItems.size} expired items? This action cannot be undone.`)) {
      return;
    }

    setActionLoading(true);
    try {
      for (const lotId of Array.from(selectedItems)) {
        const item = expiredStock.find((i) => i.lotId === lotId);
        if (!item) continue;

        const res = await fetch("/api/v1/inventory/expiry-writeoff/manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            lotId: item.lotId,
            locationId: item.locationId,
            quantity: item.onHandQty,
            reason: "Bulk write-off via expiry management",
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          console.error(`Failed to write off lot ${item.lotCode}:`, err);
        }
      }

      setSelectedItems(new Set());
      loadData();
      alert("Write-off completed successfully");
    } catch (err) {
      console.error("Write-off failed:", err);
      alert("Failed to complete write-off. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSingleWriteOff = async (item: ExpiredStockItem) => {
    if (!confirm(`Write off ${item.onHandQty} units of ${item.productName} (Lot: ${item.lotCode})?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/v1/inventory/expiry-writeoff/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          lotId: item.lotId,
          locationId: item.locationId,
          quantity: item.onHandQty,
          reason: "Manual write-off via expiry management",
        }),
      });

      if (res.ok) {
        alert("Write-off successful");
        loadData();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || "Failed to write off");
      }
    } catch (err) {
      console.error("Write-off failed:", err);
      alert("Failed to write off. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelection = (lotId: number) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(lotId)) {
      newSet.delete(lotId);
    } else {
      newSet.add(lotId);
    }
    setSelectedItems(newSet);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="dashboard-main-body">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="mb-0">Expiry Management</h5>
        <Link href="/owner/pharmacy" className="btn btn-sm btn-outline-secondary">
          Back to Dashboard
        </Link>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <Link
            href="/owner/inventory/expiry-management?tab=expired"
            className={`nav-link ${activeTab === "expired" ? "active" : ""}`}
          >
            Expired Stock
            {expiredStock.length > 0 && activeTab === "expired" && (
              <span className="badge bg-danger ms-2">{expiredStock.length}</span>
            )}
          </Link>
        </li>
        <li className="nav-item">
          <Link
            href="/owner/inventory/expiry-management?tab=near"
            className={`nav-link ${activeTab === "near" ? "active" : ""}`}
          >
            Near Expiry
          </Link>
        </li>
        <li className="nav-item">
          <Link
            href="/owner/inventory/expiry-management?tab=history"
            className={`nav-link ${activeTab === "history" ? "active" : ""}`}
          >
            Write-Off History
          </Link>
        </li>
      </ul>

      {/* Near Expiry Filters */}
      {activeTab === "near" && (
        <div className="mb-3 d-flex gap-2">
          <Link
            href="/owner/inventory/expiry-management?tab=near&days=30"
            className={`btn btn-sm ${daysFilter === "30" ? "btn-danger" : "btn-outline-danger"}`}
          >
            30 Days
          </Link>
          <Link
            href="/owner/inventory/expiry-management?tab=near&days=60"
            className={`btn btn-sm ${daysFilter === "60" ? "btn-warning" : "btn-outline-warning"}`}
          >
            60 Days
          </Link>
          <Link
            href="/owner/inventory/expiry-management?tab=near&days=90"
            className={`btn btn-sm ${daysFilter === "90" ? "btn-info" : "btn-outline-info"}`}
          >
            90 Days
          </Link>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">Loading...</div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <>
          {/* Expired Stock Tab */}
          {activeTab === "expired" && (
            <>
              {selectedItems.size > 0 && (
                <div className="mb-3">
                  <button
                    className="btn btn-danger"
                    onClick={handleBulkWriteOff}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Processing..." : `Write Off Selected (${selectedItems.size})`}
                  </button>
                </div>
              )}
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={expiredStock.length > 0 && selectedItems.size === expiredStock.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems(new Set(expiredStock.map((i) => i.lotId)));
                            } else {
                              setSelectedItems(new Set());
                            }
                          }}
                        />
                      </th>
                      <th>Product</th>
                      <th>Lot Code</th>
                      <th>Quantity</th>
                      <th>Expiry Date</th>
                      <th>Days Expired</th>
                      <th>Location</th>
                      <th>Branch</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiredStock.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center text-muted py-4">
                          No expired stock found
                        </td>
                      </tr>
                    ) : (
                      expiredStock.map((item) => (
                        <tr key={`${item.lotId}-${item.locationId}`}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedItems.has(item.lotId)}
                              onChange={() => toggleSelection(item.lotId)}
                            />
                          </td>
                          <td>{item.productName}</td>
                          <td>
                            <code className="small">{item.lotCode}</code>
                          </td>
                          <td>{item.onHandQty}</td>
                          <td>{formatDate(item.expDate)}</td>
                          <td>
                            <span className="badge bg-danger">{item.daysExpired} days</span>
                          </td>
                          <td>{item.locationName}</td>
                          <td>{item.branchName}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleSingleWriteOff(item)}
                              disabled={actionLoading}
                            >
                              Write Off
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Near Expiry Tab */}
          {activeTab === "near" && (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Lot Code</th>
                    <th>Quantity</th>
                    <th>Expiry Date</th>
                    <th>Days Until Expiry</th>
                    <th>Location</th>
                    <th>Branch</th>
                  </tr>
                </thead>
                <tbody>
                  {expiredStock.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-4">
                        No items expiring in the next {daysFilter} days
                      </td>
                    </tr>
                  ) : (
                    expiredStock.map((item: any, idx) => {
                      const daysUntil = item.lot?.expDate 
                        ? Math.ceil((new Date(item.lot.expDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                        : 0;
                      const badgeColor = daysUntil <= 30 ? "bg-danger" : daysUntil <= 60 ? "bg-warning" : "bg-info";
                      
                      return (
                        <tr key={`${item.id || idx}`}>
                          <td>{item.lot?.variant?.product?.name || item.productName || "Unknown"}</td>
                          <td>
                            <code className="small">{item.lot?.lotCode || item.lotCode}</code>
                          </td>
                          <td>{item.quantity || item.onHandQty}</td>
                          <td>{formatDate(item.expiryDate || item.lot?.expDate)}</td>
                          <td>
                            <span className={`badge ${badgeColor}`}>{daysUntil} days</span>
                          </td>
                          <td>{item.location?.name || item.locationName}</td>
                          <td>{item.branch?.name || item.branchName}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Write-Off History Tab */}
          {activeTab === "history" && (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Lot Code</th>
                    <th>Quantity</th>
                    <th>Method</th>
                    <th>Location</th>
                    <th>Branch</th>
                    <th>Performed By</th>
                  </tr>
                </thead>
                <tbody>
                  {writeOffLog.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        No write-off history found
                      </td>
                    </tr>
                  ) : (
                    writeOffLog.map((log) => (
                      <tr key={log.id}>
                        <td>{formatDate(log.createdAt)}</td>
                        <td>{log.productName}</td>
                        <td>
                          <code className="small">{log.lotCode}</code>
                        </td>
                        <td>{log.quantity}</td>
                        <td>
                          <span className={`badge ${log.method === "AUTO" ? "bg-primary" : "bg-secondary"}`}>
                            {log.method}
                          </span>
                        </td>
                        <td>{log.locationName}</td>
                        <td>{log.branchName}</td>
                        <td>{log.createdBy?.name || "System"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
