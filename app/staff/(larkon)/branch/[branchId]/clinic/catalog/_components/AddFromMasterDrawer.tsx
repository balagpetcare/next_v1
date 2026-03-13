"use client";

import { useCallback, useState } from "react";
import { DetailDrawer } from "@/src/components/dashboard";
import { listMasterCatalogItems, executeAddFromMaster } from "./catalogApi";

export default function AddFromMasterDrawer({
  branchId,
  open,
  onClose,
  onAdded,
}: {
  branchId: string;
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [masterItems, setMasterItems] = useState<{ id: number; name: string; itemCode: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "danger"; text: string } | null>(null);

  const loadMaster = useCallback(() => {
    setLoading(true);
    setMessage(null);
    listMasterCatalogItems(branchId)
      .then(setMasterItems)
      .catch(() => setMasterItems([]))
      .finally(() => setLoading(false));
  }, [branchId]);

  const executeAdd = useCallback(() => {
    if (selectedIds.length === 0) {
      setMessage({ type: "danger", text: "Select at least one item." });
      return;
    }
    setExecuting(true);
    setMessage(null);
    executeAddFromMaster(branchId, selectedIds, "createMissingOnly")
      .then((data) => {
        const created = (data?.createdItems ?? 0) + (data?.createdCategories ?? 0);
        setMessage({ type: "success", text: `Added ${created} item(s) to branch catalog.` });
        setSelectedIds([]);
        onAdded();
      })
      .catch((e) => setMessage({ type: "danger", text: (e as Error)?.message ?? "Failed to add" }))
      .finally(() => setExecuting(false));
  }, [branchId, selectedIds, onAdded]);

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title="Add from Master Catalog"
      subtitle="Select master items to add to this branch catalog."
    >
      <div className="p-3">
        <button
          type="button"
          className="btn btn-outline-primary btn-sm radius-8 mb-3"
          onClick={loadMaster}
          disabled={loading}
        >
          {loading ? "Loading…" : "Load master items"}
        </button>
        {message && (
          <div className={`alert alert-${message.type} radius-12 mb-3`} role="alert">
            {message.text}
          </div>
        )}
        {masterItems.length > 0 && (
          <>
            <div className="mb-2 small text-muted">Select items (max 50):</div>
            <div className="d-flex flex-wrap gap-2 mb-3" style={{ maxHeight: 200, overflowY: "auto" }}>
              {masterItems.slice(0, 50).map((item) => (
                <label key={item.id} className="d-inline-flex align-items-center gap-1 me-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={(e) => {
                      if (e.target.checked)
                        setSelectedIds((prev) => (prev.length >= 50 ? prev : [...prev, item.id]));
                      else setSelectedIds((prev) => prev.filter((id) => id !== item.id));
                    }}
                    aria-label={`Select ${item.name}`}
                  />
                  <span className="small">{item.itemCode} – {item.name}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm radius-8"
              onClick={executeAdd}
              disabled={executing || selectedIds.length === 0}
            >
              {executing ? "Adding…" : `Add ${selectedIds.length} item(s) to branch`}
            </button>
          </>
        )}
      </div>
    </DetailDrawer>
  );
}
