"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import StatusBadge from "@/app/owner/_components/StatusBadge";

function formatCurrency(amount) {
  return `৳${Number(amount).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function OwnerVendorsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  async function loadVendors() {
    setLoading(true);
    setError("");
    try {
      const vendorsRes = await ownerGet("/api/v1/vendors?limit=100").catch(() => ({ success: false, data: [] }));
      const vendorsList = vendorsRes?.data?.items || vendorsRes?.data || vendorsRes || [];
      setVendors(Array.isArray(vendorsList) ? vendorsList : []);
    } catch (e) {
      setError(e?.message || "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVendors();
  }, []);

  const filteredVendors = vendors.filter((v) => {
    const matchesSearch = !searchTerm || v.name?.toLowerCase().includes(searchTerm.toLowerCase()) || v.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="container py-3">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h2 className="mb-1">Vendor Management</h2>
          <div className="text-secondary">Manage your vendors and purchase orders</div>
        </div>
        <Link className="btn btn-primary" href="/owner/vendors/new">
          <i className="solar:add-circle-outline me-1" />
          Add Vendor
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Search */}
      <div className="card radius-12 mb-4">
        <div className="card-body p-24">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label">Search Vendors</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="card radius-12">
        <div className="card-body p-24">
          <h6 className="mb-3 fw-semibold">Vendors ({filteredVendors.length})</h6>
          {loading ? (
            <div className="text-center text-secondary py-4">Loading vendors...</div>
          ) : filteredVendors.length === 0 ? (
            <div className="text-center text-secondary py-4">No vendors found</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Contact</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Total Orders</th>
                    <th style={{ width: 120 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((vendor) => (
                    <tr key={vendor.id}>
                      <td>
                        <div className="fw-semibold">{vendor.name || "—"}</div>
                        {vendor.companyName && (
                          <div className="text-muted small">{vendor.companyName}</div>
                        )}
                      </td>
                      <td>{vendor.phone || "—"}</td>
                      <td>{vendor.email || "—"}</td>
                      <td>
                        <StatusBadge status={vendor.status || "ACTIVE"} />
                      </td>
                      <td className="text-center">
                        <span className="badge bg-info">{vendor.orderCount || 0}</span>
                      </td>
                      <td className="text-end">
                        <Link href={`/owner/vendors/${vendor.id}`} className="btn btn-outline-primary btn-sm">
                          View
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
