"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Dropdown, Form } from "react-bootstrap";
import { producerProductsPick } from "../_lib/producerApi";

const RECENT_KEY_PREFIX = "producer-product-pick-recent-";
const RECENT_MAX = 10;
const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

function StatusChip({ status }) {
  const s = status || "";
  const cls =
    s === "ACTIVE" ? "bg-success" : s === "APPROVED" ? "bg-info" : "bg-secondary";
  return (
    <span className={`badge ${cls} badge-sm ms-1`}>{String(s).replace(/_/g, " ")}</span>
  );
}

function getRecent(producerOrgId) {
  if (!producerOrgId) return [];
  try {
    const raw = localStorage.getItem(`${RECENT_KEY_PREFIX}${producerOrgId}`);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function pushRecent(producerOrgId, item) {
  if (!producerOrgId || !item?.id) return;
  try {
    const recent = getRecent(producerOrgId).filter((r) => r.id !== item.id);
    const next = [{ id: item.id, name: item.name, sku: item.sku, approvalStatus: item.approvalStatus }, ...recent].slice(0, RECENT_MAX);
    localStorage.setItem(`${RECENT_KEY_PREFIX}${producerOrgId}`, JSON.stringify(next));
  } catch (_) {}
}

/**
 * Async searchable product picker for batch creation. Server-side search + pagination, recent list, exact SKU shortcut.
 */
export default function ProductPicker({
  producerOrgId,
  value,
  selectedItem,
  onChange,
  placeholder = "Select product",
  onlyApproved = true,
  onlyActive = false,
  disabled,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState([]);
  const [recent, setRecent] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedForDisplay, setSelectedForDisplay] = useState(selectedItem ?? null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    setSelectedForDisplay(selectedItem ?? null);
  }, [selectedItem, value]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!producerOrgId) return;
    setRecent(getRecent(producerOrgId));
  }, [producerOrgId, isOpen]);

  const fetchPage = useCallback(
    async (q, pageNum = 1, append = false) => {
      if (!producerOrgId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await producerProductsPick({
          q: q || undefined,
          page: pageNum,
          limit: PAGE_SIZE,
          onlyApproved,
          onlyActive,
        });
        const list = res?.items ?? [];
        const tot = res?.total ?? 0;
        if (append) setItems((prev) => (pageNum === 1 ? list : [...prev, ...list]));
        else setItems(list);
        setPage(pageNum);
        setTotal(tot);
      } catch (e) {
        setError(e?.message || "Failed to load products");
        if (!append) setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [producerOrgId, onlyApproved, onlyActive]
  );

  useEffect(() => {
    if (!isOpen) return;
    fetchPage(debouncedSearch, 1, false);
  }, [isOpen, debouncedSearch, fetchPage]);

  const loadMore = useCallback(() => {
    fetchPage(debouncedSearch, page + 1, true);
  }, [debouncedSearch, page, fetchPage]);

  const hasMore = total > items.length;
  const recentIds = recent.map((r) => r.id);
  const displayItems =
    debouncedSearch === "" && recentIds.length > 0
      ? items.filter((i) => !recentIds.includes(i.id))
      : items;

  const handleSelect = useCallback(
    (item) => {
      onChange(String(item.id), item);
      setSelectedForDisplay(item);
      if (producerOrgId) pushRecent(producerOrgId, item);
      setIsOpen(false);
      setSearch("");
    },
    [onChange, producerOrgId]
  );

  const handleDropdownToggle = useCallback(
    (nextOpen) => {
      setIsOpen(nextOpen);
      if (nextOpen) {
        setSearch("");
        setError(null);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    },
    []
  );

  const exactSkuMatch = items.length === 1 && items[0].sku && search.trim() && items[0].sku.toLowerCase() === search.trim().toLowerCase();

  const onKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && exactSkuMatch) {
        e.preventDefault();
        handleSelect(items[0]);
      }
    },
    [exactSkuMatch, items, handleSelect]
  );

  const displayLabel = selectedForDisplay
    ? `${selectedForDisplay.name || "Product"}${selectedForDisplay.sku ? ` (${selectedForDisplay.sku})` : ""}`
    : value
      ? `Product #${value}`
      : placeholder;

  return (
    <Dropdown show={isOpen} onToggle={handleDropdownToggle} className={className}>
      <Dropdown.Toggle
        variant="outline-secondary"
        size="sm"
        className="w-100 radius-12 text-start d-flex align-items-center"
        disabled={disabled}
        id="product-picker-toggle"
      >
        <span className="text-truncate">{displayLabel}</span>
      </Dropdown.Toggle>
      <Dropdown.Menu align="start" className="p-0" style={{ minWidth: 320, maxHeight: 360 }}>
        <div className="p-2 border-bottom">
          <Form.Control
            ref={searchInputRef}
            size="sm"
            type="text"
            placeholder="Search by product name or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onKeyDown}
            className="radius-12"
            autoComplete="off"
          />
          {exactSkuMatch && (
            <p className="small text-muted mb-0 mt-1">Press Enter to select the matching product.</p>
          )}
        </div>
        <div ref={listRef} className="overflow-auto" style={{ maxHeight: 300 }}>
          {loading && items.length === 0 && (
            <div className="p-3 text-center text-muted small">Loading…</div>
          )}
          {error && (
            <div className="p-3 text-danger small">{error}</div>
          )}
          {!loading && !error && debouncedSearch === "" && recent.length > 0 && (
            <>
              <div className="px-2 pt-2 small text-muted">Recently selected</div>
              {recent.map((r) => (
                <Dropdown.Item
                  key={r.id}
                  onClick={() => handleSelect(r)}
                  className="d-flex flex-column align-items-start"
                >
                  <span>{r.name || `#${r.id}`}</span>
                  {r.sku && <span className="small text-muted">{r.sku}</span>}
                  {r.approvalStatus && <StatusChip status={r.approvalStatus} />}
                </Dropdown.Item>
              ))}
              <Dropdown.Divider />
            </>
          )}
          {!loading && !error && items.length === 0 && debouncedSearch !== "" && (
            <div className="p-3 text-muted small">No products match.</div>
          )}
          {displayItems.map((p) => (
            <Dropdown.Item
              key={p.id}
              onClick={() => handleSelect(p)}
              className="d-flex flex-column align-items-start"
            >
              <span>{p.name || `#${p.id}`}</span>
              {p.sku && <span className="small text-muted">{p.sku}</span>}
              <StatusChip status={p.approvalStatus} />
            </Dropdown.Item>
          ))}
          {hasMore && (
            <div className="p-2 text-center border-top">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm radius-12"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
}
