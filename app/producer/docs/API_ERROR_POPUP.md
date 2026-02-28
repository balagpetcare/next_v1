# Producer API Error Popup

When the backend returns non-2xx (e.g. 403 "Product must be activated..."), show a **modal popup** instead of only console or toast.

## Reuse in other producer pages

1. **Import** from producer _lib:
   ```js
   import { normalizeApiError, useApiErrorPopup } from "../../_lib/apiErrorPopup";
   ```
2. **In your component:** call the hook and render the modal:
   ```js
   const { showApiErrorPopup, ApiErrorModal } = useApiErrorPopup();
   // In JSX (e.g. at top of return):
   return (
     <>
       <ApiErrorModal />
       ...rest of page...
     </>
   );
   ```
3. **On API failure:** in your `catch`, call:
   ```js
   catch (e) {
     showApiErrorPopup(normalizeApiError(e));
   }
   ```
   Use **popup as primary** for permission/blocked errors (no duplicate toast + popup).

## Where it's used

- **Create batch:** `/producer/products/[id]` (Create Batch), `/producer/batches` (Create batch modal)
- **Batch actions:** `/producer/batches/[id]` (Generate codes, Submit for approval), `/producer/batches/[id]/generate-codes` (Generate)
- **Proof upload:** `/producer/products/[id]/edit` and `/producer/products/new` (add proof document) — 500/4xx from `POST .../proofs` (e.g. storage unavailable) show in the same modal

## Behavior

- **403** → title "Action blocked"; body = backend message.
- **Product not activated** → same + hint: "This product is not activated yet. Please request platform admin approval to activate it before creating batches."
- **Other errors** → title "Request failed"; body = backend message (no raw JSON).
