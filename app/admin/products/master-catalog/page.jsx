"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import PageHeader from "@/src/bpa/components/PageHeader";
import { apiGet, apiPatch } from "@/lib/api";
import SectionCard from "@/src/bpa/admin/components/SectionCard";
import StatusChip from "@/src/bpa/admin/components/StatusChip";

export default function Page() {
  const [items, setItems] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "", "active", "inactive"
  const [verifiedFilter, setVerifiedFilter] = useState(""); // "", "verified", "unverified"

  const [mutatingId, setMutatingId] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
      });

      if (search) params.set("search", search);
      if (brandId) params.set("brandId", String(brandId));
      if (categoryId) params.set("categoryId", String(categoryId));

      if (statusFilter === "active") {
        params.set("isActive", "true");
      } else if (statusFilter === "inactive") {
        params.set("isActive", "false");
      }

      if (verifiedFilter === "verified") {
        params.set("isVerified", "true");
      } else if (verifiedFilter === "unverified") {
        params.set("isVerified", "false");
      }

      const r = await apiGet(`/api/v1/products/master-catalog?${params.toString()}`);
      const data = Array.isArray(r?.data) ? r.data : r?.data || r;
      const nextItems = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : [];

      setItems(nextItems);

      const pagination = data?.pagination || r?.pagination;
      if (pagination) {
        setTotalPages(pagination.totalPages || 1);
        setTotalCount(pagination.total || nextItems.length);
      } else {
        setTotalPages(1);
        setTotalCount(nextItems.length);
      }
    } catch (e) {
      // @ts-ignore
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, search, brandId, categoryId, statusFilter, verifiedFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Debounce search input
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Auto-hide status message
  useEffect(() => {
    if (!statusMessage) return;
    const t = setTimeout(() => setStatusMessage(""), 4000);
    return () => clearTimeout(t);
  }, [statusMessage]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (openDropdownId === null) return;
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown")) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openDropdownId]);

  const subtitleTotal = totalCount || items.length;

  const brandOptions = useMemo(() => {
    const seen = new Map();
    for (const item of items) {
      const b = item.brand;
      if (b?.id && !seen.has(b.id)) {
        seen.set(b.id, b.name || `Brand #${b.id}`);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  const categoryOptions = useMemo(() => {
    const seen = new Map();
    for (const item of items) {
      const c = item.category;
      if (c?.id && !seen.has(c.id)) {
        seen.set(c.id, c.name || `Category #${c.id}`);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  const filteredItems = useMemo(() => {
    let list = items;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((item) => {
        const name = (item.name || "").toLowerCase();
        const barcode = (item.barcode || "").toLowerCase();
        const categoryName = (item.category?.name || "").toLowerCase();
        const brandName = (item.brand?.name || "").toLowerCase();
        return (
          name.includes(q) ||
          barcode.includes(q) ||
          categoryName.includes(q) ||
          brandName.includes(q)
        );
      });
    }

    if (brandId) {
      list = list.filter((item) => String(item.brand?.id || "") === String(brandId));
    }

    if (categoryId) {
      list = list.filter((item) => String(item.category?.id || "") === String(categoryId));
    }

    if (statusFilter === "active") {
      list = list.filter((item) => item.isActive !== false);
    } else if (statusFilter === "inactive") {
      list = list.filter((item) => item.isActive === false);
    }

    if (verifiedFilter === "verified") {
      list = list.filter((item) => item.isVerified === true);
    } else if (verifiedFilter === "unverified") {
      list = list.filter((item) => item.isVerified === false);
    }

    return list;
  }, [items, search, brandId, categoryId, statusFilter, verifiedFilter]);

  const handleToggleActive = async (item) => {
    const nextActive = !item.isActive;
    const confirmed = window.confirm(
      nextActive
        ? "Activate this master product so it can be used across shops?"
        : "Deactivate (soft delete) this master product? Linked shop items may be affected.",
    );
    if (!confirmed) return;

    try {
      setMutatingId(item.id);
      await apiPatch(`/api/v1/products/master-catalog/${item.id}`, { isActive: nextActive });
      await load();
      setStatusMessage(
        nextActive
          ? "Master product activated successfully."
          : "Master product deactivated successfully.",
      );
    } catch (e) {
      // @ts-ignore
      setError(e?.message || "Failed to update product status");
    } finally {
      setMutatingId(null);
    }
  };

  return (
    <div className="container-fluid">
      <PageHeader
        title="Master Product Catalog"
        subtitle={`Total: ${subtitleTotal} products`}
        right={
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <button
              onClick={() => load()}
              disabled={loading}
              className="btn btn-outline-primary d-flex align-items-center gap-2"
            >
              <Icon icon="solar:refresh-outline" />
              {loading ? "Loading..." : "Refresh"}
            </button>
            <a
              href="/admin/products/master-catalog/import"
              className="btn btn-outline-secondary d-flex align-items-center gap-2"
            >
              <Icon icon="solar:upload-linear" />
              Import CSV
            </a>
            <a href="/admin/products" className="btn btn-light">
              Back to Products
            </a>
          </div>
        }
      />

      {error ? (
        <div className="alert alert-danger mt-2" role="alert">
          {error}
        </div>
      ) : null}
      {statusMessage ? (
        <div className="alert alert-success mt-2" role="alert">
          {statusMessage}
        </div>
      ) : null}

      <div className="mt-3">
        <SectionCard
          title="Master Catalog"
          right={
            <span className="text-secondary small">
              {filteredItems.length} product(s) • page {page} of {totalPages}
            </span>
          }
        >
          {/* Row 1: outline actions + CSV / refresh (Wowdash-style) */}
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div className="d-flex flex-wrap gap-2 align-items-center">
              {/* Outline action dropdown */}
              <div className="dropdown">
                <button
                  className="btn btn-sm btn-outline-primary dropdown-toggle d-flex align-items-center gap-2"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  Outline Action
                </button>
                <ul className="dropdown-menu dropdown-menu-end">
                  <li>
                    <button
                      type="button"
                      className="dropdown-item px-16 py-8 rounded text-secondary-light bg-hover-neutral-200 text-hover-neutral-900"
                    >
                      Quick view
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="dropdown-item px-16 py-8 rounded text-secondary-light bg-hover-neutral-200 text-hover-neutral-900"
                    >
                      Export current view
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="dropdown-item px-16 py-8 rounded text-secondary-light bg-hover-neutral-200 text-hover-neutral-900"
                    >
                      Help / guide
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            {/* Local CSV + refresh actions for this table */}
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="btn btn-sm btn-outline-primary d-flex align-items-center gap-2"
              >
                <Icon icon="solar:refresh-outline" />
                {loading ? "Loading..." : "Refresh list"}
              </button>
              <a
                href="/admin/products/master-catalog/import"
                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
              >
                <Icon icon="solar:upload-linear" />
                Upload CSV
              </a>
            </div>
          </div>

          {/* Row 2: dropdown filters – single horizontal line */}
          <div className="d-flex gap-2 mb-3" style={{ flexWrap: "nowrap" }}>
            <select
              className="form-select form-select-sm"
              style={{ flex: "1 1 0%", minWidth: 0 }}
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All categories</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              className="form-select form-select-sm"
              style={{ flex: "1 1 0%", minWidth: 0 }}
              value={brandId}
              onChange={(e) => {
                setBrandId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All brands</option>
              {brandOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <select
              className="form-select form-select-sm"
              style={{ flex: "1 1 0%", minWidth: 0 }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Active (default)</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>

            <select
              className="form-select form-select-sm"
              style={{ flex: "1 1 0%", minWidth: 0 }}
              value={verifiedFilter}
              onChange={(e) => {
                setVerifiedFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All verification</option>
              <option value="verified">Verified only</option>
              <option value="unverified">Unverified only</option>
            </select>
          </div>

          {/* Row 3: search under dropdown filters - full width */}
          <div className="mb-3">
            <input
              type="text"
              className="form-control form-control-sm w-100"
              placeholder="Search name, SKU, brand, category..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Global SKU / Barcode</th>
                  <th>Category</th>
                  <th>Brand</th>
                  <th>Variants</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        {item.primaryMedia?.url && (
                          <img
                            src={item.primaryMedia.url}
                            alt={item.name || "Product image"}
                            style={{
                              width: 40,
                              height: 40,
                              objectFit: "cover",
                              borderRadius: 6,
                            }}
                          />
                        )}
                        {!item.primaryMedia?.url && item.imageUrl && (
                          <img
                            src={item.imageUrl}
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
                          <div className="fw-semibold">{item.name || "—"}</div>
                          <div className="text-secondary" style={{ fontSize: 12 }}>
                            ID: {item.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{item.barcode || "—"}</td>
                    <td style={{ fontSize: 13 }}>{item.category?.name || "—"}</td>
                    <td style={{ fontSize: 13 }}>{item.brand?.name || "—"}</td>
                    <td style={{ fontSize: 13 }}>
                      {Array.isArray(item.variantsJson) ? item.variantsJson.length : 0}
                    </td>
                    <td>
                      <StatusChip status={item.isActive ? "ACTIVE" : "INACTIVE"} />
                    </td>
                    {/* Actions dropdown */}
                    <td className="text-end">
                      <div className="dropdown">
                        <button
                          className="btn btn-outline-primary-600 px-12 py-6 text-sm dropdown-toggle toggle-icon"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(openDropdownId === item.id ? null : item.id);
                          }}
                          aria-expanded={openDropdownId === item.id}
                        >
                          Actions
                        </button>
                        <ul
                          className={`dropdown-menu dropdown-menu-end ${openDropdownId === item.id ? "show" : ""}`}
                          style={{
                            display: openDropdownId === item.id ? "block" : "none",
                            position: "absolute",
                            zIndex: 1000,
                          }}
                        >
                          <li>
                            <a
                              className="dropdown-item px-16 py-8 rounded text-secondary-light bg-hover-neutral-200 text-hover-neutral-900"
                              href={`/admin/products/master-catalog/${item.id}`}
                              onClick={() => setOpenDropdownId(null)}
                            >
                              View Details
                            </a>
                          </li>
                          <li>
                            <a
                              className="dropdown-item px-16 py-8 rounded text-secondary-light bg-hover-neutral-200 text-hover-neutral-900"
                              href={`/admin/products/master-catalog/${item.id}?edit=true`}
                              onClick={() => setOpenDropdownId(null)}
                            >
                              Edit Product
                            </a>
                          </li>
                          <li>
                            <a
                              className="dropdown-item px-16 py-8 rounded text-secondary-light bg-hover-neutral-200 text-hover-neutral-900"
                              href={`/api/v1/products/master-catalog/${item.id}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => setOpenDropdownId(null)}
                            >
                              API
                            </a>
                          </li>
                          <li>
                            <button
                              type="button"
                              className="dropdown-item px-16 py-8 rounded text-secondary-light bg-hover-neutral-200 text-hover-neutral-900 w-100 text-start"
                              onClick={() => {
                                handleToggleActive(item);
                                setOpenDropdownId(null);
                              }}
                              disabled={mutatingId === item.id || loading}
                            >
                              {item.isActive ? "Deactivate" : "Activate"}
                            </button>
                          </li>
                        </ul>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredItems.length && !loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-secondary text-center"
                      style={{ fontSize: 13 }}
                    >
                      No products found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="text-secondary" style={{ fontSize: 13 }}>
                Page {page} of {totalPages}
                {subtitleTotal ? ` • ${subtitleTotal} products` : null}
              </div>
              <nav>
                <ul className="pagination mb-0">
                  <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
                    <button
                      className="page-link"
                      onClick={() => page > 1 && setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </button>
                  </li>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
                      <button className="page-link" onClick={() => setPage(p)}>
                        {p}
                      </button>
                    </li>
                  ))}
                  <li className={`page-item ${page === totalPages ? "disabled" : ""}`}>
                    <button
                      className="page-link"
                      onClick={() => page < totalPages && setPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
