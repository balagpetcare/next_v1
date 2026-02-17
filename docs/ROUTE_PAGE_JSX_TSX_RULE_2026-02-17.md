# Route page rule: no mixed .jsx and .tsx in same directory

## Rule

- **Never** allow both `page.jsx` and `page.tsx` in the same route directory.
- If both exist: **prefer `.tsx`** and **quarantine `.jsx`**.

## 2026-02-17 enforcement

- **Quarantined:** `app/country/(larkon)/dashboard/page.jsx`  
  → `_quarantine_cleanup/2026-02-17/duplicate_jsx_pages/app/country/(larkon)/dashboard/page.jsx`
- **Kept:** `app/country/(larkon)/dashboard/page.tsx` (single page for `/country/dashboard`).

The quarantined `.jsx` contained the full country dashboard UI (metrics, queue items, `useLanguage`). The kept `.tsx` is a minimal placeholder. To restore the previous behavior, port the content from the quarantined file into `app/country/(larkon)/dashboard/page.tsx`.

## Going forward

When adding or renaming pages under `app/`, ensure each route directory has only one of `page.jsx` or `page.tsx`; prefer `page.tsx` for new or converted pages.
