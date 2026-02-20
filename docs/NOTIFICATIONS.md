# Global Toast Notifications

The portal uses a **single, global Toast** system for success, error, warning, and info messages. Inline `alert alert-*` banners for post-action feedback have been replaced with toasts where applicable.

## Usage

### Hook: `useToast()`

In any **client component** under the app:

```jsx
"use client";

import { useToast } from "@/src/hooks/useToast";

export default function MyPage() {
  const toast = useToast();

  async function handleSave() {
    try {
      await saveSomething();
      toast.success("Saved successfully.");
    } catch (e) {
      toast.error(getMessageFromApiError(e));
    }
  }

  return (
    <button onClick={handleSave}>Save</button>
  );
}
```

### API

- `toast.success(message, opts?)` — success (green)
- `toast.error(message, opts?)` — error (red)
- `toast.warning(message, opts?)` — warning (amber)
- `toast.info(message, opts?)` — info (blue)

**Options (optional):**

- `duration` — milliseconds before auto-dismiss (default: 4000). Use `0` to not auto-dismiss.
- `dedupe` — if `false`, allow duplicate messages within 2 seconds (default: `true`).

Example:

```js
toast.success("Done!", { duration: 6000 });
toast.error("Server error", { dedupe: false });
```

### API error → user message

Use `getMessageFromApiError(err)` so 401/403/500 and backend `{ message }` / `{ errors }` are mapped to safe, user-facing text (no stack traces):

```js
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

try {
  await ownerPatch("/api/v1/...", data);
  toast.success("Updated.");
} catch (e) {
  toast.error(getMessageFromApiError(e));
}
```

## Architecture

- **ToastProvider** wraps the app in `app/layout.jsx`, so toasts are available on every page.
- **ToastViewport** is rendered once inside the provider (top-right on desktop, full-width top on small screens).
- Toasts stack, auto-dismiss after 4s, have a close (X) button, and use Bootstrap alert classes for variants.

## Key places updated

| Area | Change |
|------|--------|
| Owner vendors list/detail/new | Replaced `setError`/`setSuccess` and alert divs with `toast.*` and `getMessageFromApiError`. |
| Owner staff-access (staff/[userId]) | Replaced error banner and `setError` with toasts. |
| Owner organizations/[id]/branches | Replaced “Branch updated successfully” banner and load error with toasts. |
| Owner BranchForm | Replaced `setNotice`/`setError` and success/error alerts with toasts; kept load-error retry UI. |
| Staff branch selector | On load error, show toast and keep retry/back-to-login UI. |

## When to use what

- **Toast:** One-off feedback after an action (save, delete, status change, API error). Prefer toasts for success/error/warning/info that don’t need to stay on screen.
- **Inline message:** Keep for **blocking** or **contextual** content, e.g. “Vendor not found”, “Select an organization”, “Missing branch ID” (with Retry/Continue), or form-level validation that stays next to the form.

## Files

- `src/context/ToastContext.jsx` — Provider and context.
- `src/components/ToastViewport.jsx` — Viewport that renders toasts.
- `src/hooks/useToast.js` — `useToast()` hook.
- `src/lib/apiErrorToMessage.js` — Maps API errors to safe messages.
- Toast styles in `app/globals.css` (`.toast-viewport`, `.toast-item`, etc.).
