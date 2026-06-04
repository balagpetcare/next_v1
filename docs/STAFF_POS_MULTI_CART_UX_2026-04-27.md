# Staff POS multi-cart UX upgrade (2026-04-27)

## Scope

**Frontend only** in `app/staff/(larkon)/branch/[branchId]/pos/_components/PosCartTabs.jsx`. Reuses existing cart APIs and parent wiring (`openCarts`, `heldCarts`, `activeCartId`, `onSelectCart`, `onResumeHeldCart`, `onCreateCart`, `onRequestCloseCart`). **No** checkout/finalize API changes and **no** cart engine rewrite in `PosSaleWorkspace.jsx` beyond unchanged callbacks.

## Cart tab strip (open carts)

Each open cart is shown as a **chip** with:

- **Label** — `cartNumber` or `Cart N` (order follows list sort: **active cart first**, then by label / id).
- **Item count** — sum of `line.quantity` across `cart.lines`.
- **Subtotal** — sum of `unitSellPrice * quantity` (same basis as the active cart table; **preview only** for non-active carts from list payload).
- **Active state** — stronger border (`border-primary border-2`), light primary background, bold title.
- **Close (×)** — still calls `onRequestCloseCart(cart)`. Parent **`requestCloseCart`** already opens the **hold vs discard** modal when the cart has lines, or abandons immediately when empty — that is the **safety confirmation** for non-empty carts.

## Many carts (overflow)

When there are **more than four** open carts:

- The **first four** (after sort, so always including the **active** cart) render as inline chips.
- A **“+N more”** `<details>` menu lists the remaining carts with the same metrics; choosing one calls `onSelectCart` and collapses the menu.

## New cart

The primary **“New cart”** control (icon + label) still calls `onCreateCart` — same as the previous `+` action, with clearer labeling for cashiers.

## Held carts

- **Held** control uses **outline-warning** styling and a **count badge** when `heldCarts.length > 0`.
- Each held row shows **lines count**, **item qty**, **subtotal** (from `lines` on the held row), plus **Resume** (existing `onResumeHeldCart`).
- Light **amber strip** styling on held rows for quick visual distinction from open carts.

## Acceptance mapping

| Requirement | Implementation |
|-------------|----------------|
| Multiple carts create/switch | Unchanged `createNewPosCart` / `switchToPosCart` from parent; UI calls same handlers. |
| Totals correct | Non-active totals are computed from **`cart.lines`** on the list response (same formula as line totals in the workspace). Checkout still runs only on **`activeCart`** in `PosSaleWorkspace` / `PosCheckoutPanel`. |
| Close safety for non-empty | Still delegated to **`requestCloseCart` → modal** in `PosSaleWorkspace`; no duplicate confirm in tabs. |

## Files touched

- `app/staff/(larkon)/branch/[branchId]/pos/_components/PosCartTabs.jsx` — layout, metrics, overflow menu, held styling, “New cart” label.
- `docs/STAFF_POS_MULTI_CART_UX_2026-04-27.md` — this note.

## Follow-ups (optional)

- If list payloads omit `lines` for performance, subtotals on tabs would need a lightweight list endpoint or cached preview from the backend (out of scope for this UI-only pass).
