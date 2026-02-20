"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, ownerPost, ownerPatch, ownerDelete } from "@/app/owner/_lib/ownerApi";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type Location = {
  id: number;
  name: string;
  type?: string;
  code?: string | null;
  isActive?: boolean;
  branch?: { id: number; name: string; orgId?: number };
};

type Branch = { id: number; name: string; orgId?: number };

const LOCATION_TYPES = ["SHOP", "CLINIC", "ONLINE_HUB", "CENTRAL_WAREHOUSE", "BRANCH_STORE", "CLINIC_STORE", "DAMAGE_AREA", "RETURN_AREA"];

export default function OwnerInventoryLocationsPage() {
  const toast = useToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [ensuring, setEnsuring] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addForm, setAddForm] = useState({ branchId: "", type: "SHOP", name: "", code: "" });
  const [editForm, setEditForm] = useState({ name: "", type: "", code: "", isActive: true });

  const loadLocations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ownerGet<{ data: Location[] }>("/api/v1/inventory/locations");
      const list = Array.isArray(res?.data) ? res.data : [];
      setLocations(list);
    } catch (e) {
      toast.error(getMessageFromApiError(e as Error));
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadBranches = useCallback(async () => {
    try {
      const res = await ownerGet<{ data?: Branch[] }>("/api/v1/owner/branches");
      const list = Array.isArray(res?.data) ? res.data : [];
      setBranches(list);
    } catch {
      setBranches([]);
    }
  }, []);

  useEffect(() => {
    loadLocations();
    loadBranches();
  }, [loadLocations, loadBranches]);

  const handleEnsureDefaults = async () => {
    setEnsuring(true);
    try {
      const res = await ownerPost<{ data: { created: number; branchesProcessed: number }; message?: string }>(
        "/api/v1/owner/inventory/locations/ensure-defaults",
        {}
      );
      const created = res?.data?.created ?? 0;
      toast.success(res?.message ?? `Created ${created} default location(s).`);
      await loadLocations();
    } catch (e) {
      toast.error(getMessageFromApiError(e as Error));
    } finally {
      setEnsuring(false);
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const branchId = parseInt(addForm.branchId, 10);
    if (!branchId || !addForm.name.trim()) {
      toast.warning("Branch and name are required.");
      return;
    }
    try {
      await ownerPost("/api/v1/owner/inventory/locations", {
        branchId,
        type: addForm.type,
        name: addForm.name.trim(),
        code: addForm.code.trim() || undefined,
      });
      toast.success("Location created.");
      setAddForm({ branchId: "", type: "SHOP", name: "", code: "" });
      setShowAdd(false);
      await loadLocations();
    } catch (e) {
      toast.error(getMessageFromApiError(e as Error));
    }
  };

  const startEdit = (loc: Location) => {
    setEditingId(loc.id);
    setEditForm({ name: loc.name, type: loc.type || "SHOP", code: loc.code ?? "", isActive: loc.isActive !== false });
  };

  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId == null) return;
    try {
      await ownerPatch(`/api/v1/owner/inventory/locations/${editingId}`, {
        name: editForm.name.trim(),
        type: editForm.type,
        code: editForm.code.trim() || null,
        isActive: editForm.isActive,
      });
      toast.success("Location updated.");
      setEditingId(null);
      await loadLocations();
    } catch (e) {
      toast.error(getMessageFromApiError(e as Error));
    }
  };

  const handleDeleteLocation = async (loc: Location) => {
    if (!confirm(`Delete or deactivate "${loc.name}"?`)) return;
    try {
      const res = await ownerDelete<{ data?: { deleted?: boolean; deactivated?: boolean }; message?: string }>(
        `/api/v1/owner/inventory/locations/${loc.id}`
      );
      toast.success(res?.message ?? "Location deleted or deactivated.");
      await loadLocations();
    } catch (e) {
      toast.error(getMessageFromApiError(e as Error));
    }
  };

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Inventory Locations"
        subtitle="Locations used for opening stock and transfers. Each branch can have one or more locations."
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Inventory", href: "/owner/inventory" },
          { label: "Locations", href: "/owner/inventory/locations" },
        ]}
      />

      <div className="card radius-12 mb-3">
        <div className="card-body p-24">
          <p className="text-muted small mb-3">
            If the Location dropdown on Receipts is empty, click below to create one default location per branch (idempotent — safe to run multiple times).
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={ensuring || loading}
            onClick={handleEnsureDefaults}
          >
            {ensuring ? "Creating…" : "Ensure default locations for all branches"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-4 text-muted">Loading locations…</div>
        </div>
      ) : locations.length === 0 ? (
        <div className="card radius-12">
          <div className="card-body text-center py-4">
            <p className="text-muted mb-2">No locations yet.</p>
            <p className="small text-muted">Click &quot;Ensure default locations for all branches&quot; above, or create a new branch (new branches get a default location automatically).</p>
          </div>
        </div>
      ) : (
        <div className="card radius-12">
          <div className="card-body p-24">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <h6 className="mb-0">Locations ({locations.length})</h6>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}>
                {showAdd ? "Cancel" : "Add location"}
              </button>
            </div>
            {showAdd && (
              <form onSubmit={handleCreateLocation} className="card bg-light radius-12 mb-3 p-3">
                <div className="row g-2">
                  <div className="col-md-3">
                    <label className="form-label small">Branch</label>
                    <select
                      className="form-select form-select-sm"
                      value={addForm.branchId}
                      onChange={(e) => setAddForm((f) => ({ ...f, branchId: e.target.value }))}
                      required
                    >
                      <option value="">Select branch</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label small">Type</label>
                    <select
                      className="form-select form-select-sm"
                      value={addForm.type}
                      onChange={(e) => setAddForm((f) => ({ ...f, type: e.target.value }))}
                    >
                      {LOCATION_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label small">Name</label>
                    <input
                      className="form-control form-control-sm"
                      value={addForm.name}
                      onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Name"
                      required
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label small">Code (optional)</label>
                    <input
                      className="form-control form-control-sm"
                      value={addForm.code}
                      onChange={(e) => setAddForm((f) => ({ ...f, code: e.target.value }))}
                      placeholder="Code"
                    />
                  </div>
                  <div className="col-md-2 d-flex align-items-end">
                    <button type="submit" className="btn btn-success btn-sm me-1">Create</button>
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
                  </div>
                </div>
              </form>
            )}
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Branch</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((loc) => (
                    <tr key={loc.id}>
                      <td>{loc.id}</td>
                      <td>
                        {editingId === loc.id ? (
                          <input
                            className="form-control form-control-sm"
                            value={editForm.name}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            size={12}
                          />
                        ) : (
                          loc.name
                        )}
                      </td>
                      <td>
                        {editingId === loc.id ? (
                          <select
                            className="form-select form-select-sm"
                            value={editForm.type}
                            onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
                          >
                            {LOCATION_TYPES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        ) : (
                          loc.type ?? "—"
                        )}
                      </td>
                      <td>{loc.branch ? `${loc.branch.name} (ID ${loc.branch.id})` : "—"}</td>
                      <td>{loc.isActive === false ? <span className="badge bg-secondary">Inactive</span> : <span className="badge bg-success">Active</span>}</td>
                      <td>
                        {editingId === loc.id ? (
                          <>
                            <button type="button" className="btn btn-success btn-sm me-1" onClick={handleUpdateLocation}>Save</button>
                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="btn btn-outline-primary btn-sm me-1" onClick={() => startEdit(loc)}>Edit</button>
                            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => handleDeleteLocation(loc)}>Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3">
        <Link href="/owner/inventory/receipts" className="btn btn-outline-secondary btn-sm me-2">
          ← Receipts
        </Link>
        <Link href="/owner/inventory/warehouse" className="btn btn-outline-secondary btn-sm">
          Warehouse
        </Link>
      </div>
    </div>
  );
}
