# Staff POS scanner-first UX (2026-04-27)

## Scope

Frontend-only improvements under `app/staff/(larkon)/branch/[branchId]/pos/_components/` for barcode / quick-entry workflow. **No** API, pricing, cart line math, or payment submission logic changes.

## Behavior

### Auto-focus

- The quick-entry field is focused (and **all text selected** when **Scan mode** is on) when:
  - `canSell` is true and the sale workspace mounts or **`branchId`** / **`activeCart.id`** / **`scanMode`** changes (initial POS load and cart switch).
- **`refocusScanField()`** runs after:
  - Successful or failed **`handleQuickEntrySubmit`** (barcode / quick search).
  - **`addToCart`** (catalog `+` or scan pipeline) — `finally` block.
  - **Cart switch** (`switchToPosCart`), **new cart** (`createNewPosCart`), **resume held** (`resumeHeldCart`), **hold** (`holdActivePosCart`), **clear** (`abandonAndNewCart`), **close cart modal** (`closeCartNow`).
  - **Checkout submit** finishes (`handleSaleSubmit` `finally`) — covers validation errors and failed finalize (“checkout cancel” from cashier perspective).
  - **Dismiss** on sale success banner or sale error banner.

### Enter key

- The scan field lives in a `<form>` with a submit control; **Enter** triggers the same **`handleQuickEntrySubmit`** path as clicking the barcode submit button (standard form submit; no duplicate handler on the input).

### `addToCart` return value

- **`addToCart`** now returns **`true`** only after a successful **`staffPosCartAddLine`** + reload; **`false`** on validation failure, API error, or missing sell permissions / cart.
- **`tryAddFromBarcode`** returns **`false`** when lookup misses, stock is zero, or **`addToCart`** fails — so **`handleQuickEntrySubmit`** does not treat a failed add as success (avoids incorrect “added” UX).

## Scan status strip

Rendered above the scan field in **`PosScannerInput`** (`scanLineStatus` prop):

| State        | When |
|-------------|------|
| **Ready**   | Default / idle (`scannerTone === "ready"` and not loading). |
| **Scanning…** | While `barcodeLoading` (barcode / quick submit in flight). |
| **Added**   | After a successful line add (`markAddedPulse`: brief tone + ring animation). |
| **Not found** | Lookup miss, OOS messages mapped to this tone, or generic add failures classified as not-found. |
| **No price** | “Price is not configured…” paths. |

`aria-live="polite"` is set on the status badge for screen readers.

## Visual feedback (no audio)

- **Ring flash**: when a line is added successfully, **`PosShell`** CSS animates a short blue ring on the scanner stack (`.pos-scanner-flash`). No sound files or `Audio()` API — **visual only**, per project hygiene.

## Keyboard shortcuts

Registered on **`window`** in **capture** phase while the sale workspace is mounted (handler reads latest actions from **`scanKbRef`** each render):

| Shortcut | Action |
|----------|--------|
| **F2** | Focus scan field (respects `scanMode` select-all behavior via `refocusScanField`). |
| **Ctrl+N** (or **Cmd+N** on macOS) | **New cart** (`createNewPosCart`). Ignored while typing in other text fields / textareas / **number** inputs (e.g. received amount), but **not** when the scan field is focused. |
| **Ctrl+H** / **Cmd+H** | **Hold cart** (`holdActivePosCart`). Same guard as above. |
| **Esc** | Close **close-cart** modal, **invoice**, or **receipt** modal if open; otherwise clear scan text, clear sale error, reset scan tone to **Ready**, refocus scan. |

The same shortcuts are summarized in a **Keyboard** `<details>` disclosure next to the status badge in **`PosScannerInput`**.

## Files touched

- `PosSaleWorkspace.jsx` — `scannerTone`, `scanFlash`, `refocusScanField`, `markAddedPulse`, keyboard ref + listener, `addToCart` boolean return, `tryAddFromBarcode` return semantics, refocus hooks on cart/checkout flows, dismiss handlers.
- `PosScannerInput.jsx` — status row, keyboard help, optional `scanLineStatus` / `scanFlash` props.
- `PosCartWorkspace.jsx` — passes scan props through.
- `PosShell.jsx` — `@keyframes pos-scan-ring` + status badge color classes.

## Acceptance notes

- **Scanner keyboard wedge**: Enter-terminated scans hit the form submit path once.
- **Manual search**: Unchanged; non–scan mode still tries local match first, then barcode lookup.
- **No duplicate add from return handling**: `addToCart` / `tryAddFromBarcode` return values prevent treating a failed validation add as success.
