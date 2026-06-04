# (Superseded) Receive dispatch route fix

**Current documentation:** [`STAFF_INVENTORY_CANONICAL_DETAIL_ROUTES_STABLE_PHYSICAL.md`](./STAFF_INVENTORY_CANONICAL_DETAIL_ROUTES_STABLE_PHYSICAL.md)

The rewrite-based approach (`receive-dispatch` → `receive-dispatch-page`) was **removed** because canonical URLs still 404’d. Receive dispatch now uses a **physical page at the canonical path** `inventory/receive-dispatch/[dispatchId]/page.jsx`, with **redirects only** for legacy URLs.
