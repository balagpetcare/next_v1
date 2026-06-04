/* eslint-disable react/prop-types */
"use client";

import { useMemo } from "react";
import Card from "@/src/bpa/components/ui/Card";

export default function PosProductPanel({
  canSell,
  busy,
  productSearch,
  onProductSearchChange,
  searchResults,
  onAddProduct,
  onRefreshCatalog,
  catalogBusy,
  categories,
  activeCategory,
  onSelectCategory,
  cardClassName,
}) {
  const visibleCategories = Array.isArray(categories) ? categories.slice(0, 8) : [];
  const visibleProducts = useMemo(
    () => (Array.isArray(searchResults) ? searchResults.slice(0, 40) : []),
    [searchResults]
  );

  return (
    <Card className={`pos-catalog-card h-100 min-h-0 ${cardClassName || ""}`}>
      <div className="d-flex gap-4 mb-4 align-items-stretch pos-catalog-search">
        <div className="position-relative flex-grow-1 min-w-0">
          <i className="ri-search-line pos-catalog-search__icon text-secondary-light" aria-hidden />
          <input
            type="text"
            autoComplete="off"
            inputMode="search"
            className="form-control form-control-sm pos-catalog-search__input w-100"
            placeholder="Search name, SKU, barcode..."
            value={productSearch}
            onChange={(e) => onProductSearchChange(e.target.value)}
          />
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .pos-catalog-search .pos-catalog-search__icon {
              position: absolute;
              left: 10px;
              top: 50%;
              transform: translateY(-50%);
              z-index: 1;
              pointer-events: none;
              font-size: 0.9rem;
            }
            .pos-catalog-search .pos-catalog-search__input {
              padding-left: 2.25rem;
              padding-right: 0.45rem;
              line-height: 1.25;
              border-radius: 8px;
            }
          `,
        }}
      />

      <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
        {visibleCategories.map((category, idx) => {
          const isActive = (idx === 0 && activeCategory === "all") || activeCategory === category.id;
          return (
            <button
              key={category.id || idx}
              type="button"
              className={`btn btn-sm py-0 px-7 rounded-pill lh-sm ${isActive ? "btn-primary" : "btn-light border text-secondary"}`}
              style={{ fontSize: "10px", minHeight: "20px" }}
              onClick={() => onSelectCategory?.(category.id)}
            >
              {category.name}
            </button>
          );
        })}
        {Array.isArray(categories) && categories.length > 8 ? (
          <button
            type="button"
            className="btn btn-light border text-secondary btn-sm py-0 px-6 rounded-pill"
            style={{ fontSize: "10px", minHeight: "20px" }}
            onClick={() => onSelectCategory?.("all")}
            title="All categories"
          >
            All
          </button>
        ) : null}
      </div>

      <div className="d-flex align-items-center justify-content-between gap-6 mb-2">
        <span className="text-uppercase text-secondary fw-semibold" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
          Catalog
        </span>
        <div className="d-flex align-items-center gap-6">
          <span className="small text-secondary">{Array.isArray(searchResults) ? searchResults.length : 0} SKUs</span>
          {typeof onRefreshCatalog === "function" ? (
            <button
              type="button"
              className="btn btn-sm btn-light text-primary fw-medium border px-6 py-2"
              disabled={busy || Boolean(catalogBusy)}
              onClick={() => onRefreshCatalog()}
            >
              {catalogBusy ? "..." : "Refresh"}
            </button>
          ) : null}
        </div>
      </div>

      {visibleProducts.length > 0 ? (
        <div className="d-flex flex-column gap-0 pos-product-list">
          {visibleProducts.map((item) => {
            const stockCount = Number(item.stock ?? 0);
            const outOfStock = stockCount <= 0;
            const hasPrice = item?.price != null && Number.isFinite(Number(item.price)) && Number(item.price) > 0;
            const addDisabled = !canSell || busy || outOfStock || !hasPrice;
            return (
              <div
                key={`${item.productId}-${item.variantId ?? "base"}`}
                className="d-flex align-items-center gap-5 py-3 px-2 border-bottom pos-product-item"
                style={{ minHeight: "34px" }}
              >
                <div className="min-w-0 flex-grow-1 lh-sm">
                  <div className="fw-semibold text-truncate small mb-0">{item.name}</div>
                  <div className="d-flex flex-wrap align-items-center gap-x-7 gap-y-1 mt-1">
                      <span className="text-secondary-light" style={{ fontSize: "10px" }}>
                      {item.sku || "-"}
                    </span>
                    {hasPrice ? (
                      <span className="fw-semibold text-dark" style={{ fontSize: "11px" }}>
                        Tk {Number(item.price).toFixed(2)}
                      </span>
                    ) : (
                      <span className="badge rounded-pill bg-light text-secondary border">
                        No price
                      </span>
                    )}
                    <span
                      className={`${outOfStock ? "text-danger" : "text-success"}`}
                      style={{ fontSize: "10px" }}
                    >
                      Stock {outOfStock ? "0" : stockCount}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm flex-shrink-0 d-flex align-items-center justify-content-center fw-bold shadow-none"
                  style={{ width: 26, height: 26, minWidth: 26, padding: 0, borderRadius: "8px" }}
                  disabled={addDisabled}
                  onClick={() => onAddProduct(item)}
                  title={!hasPrice ? "Price required" : outOfStock ? "Out of stock" : "Add"}
                  aria-label="Add to cart"
                >
                  +
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-secondary small mb-0 py-10">No matching products.</p>
      )}
    </Card>
  );
}
