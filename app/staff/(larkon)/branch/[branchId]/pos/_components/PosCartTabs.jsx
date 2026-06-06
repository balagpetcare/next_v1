 
"use client";

import { useMemo } from "react";

const INLINE_CART_LIMIT = 3;

function getCartMetrics(cart) {
  const lines = Array.isArray(cart?.lines) ? cart.lines : [];
  const lineCount = lines.length;
  const itemQty = lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  const subtotal = lines.reduce(
    (sum, line) => sum + Number(line.unitSellPrice || 0) * Number(line.quantity || 0),
    0
  );
  return { lineCount, itemQty, subtotal };
}

function cartIdentity(cart) {
  return cart?.cartNumber ?? (cart?.id != null ? `Cart #${cart.id}` : "Cart");
}

function cartLabel(index) {
  return `Cart ${index + 1}`;
}

export default function PosCartTabs({
  carts,
  heldCarts,
  activeCartId,
  busy,
  onSelectCart,
  onResumeHeldCart,
  onCreateCart,
  onRequestCloseCart,
  className,
}) {
  const held = useMemo(() => (Array.isArray(heldCarts) ? heldCarts : []), [heldCarts]);

  const sortedOpen = useMemo(() => {
    const open = Array.isArray(carts) ? carts.filter((cart) => cart.status !== "HELD") : [];
    const list = [...open];
    list.sort((a, b) => {
      if (a.id === activeCartId) return -1;
      if (b.id === activeCartId) return 1;
      const an = String(a.cartNumber ?? a.id);
      const bn = String(b.cartNumber ?? b.id);
      return an.localeCompare(bn, undefined, { numeric: true });
    });
    return list;
  }, [carts, activeCartId]);

  const cartOrdinalById = useMemo(() => {
    const open = Array.isArray(carts) ? carts.filter((cart) => cart.status !== "HELD") : [];
    const list = [...open].sort((a, b) => {
      const an = String(a.cartNumber ?? a.id);
      const bn = String(b.cartNumber ?? b.id);
      return an.localeCompare(bn, undefined, { numeric: true });
    });
    const ordinals = new Map();
    list.forEach((cart, index) => {
      ordinals.set(cart.id, index);
    });
    return ordinals;
  }, [carts]);

  const showOverflowSwitcher = sortedOpen.length > INLINE_CART_LIMIT;
  const inlineCarts = showOverflowSwitcher ? sortedOpen.slice(0, INLINE_CART_LIMIT) : sortedOpen;
  const overflowCarts = showOverflowSwitcher ? sortedOpen.slice(INLINE_CART_LIMIT) : [];

  const renderCartChip = (cart, idx) => {
    const isActive = cart.id === activeCartId;
    const { lineCount, itemQty, subtotal } = getCartMetrics(cart);
    const ordinal = cartOrdinalById.get(cart.id) ?? idx;
    const label = cartLabel(ordinal);
    const identity = cartIdentity(cart);
    const hasLines = lineCount > 0;

    return (
      <div
        key={cart.id}
        className={`pos-cart-chip d-inline-flex align-items-stretch rounded-3 border ${
          isActive ? "is-active border-primary bg-white shadow-sm" : "border-light bg-white"
        }`}
        style={{ minWidth: showOverflowSwitcher ? 112 : 122, maxWidth: 168 }}
      >
        <button
          type="button"
          className={`btn btn-sm text-start flex-grow-1 py-2 px-7 rounded-0 rounded-start-3 border-0 min-w-0 pos-cart-chip__main ${
            isActive ? "text-primary fw-bold" : "text-dark"
          }`}
          style={{ lineHeight: 1.15 }}
          disabled={busy}
          onClick={() => onSelectCart?.(cart)}
          title={`Switch to ${label} (${identity})`}
        >
          <div className="pos-cart-chip__title">{label}</div>
          <div className="text-secondary fw-normal pos-cart-chip__meta" style={{ fontSize: "9.5px" }}>
            {itemQty} {itemQty === 1 ? "item" : "items"}
            {hasLines ? ` · Tk ${subtotal.toFixed(2)}` : " · Tk 0.00"}
          </div>
        </button>
        <button
          type="button"
          className={`btn btn-sm border-0 rounded-0 rounded-end-3 px-5 py-0 lh-1 ${
            isActive ? "text-primary" : "text-secondary-light"
          }`}
          title={hasLines ? "Close cart" : "Close empty cart"}
          disabled={busy}
          onClick={() => onRequestCloseCart?.(cart)}
        >
          <i className="ri-close-line" />
        </button>
      </div>
    );
  };

  return (
    <div className={`card radius-10 border shadow-none pos-cart-tabs-card ${className || ""}`.trim()}>
      <div className="card-body py-4 px-6">
        <div className="d-flex align-items-center justify-content-between gap-6 flex-nowrap pos-cart-tabs-row">
          <div className="d-flex align-items-center gap-6 flex-nowrap flex-grow-1 min-w-0 overflow-auto pos-cart-tabs-strip">
            {inlineCarts.map((cart) =>
              renderCartChip(cart, Math.max(0, sortedOpen.findIndex((c) => c.id === cart.id)))
            )}
          </div>

          <div className="d-flex align-items-center gap-5 flex-shrink-0 pos-cart-tabs-actions">
            {showOverflowSwitcher && overflowCarts.length > 0 ? (
              <details className="position-relative pos-cart-overflow">
                <summary
                  className="btn btn-sm btn-light border text-secondary py-0 px-8 list-unstyled pos-cart-more-btn"
                  style={{ listStyle: "none" }}
                >
                  +{overflowCarts.length} <i className="ri-arrow-down-s-line ms-2" />
                </summary>
                <div
                  className="position-absolute start-0 mt-6 p-8 border rounded-3 bg-white shadow"
                  style={{ minWidth: 250, maxWidth: 300, zIndex: 40 }}
                >
                  <div className="small text-secondary fw-semibold mb-6 text-uppercase" style={{ fontSize: "10px" }}>
                    Other carts
                  </div>
                  <div className="d-flex flex-column gap-4">
                    {overflowCarts.map((cart, idx) => {
                      const isActive = cart.id === activeCartId;
                      const { itemQty, subtotal } = getCartMetrics(cart);
                      const ordinal = cartOrdinalById.get(cart.id) ?? INLINE_CART_LIMIT + idx;
                      const label = cartLabel(ordinal);
                      const identity = cartIdentity(cart);
                      return (
                        <button
                          key={cart.id}
                          type="button"
                          className={`btn btn-sm text-start border rounded-2 py-4 px-8 ${
                            isActive ? "border-primary bg-primary-subtle fw-semibold" : "border-light"
                          }`}
                          disabled={busy}
                          onClick={(e) => {
                            onSelectCart?.(cart);
                            e.currentTarget.closest("details")?.removeAttribute("open");
                          }}
                          title={`${label} (${identity})`}
                        >
                          <div className="d-flex align-items-center justify-content-between gap-8">
                            <span className="text-truncate fw-semibold">{label}</span>
                            <span className="text-secondary flex-shrink-0" style={{ fontSize: "10px" }}>
                              {itemQty} {itemQty === 1 ? "item" : "items"} · Tk {subtotal.toFixed(2)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </details>
            ) : null}

            <button
              type="button"
              className="btn btn-sm btn-primary rounded-3 px-8 py-0 fw-semibold d-inline-flex align-items-center gap-4 flex-shrink-0 pos-new-cart-btn"
              disabled={busy}
              title="Start a new empty cart"
              onClick={() => onCreateCart?.()}
            >
              <i className="ri-add-line" />
              <span>New</span>
            </button>

            <details className="position-relative flex-shrink-0 pos-held-menu">
              <summary
                className={`btn btn-sm px-8 py-0 list-unstyled d-inline-flex align-items-center gap-4 pos-held-toggle ${
                  held.length ? "btn-light border border-warning text-dark" : "btn-light border text-secondary"
                }`}
                style={{ listStyle: "none" }}
              >
                <i className="ri-pause-circle-line" />
                Held
                {held.length > 0 ? (
                  <span className="badge rounded-pill bg-warning text-dark">{held.length}</span>
                ) : null}
                <i className="ri-arrow-down-s-line" />
              </summary>
              <div
                className="position-absolute end-0 mt-6 p-10 border rounded-3 bg-white shadow"
                style={{ minWidth: 260, zIndex: 35 }}
              >
                {held.length > 0 ? (
                  <>
                    <div className="small text-secondary mb-8 fw-medium">Paused carts</div>
                    {held.map((cart, idx) => {
                      const { lineCount, itemQty, subtotal } = getCartMetrics(cart);
                      return (
                        <div
                          key={cart.id}
                          className={`d-flex align-items-center justify-content-between gap-8 py-5 px-8 rounded-2 pos-held-row ${
                            idx < held.length - 1 ? "mb-6" : ""
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="fw-semibold small text-truncate">{cart.cartNumber ?? `Cart #${cart.id}`}</div>
                            <div className="small text-secondary">
                              {lineCount} lines | {itemQty} items | Tk {subtotal.toFixed(2)}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary flex-shrink-0"
                            disabled={busy}
                            onClick={() => onResumeHeldCart?.(cart)}
                          >
                            Resume
                          </button>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="small text-secondary-light">No held carts. Use Hold to park a cart.</div>
                )}
              </div>
            </details>
          </div>
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .pos-cart-tabs-card .pos-held-row {
              background: linear-gradient(90deg, rgba(255, 193, 7, 0.12), rgba(255, 255, 255, 0.9));
              border: 1px solid rgba(255, 193, 7, 0.35);
            }
            .pos-cart-tabs-card .pos-cart-tabs-strip {
              scrollbar-width: thin;
              padding-bottom: 0;
            }
            .pos-cart-tabs-card .pos-cart-chip {
              width: 146px;
              height: 40px;
              min-height: 40px;
              overflow: hidden;
            }
            .pos-cart-tabs-card .pos-cart-chip.is-active {
              box-shadow: inset 3px 0 0 #2563eb, 0 3px 10px rgba(37, 99, 235, 0.12) !important;
            }
            .pos-cart-tabs-card .pos-cart-chip__main {
              overflow: hidden;
            }
            .pos-cart-tabs-card .pos-cart-chip__title,
            .pos-cart-tabs-card .pos-cart-chip__meta {
              display: block;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .pos-cart-tabs-card .pos-cart-chip__title {
              font-size: 12px;
              font-weight: 700;
            }
            .pos-cart-tabs-card .pos-cart-chip__meta {
              color: #64748b;
              font-size: 9.5px;
            }
            .pos-cart-tabs-card .pos-cart-more-btn,
            .pos-cart-tabs-card .pos-new-cart-btn,
            .pos-cart-tabs-card .pos-held-toggle {
              height: 38px;
              min-height: 38px;
              line-height: 1;
            }
            .pos-cart-tabs-card .pos-cart-chip .btn:focus {
              box-shadow: none;
            }
          `,
        }}
      />
    </div>
  );
}
